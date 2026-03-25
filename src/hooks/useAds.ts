import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Ad } from '../components/AdCard';

export function useAds(selectedCategory?: string | null) {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    async function fetchAds() {
      const { data, error } = await supabase
        .from('catalog_ads')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (!error && data) {
        let filtered: Ad[] = data as Ad[];
        if (selectedCategory) {
          filtered = filtered.filter(
            (ad) =>
              !ad.target_categories?.length ||
              ad.target_categories.includes(selectedCategory)
          );
        }
        setAds(filtered);
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
