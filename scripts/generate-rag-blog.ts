import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const AI_MODEL = process.env.VITE_OPENROUTER_MODEL || 'liquid/lfm-2-24b-a2b:latest';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type ArticlePayload = {
  slug: string;
  title: string;
  description: string;
  summary: string;
  body: string;
  faq: Array<{ question: string; answer: string }>;
};

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

async function main() {
  console.log('🧠 Loading knowledge base...');
  const { data: kbRows, error } = await supabase
    .from('knowledge_base')
    .select('title, content, category')
    .order('created_at', { ascending: false })
    .limit(18);

  if (error) throw error;
  if (!kbRows || kbRows.length === 0) {
    console.log('⚠️ No knowledge base entries found.');
    return;
  }

  const grouped = kbRows.reduce<Record<string, { title: string; content: string }[]>>((acc, row) => {
    const key = row.category || 'general';
    acc[key] ||= [];
    acc[key].push({ title: row.title, content: row.content });
    return acc;
  }, {});

  const entries = Object.entries(grouped).slice(0, 6);
  const generated: ArticlePayload[] = [];

  for (const [category, docs] of entries) {
    const context = docs.map((d, i) => `Source ${i + 1}: ${d.title}\n${d.content}`).join('\n\n');
    const prompt = `
Tu es un rédacteur SEO senior en français.

À partir des sources suivantes, rédige un article de blog qui vise une intention informationnelle et commerciale douce.

Contrainte de sortie: JSON valide strict avec ce format:
{
  "title": "...",
  "description": "...",
  "summary": "...",
  "body": "...",
  "faq": [{"question":"...","answer":"..."}, {"question":"...","answer":"..."}]
}

Contraintes SEO:
- title <= 60 caractères
- description <= 155 caractères
- body 180 à 260 mots
- Ton expert, pédagogique, naturel
- 2 FAQ pertinentes
- Ne pas inventer de chiffres si absents des sources
- Catégorie cible: ${category}

Sources:
${context}
`;

    const { data, error: aiError } = await supabase.functions.invoke('ai-chat', {
      body: {
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        x_title: 'ESIL Ventes RAG Blog Generator',
      },
    });

    if (aiError) {
      console.warn(`⚠️ AI error for category ${category}:`, aiError.message);
      continue;
    }

    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) continue;

    try {
      const parsed = JSON.parse(String(raw).replace(/```json\s?|```/g, '').trim()) as Omit<ArticlePayload, 'slug'>;
      const slug = `blog-${slugify(parsed.title || category)}`;
      generated.push({ slug, ...parsed });
      console.log(`✅ Generated ${slug}`);
    } catch (e) {
      console.warn(`⚠️ Invalid JSON for category ${category}`);
    }
  }

  const fileContent = `export interface GeneratedGuideEntry {\n  title: string;\n  description: string;\n  summary: string;\n  body: string;\n  faq: Array<{ question: string; answer: string }>;\n}\n\n// Fichier auto-généré par scripts/generate-rag-blog.ts\n// Ne pas modifier à la main.\nexport const generatedGuides: Record<string, GeneratedGuideEntry> = ${JSON.stringify(Object.fromEntries(generated.map(g => [g.slug, {
    title: g.title,
    description: g.description,
    summary: g.summary,
    body: g.body,
    faq: g.faq,
  }])), null, 2)};\n`;

  writeFileSync(resolve(__dirname, '../src/pages/guides/generatedGuides.ts'), fileContent);
  console.log(`✨ Generated ${generated.length} articles into src/pages/guides/generatedGuides.ts`);
}

main().catch((err) => {
  console.error('🔥 RAG blog generation failed:', err);
  process.exit(1);
});
