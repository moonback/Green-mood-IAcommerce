import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, SlidersHorizontal, X, Sparkles, Info, ShieldCheck,
  ArrowUpDown, ChevronLeft, ChevronRight, Microscope, Link2, Scale,
  LayoutGrid, LayoutList, ChevronDown, ChevronUp, Star,
  Sprout, Wind, Gauge, FlaskConical, Beaker, Zap, Euro, CheckCircle2,
  Filter, MoreHorizontal, Activity, Droplets
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateEmbedding } from '../lib/embeddings';
import { matchProductsRpc } from '../lib/matchProductsRpc';
import { Category, CategoryNode, Product } from '../lib/types';
import { buildCategoryTree, getCategorySubtreeIds } from '../lib/categoryTree';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { stripHtml } from '../lib/utils';
import ProductCard from '../components/ProductCardV2';
import AdCard from '../components/AdCard';
import { useAds, injectAdsIntoGrid } from '../hooks/useAds';
import DualRangeSlider from '../components/DualRangeSlider';
import ProductCompareModal from '../components/ProductCompareModal';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useSettingsStore } from '../store/settingsStore';
import { ProductGridSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import ThemeToggle from '../components/ThemeToggle';
import { Badge } from '../components/ui/Badge';

/* ─── Collapsible sidebar section ─── */
function FilterSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  activeCount = 0,
  onClear
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  activeCount?: number;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`py-4 ${open ? 'mb-2' : ''} border-b border-[color:var(--color-border)]/50 last:border-0`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-1 text-left group gap-2"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {Icon && (
            <div className={`p-1.5 rounded-lg transition-colors ${open ? 'bg-green-neon/10 text-green-neon' : 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-text)]'}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text)] group-hover:text-green-neon transition-colors truncate">
            {title}
          </span>
          {activeCount > 0 && !open && (
            <Badge variant="success" className="h-4 min-w-4 px-1 rounded-full text-[8px] font-black">
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeCount > 0 && open && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear?.(); }}
              className="text-[9px] font-bold text-red-500 hover:underline px-1"
            >
              Reset
            </button>
          )}
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-text)]" />
            : <ChevronDown className="w-3.5 h-3.5 text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-text)]" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-1.5 px-0.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Star rating row ─── */
function StarRatingRow({ rating, active, onClick }: { rating: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all ${active ? 'bg-green-neon/10 text-green-neon glow-green' : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-elevated)]/80 hover:text-[color:var(--color-text)]'
        }`}
    >
      <span className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i < rating ? (active ? 'fill-green-neon text-green-neon' : 'fill-amber-400 text-amber-400') : 'text-[color:var(--color-text-subtle)]'}`}
          />
        ))}
      </span>
      <span>& plus</span>
    </button>
  );
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const { settings } = useSettingsStore();

  // ── Premium font injection ──
  useEffect(() => {
    if (document.querySelector('link[data-account-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('data-account-fonts', '1');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;700&display=swap';
    document.head.appendChild(link);
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('category'));
  const [selectedBenefit, setSelectedBenefit] = useState<string | null>(null);
  const [selectedAroma, setSelectedAroma] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || searchParams.get('q') || '');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [subscribableOnly, setSubscribableOnly] = useState(false);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [displayDensity, setDisplayDensity] = useState<'cozy' | 'compact'>('cozy');
  const [selectedMinRating, setSelectedMinRating] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [currentPage, setCurrentPage] = useState(1);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });
  const [allProductMetadata, setAllProductMetadata] = useState<any[]>([]);
  const [availableSpecs, setAvailableSpecs] = useState<Record<string, Set<string>>>({});
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  const [impacts, setImpacts] = useState<string[]>([]);
  const [aromas, setAromas] = useState<string[]>([]);

  // ─── Category tree for accordion filter ───
  const [expandedCatNodes, setExpandedCatNodes] = useState<Set<string>>(new Set());
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  // ─── Ads ───
  const ads = useAds(selectedCategory);

  const PRODUCTS_PER_PAGE = 8;

  useEffect(() => {
    async function loadMetadata() {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('products').select('price, attributes, category_id').eq('is_active', true),
      ]);
      if (cats && prods) {
        const activeCatIds = new Set(prods.map((p: any) => p.category_id).filter(Boolean));

        const catMap = new Map((cats as Category[]).map(c => [c.id, c]));
        const keptIds = new Set<string>();

        const keepWithAncestors = (catId: string) => {
          if (keptIds.has(catId)) return;
          keptIds.add(catId);
          const cat = catMap.get(catId);
          if (cat?.parent_id) keepWithAncestors(cat.parent_id);
        };

        // Check each category: if it or any of its descendants has products, keep it and its ancestors
        const hasProducts = (categoryId: string): boolean => {
          if (activeCatIds.has(categoryId)) return true;
          const children = (cats as Category[]).filter(c => c.parent_id === categoryId);
          return children.some(c => hasProducts(c.id));
        };

        (cats as Category[]).forEach(c => {
          if (hasProducts(c.id)) {
            keepWithAncestors(c.id);
          }
        });

        const filteredCats = (cats as Category[]).filter(c => keptIds.has(c.id));
        setCategories(filteredCats);
        setAllProductMetadata(prods);

        const prices = prods.map(p => p.price);
        const minP = prices.length > 0 ? Math.floor(Math.min(...prices)) : 0;
        const maxP = prices.length > 0 ? Math.ceil(Math.max(...prices)) : 100;
        setPriceBounds({ min: minP, max: maxP });

        if (!searchParams.get('minPrice')) setPriceMin(minP);
        if (!searchParams.get('maxPrice')) setPriceMax(maxP);
      } else if (cats) {
        setCategories(cats as Category[]);
      }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    const minParam = searchParams.get('minPrice');
    const maxParam = searchParams.get('maxPrice');
    if (minParam) setPriceMin(Number(minParam));
    if (maxParam) setPriceMax(Number(maxParam));
    setSelectedCategory(searchParams.get('category'));
    setSelectedBenefit(searchParams.get('benefit') || searchParams.get('feature'));
    setSelectedAroma(searchParams.get('aroma') || searchParams.get('attribute'));
    setSortBy((searchParams.get('sort') as typeof sortBy) || 'featured');
    setSelectedMinRating(searchParams.get('rating') ? Number(searchParams.get('rating')) : null);
    setInStockOnly(searchParams.get('stock') === '1');
    setFeaturedOnly(searchParams.get('featured') === '1');
    setSubscribableOnly(searchParams.get('subscribable') === '1');
    setDisplayDensity(searchParams.get('density') === 'compact' ? 'compact' : 'cozy');
    setSearchQuery(searchParams.get('search') || searchParams.get('q') || '');
    setCurrentPage(searchParams.get('page') ? Number(searchParams.get('page')) : 1);
  }, [searchParams]);

  // Derive filters from category-specific products
  useEffect(() => {
    if (allProductMetadata.length === 0) return;

    let filteredMetadata = allProductMetadata;
    if (selectedCategory) {
      const cat = categories.find(c => c.id === selectedCategory || c.slug === selectedCategory);
      if (cat) {
        const subtreeIds = getCategorySubtreeIds(cat.id, categories);
        filteredMetadata = allProductMetadata.filter(p => subtreeIds.includes(p.category_id));
      }
    }

    setImpacts(Array.from(new Set(filteredMetadata.flatMap((p: any) => p.attributes?.benefits || []))));
    setAromas(Array.from(new Set(filteredMetadata.flatMap((p: any) => p.attributes?.aromas || []))));

    const specsMap: Record<string, Set<string>> = {};
    filteredMetadata.forEach((p: any) => {
      const techSpecs = p.attributes?.technical_specs || [];
      techSpecs.forEach((group: any) => {
        group.items?.forEach((item: any) => {
          if (item.label && item.value) {
            if (!specsMap[item.label]) specsMap[item.label] = new Set();
            specsMap[item.label].add(item.value);
          }
        });
      });
      const flatSpecs = p.attributes?.specs || [];
      flatSpecs.forEach((s: string) => {
        if (s.includes(':')) {
          const [l, v] = s.split(':').map(x => x.trim());
          if (l && v) {
            if (!specsMap[l]) specsMap[l] = new Set();
            specsMap[l].add(v);
          }
        }
      });
    });
    setAvailableSpecs(specsMap);

    // Clear specs that don't belong to the new category
    setSelectedSpecs(prev => {
      const next: Record<string, string[]> = {};
      Object.entries(prev).forEach(([label, values]) => {
        if (specsMap[label]) {
          const validValues = values.filter(v => specsMap[label].has(v));
          if (validValues.length > 0) next[label] = validValues;
        }
      });
      return next;
    });
  }, [selectedCategory, allProductMetadata, categories]);

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);

      // ── Mode RECHERCHE : vectoriel + ilike fusionnés ──
      if (searchQuery.trim().length >= 2) {
        try {
          const text = searchQuery.trim();

          // 1. Recherche par mots-clés (rapide)
          const { data: kwData } = await supabase
            .from('products')
            .select(`*, category:categories(*), ratings:product_ratings(avg_rating, review_count)`)
            .ilike('name', `%${text}%`)
            .eq('is_active', true)
            .eq('is_available', true)
            .gt('stock_quantity', 0)
            .limit(30);

          const keywordProducts: Product[] = (kwData ?? []).map((p: any) => ({
            ...p,
            avg_rating: p.ratings?.[0]?.avg_rating ?? null,
            review_count: p.ratings?.[0]?.review_count ?? 0,
          }));

          // Affichage immédiat résultats textuels
          setProducts(keywordProducts);
          setTotalCount(keywordProducts.length);

          // 2. Recherche vectorielle (IA) en arrière-plan
          try {
            const embedding = await generateEmbedding(text);
            if (embedding?.length) {
              const { data: vectorData } = await matchProductsRpc<Product>({
                embedding,
                matchThreshold: 0.3,
                matchCount: 30,
              });

              if (vectorData?.length) {
                const mergedMap = new Map<string, Product>();
                keywordProducts.forEach((p) => mergedMap.set(p.id, p));
                (vectorData as Product[]).forEach((pv) => {
                  if (!mergedMap.has(pv.id)) mergedMap.set(pv.id, pv);
                });
                const merged = Array.from(mergedMap.values());
                setProducts(merged);
                setTotalCount(merged.length);
              }
            }
          } catch (vErr) {
            console.warn('[Catalog] Recherche vectorielle ignorée:', vErr);
          }
        } catch (err) {
          console.error('[Catalog] Erreur recherche:', err);
        }
        setIsLoading(false);
        return;
      }

      // ── Mode NORMAL : filtres + pagination BDD ──
      let query = supabase
        .from('products')
        .select(`*, category:categories(*), ratings:product_ratings(avg_rating, review_count)`, { count: 'exact' })
        .eq('is_active', true)
        .eq('is_available', true)
        .gt('stock_quantity', 0);

      if (selectedCategory) {
        const cat = categories.find(c => c.id === selectedCategory || c.slug === selectedCategory);
        if (cat) {
          // Include products from all descendant categories (subtree)
          const subtreeIds = getCategorySubtreeIds(cat.id, categories);
          if (subtreeIds.length === 1) {
            query = query.eq('category_id', subtreeIds[0]);
          } else {
            query = query.in('category_id', subtreeIds);
          }
        }
      }
      if (selectedBenefit) query = query.contains('attributes', { benefits: [selectedBenefit] });
      if (selectedAroma) query = query.contains('attributes', { aromas: [selectedAroma] });
      if (inStockOnly) query = query.gt('stock_quantity', 0).eq('is_available', true);
      if (featuredOnly) query = query.eq('is_featured', true);
      if (subscribableOnly) query = query.eq('is_subscribable', true);
      if (priceMin !== null) query = query.gte('price', priceMin);
      if (priceMax !== null) query = query.lte('price', priceMax);

      // Spec filters
      Object.entries(selectedSpecs).forEach(([label, values]) => {
        values.forEach(v => {
          // Products must contain the specific spec string in their flat attributes.specs array
          query = query.contains('attributes', { specs: [v] });
        });
      });

      switch (sortBy) {
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        default: query = query.order('is_featured', { ascending: false }).order('name');
      }

      const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
      query = query.range(from, from + PRODUCTS_PER_PAGE - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        setProducts(data.map(p => ({
          ...p,
          avg_rating: p.ratings?.[0]?.avg_rating ?? null,
          review_count: p.ratings?.[0]?.review_count ?? 0,
        })) as Product[]);
        setTotalCount(count || 0);
      }
      setIsLoading(false);
    }
    fetchProducts();
  }, [selectedCategory, searchQuery, selectedBenefit, selectedAroma, inStockOnly, featuredOnly, subscribableOnly, priceMin, priceMax, sortBy, currentPage]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);
    if (selectedCategory) nextParams.set('category', selectedCategory); else nextParams.delete('category');
    if (searchQuery) nextParams.set('search', searchQuery); else nextParams.delete('search');
    if (selectedBenefit) {
      nextParams.set('benefit', selectedBenefit);
      nextParams.delete('feature');
    } else {
      nextParams.delete('benefit');
      nextParams.delete('feature');
    }
    if (selectedAroma) {
      nextParams.set('aroma', selectedAroma);
      nextParams.delete('attribute');
    } else {
      nextParams.delete('aroma');
      nextParams.delete('attribute');
    }
    if (sortBy !== 'featured') nextParams.set('sort', sortBy); else nextParams.delete('sort');
    if (selectedMinRating) nextParams.set('rating', String(selectedMinRating)); else nextParams.delete('rating');
    if (inStockOnly) nextParams.set('stock', '1'); else nextParams.delete('stock');
    if (featuredOnly) nextParams.set('featured', '1'); else nextParams.delete('featured');
    if (subscribableOnly) nextParams.set('subscribable', '1'); else nextParams.delete('subscribable');
    if (displayDensity !== 'cozy') nextParams.set('density', displayDensity); else nextParams.delete('density');
    if (priceMin !== null) nextParams.set('minPrice', String(priceMin)); else nextParams.delete('minPrice');
    if (priceMax !== null) nextParams.set('maxPrice', String(priceMax)); else nextParams.delete('maxPrice');
    if (currentPage > 1) nextParams.set('page', String(currentPage)); else nextParams.delete('page');
    if (nextParams.toString() !== searchParams.toString()) setSearchParams(nextParams, { replace: true });
  }, [selectedCategory, searchQuery, selectedBenefit, selectedAroma, sortBy, selectedMinRating, inStockOnly, featuredOnly, subscribableOnly, displayDensity, priceMin, priceMax, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [selectedCategory, selectedBenefit, selectedAroma, searchQuery, sortBy, selectedMinRating, inStockOnly, featuredOnly, subscribableOnly, priceMin, priceMax]);

  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  const resetAllFilters = () => {
    setSearchQuery(''); setSelectedCategory(null); setSelectedBenefit(null);
    setSelectedAroma(null); setSelectedMinRating(null); setInStockOnly(false);
    setFeaturedOnly(false); setSubscribableOnly(false);
    setPriceMin(priceBounds.min); setPriceMax(priceBounds.max);
    setSelectedSpecs({});
  };

  const handleShareCatalog = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 1800);
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 1800);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) { addToast({ message: 'Maximum 3 produits à comparer', type: 'error' }); return prev; }
      return [...prev, id];
    });
  };

  const compareProducts = products.filter((p) => compareIds.includes(p.id));

  /* Active filter count for badge */
  const activeFilterCount = [
    selectedCategory, selectedBenefit, selectedAroma, selectedMinRating,
    inStockOnly || null, featuredOnly || null, subscribableOnly || null,
    (priceMin !== null && priceMin > priceBounds.min) ? true : null,
    (priceMax !== null && priceMax < priceBounds.max) ? true : null,
    Object.values(selectedSpecs).some(arr => arr.length > 0) ? true : null,
  ].filter(Boolean).length;

  /* ─── Sidebar content (shared between desktop & mobile drawer) ─── */
  const SidebarContent = () => {
    const getIconForSpec = (label: string) => {
      const lower = label.toLowerCase();
      if (lower.includes('concentration') || lower.includes('cbd') || lower.includes('thc')) return Activity;
      if (lower.includes('terpène')) return Droplets;
      if (lower.includes('certif') || lower.includes('test')) return ShieldCheck;
      if (lower.includes('culture') || lower.includes('pouss')) return Sprout;
      if (lower.includes('aroma') || lower.includes('saveur') || lower.includes('goût')) return Wind;
      if (lower.includes('effet') || lower.includes('bienfait')) return Sparkles;
      if (lower.includes('lab') || lower.includes('analyse')) return FlaskConical;
      return Filter;
    };

    const cleanTerpeneLabel = (val: string) => {
      let s = stripHtml(val).replace(/['"]+/g, '').replace(/ - .*$/, '').trim();
      // Keep only first 2 terpenes for a cleaner look
      const parts = s.split(/[,;]/);
      if (parts.length > 2) {
        return parts.slice(0, 2).join(' • ') + '...';
      }
      return parts.join(' • ');
    };

    return (
      <div className="space-y-1 divide-y divide-[color:var(--color-border)]/20">

        {/* Departments — hierarchical accordion */}
        <FilterSection
          title="Catégories"
          icon={LayoutGrid}
          activeCount={selectedCategory ? 1 : 0}
          onClear={() => setSelectedCategory(null)}
        >
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${!selectedCategory ? 'bg-green-neon/10 text-green-neon font-black glow-green' : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-elevated)]/80 hover:text-[color:var(--color-text)]'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!selectedCategory ? 'bg-green-neon shadow-[0_0_8px_var(--theme-neon)]' : 'bg-[color:var(--color-border)]'}`} />
            Tous les produits
          </button>
          <div className="space-y-1 mt-1">
            {categoryTree.map(function renderCatNode(node: CategoryNode): React.ReactNode {
              const isSelected = selectedCategory === node.id || selectedCategory === node.slug;
              const hasChildren = node.children.length > 0;
              const isExpanded = expandedCatNodes.has(node.id);
              const indent = (node.depth ?? 0) * 12;
              return (
                <div key={node.id}>
                  <div className="flex items-center gap-1 group/item" style={{ paddingLeft: `${indent}px` }}>
                    {hasChildren && (
                      <button
                        onClick={() => setExpandedCatNodes(prev => { const n = new Set(prev); n.has(node.id) ? n.delete(node.id) : n.add(node.id); return n; })}
                        className="p-1 text-[color:var(--color-text-subtle)] hover:text-green-neon transition-colors"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`} />
                      </button>
                    )}
                    {!hasChildren && <span className="w-5 flex-shrink-0" />}
                    <button
                      onClick={() => setSelectedCategory(isSelected ? null : node.id)}
                      className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all group-hover/item:translate-x-0.5 ${isSelected ? 'bg-green-neon/10 text-green-neon font-black glow-green' : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-elevated)]/80 hover:text-[color:var(--color-text)]'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-green-neon shadow-[0_0_8px_var(--theme-neon)]' : 'bg-[color:var(--color-border)]'}`} />
                      {node.name}
                    </button>
                  </div>
                  {hasChildren && isExpanded && (
                    <div className="mt-1 border-l border-[color:var(--color-border)]/30 ml-2.5 pl-0.5">
                      {node.children.map(renderCatNode)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FilterSection>

        {/* Customer ratings */}
        <FilterSection
          title="Note clients"
          icon={Star}
          activeCount={selectedMinRating ? 1 : 0}
          onClear={() => setSelectedMinRating(null)}
          defaultOpen={false}
        >
          {[4, 3, 2].map((r) => (
            <StarRatingRow
              key={r}
              rating={r}
              active={selectedMinRating === r}
              onClick={() => setSelectedMinRating((v) => v === r ? null : r)}
            />
          ))}
        </FilterSection>

        {/* Price */}
        <FilterSection
          title="Budget"
          icon={Euro}
          activeCount={(priceMin > priceBounds.min || priceMax < priceBounds.max) ? 1 : 0}
          onClear={() => { setPriceMin(priceBounds.min); setPriceMax(priceBounds.max); }}
        >
          <div className="grid grid-cols-2 gap-2.5 mb-5 px-1">
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[color:var(--color-text-subtle)] group-focus-within:text-green-neon transition-colors">€</span>
              <input
                type="number"
                value={priceMin ?? ''}
                min={priceBounds.min}
                max={priceMax ?? priceBounds.max}
                onChange={(e) => setPriceMin(Number(e.target.value))}
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-muted)] pl-7 pr-3 py-2.5 text-[11px] font-bold text-[color:var(--color-text)] focus:outline-none focus:ring-1 focus:ring-green-neon/30 focus:border-green-neon/50 transition-all shadow-inner"
                placeholder="Min"
              />
            </div>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[color:var(--color-text-subtle)] group-focus-within:text-green-neon transition-colors">€</span>
              <input
                type="number"
                value={priceMax ?? ''}
                min={priceMin ?? priceBounds.min}
                max={priceBounds.max}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-muted)] pl-7 pr-3 py-2.5 text-[11px] font-bold text-[color:var(--color-text)] focus:outline-none focus:ring-1 focus:ring-green-neon/30 focus:border-green-neon/50 transition-all shadow-inner"
                placeholder="Max"
              />
            </div>
          </div>
          {priceMin !== null && priceMax !== null && priceBounds.max > priceBounds.min && (
            <div className="px-2">
              <DualRangeSlider
                min={priceBounds.min} max={priceBounds.max}
                valueMin={priceMin} valueMax={priceMax}
                onChangeMin={setPriceMin} onChangeMax={setPriceMax}
                formatLabel={(v) => `${v}€`}
              />
            </div>
          )}
        </FilterSection>

        {/* Caractéristiques techniques ou pratiques */}
        {impacts.length > 0 && (
          <FilterSection
            title="Effets & Bienfaits"
            icon={Sparkles}
            defaultOpen={false}
            activeCount={selectedBenefit ? 1 : 0}
            onClear={() => setSelectedBenefit(null)}
          >
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
              {impacts.map((benefit) => (
                <label key={benefit} className="group/benefit flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-[color:var(--color-bg-elevated)]/80 transition-all">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedBenefit === benefit}
                      onChange={() => setSelectedBenefit(selectedBenefit === benefit ? null : benefit)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border border-[color:var(--color-border)] transition-all peer-checked:bg-green-neon peer-checked:border-green-neon peer-checked:shadow-[0_0_8px_var(--theme-neon)] flex items-center justify-center group-hover/benefit:border-green-neon/50">
                      <div className="w-2 h-2 rounded-sm bg-black opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className={`text-[11px] transition-colors ${selectedBenefit === benefit ? 'text-[color:var(--color-text)] font-black' : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]'}`}>
                    {stripHtml(benefit)}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {aromas.length > 0 && (
          <FilterSection
            title="Profil Aromatique"
            icon={Wind}
            defaultOpen={false}
            activeCount={selectedAroma ? 1 : 0}
            onClear={() => setSelectedAroma(null)}
          >
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
              {aromas.map((aroma) => (
                <button
                  key={aroma}
                  onClick={() => setSelectedAroma(selectedAroma === aroma ? null : aroma)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${selectedAroma === aroma
                      ? 'bg-green-neon border-green-neon text-black shadow-[0_4px_12px_var(--theme-neon-transparent)]'
                      : 'border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:border-green-neon/50 hover:text-[color:var(--color-text)]'
                    }`}
                >
                  {stripHtml(aroma)}
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Dynamic Technical Specs Filters */}
        {Object.entries(availableSpecs).filter(([label, values]) => values.size > 1 && !label.toLowerCase().includes('certification')).map(([label, values]) => {
          const valsArray = Array.from(values).sort();
          const lowerLabel = label.toLowerCase();
          const isConcentration = lowerLabel.includes('concentration');
          const isTerpene = lowerLabel.includes('terpène');
          // For terpenes or complex concentrations, don't use multi-column as the text is long
          const isMultiColumn = valsArray.length > 6 && !isConcentration && !isTerpene;

          return (
            <FilterSection
              key={label}
              title={label}
              icon={getIconForSpec(label)}
              defaultOpen={isConcentration || isTerpene}
              activeCount={selectedSpecs[label]?.length || 0}
              onClear={() => setSelectedSpecs(prev => { const n = { ...prev }; delete n[label]; return n; })}
            >
              <div className={`scrollbar-thin pr-1 ${isConcentration || isTerpene ? 'space-y-1' : isMultiColumn ? 'flex flex-wrap gap-1.5' : 'space-y-1'}`}>
                {valsArray.map((val) => {
                  const isChecked = selectedSpecs[label]?.includes(val);

                  if (isTerpene) {
                    return (
                      <label key={val} className={`group/spec flex items-start gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all border ${isChecked ? 'bg-green-neon/10 border-green-neon/30 shadow-[0_4px_15px_var(--theme-neon-transparent)]' : 'bg-[color:var(--color-bg-muted)]/50 border-transparent hover:border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)]/80'}`}>
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSpecs(prev => {
                                const current = prev[label] || [];
                                const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                                return { ...prev, [label]: next };
                              });
                            }}
                            className="peer sr-only"
                          />
                          <div className={`w-4 h-4 rounded-full border border-[color:var(--color-border)] transition-all peer-checked:bg-green-neon peer-checked:border-green-neon flex items-center justify-center group-hover/spec:border-green-neon/50`}>
                            <CheckCircle2 className={`w-2.5 h-2.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity`} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className={`text-[11px] font-bold leading-tight ${isChecked ? 'text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]'}`}>
                            {cleanTerpeneLabel(val)}
                          </span>
                          <span className="text-[9px] text-[color:var(--color-text-subtle)] truncate opacity-60">
                            {stripHtml(val).replace(/['"]+/g, '').replace(/^.* - /, '')}
                          </span>
                        </div>
                      </label>
                    );
                  }

                  const displayVal = isConcentration ? stripHtml(val).replace(/de CBD/gi, 'CBD').replace(/de CBG/gi, 'CBG') : stripHtml(val);

                  return (
                    <label key={val} className={`group/spec flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${isChecked ? 'bg-green-neon/5' : 'hover:bg-[color:var(--color-bg-elevated)]/80'}`}>
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedSpecs(prev => {
                              const current = prev[label] || [];
                              const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                              return { ...prev, [label]: next };
                            });
                          }}
                          className="peer sr-only"
                        />
                        <div className={`w-4 h-4 rounded border border-[color:var(--color-border)] transition-all peer-checked:bg-green-neon peer-checked:border-green-neon peer-checked:shadow-[0_0_8px_var(--theme-neon)] flex items-center justify-center group-hover/spec:border-green-neon/50`}>
                          <CheckCircle2 className={`w-2.5 h-2.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity`} />
                        </div>
                      </div>
                      <span className={`text-[11px] leading-snug break-words ${isChecked ? 'text-[color:var(--color-text)] font-black' : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]'}`}>
                        {displayVal}
                      </span>
                    </label>
                  );
                })}
              </div>
            </FilterSection>
          );
        })}

        {/* Statut */}
        <FilterSection
          title="Disponibilité"
          icon={CheckCircle2}
          defaultOpen={false}
          activeCount={[inStockOnly, featuredOnly, subscribableOnly].filter(Boolean).length}
          onClear={() => { setInStockOnly(false); setFeaturedOnly(false); setSubscribableOnly(false); }}
        >
          {[
            { label: 'En stock uniquement', active: inStockOnly, toggle: () => setInStockOnly(v => !v) },
            { label: 'Produits vedettes', active: featuredOnly, toggle: () => setFeaturedOnly(v => !v) },
            { label: 'Disponible en abonnement', active: subscribableOnly, toggle: () => setSubscribableOnly(v => !v) },
          ].map((item) => (
            <label key={item.label} className="group/avail flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-[color:var(--color-bg-elevated)]/80 transition-all">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={item.toggle}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 rounded border border-[color:var(--color-border)] group-hover/avail:border-green-neon/50 transition-all peer-checked:bg-green-neon peer-checked:border-green-neon peer-checked:shadow-[0_0_8px_var(--theme-neon)] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-sm bg-black opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className={`text-[11px] transition-colors ${item.active ? 'text-[color:var(--color-text)] font-black' : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]'}`}>{item.label}</span>
            </label>
          ))}
        </FilterSection>

        {activeFilterCount > 0 && (
          <div className="pt-6">
            <button
              onClick={resetAllFilters}
              className="w-full relative group h-12 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl overflow-hidden active:scale-95 transition-all"
            >
              <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative flex items-center justify-center gap-2">
                <X className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">Réinitialiser ({activeFilterCount})</span>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  const gridItems = useMemo(() => injectAdsIntoGrid(products, ads), [products, ads]);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] overflow-x-hidden transition-colors duration-300">
      <SEO
        title={`Catalogue ${settings.store_sector} | ${settings.store_name}`}
        description={`Retrouvez des millions d'articles en stock à prix réduits : High-Tech, Culture, Mode et Maison. Comparez et trouvez le bon produit avec l'aide de notre conseiller IA.`}
      />

      {showCompareModal && compareProducts.length >= 2 && (
        <ProductCompareModal products={compareProducts} onClose={() => setShowCompareModal(false)} />
      )}



      {/* ──────────────── TOP SEARCH BAR (Amazon-style) ──────────────── */}
      {/* <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
        <div className="max-w-full mx-auto px-4 md:px-10 lg:px-14 py-4 flex items-center gap-6">

          <div className="hidden lg:block flex-shrink-0">
            <p className="text-[9px] uppercase tracking-[0.3em] text-slate-400">Catalogue</p>
            <h1 className="text-sm font-['Inter',sans-serif] font-bold text-slate-100 leading-tight whitespace-nowrap">Produits {settings.store_sector}</h1>
          </div>

          <div className="flex-1 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-300 transition-colors" />
            <input
              id="catalog-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher bornes, flippers, simulateurs…"
              className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-slate-100 placeholder-zinc-400 focus:outline-none focus:border-[#2563eb]/40 focus:bg-slate-900/80 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-white/5 text-slate-400 hover:text-[color:var(--color-text)] flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-100" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              id="mobile-filter-btn"
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 bg-slate-900/80 text-xs text-[color:var(--color-text-subtle)] hover:bg-white/5 transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtres
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-[color:var(--color-text)] text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              id="compare-mode-btn"
              onClick={() => { setCompareMode(v => { if (v) setCompareIds([]); return !v; }); }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all ${compareMode ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300' : 'border border-white/10 text-slate-400 hover:text-zinc-200'
                }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Comparer {compareIds.length > 0 ? `(${compareIds.length})` : ''}
            </button>

            <button
              id="share-catalog-btn"
              onClick={handleShareCatalog}
              className="w-9 h-9 rounded-xl border border-white/15 bg-slate-900/80 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:border-zinc-300 transition-all shadow-sm"
              title="Partager ce catalogue"
            >
              {shareStatus === 'copied'
                ? <span className="text-[9px] font-bold text-cyan-300">✓</span>
                : <Link2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div> */}

      {/* ──────────────── PAGE HERO HEADER ──────────────── */}
      <div style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)', background: 'color-mix(in srgb, var(--color-card) 40%, transparent)' }}>
        <div className="max-w-full mx-auto px-4 md:px-10 lg:px-14 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="space-y-1.5">
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                {settings.store_sector}&nbsp;·&nbsp;{!isLoading ? `${totalCount} produit${totalCount !== 1 ? 's' : ''}` : '…'}
              </p>
              <h1 className="text-[color:var(--color-text)] leading-none"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>
                Notre Catalogue
              </h1>
            </div>
            <div className="relative w-full md:w-[340px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[color:var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit…"
                className="w-full rounded-2xl pl-11 pr-10 py-3.5 outline-none transition-all"
                style={{
                  background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                  color: 'var(--color-text)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '12px',
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-primary)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = ''; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── CATEGORY PILLS (Amazon dept nav) ──────────────── */}
      <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-card)]/85 backdrop-blur-xl">
        <div className="max-w-full mx-auto px-4 md:px-10 lg:px-14">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)] flex-shrink-0 mr-1">Département :</span>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!selectedCategory
                ? 'bg-green-neon text-black shadow-[0_0_15px_var(--theme-neon)]'
                : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)]/80'
                }`}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat.id
                  ? 'bg-green-neon text-black shadow-[0_0_15px_var(--theme-neon)]'
                  : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)]/80'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ──────────────── MAIN LAYOUT ──────────────── */}
      <div className="max-w-full mx-auto px-4 md:px-10 lg:px-14 pt-8 pb-28">
        <div className="flex gap-6">

          {/* ── DESKTOP SIDEBAR ── */}
          <aside className="hidden lg:block w-[260px] xl:w-[280px] flex-shrink-0">
            <div className="sticky top-[104px]">
              <div className="rounded-[2.5rem] border border-[color:var(--color-border)]/50 bg-[color:var(--color-card)]/70 p-6 shadow-[var(--shadow-card)] backdrop-blur-2xl transition-all duration-500 hover:shadow-2xl hover:border-green-neon/20">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-green-neon/10 flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4 text-green-neon" />
                    </div>
                    <span className="text-[color:var(--color-text)]"
                      style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
                      Filtres
                    </span>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetAllFilters}
                      className="text-[10px] font-bold text-[color:var(--color-text-subtle)] hover:text-red-500 transition-colors"
                    >
                      Reset All
                    </button>
                  )}
                </div>
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar pr-1">
                  <SidebarContent />
                </div>
              </div>
            </div>
          </aside>

          {/* ── PRODUCT AREA ── */}
          <div className="flex-1 min-w-0">

            {/* ─── Results toolbar ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-[color:var(--color-border)]">
              <div className="flex items-center gap-3">
                <p className="text-sm text-[color:var(--color-text)]">
                  {isLoading ? (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>Chargement…</span>
                  ) : totalCount === 0 ? (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px' }}>0 résultat</span>
                  ) : (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: 'var(--color-text)', fontStyle: 'normal' }}>
                        {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount)}
                      </span>
                      {' '}sur{' '}
                      <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.1rem', color: 'var(--color-text)', fontStyle: 'normal' }}>
                        {totalCount > 100 ? '100+' : totalCount}
                      </span>
                      {' '}résultats
                    </span>
                  )}
                </p>
                {selectedCategory && (
                  <span className="px-2.5 py-1 rounded-lg bg-green-neon/10 border border-green-neon/25 text-green-neon glow-green text-[10px] font-black uppercase tracking-widest">
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sort */}
                <div className="relative">
                  <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[color:var(--color-text-subtle)] pointer-events-none" />
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="appearance-none bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-xl pl-8 pr-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-text-muted)] focus:outline-none cursor-pointer h-9 hover:border-green-neon/35 transition-all shadow-sm"
                  >
                    <option value="featured">Populaires</option>
                    <option value="price_asc">Prix Croissant</option>
                    <option value="price_desc">Prix Décroissant</option>
                    <option value="rating">Mieux Notés</option>
                    <option value="newest">Nouveautés</option>
                  </select>
                </div>

                {/* View density */}
                <div className="flex items-center bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-xl overflow-hidden h-9 shadow-sm">
                  <button
                    id="view-grid-btn"
                    onClick={() => setDisplayDensity('cozy')}
                    className={`w-9 h-9 flex items-center justify-center transition-all ${displayDensity === 'cozy' ? 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
                      }`}
                    title="Vue grille"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    id="view-list-btn"
                    onClick={() => setDisplayDensity('compact')}
                    className={`w-9 h-9 flex items-center justify-center transition-all ${displayDensity === 'compact' ? 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
                      }`}
                    title="Vue compacte"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Active filter chips ─── */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-neon/30 bg-green-neon/8 text-green-neon text-[11px] glow-green">
                    {categories.find(c => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedBenefit && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text)] text-[11px]">
                    Caractéristique : {selectedBenefit}
                    <button onClick={() => setSelectedBenefit(null)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedAroma && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text)] text-[11px]">
                    Univers : {selectedAroma}
                    <button onClick={() => setSelectedAroma(null)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text)] text-[11px]">
                    En stock
                    <button onClick={() => setInStockOnly(false)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedMinRating && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text)] text-[11px]">
                    {selectedMinRating}★ et plus
                    <button onClick={() => setSelectedMinRating(null)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {Object.entries(selectedSpecs).map(([label, values]) =>
                  values.map(val => (
                    <span key={`${label}-${val}`} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text)] text-[11px]">
                      {label} : {val}
                      <button onClick={() => setSelectedSpecs(prev => ({ ...prev, [label]: prev[label].filter(v => v !== val) }))} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                    </span>
                  ))
                )}
              </div>
            )}

            {/* ─── Product Grid ─── */}
            {isLoading ? (
              <ProductGridSkeleton count={8} />
            ) : products.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-5 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-[color:var(--color-card)] border border-[color:var(--color-border)] flex items-center justify-center">
                  <Search className="w-7 h-7 text-[color:var(--color-text-muted)]" />
                </div>
                <div>
                  <h2 className="text-[color:var(--color-text)]"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.75rem' }}>
                  Aucun résultat trouvé
                </h2>
                <p className="text-[color:var(--color-text-muted)] mt-1.5 max-w-sm"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', letterSpacing: '0.04em' }}>
                  Essayez d'élargir votre recherche ou de réinitialiser les filtres.
                </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={resetAllFilters}
                  className="px-8 font-black uppercase tracking-widest"
                >
                  Réinitialiser les filtres
                </Button>
              </motion.div>
            ) : (
              <>
                <div className={`grid ${displayDensity === 'compact'
                  ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5'
                  }`}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {gridItems.map((item, idx) => {
                      if ('__isAd' in item && item.__isAd) {
                        return (
                          <motion.div
                            key={`ad-${item.ad.id}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: (idx % 8) * 0.05, duration: 0.4 }}
                            layout
                          >
                            <AdCard ad={item.ad} />
                          </motion.div>
                        );
                      }
                      const product = item as typeof products[0];
                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: (idx % 8) * 0.05, duration: 0.4 }}
                          layout
                        >
                          <ProductCard
                            product={product}
                            isCompared={compareIds.includes(product.id)}
                            onToggleCompare={compareMode ? () => toggleCompare(product.id) : undefined}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Sales Boosting Section: Trust Signals */}
                {!isLoading && products.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-16 mb-16 p-8 lg:p-12 rounded-[3.5rem] bg-gradient-to-br from-[color:var(--color-primary)]/12 via-[color:var(--color-card)] to-emerald-500/10 border border-[color:var(--color-border)] relative overflow-hidden shadow-[var(--shadow-card)]"
                  >
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                      <Sparkles className="w-64 h-64 -rotate-12" />
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-bg-elevated)] flex items-center justify-center mx-auto border border-[color:var(--color-border)] text-green-neon shadow-lg glow-box-green-sm">
                          <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h3 className="text-[color:var(--color-text)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.2rem' }}>Qualité Certifiée</h3>
                        <p className="text-xs text-[color:var(--color-text-muted)] leading-relaxed uppercase tracking-widest">Tests techniques & conformité CE</p>
                      </div>

                      {settings.loyalty_program_enabled && (
                        <div className="space-y-3">
                          <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-bg-elevated)] flex items-center justify-center mx-auto border border-[color:var(--color-border)] text-[color:var(--color-primary)] shadow-lg">
                            <Sparkles className="w-7 h-7" />
                          </div>
                          <h3 className="text-[color:var(--color-text)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.2rem' }}>Fidélité Récompensée</h3>
                          <p className="text-xs text-[color:var(--color-text-muted)] leading-relaxed uppercase tracking-widest">Cumulez des {settings.loyalty_currency_name} à chaque achat</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-bg-elevated)] flex items-center justify-center mx-auto border border-[color:var(--color-border)] text-green-neon shadow-lg glow-box-green-sm">
                          <Info className="w-7 h-7" />
                        </div>
                        <h3 className="text-[color:var(--color-text)]" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.2rem' }}>Livraison Express</h3>
                        <p className="text-xs text-[color:var(--color-text-muted)] leading-relaxed uppercase tracking-widest">Chez vous en 24h/48h partout en France</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── Pagination (Amazon-style) ─── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-12">
                    <button
                      onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] text-xs disabled:opacity-30 hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)] transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Préc.
                    </button>

                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1 <= 5 ? i + 1 : i === 5 ? -1 : totalPages;
                      } else if (currentPage >= totalPages - 3) {
                        page = i === 0 ? 1 : i === 1 ? -1 : totalPages - (6 - i);
                      } else {
                        const map = [1, -1, currentPage - 1, currentPage, currentPage + 1, -2, totalPages];
                        page = map[i];
                      }
                      if (page < 0) return <span key={`ellipsis-${i}`} className="w-9 text-center text-[color:var(--color-text-muted)] text-sm">…</span>;
                      return (
                        <button
                          key={page}
                          onClick={() => { setCurrentPage(page); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${page === currentPage
                            ? 'bg-green-neon text-black shadow-[0_0_14px_var(--theme-neon)]'
                            : 'border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)]'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[color:var(--color-border)] text-[color:var(--color-text-muted)] text-xs disabled:opacity-30 hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)] transition-all"
                    >
                      Suiv. <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}


            {/* ─── Compliance footer ─── */}
            <div className="mt-16 pt-10 border-t border-[color:var(--color-border)] grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <ShieldCheck className="w-4 h-4" />, title: 'Produits conformes', text: 'Sélection certifiée et contrôlée avant mise en ligne pour un achat plus serein.' },
                { icon: <Microscope className="w-4 h-4" />, title: 'Le meilleur au plus petit prix', text: 'Culture, High-Tech, Mode et Maison : trouvez les références idéales sans vous ruiner.' },
                { icon: <Info className="w-4 h-4" />, title: 'SAV réactif', text: 'Support France, suivi de commande et accompagnement rapide après achat.' },
              ].map((item, idx) => (
                <div key={idx} className="group space-y-2.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--color-text-subtle)] flex items-center gap-2 group-hover:text-[color:var(--color-text)] transition-colors">
                    <span className="text-green-neon">{item.icon}</span>
                    {item.title}
                  </h4>
                  <p className="text-xs text-[color:var(--color-text-subtle)] leading-relaxed group-hover:text-[color:var(--color-text-muted)] transition-colors">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── MOBILE FILTER DRAWER ──────────────── */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[color:var(--color-card)] border-r border-[color:var(--color-border)] flex flex-col backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-[color:var(--color-border)]">
                <span className="font-['Inter',sans-serif] text-base font-semibold">Filtres</span>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-8 h-8 rounded-xl bg-[color:var(--color-bg-elevated)] flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                <SidebarContent />
              </div>
              <div className="p-4 border-t border-[color:var(--color-border)]">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full font-black uppercase tracking-widest"
                >
                  Voir les résultats ({totalCount})
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ──────────────── FLOATING COMPARE BAR ──────────────── */}
      <AnimatePresence>
        {compareIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
          >
            <div className="bg-[color:var(--color-card)]/95 backdrop-blur-2xl border border-[color:var(--color-border)] rounded-[1.5rem] p-3.5 shadow-[var(--shadow-card)] flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {compareIds.map((id) => {
                  const p = products.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-green-neon/40 bg-[color:var(--color-bg-elevated)]">
                        <img
                          src={getProductImageSrc(p.image_url)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={applyProductImageFallback}
                        />
                      </div>
                      <button
                        onClick={() => toggleCompare(id)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-text-muted)] hover:bg-red-500 hover:text-[color:var(--color-text)] hover:border-red-500 transition-all"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
                {Array.from({ length: 3 - compareIds.length }).map((_, i) => (
                  <div key={i} className="w-11 h-11 rounded-xl border border-dashed border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-text-subtle)]">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                ))}
                <div className="ml-2 hidden sm:block">
                  <p className="text-[10px] font-bold text-[color:var(--color-text)] uppercase tracking-widest">{compareIds.length} / 3</p>
                  <p className="text-[9px] text-[color:var(--color-text-muted)] mt-0.5">{compareIds.length < 2 ? 'Min. 2 produits requis' : 'Prêt à comparer'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { setCompareIds([]); setCompareMode(false); }}
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  Annuler
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCompareModal(true)}
                  disabled={compareIds.length < 2}
                  leftIcon={<Scale className="w-3.5 h-3.5" />}
                  className="px-6 font-black uppercase tracking-widest text-[10px]"
                >
                  Comparer
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
