import { supabase } from './supabase';
import { toPgVectorLiteral } from './vector';

interface MatchProductsOptions {
  embedding: number[];
  matchThreshold: number;
  matchCount: number;
}

interface RpcErrorShape {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number | string;
}

let semanticSearchUnavailable = false;

const rpcPayloadVariants = (
  embeddingLiteral: string,
  matchThreshold: number,
  matchCount: number,
) => [
  {
    query_embedding: embeddingLiteral,
    match_threshold: matchThreshold,
    match_count: matchCount,
  },
  {
    p_query_embedding: embeddingLiteral,
    p_match_threshold: matchThreshold,
    p_match_count: matchCount,
  },
];

function shouldRetryWithAltSignature(error: { message?: string; code?: string } | null): boolean {
  if (!error?.message) return false;
  const lower = error.message.toLowerCase();
  return (
    lower.includes('could not find the function') ||
    lower.includes('function public.match_products') ||
    lower.includes('schema cache') ||
    error.code === 'PGRST202'
  );
}

function shouldDisableSemanticSearch(error: RpcErrorShape | null): boolean {
  if (!error) return false;

  const code = String(error.code || '').toUpperCase();
  if (code === '42703' || code === '42883' || code === '42P01' || code === 'DIMENSION_MISMATCH') {
    return true;
  }

  const status = Number(error.status || 0);
  if (status === 400) {
    return true;
  }

  const message = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const hint = String(error.hint || '').toLowerCase();

  return (
    message.includes('different vector dimensions') ||
    (message.includes('vector') && message.includes('dimensions')) ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('function') && message.includes('does not exist')) ||
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('match_products') && message.includes('does not exist')) ||
    details.includes('does not exist') ||
    hint.includes('does not exist')
  );
}

function normalizeError(error: RpcErrorShape | null): RpcErrorShape | null {
  if (!error) return null;

  if (shouldDisableSemanticSearch(error)) {
    semanticSearchUnavailable = true;
  }

  return error;
}

export function isMatchProductsRpcAvailable(): boolean {
  return !semanticSearchUnavailable;
}

export function resetMatchProductsRpcAvailability(): void {
  semanticSearchUnavailable = false;
}

export async function matchProductsRpc<T = unknown>({
  embedding,
  matchThreshold,
  matchCount,
}: MatchProductsOptions): Promise<{ data: T[] | null; error: { message?: string; code?: string } | null }> {
  if (semanticSearchUnavailable) {
    return {
      data: null,
      error: {
        code: 'SEMANTIC_SEARCH_UNAVAILABLE',
        message: 'match_products RPC is unavailable because the deployed Supabase function schema is incompatible.',
      },
    };
  }

  const embeddingLiteral = toPgVectorLiteral(embedding);

  const [defaultPayload, prefixedPayload] = rpcPayloadVariants(
    embeddingLiteral,
    matchThreshold,
    matchCount,
  );

  const firstAttempt = await supabase.rpc('match_products', defaultPayload);
  if (!shouldRetryWithAltSignature(firstAttempt.error)) {
    return {
      data: firstAttempt.data as T[] | null,
      error: normalizeError(firstAttempt.error),
    };
  }

  const secondAttempt = await supabase.rpc('match_products', prefixedPayload);
  return {
    data: secondAttempt.data as T[] | null,
    error: normalizeError(secondAttempt.error),
  };
}

/**
 * Text search fallback for products.
 * Uses match_products_text RPC which uses ILIKE matching on name, description, and specs.
 */
export async function matchProductsTextRpc<T = unknown>(
  queryText: string,
  matchCount: number = 30
): Promise<{ data: T[] | null; error: { message?: string; code?: string } | null }> {
  return await supabase.rpc('match_products_text', {
    query_text: queryText,
    match_count: matchCount
  });
}
