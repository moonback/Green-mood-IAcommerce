import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Ad } from '../components/AdCard';

const ADS_CACHE_TTL_MS = 5 * 60 * 1000;
let adsCache: { data: Ad[]; fetchedAt: number } | null = null;
let adsInFlight: Promise<Ad[]> | null = null;

async function fetchActiveAds(): Promise<Ad[]> {
  const now = Date.now();
  if (adsCache && now - adsCache.fetchedAt < ADS_CACHE_TTL_MS) return adsCache.data;
  if (adsInFlight) return adsInFlight;

  adsInFlight = (async () => {
    const { data, error } = await supabase
      .from('catalog_ads')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) throw error;
    const resolved = (data ?? []) as Ad[];
    adsCache = { data: resolved, fetchedAt: Date.now() };
    return resolved;
  })().finally(() => {
    adsInFlight = null;
  });

  return adsInFlight;
}

export function useAds(selectedCategory?: string | null) {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    async function fetchAds() {
      try {
        const allAds = await fetchActiveAds();
        let filtered: Ad[] = allAds;
        if (selectedCategory) {
          filtered = filtered.filter(
            (ad) =>
              !ad.target_categories?.length ||
              ad.target_categories.includes(selectedCategory)
          );
        }
        setAds(filtered);
      } catch (error) {
        console.error('[useAds] Error fetching ads:', error);
      }
    }
    fetchAds();
  }, [selectedCategory]);

  return ads;
}

/**
 * Inserts ads into a product list at given positions.
 * Each ad has a `position` field = the interval N (insert every N products)
 * or a fixed index if unique.
 */
export function injectAdsIntoGrid<T>(
  products: T[],
  ads: Ad[]
): (T | { __isAd: true; ad: Ad })[] {
  if (!ads.length) return products as (T | { __isAd: true; ad: Ad })[];

  const result: (T | { __isAd: true; ad: Ad })[] = [...products];

  // Sort ads by position ascending
  const sorted = [...ads].sort((a, b) => (a.position ?? 4) - (b.position ?? 4));

  let offset = 0;
  sorted.forEach((ad) => {
    const pos = Math.max(1, ad.position ?? 4);
    const insertAt = pos + offset;
    if (insertAt <= result.length) {
      result.splice(insertAt, 0, { __isAd: true, ad });
      offset++;
    } else {
      result.push({ __isAd: true, ad });
      offset++;
    }
  });

  return result;
}
