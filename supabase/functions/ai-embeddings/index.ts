import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  normalizeEmbeddingInput,
  toValidEmbeddingVector,
} from '../_shared/embedding-cache-utils.ts';

const OPENROUTER_EMBED_URL = 'https://openrouter.ai/api/v1/embeddings';
const DEFAULT_EMBEDDING_MODEL = 'openai/text-embedding-3-large';
const L1_MAX_SIZE = 1000;
const L1_TTL_MS = 1000 * 60 * 30;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type L1Entry = {
  embedding: number[];
  expiresAt: number;
};

const l1EmbeddingCache = new Map<string, L1Entry>();
type UpstreamEmbeddingResult = {
  ok: boolean;
  status: number;
  data: any;
};

const inFlightEmbeddings = new Map<string, Promise<UpstreamEmbeddingResult>>();

function getL1Cache(key: string, expectedDimensions: number): number[] | null {
  const hit = l1EmbeddingCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    l1EmbeddingCache.delete(key);
    return null;
  }

  const valid = toValidEmbeddingVector(hit.embedding, expectedDimensions);
  if (!valid) {
    l1EmbeddingCache.delete(key);
    return null;
  }

  l1EmbeddingCache.delete(key);
  l1EmbeddingCache.set(key, hit);
  return valid;
}

function setL1Cache(key: string, embedding: number[]) {
  if (l1EmbeddingCache.has(key)) {
    l1EmbeddingCache.delete(key);
  }

  l1EmbeddingCache.set(key, {
    embedding,
    expiresAt: Date.now() + L1_TTL_MS,
  });

  if (l1EmbeddingCache.size > L1_MAX_SIZE) {
    const oldestKey = l1EmbeddingCache.keys().next().value;
    if (oldestKey) {
      l1EmbeddingCache.delete(oldestKey);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!openrouterApiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { model, input, dimensions } = await req.json();
    const selectedModel = typeof model === 'string' && model.trim().length > 0 ? model : DEFAULT_EMBEDDING_MODEL;
    const requestedDimensions = Number.isFinite(dimensions) && dimensions > 0
      ? Number(dimensions)
      : DEFAULT_EMBEDDING_DIMENSIONS;

    const isCacheable = typeof input === 'string' && input.trim().length > 0;
    const normalizedInput = isCacheable ? normalizeEmbeddingInput(input) : null;
    const l1Key = normalizedInput ? `${selectedModel}:${requestedDimensions}:${normalizedInput}` : null;

    if (l1Key) {
      const l1Hit = getL1Cache(l1Key, requestedDimensions);
      if (l1Hit) {
        return new Response(JSON.stringify({
          data: [{ embedding: l1Hit }],
          model: selectedModel,
          cached: true,
          cache_layer: 'l1_memory',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (inFlightEmbeddings.has(l1Key)) {
        const inflightData = await inFlightEmbeddings.get(l1Key);
        return new Response(JSON.stringify({ ...inflightData?.data, deduped: true }), {
          status: inflightData?.status ?? 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (normalizedInput && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: cached } = await supabase
        .from('search_embeddings_cache')
        .select('embedding')
        .eq('query_text', normalizedInput)
        .maybeSingle();

      const cachedEmbedding = toValidEmbeddingVector(cached && cached.embedding, requestedDimensions);

      if (cachedEmbedding) {
        if (l1Key) setL1Cache(l1Key, cachedEmbedding);
        supabase.rpc('increment_search_cache_usage', { p_query: normalizedInput }).then();

        return new Response(JSON.stringify({
          data: [{ embedding: cachedEmbedding }],
          model: selectedModel,
          cached: true,
          cache_layer: 'postgres',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const upstreamPromise = fetch(OPENROUTER_EMBED_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': Deno.env.get('APP_URL') ?? 'https://green-moon.fr',
        'X-Title': 'NeuroCart Vector Search',
      },
      body: JSON.stringify({ model: selectedModel, input, dimensions: requestedDimensions }),
    }).then(async (res) => ({
      ok: res.ok,
      status: res.status,
      data: await res.json(),
    }));

    if (l1Key) {
      inFlightEmbeddings.set(l1Key, upstreamPromise);
    }

    let upstreamResult: UpstreamEmbeddingResult;
    try {
      upstreamResult = await upstreamPromise;
    } finally {
      if (l1Key && inFlightEmbeddings.get(l1Key) === upstreamPromise) {
        inFlightEmbeddings.delete(l1Key);
      }
    }

    const data = upstreamResult.data;
    if (!upstreamResult.ok) {
      return new Response(JSON.stringify(data), {
        status: upstreamResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstreamEmbedding = toValidEmbeddingVector(data && data.data && data.data[0] && data.data[0].embedding, requestedDimensions);

    if (upstreamEmbedding && l1Key) {
      setL1Cache(l1Key, upstreamEmbedding);
    }

    if (normalizedInput && upstreamEmbedding && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('search_embeddings_cache')
        .upsert(
          {
            query_text: normalizedInput,
            embedding: upstreamEmbedding,
          },
          { onConflict: 'query_text' },
        );
    }

    return new Response(JSON.stringify(data), {
      status: upstreamResult.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Erreur dans la fonction ai-embeddings:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
