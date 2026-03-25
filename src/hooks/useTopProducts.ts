import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface TopProduct {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  benefit: string;
  qty: number;
}

export function useTopProducts(limit = 3) {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    async function fetchTopProducts() {
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('product_id, product_name, unit_price, product:products(id, name, slug, image_url, price, attributes, category:categories(name, slug))')
          .not('product_id', 'is', null)
          .limit(300);

        if (error || !data) return;

        const counts: Record<string, TopProduct> = {};
        (data as unknown[]).forEach((raw) => {
          const item = raw as {
            product_id: string;
            product_name: string;
            unit_price: number;
            product?: {
              id: string;
              name: string;
              image_url: string | null;
              price: number;
              attributes?: { benefits?: string[] };
              category?: { name: string; slug: string };
            } | null;
          };

          const id = item.product_id;
          if (!id) return;

          if (!counts[id]) {
            counts[id] = {
              id,
              name: item.product?.name || item.product_name || 'Produit',
              image_url: item.product?.image_url || null,
              price: item.product?.price || item.unit_price || 0,
              benefit: item.product?.attributes?.benefits?.[0] || item.product?.category?.name || 'Exceptionnel',
              qty: 0,
            };
          }

          counts[id].qty += 1;
        });

        const sorted = Object.values(counts)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, limit);

        if (sorted.length > 0) {
          setTopProducts(sorted);
        }
      } catch (err) {
        console.error('Error fetching top products:', err);
      }
    }

    fetchTopProducts();
  }, [limit]);

  return topProducts;
}
