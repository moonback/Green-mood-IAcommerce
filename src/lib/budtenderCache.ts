import { supabase } from './supabase';
import { Product } from './types';
import { BudTenderSettings, TECH_ADVISOR_DEFAULTS } from './budtenderSettings';

// ─── Generic TTL Cache ───────────────────────────────────────────────────────

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class TTLCache<T> {
    private entry: CacheEntry<T> | null = null;
    constructor(private ttlMs: number) { }

    get(): T | null {
        if (this.entry && Date.now() < this.entry.expiresAt) return this.entry.data;
        return null;
    }

    set(data: T): void {
        this.entry = { data, expiresAt: Date.now() + this.ttlMs };
    }

    invalidate(): void {
        this.entry = null;
    }
}

// ─── Products Cache (TTL 5 min) ──────────────────────────────────────────────

const productsCache = new TTLCache<Product[]>(5 * 60 * 1000);
let productsFetchPromise: Promise<Product[]> | null = null;

export async function getCachedProducts(): Promise<Product[]> {
    const cached = productsCache.get();
    if (cached) {
        console.log('[Cache HIT] products —', cached.length, 'items');
        return cached;
    }

    // Deduplicate in-flight fetches
    if (productsFetchPromise) return productsFetchPromise;

    productsFetchPromise = (async () => {
        try {
            console.log('[Cache MISS] products — fetching from Supabase');
            const { data } = await supabase
                .from('products')
                .select('*, category:categories(slug, name), ratings:product_ratings(avg_rating, review_count)')
                .eq('is_active', true)
                .eq('is_available', true);
            
            const products = (data ?? []).map(p => ({
                ...p,
                avg_rating: (p as any).ratings?.[0]?.avg_rating ?? null,
                review_count: (p as any).ratings?.[0]?.review_count ?? 0
            })) as Product[];
            productsCache.set(products);
            return products;
        } finally {
            productsFetchPromise = null;
        }
    })();

    return productsFetchPromise;
}

export function invalidateProductsCache(): void {
    productsCache.invalidate();
}

// ─── Settings Cache (TTL 2 min) ──────────────────────────────────────────────

const settingsCache = new TTLCache<BudTenderSettings>(2 * 60 * 1000);
let settingsFetchPromise: Promise<BudTenderSettings> | null = null;

export async function getCachedSettings(): Promise<BudTenderSettings> {
    const cached = settingsCache.get();
    if (cached) {
        console.log('[Cache HIT] settings');
        return cached;
    }

    if (settingsFetchPromise) return settingsFetchPromise;

    settingsFetchPromise = (async () => {
        try {
            console.log('[Cache MISS] settings — fetching from Supabase');
            const { fetchBudTenderSettings } = await import('./budtenderSettings');
            const settings = await fetchBudTenderSettings();
            settingsCache.set(settings);
            return settings;
        } finally {
            settingsFetchPromise = null;
        }
    })();

    return settingsFetchPromise;
}

export function invalidateSettingsCache(): void {
    settingsCache.invalidate();
}

// ─── Embedding LRU Cache (max 50 entries, TTL 10 min) ────────────────────────

interface EmbeddingCacheEntry {
    embedding: number[];
    expiresAt: number;
}

const EMBEDDING_CACHE_MAX = 50;
const EMBEDDING_TTL_MS = 10 * 60 * 1000;
const embeddingCache = new Map<string, EmbeddingCacheEntry>();

function normalizeKey(text: string): string {
    return (text || '').trim().toLowerCase();
}


export function getCachedEmbedding(text: string): number[] | null {
    const key = normalizeKey(text);
    const entry = embeddingCache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
        console.log('[Embedding Cache HIT]', key.slice(0, 40));
        return entry.embedding;
    }
    if (entry) embeddingCache.delete(key); // expired
    return null;
}

export function setCachedEmbedding(text: string, embedding: number[]): void {
    const key = normalizeKey(text);

    // LRU eviction — remove oldest entry if at capacity
    if (embeddingCache.size >= EMBEDDING_CACHE_MAX) {
        const firstKey = embeddingCache.keys().next().value;
        if (firstKey !== undefined) embeddingCache.delete(firstKey);
    }

    embeddingCache.set(key, { embedding, expiresAt: Date.now() + EMBEDDING_TTL_MS });
    console.log('[Embedding Cache SET]', key.slice(0, 40), `(${embeddingCache.size}/${EMBEDDING_CACHE_MAX})`);
}
