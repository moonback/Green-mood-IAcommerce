import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { Ad } from '../components/AdCard';

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  profile?: { full_name: string } | null;
}

export function useStoreDisplayData<TConfig extends { product_ids: string[] }>(
  defaultConfig: TConfig,
  settingsKey = 'store_display',
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [config, setConfig] = useState<TConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsMap, setReviewsMap] = useState<Record<string, ReviewItem[]>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDisplayData = useCallback(async () => {
    try {
      const { data: rows } = await supabase.from('store_settings').select('value').eq('key', settingsKey).limit(1);
      const cfg: TConfig = rows?.[0]?.value
        ? { ...defaultConfig, ...(rows[0].value as Partial<TConfig>) }
        : defaultConfig;
      setConfig(cfg);

      if (cfg.product_ids.length === 0) {
        setProducts([]);
        setReviewsMap({});
        setIsLoading(false);
        return;
      }

      const { data: prods } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .in('id', cfg.product_ids)
        .eq('is_active', true);

      let ordered: Product[] = [];
      if (prods && prods.length > 0) {
        ordered = cfg.product_ids
          .map((id) => (prods as Product[]).find((p) => p.id === id))
          .filter((p): p is Product => !!p);
        setProducts(ordered);
      } else {
        setProducts([]);
      }

      if (ordered.length > 0) {
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('id, product_id, rating, comment, profile:profiles(full_name)')
          .in('product_id', ordered.map((p) => p.id))
          .eq('is_published', true)
          .gte('rating', 4)
          .order('rating', { ascending: false })
          .limit(40);

        const map: Record<string, ReviewItem[]> = {};
        (reviewsData ?? []).forEach((r) => {
          const pid = r.product_id as string;
          if (!map[pid]) map[pid] = [];
          const profileRaw = Array.isArray(r.profile) ? r.profile[0] : r.profile;
          map[pid].push({
            id: r.id as string,
            rating: r.rating as number,
            comment: r.comment as string | null,
            profile: profileRaw ? { full_name: profileRaw.full_name as string } : null,
          });
        });
        setReviewsMap(map);
      } else {
        setReviewsMap({});
      }

      const { data: adsData } = await supabase
        .from('catalog_ads')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });

      setAds((adsData as Ad[]) ?? []);
    } catch {
      // Keep current state on transient failures.
    } finally {
      setIsLoading(false);
    }
  }, [defaultConfig, settingsKey]);

  useEffect(() => {
    loadDisplayData();

    const channel = supabase
      .channel(`store-display-config-${settingsKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings', filter: `key=eq.${settingsKey}` }, () => {
        loadDisplayData();
      })
      .subscribe();

    pollRef.current = setInterval(loadDisplayData, 60_000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadDisplayData, settingsKey]);

  return { products, ads, config, isLoading, reviewsMap, reload: loadDisplayData };
}
