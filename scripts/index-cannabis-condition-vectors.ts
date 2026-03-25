import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Align this script with the app embedding config (no secret in frontend env)
const OPENROUTER_EMBED_MODEL = 'openai/text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or fallback VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

type ConditionRow = {
  id: string;
  condition: string;
  simple_notes: string | null;
  scientific_notes: string | null;
};

function buildTextContent(row: ConditionRow): string {
  return [row.condition, row.simple_notes, row.scientific_notes].filter(Boolean).join('\n\n');
}

function extractEmbeddingVector(payload: any): number[] | null {
  const candidates = [
    payload?.data?.[0]?.embedding,
    payload?.embedding,
    payload?.data?.embedding,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  return null;
}

async function createOpenRouterEmbedding(text: string): Promise<number[]> {
  const { data: payload, error } = await supabase.functions.invoke('ai-embeddings', {
    body: {
      model: OPENROUTER_EMBED_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    },
  });

  if (error) {
    throw new Error(`OpenRouter embedding error: ${error.message}`);
  }

  let vector = extractEmbeddingVector(payload);

  // Retry once without dimensions for providers that reject dimensions.
  if (!vector) {
    const { data: fallbackPayload, error: fallbackError } = await supabase.functions.invoke('ai-embeddings', {
      body: {
        model: OPENROUTER_EMBED_MODEL,
        input: text,
      },
    });

    if (fallbackError) {
      throw new Error(`OpenRouter fallback embedding error: ${fallbackError.message}`);
    }

    vector = extractEmbeddingVector(fallbackPayload);
  }

  if (!vector) {
    throw new Error('OpenRouter embedding response did not include a vector.');
  }

  return vector;
}

async function indexCannabisConditionVectors() {
  const { data: rows, error } = await supabase
    .from('cannabis_conditions')
    .select('id, condition, simple_notes, scientific_notes');

  if (error) throw new Error(`Failed to load conditions: ${error.message}`);

  const conditions = (rows ?? []) as ConditionRow[];
  if (conditions.length === 0) {
    console.log('⚠️ No cannabis conditions available to index.');
    return;
  }

  let indexed = 0;

  for (const row of conditions) {
    const textContent = buildTextContent(row);
    if (!textContent) continue;

    const embedding = await createOpenRouterEmbedding(textContent);

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding dimension mismatch for ${row.condition}: got ${embedding.length}, expected ${EMBEDDING_DIMENSIONS}`);
    }

    const { error: upsertError } = await supabase
      .from('cannabis_conditions_vectors')
      .upsert(
        {
          condition_id: row.id,
          embedding,
          text_content: textContent,
        },
        { onConflict: 'condition_id' }
      );

    if (upsertError) {
      throw new Error(`Failed to upsert vector for ${row.condition}: ${upsertError.message}`);
    }

    indexed += 1;
    console.log(`✅ Indexed ${indexed}/${conditions.length}: ${row.condition}`);
  }

  console.log(`🌿 Finished indexing ${indexed} cannabis condition vectors with OpenRouter (${OPENROUTER_EMBED_MODEL}).`);
}

indexCannabisConditionVectors().catch((error) => {
  console.error('❌ Vector indexing failed:', error);
  process.exit(1);
});
