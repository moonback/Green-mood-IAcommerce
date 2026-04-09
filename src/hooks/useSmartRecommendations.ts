import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { matchProductsRpc } from '../lib/matchProductsRpc';
import { enhanceProduct } from './useQueries';
import type { Product as BaseProduct } from '../lib/types';
import type { Product } from '../types/premiumProduct';

/**
 * Hook to fetch products that are semantically similar to the current one.
 * Uses the pgvector <=> operator (cosine distance) via match_products RPC.
 */
export function useSmartRecommendations(productId: string | undefined, limit: number = 4) {
  return useQuery({
    queryKey: ['smart-recommendations', productId],
    queryFn: async () => {
      if (!productId) return [];

      // 1. Fetch current product's embedding
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('embedding, category_id, price')
        .eq('id', productId)
        .single();

      if (fetchError || !currentProduct?.embedding) {
        // Fallback: simple category-based recommendations if no embedding
        const { data: fallbackData } = await supabase
          .from('products')
          .select('*, ratings:product_ratings(avg_rating, review_count)')
          .eq('category_id', currentProduct?.category_id || '')
          .neq('id', productId)
          .eq('is_active', true)
          .limit(limit);
        
        return (fallbackData || []).map(p => enhanceProduct({
          ...p,
          avg_rating: (p as any).ratings?.[0]?.avg_rating ?? null,
          review_count: (p as any).ratings?.[0]?.review_count ?? 0,
        } as BaseProduct));
      }

      // 2. Use match_products RPC to find similar items
      // We use a lower threshold (0.2) to ensure we get results even if similarity is not perfect
      const { data: similarData, error: rpcError } = await matchProductsRpc<BaseProduct>({
        embedding: currentProduct.embedding as unknown as number[],
        matchThreshold: 0.2,
        matchCount: limit + 1, // +1 because it might include itself
      });

      if (rpcError || !similarData) {
        console.warn('[SmartRecs] RPC failed, falling back to basic recommendations');
        return [];
      }

      // Filter out self and enhance
      return similarData
        .filter(p => p.id !== productId)
        .slice(0, limit)
        .map(p => enhanceProduct(p));
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
