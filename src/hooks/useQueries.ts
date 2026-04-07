import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Category, Product as BaseProduct } from '../lib/types';
import type { Product, Review } from '../types/premiumProduct';
import { formatProductText } from '../lib/textFormatter';

// ── Types ──────────────────────────────────────────────────────────────────

export interface NavCategory extends Category {
  children: NavCategory[];
}

// ── Helper Functions ────────────────────────────────────────────────────────

function deriveProductMetrics(base: BaseProduct): Record<'Détente' | 'Saveur' | 'Arôme' | 'Puissance', number> {
  const attrs = base.attributes ?? {};
  if (attrs.productMetrics) return attrs.productMetrics;

  const cbd = base.cbd_percentage || 0;
  const thc = base.thc_max || 0.3;
  const detente = Math.min(10, Math.max(5, Math.round(cbd / 2)));
  const puissance = Math.min(10, Math.max(4, Math.round(cbd / 3 + (thc > 0.2 ? 2 : 0))));

  return { Détente: detente, Saveur: 8, Arôme: 8, Puissance: puissance };
}

function getSpecIcon(spec: string): string {
  if (!spec) return '📄';
  const s = spec.toLowerCase();
  if (/\b(indoor|greenhouse|outdoor)\b/.test(s)) return '🌱';
  if (/\b(cbd|cbg|cbn|cbc|thcv)\b/.test(s)) return '🧪';
  if (/\b(terpène|arôme|goût|saveur)\b/.test(s)) return '👃';
  if (/\b(détente|relax|sommeil|calme)\b/.test(s)) return '🧘';
  if (/\b(lab|testé|analysé|pur)\b/.test(s)) return '🔬';
  if (/\b(bio|organique|naturel)\b/.test(s)) return '🍃';
  if (/\b(poids|gramme|g)\b/.test(s)) return '⚖️';
  if (/\b(provenance|origine|pays)\b/.test(s)) return '🌍';
  if (/\b(certifié|conformité|norme)\b/.test(s)) return '✅';
  if (/\b(garantie|sécurité)\b/.test(s)) return '🛡️';
  return '📄';
}

function getSpecCategory(spec: string): string {
  if (!spec) return 'Informations';
  const s = spec.toLowerCase();
  if (/culture|méthode|indoor|outdoor|greenhouse/.test(s)) return 'Culture';
  if (/taux|cbd|thc|cbg|cbn|analyse/.test(s)) return 'Composition';
  if (/profil|terpène|arôme|goût|parfum|saveur/.test(s)) return 'Profil Aromatique';
  if (/effet|détente|sommeil|bien.?être/.test(s)) return 'Effets Dominants';
  if (/lab|test|certif|norme|origine/.test(s)) return 'Qualité & Analyse';
  return 'Informations';
}

export function enhanceProduct(base: BaseProduct): Product {
  const attrs = base.attributes ?? {};
  const techFeatures: string[] = Array.isArray(attrs.techFeatures) ? attrs.techFeatures : [];
  const productSpecsData = Array.isArray(attrs.productSpecs) ? attrs.productSpecs : [];
  const brand = String(attrs.brand ?? 'Green Mood Exclusive');

  let specs_enhanced = productSpecsData
    .filter(s => s && (s.name || s.label))
    .map(s => {
      const name = s.name || s.label || 'Spécification';
      return {
        ...s,
        name,
        intensity: s.intensity ?? 100,
        icon: s.icon ?? getSpecIcon(name),
        category: s.category ?? getSpecCategory(name),
        description: s.description ?? ''
      };
    });

  if (specs_enhanced.length === 0) {
    const cbd = base.attributes?.cbd_percentage || (base as any).cbd_percentage;
    if (cbd) {
      specs_enhanced.push({
        name: 'CBD', icon: '🧪', category: 'Composition',
        description: `Taux de CBD élevé de ${cbd}% pour une efficacité optimale.`,
        intensity: Math.min(100, (cbd / 20) * 100)
      });
    }
  }

  return {
    ...base,
    headline: attrs.headline || `${base.name} · CBD Edition Limitée`,
    shortDescription: formatProductText(base.description?.trim()
      ? base.description
      : `${brand} · Découvrez les arômes profonds de la variété ${base.name}.`),
    techFeatures: techFeatures.length > 0 ? techFeatures : ['Premium', 'Lab Tested', 'Organique'],
    productMetrics: deriveProductMetrics(base),
    productSpecs: specs_enhanced,
  } as Product;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
        .eq('slug', slug)
        .eq('is_active', true)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .single();

      if (error || !data) throw error || new Error('Product not found');

      const rawProduct = {
        ...(data as any),
        avg_rating: (data as any).ratings?.[0]?.avg_rating ?? null,
        review_count: (data as any).ratings?.[0]?.review_count ?? 0,
      };
      return enhanceProduct(rawProduct as BaseProduct);
    },
    enabled: !!slug,
  });
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profile:profiles(full_name)')
        .eq('product_id', productId)
        .eq('is_published', true)
        .limit(8);

      if (error) throw error;

      return (data as any[]).map((r) => {
        const fullName = Array.isArray(r.profile) ? r.profile[0]?.full_name : r.profile?.full_name;
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          author: fullName ?? 'Client vérifié'
        } as Review;
      });
    },
    enabled: !!productId,
  });
}

export function useRelatedProducts(productId: string | undefined) {
  return useQuery({
    queryKey: ['related-products', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*, ratings:product_ratings(avg_rating, review_count)')
        .neq('id', productId)
        .eq('is_active', true)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .limit(3);

      if (error) throw error;

      return (data as any[]).map(p => {
        const raw = {
          ...p,
          avg_rating: p.ratings?.[0]?.avg_rating ?? null,
          review_count: p.ratings?.[0]?.review_count ?? 0,
        };
        return enhanceProduct(raw as BaseProduct);
      });
    },
    enabled: !!productId,
  });
}

export function useProducts(options: { 
  limit?: number; 
  featured?: boolean; 
  order?: { column: string; ascending?: boolean } 
} = {}) {
  const { limit = 8, featured = false, order = { column: 'created_at', ascending: false } } = options;
  
  return useQuery({
    queryKey: ['products-list', { limit, featured, order }],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
        .eq('is_active', true)
        .eq('is_available', true)
        .gt('stock_quantity', 0);
      
      if (featured) query = query.eq('is_featured', true);
      
      query = query.order(order.column, { ascending: order.ascending ?? false }).limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data as any[]).map(p => {
        const raw = {
          ...p,
          avg_rating: p.ratings?.[0]?.avg_rating ?? null,
          review_count: p.ratings?.[0]?.review_count ?? 0,
        };
        return enhanceProduct(raw as BaseProduct);
      });
    }
  });
}
