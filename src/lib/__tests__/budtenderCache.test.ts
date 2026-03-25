import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (v: any) => any) => Promise.resolve({ data: [], error: null }).then(resolve),
    })),
  },
}));
vi.mock('../budtenderSettings', () => ({
  fetchBudTenderSettings: vi.fn().mockResolvedValue({ ai_model: 'test' }),
  getBudTenderSettings: vi.fn().mockReturnValue({ ai_model: 'test' }),
  BUDTENDER_DEFAULTS: { ai_model: 'test' },
}));

import {
  getCachedEmbedding,
  setCachedEmbedding,
  invalidateProductsCache,
  invalidateSettingsCache,
} from '../budtenderCache';

describe('Embedding Cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear cache between tests by setting unique keys
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for a cache miss', () => {
    expect(getCachedEmbedding('__never_set_key_xyz__')).toBeNull();
  });

  it('returns the embedding after setting it', () => {
    const embedding = [0.1, 0.2, 0.3];
    setCachedEmbedding('test-text-a', embedding);
    expect(getCachedEmbedding('test-text-a')).toEqual(embedding);
  });

  it('is case-insensitive and trims whitespace', () => {
    const embedding = [0.5, 0.6];
    setCachedEmbedding('  Hello World  ', embedding);
    expect(getCachedEmbedding('hello world')).toEqual(embedding);
  });

  it('returns null after the TTL expires (10 min)', () => {
    const embedding = [1, 2, 3];
    setCachedEmbedding('ttl-test', embedding);
    expect(getCachedEmbedding('ttl-test')).toEqual(embedding);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1);
    expect(getCachedEmbedding('ttl-test')).toBeNull();
  });

  it('evicts oldest entry when at capacity (50)', () => {
    // Fill cache to capacity
    for (let i = 0; i < 50; i++) {
      setCachedEmbedding(`fill-key-${i}`, [i]);
    }
    // All 50 should be present
    expect(getCachedEmbedding('fill-key-0')).toEqual([0]);

    // Adding one more should evict fill-key-0 (the oldest)
    setCachedEmbedding('fill-key-new', [99]);
    expect(getCachedEmbedding('fill-key-0')).toBeNull();
    expect(getCachedEmbedding('fill-key-new')).toEqual([99]);
  });
});

describe('invalidateProductsCache', () => {
  it('can be called without throwing', () => {
    expect(() => invalidateProductsCache()).not.toThrow();
  });
});

describe('invalidateSettingsCache', () => {
  it('can be called without throwing', () => {
    expect(() => invalidateSettingsCache()).not.toThrow();
  });
});
