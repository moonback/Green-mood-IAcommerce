import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEmbedding, EXPECTED_EMBED_DIMENSIONS } from '../embeddings';
import { supabase } from '../supabase';
import * as cache from '../budtenderCache';

// Mock Supabase to avoid real network calls
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-key',
}));

// Mock the cache to test logic and hits/misses
vi.mock('../budtenderCache', () => ({
  getCachedEmbedding: vi.fn(),
  setCachedEmbedding: vi.fn(),
}));

describe('generateEmbedding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: { access_token: 'fake-token' } as any }, 
        error: null 
    });
  });

  it('returns an empty array for empty input', async () => {
    const result = await generateEmbedding('   ');
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns cached embedding if available', async () => {
    const mockEmbed = new Array(EXPECTED_EMBED_DIMENSIONS).fill(0.1);
    vi.mocked(cache.getCachedEmbedding).mockReturnValue(mockEmbed);

    const result = await generateEmbedding('hello world');
    expect(result).toBe(mockEmbed);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls the Edge Function on cache miss and returns valid embedding', async () => {
    const mockEmbed = new Array(EXPECTED_EMBED_DIMENSIONS).fill(0.2);
    vi.mocked(cache.getCachedEmbedding).mockReturnValue(null);
    
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: mockEmbed }] }),
    } as Response);

    const result = await generateEmbedding('new text');
    
    expect(result).toEqual(mockEmbed);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(cache.setCachedEmbedding).toHaveBeenCalledWith('new text', mockEmbed);
    
    // Verify the payload sent to fetch
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('ai-embeddings');
    expect(JSON.parse(options?.body as string)).toMatchObject({
      input: 'new text',
      dimensions: EXPECTED_EMBED_DIMENSIONS,
    });
    
    // Verify headers
    expect(options?.headers).toMatchObject({
        'Authorization': 'Bearer fake-token'
    });
  });

  it('retries without dimensions if the first call returns no embedding', async () => {
    const mockEmbed = new Array(EXPECTED_EMBED_DIMENSIONS).fill(0.3);
    vi.mocked(cache.getCachedEmbedding).mockReturnValue(null);
    
    // First call returns empty/invalid
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    } as Response);

    // Second call (retry) returns valid
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ embedding: mockEmbed }), // Test different payload format
    } as Response);

    const result = await generateEmbedding('retry me');
    
    expect(result).toEqual(mockEmbed);
    expect(fetch).toHaveBeenCalledTimes(2);
    
    // Check that the second call DOES NOT HAVE dimensions in the body
    const secondCallBody = JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string);
    expect(secondCallBody.dimensions).toBeUndefined();
  });

  it('throws error if the API returns an error status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('External provider error'),
    } as Response);

    await expect(generateEmbedding('error text')).rejects.toThrow('Edge Function error (500): External provider error');
  });

  it('throws error if the returned embedding has wrong dimensions', async () => {
    const wrongEmbed = [0.1, 0.2]; // Tiny vector
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: wrongEmbed }),
    } as Response);

    await expect(generateEmbedding('small vector')).rejects.toThrow(/dimension mismatch/);
  });

  it('throws error if both initial call and retry fail to return an embedding', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ garbage: 'data' }),
    } as Response);

    await expect(generateEmbedding('hopeless')).rejects.toThrow('OpenRouter returned an empty embedding vector.');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses anon key if no session is available', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
        data: { session: null }, 
        error: null 
    });
    
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ embedding: new Array(EXPECTED_EMBED_DIMENSIONS).fill(0.1) }),
    } as Response);

    await generateEmbedding('no session');
    
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(options?.headers).toMatchObject({
        'Authorization': 'Bearer test-key' // Matches mock mockSupabase.SUPABASE_ANON_KEY
    });
  });
});
