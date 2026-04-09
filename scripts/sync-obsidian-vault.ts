
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import * as fs from 'fs/promises';
import { parseObsidianNote } from '../src/lib/obsidianImport';

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

async function generateEmbedding(text: string): Promise<number[]> {
  const OPENROUTER_EMBED_MODEL = process.env.VITE_OPENROUTER_EMBED_MODEL || 'openai/text-embedding-3-large';
  const EXPECTED_EMBED_DIMENSIONS = parseInt(process.env.VITE_OPENROUTER_EMBED_DIMENSIONS || '3072');

  const { data, error } = await supabase.functions.invoke('ai-embeddings', {
    body: {
      model: OPENROUTER_EMBED_MODEL,
      input: text,
      dimensions: EXPECTED_EMBED_DIMENSIONS
    }
  });

  if (error) {
    throw new Error(`Embedding failed: ${error.message}`);
  }

  const embedding = data?.data?.[0]?.embedding || data?.embedding;
  if (!embedding) throw new Error('Failed to extract embedding from response.');
  return embedding;
}

async function syncVault(vaultPath: string) {
  console.log(`📂 Scanning Obsidian vault at: ${vaultPath}`);
  
  try {
    const files = await fs.readdir(vaultPath, { recursive: true });
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`🔍 Found ${mdFiles.length} markdown notes.`);

    for (const relativePath of mdFiles) {
      const fullPath = join(vaultPath, relativePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const filename = relativePath.split(/[\\/]/).pop() || '';
      
      const parsed = parseObsidianNote(content, filename);
      
      if (!parsed.content.trim()) continue;

      console.log(`🔄 Syncing: "${parsed.title}"...`);
      
      const vector = await generateEmbedding(`${parsed.title}\n\n${parsed.content}`);
      
      // Upsert based on title (or you could use a slug)
      const { error: upsertError } = await supabase.from('knowledge_base').upsert({
        title: parsed.title,
        content: parsed.content,
        category: parsed.category,
        embedding: vector,
        updated_at: new Date().toISOString()
      }, { onConflict: 'title' });

      if (upsertError) {
        console.error(`❌ Error syncing "${parsed.title}":`, upsertError.message);
      } else {
        console.log(`✅ Indexed "${parsed.title}" successfully.`);
      }
    }

    console.log('✨ Vault sync completed!');
  } catch (err: any) {
    console.error('🔥 Fatal error during sync:', err.message);
  }
}

const targetVault = process.argv[2];
if (!targetVault) {
  console.error("❌ Usage: npx tsx scripts/sync-obsidian-vault.ts <path-to-your-vault>");
  process.exit(1);
}

syncVault(resolve(targetVault));
