import { Suspense, lazy, useEffect, useMemo, useState, Fragment } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ShoppingBag, BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import type { Category, Product as BaseProduct } from '../lib/types';
import { getCategoryAncestors } from '../lib/categoryTree';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { useBudtenderStore } from '../store/budtenderStore';
import type { Product, ProductSpec } from '../types/premiumProduct';
import ProductHero from '../components/product-premium/ProductHero';
import SectionSkeleton from '../components/product-premium/SectionSkeleton';
import PremiumModal from '../components/product-premium/PremiumModal';
import SEO from '../components/SEO';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { buildProductSEO } from '../lib/seo/metaBuilder';
import { breadcrumbSchema } from '../lib/seo/schemaBuilder';
import { useSettingsStore } from '../store/settingsStore';
import { formatProductText } from '../lib/textFormatter';

const ProductStory = lazy(() => import('../components/product-premium/ProductStory'));
const EffectVisualization = lazy(() => import('../components/product-premium/EffectVisualization'));
const ProductSpecs = lazy(() => import('../components/product-premium/BotanicalSpecs'));
const QualityGuarantee = lazy(() => import('../components/product-premium/QualityGuarantee'));
const ConsumptionGuide = lazy(() => import('../components/product-premium/ConsumptionGuide'));
const DosageGuide = lazy(() => import('../components/product-premium/DosageGuide'));
const ProductReviews = lazy(() => import('../components/product-premium/ProductReviews'));
const PremiumRelatedProducts = lazy(() => import('../components/product-premium/PremiumRelatedProducts'));

// ── Spec icons derived from keyword matching ─────────────────────────────────
function getSpecIcon(spec: string): string {
  if (!spec) return '📄';
  const s = spec.toLowerCase();

  // ── Botanical / CBD Specific ──────────────────────────────────────────────
  if (/\b(indoor|greenhouse|outdoor)\b/.test(s)) return '🌱';
  if (/\b(cbd|cbg|cbn|cbc|thcv)\b/.test(s)) return '🧪';
  if (/\b(terpène|arôme|goût|saveur)\b/.test(s)) return '👃';
  if (/\b(détente|relax|sommeil|calme)\b/.test(s)) return '🧘';
  if (/\b(lab|testé|analysé|pur)\b/.test(s)) return '🔬';
  if (/\b(bio|organique|naturel)\b/.test(s)) return '🍃';

  // ── General Specs ─────────────────────────────────────────────────────────
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

const fallbackSpecs: ProductSpec[] = [
  { name: 'Culture Organique', icon: '🌱', category: 'Culture', description: 'Cultivé sans pesticides ni métaux lourds dans le respect de l environement.', intensity: 100 },
  { name: 'Tests Labo', icon: '🔬', category: 'Qualité & Analyse', description: 'Chaque lot est analysé par un laboratoire indépendant pour garantir la pureté.', intensity: 100 },
  { name: 'THC < 0.3%', icon: '⚖️', category: 'Composition', description: 'Produit 100% légal conforme à la législation européenne.', intensity: 100 },
  { name: 'Full Spectrum', icon: '🧪', category: 'Composition', description: 'Contient l ensemble des cannabinoïdes naturels pour un effet d entourage maximal.', intensity: 90 },
];

// ── Product evaluation metrics (0–10) ───────────────────────────────────────
function deriveProductMetrics(base: BaseProduct): Record<'Détente' | 'Saveur' | 'Arôme' | 'Puissance', number> {
  const attrs = base.attributes ?? {};
  
  // If we already have metrics in attributes, use them
  if (attrs.productMetrics) {
    return attrs.productMetrics;
  }

  // Fallback derivation based on existing fields
  const cbd = base.cbd_percentage || 0;
  const thc = base.thc_max || 0.3;

  const detente = Math.min(10, Math.max(5, Math.round(cbd / 2)));
  const puissance = Math.min(10, Math.max(4, Math.round(cbd / 3 + (thc > 0.2 ? 2 : 0))));

  return {
    Détente: detente,
    Saveur: 8, // Default good score
    Arôme: 8, // Default good score
    Puissance: puissance,
  };
}

// ── Build Product (enhance BaseProduct with premium fields) ──────────────────
function enhanceProduct(base: BaseProduct): Product {
  const attrs = base.attributes ?? {};
  const techFeatures: string[] = Array.isArray(attrs.techFeatures) ? attrs.techFeatures : [];
  const productSpecsData = Array.isArray(attrs.productSpecs) ? attrs.productSpecs : [];
  const brand = String(attrs.brand ?? 'Green Mood Exclusive');

  // Specs → interaction viewer
  let specs_enhanced: ProductSpec[] = [];

  if (productSpecsData.length > 0) {
    specs_enhanced = productSpecsData
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
  } else {
    // Try to derive from basic attributes
    const cbd = base.attributes?.cbd_percentage || (base as any).cbd_percentage;
    if (cbd) {
      specs_enhanced.push({
        name: 'CBD',
        icon: '🧪',
        category: 'Composition',
        description: `Taux de CBD élevé de ${cbd}% pour une efficacité optimale.`,
        intensity: Math.min(100, (cbd / 20) * 100)
      });
    }
    
    const thc = base.attributes?.thc_max !== undefined ? base.attributes.thc_max : (base as any).thc_max;
    if (thc !== undefined && thc <= 0.3) {
      specs_enhanced.push({
        name: 'THC',
        icon: '✅',
        category: 'Composition',
        description: `Taux de THC inférieur à 0.3%, garantissant l'absence d'effet psychotrope légal.`,
        intensity: 100
      });
    }

    if (specs_enhanced.length === 0) {
      specs_enhanced = fallbackSpecs;
    }
  }

  // Add standard trust elements
  if (!specs_enhanced.some(s => s.category === 'Engagement')) {
    specs_enhanced.push({
      name: 'Qualité Premium',
      icon: '🛡️',
      category: 'Engagement',
      description: 'Sélection rigoureuse des meilleures fleurs et résines du marché européen.',
      intensity: 100
    });
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

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setActiveProduct } = useBudtenderStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<import('../types/premiumProduct').Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [recentlyViewed, setRecentlyViewed] = useState<Array<Pick<BaseProduct, 'id' | 'name' | 'slug' | 'image_url' | 'price'>>>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // ── Premium font injection ──
  useEffect(() => {
    if (document.querySelector('link[data-account-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('data-account-fonts', '1');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;700&display=swap';
    document.head.appendChild(link);
  }, []);

  // Modal states
  const [activeModal, setActiveModal] = useState<'specs' | 'performance' | 'story' | 'reviews' | 'related' | null>(null);

  useEffect(() => {
    const handleOpenModalEvent = (e: any) => {
      const modalName = e.detail;
      if (['specs', 'performance', 'story', 'reviews', 'related'].includes(modalName)) {
        setActiveModal(modalName as any);
      }
    };
    window.addEventListener('cortex-open-modal', handleOpenModalEvent);
    return () => window.removeEventListener('cortex-open-modal', handleOpenModalEvent);
  }, []);

  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const openSidebar = useCartStore((s) => s.openSidebar);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!slug) return;
    // Close any open modal when switching products (e.g. via voice assistant)
    setActiveModal(null);
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
        .eq('slug', slug)
        .eq('is_active', true)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .single();

      if (error || !data) { navigate('/catalogue', { replace: true }); return; }

      const rawProduct = {
        ...(data as BaseProduct),
        avg_rating: (data as any).ratings?.[0]?.avg_rating ?? null,
        review_count: (data as any).ratings?.[0]?.review_count ?? 0,
      };
      const enhanced = enhanceProduct(rawProduct as BaseProduct);
      setProduct(enhanced);

      const [{ data: reviewData }, { data: relatedData }, { data: catsData }] = await Promise.all([
        supabase.from('reviews').select('id, rating, comment, created_at, profile:profiles(full_name)')
          .eq('product_id', enhanced.id).eq('is_published', true).limit(8),
        supabase.from('products').select('*').neq('id', enhanced.id).eq('is_active', true).eq('is_available', true).gt('stock_quantity', 0).limit(3),
        supabase.from('categories').select('id, parent_id, depth, name, slug').eq('is_active', true),
      ]);

      if (catsData) setAllCategories(catsData as Category[]);

      const mappedReviews: import('../types/premiumProduct').Review[] = ((reviewData ?? []) as any[]).map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at, author: r.profile?.[0]?.full_name ?? 'Client vérifié' }));

      setReviews(mappedReviews);
      setRelated((relatedData as BaseProduct[] | null)?.map(enhanceProduct) ?? []);
      
      // Update BudTender store for Cortex AI visibility
      setActiveProduct({
        ...enhanced,
        reviews: mappedReviews,
        relatedProducts: (relatedData as BaseProduct[] | null)?.map(enhanceProduct) ?? []
      } as any);

      setLoading(false);
    })();

    return () => {
      setActiveProduct(null);
    };
  }, [slug, navigate, setActiveProduct]);

  useEffect(() => {
    if (!product) return;
    const key = 'recently-viewed-products';
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) as any[] : [];
      const next = [
        { id: product.id, name: product.name, slug: product.slug, image_url: product.image_url, price: product.price },
        ...parsed.filter((p) => p.id !== product.id),
      ].slice(0, 10);
      localStorage.setItem(key, JSON.stringify(next));
      setRecentlyViewed(next.filter((p) => p.id !== product.id).slice(0, 6));
    } catch { }
  }, [product]);

  const subtotal = useMemo(() => (product ? (product.price * quantity).toFixed(2) : '0.00'), [product, quantity]);

  const categoryAncestors = useMemo(() => {
    if (!product || !allCategories.length) return [];
    const catId = (product as unknown as BaseProduct).category_id;
    if (!catId) return [];
    return getCategoryAncestors(catId, allCategories);
  }, [product, allCategories]);

  const breadcrumbJsonLd = useMemo(() => breadcrumbSchema([
    { name: 'Accueil', path: '/' },
    { name: 'Catalogue', path: '/catalogue' },
    ...categoryAncestors.map(cat => ({ name: cat.name, path: `/catalogue?category=${cat.slug}` })),
    { name: product?.name ?? '', path: `/produit/${(product as unknown as BaseProduct)?.slug ?? ''}` },
  ]), [categoryAncestors, product]);

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-[color:var(--color-bg)]">
        <SectionSkeleton />
      </div>
    );
  }

  const handleAddToCart = () => {
    const isOrderable = product.is_available !== false && product.stock_quantity > 0;
    if (!isOrderable) {
      addToast({ type: 'error', message: 'Produit en rupture de stock.' });
      return;
    }
    addItem(product);
    if (quantity > 1) updateQuantity(product.id, quantity);
    openSidebar();
    addToast({ type: 'success', message: `${product.name} ajouté au panier` });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/commande');
  };

  return (
    <div className="flex-1 h-full overflow-hidden bg-[color:var(--color-bg)] flex flex-col text-[color:var(--color-text)] relative">
      <SEO {...buildProductSEO(product)} schema={breadcrumbJsonLd} />

      {/* ── Header Area ── */}
      <div className="flex-none z-20"
        style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
        <div className="mx-auto max-w-[1400px] px-4 py-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <nav className="flex items-center gap-1.5 flex-wrap min-w-0"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            <Link to="/" className="hover:text-[color:var(--color-primary)] transition-colors shrink-0">Accueil</Link>
            <ChevronRight className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />
            <Link to="/catalogue" className="hover:text-[color:var(--color-primary)] transition-colors shrink-0">Catalogue</Link>
            {categoryAncestors.map(cat => (
              <Fragment key={cat.id}>
                <ChevronRight className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />
                <Link to={`/catalogue?category=${cat.slug}`} className="hover:text-[color:var(--color-primary)] transition-colors shrink-0">
                  {cat.name}
                </Link>
              </Fragment>
            ))}
            <ChevronRight className="w-2.5 h-2.5 flex-shrink-0 opacity-40" />
            <span className="text-[color:var(--color-primary)] truncate max-w-[200px]">{product.name}</span>
          </nav>

          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-1.5 shrink-0 transition-all"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-[color:var(--color-primary)]" />
            <span className="group-hover:text-[color:var(--color-primary)] transition-colors">Retour</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <main className="flex-1 min-h-0 relative z-10">
        <ProductHero
          product={product}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onOpenModal={(type) => setActiveModal(type)}
        />
      </main>

      {/* ── Modals ── */}
      <Suspense fallback={null}>
        <PremiumModal
          isOpen={activeModal === 'story'}
          onClose={() => setActiveModal(null)}
          title="Histoire & Concept"
        >
          <ProductStory
            title={`${product.productMetrics.Détente >= 8 ? 'Relaxation & Bien-être' : 'Qualité & Arômes'}`}
            text={formatProductText(product.description?.trim() || `${product.name} — variété CBD premium sélectionnée pour sa pureté et son profil aromatique unique.`)}
          />
        </PremiumModal>

        <PremiumModal
          isOpen={activeModal === 'performance'}
          onClose={() => setActiveModal(null)}
          title="Expertise & Bien-être"
        >
          <div className="space-y-16">
            <EffectVisualization metrics={product.productMetrics} />
            <DosageGuide />
            <QualityGuarantee />
            <ConsumptionGuide />
          </div>
        </PremiumModal>

        <PremiumModal
          isOpen={activeModal === 'specs'}
          onClose={() => setActiveModal(null)}
          title="Spécifications Variété"
        >
          <ProductSpecs specs={product.productSpecs} />
        </PremiumModal>

        <PremiumModal
          isOpen={activeModal === 'reviews'}
          onClose={() => setActiveModal(null)}
          title="Avis Clients"
        >
          <ProductReviews reviews={reviews} />
        </PremiumModal>

        <PremiumModal
          isOpen={activeModal === 'related'}
          onClose={() => setActiveModal(null)}
          title="Découvrir plus"
        >
          <div className="space-y-16">
            <PremiumRelatedProducts products={related} />

            {recentlyViewed.length > 0 && (
              <section className="w-full">
                <div className="mb-8 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]">Navigation</p>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white">Vus récemment</h3>
                  </div>
                </div>
                <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-none">
                  {recentlyViewed.map((p) => (
                    <motion.div key={p.id} whileHover={{ y: -4 }} className="flex-shrink-0">
                      <Link
                        to={`/catalogue/${p.slug}`}
                        onClick={() => setActiveModal(null)}
                        className="block w-[240px] rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-[color:var(--color-primary)]/30 hover:bg-white/10 shadow-sm"
                      >
                        <div className="mb-4 h-32 w-full overflow-hidden rounded-xl bg-black/20">
                          <img src={getProductImageSrc(p.image_url)} alt={p.name} className="h-full w-full object-cover" onError={applyProductImageFallback} />
                        </div>
                        <p className="line-clamp-1 text-sm font-black text-white uppercase tracking-tight">{p.name}</p>
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
                          <p className="text-sm font-black text-[color:var(--color-primary)]">{p.price.toFixed(2)} €</p>
                          <ChevronRight className="w-3 h-3 text-white/40" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </PremiumModal>
      </Suspense>

      {/* ── Mobile sticky bottom bar (keep for small screens) ── */}
      <div className="md:hidden flex-none">
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          className="border-t border-[color:var(--color-border)] bg-[color:var(--color-card)]/90 backdrop-blur-xl p-3 shadow-lg"
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xl font-black text-[color:var(--color-text)]">{subtotal} <span className="text-sm text-[color:var(--color-text-muted)]">€</span></p>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex items-center gap-2 rounded-xl bg-[color:var(--color-primary)] px-5 py-3 font-bold text-[color:var(--color-primary-contrast)] text-sm shadow-lg transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
