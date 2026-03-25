import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  normalizeEmbeddingInput,
  toValidEmbeddingVector,
} from '../../../supabase/functions/_shared/embedding-cache-utils';

describe('embedding-cache-utils', () => {
  it('normalizeEmbeddingInput should normalize accents/case/spaces', () => {
    const input = '  HéLLo    CBD\n  OïL  ';
    expect(normalizeEmbeddingInput(input)).toBe('hello cbd oil');
  });

  it('toValidEmbeddingVector should accept valid numeric vector', () => {
    const vec = new Array(DEFAULT_EMBEDDING_DIMENSIONS).fill(0.1);
    expect(toValidEmbeddingVector(vec)).toEqual(vec);
  });

  it('toValidEmbeddingVector should reject invalid dimensions or non-finite values', () => {
    expect(toValidEmbeddingVector([1, 2, 3], 4)).toBeNull();
    expect(toValidEmbeddingVector([1, Number.NaN], 2)).toBeNull();
  });
});
