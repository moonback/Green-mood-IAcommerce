import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define some initial seed data
const KNOWLEDGE_ENTRIES = [
  {
    title: 'Les bienfaits du CBD (Cannabidiol)',
    category: 'science',
    content: "Le CBD est réputé pour ses propriétés relaxantes, anti-inflammatoires et anxiolytiques. Contrairement au THC, il n'a pas d'effet psychoactif (il ne fait pas « planer ») et ne crée pas de dépendance. Il interagit avec le système endocannabinoïde pour aider à réguler l'humeur, le sommeil et la perception de la douleur."
  },
  {
    title: 'CBN (Cannabinol) et Sommeil',
    category: 'science',
    content: "Le CBN est un cannabinoïde souvent décrit comme le « cannabinoïde du sommeil ». Il est issu de l'oxydation du THC. Bien qu'il soit très légèrement psychoactif en théorie, dans les produits commerciaux CBD, il est utilisé pur pour ses puissants effets sédatifs naturels et relaxants, idéals pour lutter contre l'insomnie."
  },
  {
    title: 'Terpène : Myrcène',
    category: 'terpenes',
    content: "Le Myrcène est le terpène le plus abondant dans le cannabis. Il offre des arômes terreux, musqués et herbacés. Il est particulièrement reconnu pour l'« effet canapé » (couch-lock), favorisant une profonde relaxation musculaire et un endormissement rapide."
  },
  {
    title: 'Terpène : Limonène',
    category: 'terpenes',
    content: "Le Limonène se caractérise par des notes d'agrumes vives (citron, orange). Il a des propriétés reconnues pour élever l'humeur, réduire le stress et l'anxiété. Idéal pour une consommation en journée pour un regain d'énergie créative."
  },
  {
    title: 'Livraison et Frais de port',
    category: 'policy',
    content: "NeuroCart  propose plusieurs modes de livraison : Click & Collect gratuit en boutique, livraison standard à domicile (5.90€, offerte dès 50€ d'achat), et livraison express en 24h (9.90€)."
  },
  {
    title: 'Programme de fidélité et Parrainage',
    category: 'policy',
    content: "Le programme de fidélité NeuroCart  permet de cumuler des points à chaque achat (1€ = 10 points). Ces points peuvent être convertis en réductions (1000 points = 10€ offerts). De plus, avec le code parrainage, si un client invite un ami, ils reçoivent tous deux un bon de -10%."
  }
];

async function generateEmbedding(text: string): Promise<number[]> {
  const OPENROUTER_EMBED_MODEL = 'openai/text-embedding-3-large';
  const EXPECTED_EMBED_DIMENSIONS = 3072;

  const { data, error } = await supabase.functions.invoke('ai-embeddings', {
    body: {
      model: OPENROUTER_EMBED_MODEL,
      input: text,
      dimensions: EXPECTED_EMBED_DIMENSIONS
    }
  });

  if (error) {
    throw new Error(`Embedding failed for text: ${text.substring(0, 30)}... Error: ${error.message}`);
  }

  // Extract embedding array
  const candidates = [
    data?.data?.[0]?.embedding,
    data?.embedding,
    data?.data?.embedding,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      if (candidate.length !== EXPECTED_EMBED_DIMENSIONS) {
        throw new Error(`Dimension mismatch: got ${candidate.length}, expected ${EXPECTED_EMBED_DIMENSIONS}.`);
      }
      return candidate;
    }
  }

  throw new Error('Failed to extract embedding from response.');
}

async function seedKnowledgeBase() {
  console.log('🌱 Starting Knowledge Base seeding...');

  try {
    for (const entry of KNOWLEDGE_ENTRIES) {
      console.log(`Processing entry: "${entry.title}" (${entry.category})...`);

      // The text to embed combines title and content for best semantic hits
      const textToEmbed = `${entry.title}\n\n${entry.content}`;
      const vector = await generateEmbedding(textToEmbed);

      const { error } = await supabase.from('knowledge_base').insert({
        title: entry.title,
        content: entry.content,
        category: entry.category,
        embedding: vector
      });

      if (error) {
        console.error(`❌ DB error for "${entry.title}":`, error.message);
      } else {
        console.log(`✅ Indexed "${entry.title}" successfully.`);
      }
    }

    console.log('✨ All knowledge entries seeded successfully!');
  } catch (err: any) {
    console.error('🔥 Fatal error seeding knowledge base:', err.message);
  }
}

seedKnowledgeBase();
