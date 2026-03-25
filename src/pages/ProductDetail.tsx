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
import type { Product, MachineSpec } from '../types/premiumProduct';
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
const MachineSpecs = lazy(() => import('../components/product-premium/MachineSpecs'));
const QualityGuarantee = lazy(() => import('../components/product-premium/QualityGuarantee'));
const ProductReviews = lazy(() => import('../components/product-premium/ProductReviews'));
const PremiumRelatedProducts = lazy(() => import('../components/product-premium/PremiumRelatedProducts'));

// ── Spec icons derived from keyword matching ─────────────────────────────────
function getSpecIcon(spec: string): string {
  const s = spec.toLowerCase();

  // ── Affichage ──────────────────────────────────────────────────────────────
  if (/\b(4k|uhd|8k)\b/.test(s)) return '🎆';
  if (/\b(oled|amoled)\b/.test(s)) return '✨';
  if (/écran|screen|lcd|hd|display|moniteur|résolution|refresh|hz|ips|va panel/.test(s)) return '🖥️';
  if (/projecteur|projection|beamer/.test(s)) return '📽️';
  if (/luminosité|luminance|nits|brightness/.test(s)) return '☀️';

  // ── Audio ──────────────────────────────────────────────────────────────────
  if (/subwoofer|basse|bass/.test(s)) return '🔉';
  if (/casque|headset|headphone|earphone|oreillette/.test(s)) return '🎧';
  if (/microphone|micro|mic/.test(s)) return '🎙️';
  if (/amplificateur|ampli/.test(s)) return '📻';
  if (/son|audio|haut-parleur|speaker|stéréo|surround|dolby|dts|atmos/.test(s)) return '🔊';

  // ── Connectivité ──────────────────────────────────────────────────────────
  if (/bluetooth/.test(s)) return '🔷';
  if (/wi-?fi|wireless|sans.?fil/.test(s)) return '📶';
  if (/ethernet|rj.?45|lan/.test(s)) return '🌐';
  if (/hdmi/.test(s)) return '📺';
  if (/usb.?c|thunderbolt/.test(s)) return '⚡';
  if (/usb|port|jack|aux|prise/.test(s)) return '🔌';
  if (/réseau|network|internet/.test(s)) return '📡';
  if (/nfc|rfid/.test(s)) return '📲';

  // ── Puissance & Énergie ───────────────────────────────────────────────────
  if (/batterie|autonomie|mah|battery/.test(s)) return '🔋';
  if (/consommation|watts?|watt|courant|ampère|tension|voltage|psu|alimentation/.test(s)) return '⚡';

  // ── Éclairage ─────────────────────────────────────────────────────────────
  if (/rgb|argb|led|rétro.?éclairage|backlight|lumière|light/.test(s)) return '💡';
  if (/néon|neon|strip/.test(s)) return '🌈';

  // ── Structure & Matériaux ─────────────────────────────────────────────────
  if (/acier|steel|inox|aluminium|alu|titane/.test(s)) return '🔩';
  if (/plastique|abs|polycarbonate|composite/.test(s)) return '🧱';
  if (/verre|tempered glass|gorilla/.test(s)) return '🪟';
  if (/caoutchouc|rubber|silicone/.test(s)) return '⚫';

  // ── Dimensions & Physique ─────────────────────────────────────────────────
  if (/poids|kg|gramme|masse|weight/.test(s)) return '⚖️';
  if (/dimension|taille|encombrement|largeur|hauteur|profondeur|cm|mm|inch/.test(s)) return '📏';
  if (/volume|litre|capacité de stockage/.test(s)) return '📦';

  // ── Refroidissement & Thermique ────────────────────────────────────────────
  if (/ventilateur|cooling|refroidissement|fan|radiateur|thermal|température/.test(s)) return '❄️';

  // ── Processeur / Électronique ─────────────────────────────────────────────
  if (/processeur|cpu|processor|core|ghz|mhz/.test(s)) return '🧠';
  if (/mémoire|ram|vram|ddr/.test(s)) return '💾';
  if (/gpu|carte graphique|graphique|rtx|rx\s/.test(s)) return '🎴';
  if (/stockage|ssd|hdd|nvme|disque/.test(s)) return '💿';
  if (/chipset|carte mère|motherboard/.test(s)) return '🖥️';

  // ── Certifications & Conformité ───────────────────────────────────────────
  if (/ce\b|rohs|fcc|ukca|norme|certif|homolog|iso/.test(s)) return '✅';
  if (/licence|officiel|agréé|authorized/.test(s)) return '⭐';
  if (/brevet|patent|exclusif/.test(s)) return '📜';

  // ── Garantie & Services ───────────────────────────────────────────────────
  if (/garantie|warranty|sav|assurance/.test(s)) return '🛡️';
  if (/maintenance|réparation|dépannage|spare|pièce de rechange/.test(s)) return '🛠️';
  if (/support|assistance|hotline|helpdesk/.test(s)) return '📞';
  if (/mise à jour|firmware|update|logiciel|software/.test(s)) return '🔄';

  // ── Logistique ────────────────────────────────────────────────────────────
  if (/livraison|shipping|transport|expédition/.test(s)) return '🚚';
  if (/installation|mise en service|setup/.test(s)) return '🔧';
  if (/emballage|packaging|colis/.test(s)) return '📦';

  // ── Marque & Origine ──────────────────────────────────────────────────────
  if (/marque|brand|manufacturer|fabricant/.test(s)) return '🏢';
  if (/made in|origine|provenance|pays/.test(s)) return '🌍';
  if (/année|year|édition|version|model/.test(s)) return '📅';

  // ── Fallback ──────────────────────────────────────────────────────────────
  return '⚙️';
}

function getSpecCategory(spec: string): string {
  const s = spec.toLowerCase();

  // Affichage
  if (/écran|screen|lcd|oled|amoled|hd|4k|uhd|8k|display|moniteur|résolution|refresh|hz|ips|luminosité|nits|projecteur/.test(s)) return 'Affichage';

  // Audio
  if (/son|audio|haut-parleur|speaker|stéréo|surround|dolby|dts|atmos|subwoofer|casque|headset|micro|amplificateur/.test(s)) return 'Audio';

  // Connectivité
  if (/bluetooth|wi-?fi|wireless|ethernet|rj.?45|lan|hdmi|usb|thunderbolt|port|jack|aux|prise|réseau|network|nfc|rfid/.test(s)) return 'Connectivité';

  // Énergie & Puissance
  if (/consommation|watts?|watt|courant|ampère|tension|voltage|psu|alimentation|batterie|autonomie|mah/.test(s)) return 'Énergie & Puissance';

  // Éclairage
  if (/led|rgb|argb|lumière|light|rétro.?éclairage|backlight|néon|strip/.test(s)) return 'Éclairage';

  // Refroidissement
  if (/ventilateur|cooling|refroidissement|fan|radiateur|thermal|température/.test(s)) return 'Refroidissement';

  // Processeur & Mémoire
  if (/processeur|cpu|processor|core|ghz|mhz|mémoire|ram|vram|ddr/.test(s)) return 'Processeur & Mémoire';

  // Graphique & Stockage
  if (/gpu|carte graphique|graphique|rtx|stockage|ssd|hdd|nvme|disque/.test(s)) return 'Graphique & Stockage';

  // Matériaux & Structure
  if (/acier|steel|inox|aluminium|alu|titane|plastique|abs|polycarbonate|verre|caoutchouc|rubber|silicone|métal|structure|matériau|châssis/.test(s)) return 'Matériaux & Structure';

  // Spécifications Physiques
  if (/poids|kg|gramme|masse|weight|dimension|taille|encombrement|largeur|hauteur|profondeur|cm|mm/.test(s)) return 'Spécifications Physiques';

  // Certifications & Conformité
  if (/ce\b|rohs|fcc|ukca|norme|certif|homolog|iso|licence|officiel|agréé|brevet/.test(s)) return 'Certification & Conformité';

  // Logiciel & Mises à jour
  if (/firmware|update|mise à jour|logiciel|software/.test(s)) return 'Logiciels';

  // Engagement & Services
  if (/garantie|warranty|sav|assurance|maintenance|réparation|support|assistance|livraison|transport|installation|emballage/.test(s)) return 'Engagement & Services';

  // Marque & Origine
  if (/marque|brand|manufacturer|fabricant|made in|origine|année|year|édition|version/.test(s)) return 'Marque & Origine';

  return 'Technique';
}

const fallbackSpecs: MachineSpec[] = [
  { name: 'Qualité construction', icon: '🔩', category: 'Matériaux & Structure', description: 'Structure robuste avec châssis acier traité. Conçu pour un usage intensif commercial.', intensity: 90 },
  { name: 'Connectivité intégrée', icon: '🔌', category: 'Connectivité', description: 'Multiple interfaces de connexion pour une intégration simple dans tout environnement.', intensity: 85 },
  { name: 'Affichage HD', icon: '🖥️', category: 'Affichage', description: 'Écran haute définition avec rendu lumineux, adapté aux environnements bien éclairés.', intensity: 88 },
  { name: 'Certifié CE', icon: '✅', category: 'Certification & Conformité', description: 'Conforme aux normes européennes en vigueur. Sécurité électrique garantie.', intensity: 100 },
];

// ── Machine performance metrics (0–10) ───────────────────────────────────────
function deriveMachineMetrics(base: BaseProduct): Record<'Performance' | 'Durabilité' | 'Immersion' | 'Prix-qualité', number> {
  const attrs = base.attributes ?? {};
  const specs: string[] = Array.isArray(attrs.specs) ? attrs.specs : [];
  const players = Number(attrs.players) || 1;
  const power = Number(attrs.power_watts) || 0;
  const price = base.price ?? 0;
  const originalValue = (base as any).original_value ?? null;

  const performance = Math.min(10, Math.round(
    (specs.length >= 4 ? 8 : specs.length * 2) +
    (power >= 600 ? 2 : power >= 300 ? 1 : 0)
  ));

  const immersion = Math.min(10,
    players >= 4 ? 10 :
      players >= 2 ? 8 : 6
  );

  const durability = Math.min(10, Math.max(6, Math.round(
    (specs.length >= 5 ? 8 : specs.length >= 3 ? 7 : 6) +
    (power >= 500 ? 1 : 0) +
    (players >= 2 ? 1 : 0)
  )));

  const prixQualite = Math.min(10,
    originalValue && price < originalValue
      ? Math.round(7 + Math.min(3, ((originalValue - price) / originalValue) * 10))
      : 7
  );

  return {
    Performance: Math.max(6, performance),
    Durabilité: durability,
    Immersion: immersion,
    'Prix-qualité': prixQualite,
  };
}

// ── Build Product (enhance BaseProduct with premium fields) ──────────────────
function enhanceProduct(base: BaseProduct): Product {
  const attrs = base.attributes ?? {};
  const specs: string[] = Array.isArray(attrs.specs) ? attrs.specs : [];
  const connectivity: string[] = Array.isArray(attrs.connectivity) ? attrs.connectivity : [];
  const benefits: string[] = Array.isArray(attrs.benefits) ? attrs.benefits : [];
  const technical_specs = Array.isArray(attrs.technical_specs) ? attrs.technical_specs : [];
  const brand = String(attrs.brand ?? '');

  // Machine specs → interaction viewer
  // Prioritize structured 'technical_specs' if they exist
  let specs_enhanced: MachineSpec[] = [];

  if (technical_specs.length > 0) {
    technical_specs.forEach((group) => {
      group.items.forEach((item: any) => {
        specs_enhanced.push({
          name: item.label,
          icon: item.icon || getSpecIcon(item.label + ' ' + item.value),
          category: group.group,
          description: item.description || `${item.label} : ${item.value}`,
          intensity: 100
        });
      });
    });
  } else if (specs.length > 0) {
    specs_enhanced = specs.map((spec, i) => ({
      name: spec.length > 40 ? spec.slice(0, 40) + '…' : spec,
      icon: getSpecIcon(spec),
      category: getSpecCategory(spec),
      description: `${spec} — caractéristique technique incluse sur le produit ${base.name}.`,
      intensity: Math.max(70, 100 - (i * 5)),
    }));
  } else {
    specs_enhanced = fallbackSpecs;
  }

  // Add weight if available
  if (base.weight_grams) {
    specs_enhanced.push({
      name: 'Poids',
      icon: '⚖️',
      category: 'Spécifications Physiques',
      description: `Poids de l'unité : ${(base.weight_grams / 1000).toFixed(1)} kg. Châssis renforcé pour une stabilité maximale.`,
      intensity: 95
    });
  }

  // Add brand if available

  // Add brand if available
  if (brand) {
    specs_enhanced.push({
      name: 'Manufacture',
      icon: '🏢',
      category: 'Origine',
      description: `Produit certifié et distribué sous la marque ${brand}. Qualité de fabrication contrôlée.`,
      intensity: 100
    });
  }

  // Add standard warranty and support
  specs_enhanced.push({
    name: 'Garantie Premium',
    icon: '🛡️',
    category: 'Sérénité',
    description: 'Garantie de 2 ans pièces et main d\'œuvre. Échange standard en cas de défaut majeur constaté au déballage.',
    intensity: 100
  });

  specs_enhanced.push({
    name: 'Support Technique',
    icon: '🛠️',
    category: 'Sérénité',
    description: 'Assistance technique prioritaire par téléphone et email. Accès aux guides de maintenance et mises à jour logicielles.',
    intensity: 100
  });

  // Add connectivity if available and not already in specs
  if (connectivity.length > 0) {
    connectivity.forEach(conn => {
      if (!specs_enhanced.some(s => s.name.toLowerCase().includes(conn.toLowerCase()))) {
        specs_enhanced.push({
          name: conn,
          icon: getSpecIcon(conn),
          category: 'Connectivité',
          description: `Interface ${conn} intégrée pour une connectivité étendue et des mises à jour simplifiées.`,
          intensity: 100
        });
      }
    });
  }

  // Add delivery criteria
  specs_enhanced.push({
    name: 'Condition de Livraison',
    icon: '🚚',
    category: 'Logistique',
    description: 'Expédition sécurisée avec emballage haute protection. Livraison suivie jusqu\'à votre point de destination.',
    intensity: 100
  });

  // Feature chips: benefits first, then connectivity ports
  const techFeatures: string[] = [
    ...benefits.slice(0, 2),
    ...connectivity.slice(0, 2),
  ].filter(Boolean).slice(0, 6);

  return {
    ...base,
    headline: `${base.name} · ${brand || 'Produit'} Premium`,
    shortDescription: formatProductText(base.description?.trim()
      ? base.description
      : `${brand ? brand + ' · ' : ''}Découvrez l'excellence avec ${base.name}. Certifié CE.`),
    techFeatures,
    machineMetrics: deriveMachineMetrics(base),
    machineSpecs: specs_enhanced,
  };
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
      <div className="flex-none z-20">
        <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)] flex-wrap">
            <Link to="/" className="hover:text-[color:var(--color-primary)] transition-colors">Accueil</Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0 text-[color:var(--color-border-strong)]" />
            <Link to="/catalogue" className="hover:text-[color:var(--color-primary)] transition-colors">Catalogue</Link>
            {categoryAncestors.map(cat => (
              <Fragment key={cat.id}>
                <ChevronRight className="w-3 h-3 flex-shrink-0 text-[color:var(--color-border-strong)]" />
                <Link to={`/catalogue?category=${cat.slug}`} className="hover:text-[color:var(--color-primary)] transition-colors">
                  {cat.name}
                </Link>
              </Fragment>
            ))}
            <ChevronRight className="w-3 h-3 flex-shrink-0 text-[color:var(--color-border-strong)]" />
            <span className="text-[color:var(--color-primary)] truncate max-w-[180px] font-black">{product.name}</span>
          </nav>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-all group font-black uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Retour</span>
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
            title={`${product.machineMetrics.Performance >= 8 ? 'Performance & usage' : 'Qualité & durabilité'}`}
            text={formatProductText(product.description?.trim() || `${product.name} — produit électronique certifié CE, pensé pour un usage quotidien ou premium.`)}
          />
        </PremiumModal>

        <PremiumModal
          isOpen={activeModal === 'performance'}
          onClose={() => setActiveModal(null)}
          title="Performance & Qualité"
        >
          <div className="space-y-12">
            <EffectVisualization metrics={product.machineMetrics} />
            <QualityGuarantee />
          </div>
        </PremiumModal>

        <PremiumModal
          isOpen={activeModal === 'specs'}
          onClose={() => setActiveModal(null)}
          title="Spécifications Techniques"
        >
          <MachineSpecs specs={product.machineSpecs} />
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
