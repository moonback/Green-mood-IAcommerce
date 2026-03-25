import { supabase } from './supabase';
import { getCachedEmbedding, setCachedEmbedding } from './budtenderCache';

export const OPENROUTER_EMBED_MODEL = 'openai/text-embedding-3-large';

// CRITICAL: The database uses vector(3072). Do not make this configurable in
// the browser, otherwise a stale VITE_* value can silently generate 1536-dim
// vectors and break pgvector RPC calls like match_knowledge.
export const EXPECTED_EMBED_DIMENSIONS = 3072;

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

async function requestEmbedding(normalized: string, dimensions?: number): Promise<any> {
    const body: Record<string, unknown> = {
        model: OPENROUTER_EMBED_MODEL,
        input: normalized,
    };

    if (typeof dimensions === 'number' && Number.isFinite(dimensions) && dimensions > 0) {
        body.dimensions = dimensions;
    }

    const { data: payload, error } = await supabase.functions.invoke('ai-embeddings', { body });

    if (error) throw new Error(`OpenRouter embedding error: ${error.message}`);

    return payload;
}

/**
 * Generate embeddings with LRU cache.
 * Identical queries hit the cache instead of calling the API again.
 * Validates that the returned vector dimension matches the DB schema.
 *
 * API call is proxied through the `ai-embeddings` Supabase Edge Function
 * so the OpenRouter API key is never exposed in the browser bundle.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const normalized = text.trim();
    if (!normalized) return [];

    const cached = getCachedEmbedding(normalized);
    if (cached) return cached;

    const payloadWithDimensions = await requestEmbedding(normalized, EXPECTED_EMBED_DIMENSIONS);
    let embedding = extractEmbeddingVector(payloadWithDimensions);

    // Some OpenRouter providers/models ignore or reject the dimensions argument
    // and can return an empty vector payload. Retry once without dimensions.
    if (!embedding) {
        const payloadWithoutDimensions = await requestEmbedding(normalized);
        embedding = extractEmbeddingVector(payloadWithoutDimensions);
    }

    if (!embedding) {
        throw new Error('OpenRouter returned an empty embedding vector.');
    }

    // Guard against dimension mismatch that would silently break match_products
    if (embedding.length !== EXPECTED_EMBED_DIMENSIONS) {
        const err: Error & { code?: string } = new Error(
            `Embedding dimension mismatch: got ${embedding.length}, expected ${EXPECTED_EMBED_DIMENSIONS}. ` +
            `The app and Supabase RPCs require 3072-dimensional vectors with ${OPENROUTER_EMBED_MODEL}.`
        );
        err.code = 'DIMENSION_MISMATCH';
        throw err;
    }

    setCachedEmbedding(normalized, embedding);
    return embedding;
}