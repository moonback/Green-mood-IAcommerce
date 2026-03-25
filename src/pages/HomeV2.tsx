import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgePercent, Mic, MessageSquare, PackageCheck, ShieldCheck,
  Sparkles, Truck, Zap, ChevronRight, Star, ArrowRight,
  ShoppingBag, Layers, CreditCard, Headphones, Gamepad2,
  Home as HomeIcon, Smartphone, CheckCircle2, TrendingUp, Users, Award, Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SEO from '../components/SEO';
import ProductCard from '../components/ProductCardV2';
import { Button, MotionButton } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import Hero from '../components/home/Hero';
import Hero2 from '../components/home/Hero2';
import FuturisticBackground from '../components/home/FuturisticBackground';

import type { Product, Category } from '../lib/types';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useBudtenderStore } from '../store/budtenderStore';
import { useNavigate } from 'react-router-dom';

// Pre-computed waveform values — stable across re-renders
const WAVE_HEIGHTS = Array.from({ length: 32 }, (_, i) => 10 + ((i * 17 + 11) % 50));
const WAVE_DURATIONS = Array.from({ length: 32 }, (_, i) => parseFloat((0.4 + (i * 0.029) % 0.4).toFixed(2)));
const ORB_WAVE_DURATIONS = Array.from({ length: 8 }, (_, i) => parseFloat((0.5 + (i * 0.07) % 0.5).toFixed(2)));

const ADVANTAGES = [
  {
    title: 'Expédition Express',
    description: 'Livraison suivie en 24/48h. Votre commande traitée et expédiée le jour même.',
    Icon: Truck,
  },
  {
    title: 'Qualité Certifiée',
    description: 'Sélection rigoureuse : chaque produit est testé par nos experts avant mise en vente.',
    Icon: CheckCircle2,
  },
  {
    title: 'Support Dédié',
    description: 'Une équipe d\'experts et une IA aux petits soins pour répondre à toutes vos questions.',
    Icon: MessageSquare,
  },
  {
    title: 'Garantie Totale',
    description: 'Paiement 100% sécurisé et garantie satisfait ou remboursé sous 14 jours.',
    Icon: ShieldCheck,
  },
] as const;

const TESTIMONIALS = [
  {
    name: 'Thomas D.',
    city: 'Lyon',
    when: 'Achat vérifié',
    verified: true,
    content: "La livraison a été incroyablement rapide. Le produit est d'une qualité rare, on sent que la sélection est faite avec soin. Je recommande les yeux fermés.",
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas'
  },
  {
    name: 'Sarah M.',
    city: 'Bordeaux',
    when: 'Achat vérifié',
    verified: true,
    content: "Le diagnostic IA m'a vraiment aidée à choisir le bon modèle selon mon budget. Service client ultra réactif et emballage très soigné.",
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    name: 'Marc L.',
    city: 'Paris',
    when: 'Achat vérifié',
    verified: true,
    content: "Enfin une boutique qui allie innovation et sérieux. Les produits sont top, le paiement est fluide, rien à dire de plus : c'est parfait.",
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marc'
  }
];

export default function HomeV2() {
  const settings = useSettingsStore((s) => s.settings);
  const { user } = useAuthStore();
  const { openVoice } = useBudtenderStore();
  const navigate = useNavigate();
  const storeName = settings.store_name || 'NeuroCart';

  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [heroProduct, setHeroProduct] = useState<Product | null>(null);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [topSoldProducts, setTopSoldProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBlocks, setCategoryBlocks] = useState<{ name: string, id: string, slug: string, products: Product[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHomepageData() {
      try {
        // Fetch Categories and Products (to check which cats are active)
        const [{ data: catData }, { data: pData }] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order'),
          supabase
            .from('products')
            .select('category_id')
            .eq('is_active', true)
            .eq('is_available', true)
            .gt('stock_quantity', 0)
        ]);

        let filteredCats: Category[] = [];

        if (catData && pData) {
          const activeIds = new Set(pData.map(p => p.category_id).filter(Boolean));
          const hasProducts = (catId: string): boolean => {
            if (activeIds.has(catId)) return true;
            const children = catData.filter(c => c.parent_id === catId);
            return children.some(c => hasProducts(c.id));
          };
          filteredCats = catData.filter(c => hasProducts(c.id));
          setCategories(filteredCats.slice(0, 10));
        }

        // Fetch Best Sellers (Featured products)
        const { data: bestSellersData } = await supabase
          .from('products')
          .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
          .eq('is_active', true)
          .eq('is_available', true)
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(8);

        const mappedBestSellers = (bestSellersData || []).map(p => ({
          ...p,
          avg_rating: (p as any).ratings?.[0]?.avg_rating ?? null,
          review_count: (p as any).ratings?.[0]?.review_count ?? 0,
        }));

        setBestSellers(mappedBestSellers as Product[]);
        if (mappedBestSellers.length > 0) {
          setHeroProduct(mappedBestSellers[0] as Product);
        } else {
          // If no featured products, fetch any recent active product for the hero
          const { data: fallbackProduct } = await supabase
            .from('products')
            .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          if (fallbackProduct) {
            setHeroProduct({
              ...(fallbackProduct as any),
              avg_rating: (fallbackProduct as any).ratings?.[0]?.avg_rating ?? null,
              review_count: (fallbackProduct as any).ratings?.[0]?.review_count ?? 0,
            } as Product);
          }
        }

        // Fetch Top Sold Products (Most purchased)
        const { data: orderItemsData } = await supabase
          .from('order_items')
          .select('product_id, product:products(*, category:categories(*), ratings:product_ratings(avg_rating, review_count))')
          .not('product_id', 'is', null)
          .limit(200);

        if (orderItemsData) {
          const counts: Record<string, { product: Product, qty: number }> = {};
          orderItemsData.forEach((item: any) => {
            const p = item.product;
            if (!p) return;
            if (!counts[p.id]) {
              counts[p.id] = {
                product: {
                  ...p,
                  avg_rating: p.ratings?.[0]?.avg_rating ?? null,
                  review_count: p.ratings?.[0]?.review_count ?? 0,
                },
                qty: 0
              };
            }
            counts[p.id].qty += 1;
          });

          const sortedTopSold = Object.values(counts)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 4)
            .map(item => item.product);

          setTopSoldProducts(sortedTopSold);
        }

        // Fetch Recommended (most recent)
        const { data: recData } = await supabase
          .from('products')
          .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
          .eq('is_active', true)
          .eq('is_available', true)
          .order('created_at', { ascending: false })
          .limit(4);

        setRecommended((recData || []).map(p => ({
          ...p,
          avg_rating: (p as any).ratings?.[0]?.avg_rating ?? null,
          review_count: (p as any).ratings?.[0]?.review_count ?? 0,
        })) as Product[]);

        // Category blocks (Gaming, Audio, Maison)
        if (filteredCats && filteredCats.length > 0) {
          const blockCategories = filteredCats.slice(0, 6); // Try matching first 6 to find at least 3 with products
          const blocks = await Promise.all(blockCategories.map(async (cat) => {
            const { data: p } = await supabase
              .from('products')
              .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
              .eq('category_id', cat.id)
              .eq('is_active', true)
              .limit(4);
            if (!p || p.length === 0) return null;
            return {
              name: cat.name,
              id: cat.id,
              slug: cat.slug,
              products: (p || []).map(item => ({
                ...item,
                avg_rating: (item as any).ratings?.[0]?.avg_rating ?? null,
                review_count: (item as any).ratings?.[0]?.review_count ?? 0,
              })) as Product[]
            };
          }));
          setCategoryBlocks(blocks.filter(Boolean).slice(0, 3) as { name: string, id: string, slug: string, products: Product[] }[]);
        }

      } catch (error) {
        console.error('Erreur chargement home data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHomepageData();
  }, []);

  const heroImage = useMemo(
    () => settings.home_hero_bg_url || settings.hero_bg_url || '/logo.png',
    [settings.home_hero_bg_url, settings.hero_bg_url],
  );

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] selection:bg-[color:var(--color-primary)]/40 selection:text-[color:var(--color-text)] relative overflow-hidden">
      <SEO
        title={`${storeName} | Électronique, téléphones & maison tendance`}
        description={`${storeName} vous aide à choisir le bon téléphone, accessoire ou produit maison tendance grâce à un conseiller IA, une sélection premium et un paiement sécurisé.`}
        keywords={`${storeName}, électronique, téléphones, maison tendance, accessoires, e-commerce premium, assistant IA, conseiller achat`}
        canonical="/"
      />

      {/* Futuristic Background */}
      <FuturisticBackground />

      {/* Decorative HUD Lines */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div className="absolute top-1/4 left-0 w-20 h-[1px] bg-gradient-to-r from-[color:var(--color-primary)]/20 to-transparent" />
        <div className="absolute top-1/2 left-0 w-32 h-[1px] bg-gradient-to-r from-[color:var(--color-primary)]/10 to-transparent opacity-50" />
        <div className="absolute top-3/4 left-0 w-24 h-[1px] bg-gradient-to-r from-[color:var(--color-primary)]/20 to-transparent" />

        <div className="absolute top-1/4 right-0 w-20 h-[1px] bg-gradient-to-l from-[color:var(--color-primary)]/20 to-transparent" />
        <div className="absolute top-1/2 right-0 w-32 h-[1px] bg-gradient-to-l from-[color:var(--color-primary)]/10 to-transparent opacity-50" />
        <div className="absolute top-3/4 right-0 w-24 h-[1px] bg-gradient-to-l from-[color:var(--color-primary)]/20 to-transparent" />
      </div>

      <main className="relative">

        {/* 1. HERO SECTION */}
        <Hero />

        {/* STATS / MÉTRIQUES DE CONFIANCE */}
        <div className="relative z-10 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/90 backdrop-blur-md">
          <div className="mx-auto max-w-screen-2xl px-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[color:var(--color-border)]">
              {[
                { value: '+15 000', label: 'Clients satisfaits', icon: Users },
                { value: '4.9 / 5', label: 'Note moyenne', icon: Star },
                { value: '24 / 48h', label: 'Livraison express', icon: Truck },
                { value: '100%', label: 'Paiement sécurisé', icon: ShieldCheck },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-center justify-center gap-3 py-5 px-4 group"
                >
                  <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                    <stat.icon size={14} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-base font-black text-[color:var(--color-text)] tracking-tight leading-none">{stat.value}</p>
                    <p className="text-xs text-[color:var(--color-text-muted)] mt-0.5">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. CATÉGORIES (SCROLL HORIZONTAL) */}
        <section className="relative z-10 py-8 border-y border-[color:var(--color-border)] bg-[color:var(--color-card)]/50">
          <div className="mx-auto max-w-screen-2xl px-4 lg:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">
                <Layers className="h-4 w-4 text-[color:var(--color-primary)]" />
                Catégories
              </h4>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-none snap-x mask-fade-right">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="min-w-[160px] h-40 animate-pulse rounded-3xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)]" />
                ))
              ) : (
                categories.map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="snap-start"
                  >
                    <Link
                      to={`/catalogue?category=${cat.slug}`}
                      className="group relative flex flex-col items-center gap-3 min-w-[130px] sm:min-w-[150px] p-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 backdrop-blur-sm transition-all hover:bg-[color:var(--color-primary)]/5 hover:border-[color:var(--color-primary)]/30 hover:shadow-md hover:scale-[1.03]"
                    >
                      <div className="relative h-[90px] w-full flex items-center justify-center rounded-xl bg-[color:var(--color-bg-elevated)] p-3 transition-all duration-300 group-hover:scale-105 group-hover:bg-[color:var(--color-primary)]/10">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="h-full w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                        ) : (
                          <Smartphone className="h-10 w-10 text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-primary)] transition-colors" />
                        )}
                      </div>
                      <span className="text-center text-xs font-semibold text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary)] transition-colors leading-tight">
                        {cat.name}
                      </span>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 2.5 CORTEX AI ADVISOR SECTION */}
        <section className="relative z-20 px-4 py-32 lg:px-8 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[color:var(--color-primary)]/5 blur-[150px] rounded-full pointer-events-none animate-pulse-slow" />

          <div className="mx-auto max-w-screen-2xl relative overflow-hidden rounded-[4rem] border border-[color:var(--color-primary)]/20 bg-[color:var(--color-card)]/40 p-8 shadow-[0_0_80px_-20px_rgba(var(--color-primary-rgb),0.3)] backdrop-blur-3xl sm:p-20 group">
            {/* Holographic Overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/5 via-transparent to-transparent opacity-50" />
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[color:var(--color-primary)]/10 blur-3xl" />

            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/30 to-transparent" />

            <div className="grid gap-20 lg:grid-cols-[1fr_0.9fr] lg:items-center relative z-10">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="space-y-12"
              >
                <div className="space-y-8">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-3 rounded-full border border-[color:var(--color-primary)]/30 bg-[color:var(--color-primary)]/10 px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)] shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.2)]"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-primary)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--color-primary)]"></span>
                    </span>
                    Recherche approfondie
                  </motion.div>

                  <h2 className="text-5xl font-black tracking-tighter text-[color:var(--color-text)] sm:text-7xl lg:text-8xl text-balance leading-[0.85] uppercase italic font-black">
                    Recherche vocale <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] via-indigo-400 to-[color:var(--color-primary)] drop-shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)]">Demain, ici.</span>
                  </h2>

                  <p className="max-w-xl text-xl text-[color:var(--color-text-muted)] leading-relaxed font-medium">
                    Cortex n'est pas un simple assistant, c'est votre <span className="text-[color:var(--color-text)] font-black">personnel shopper</span>. Parlez-lui naturellement pour trouver l'équipement parfait.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-3">
                  {[
                    { icon: Mic, title: 'Neural Voice', desc: 'Interactions vocales ultra-fluides 7j/24h/24.', highlighted: true },
                    { icon: Zap, title: 'Recherche vocale', desc: 'Recherche vocale instantanée.' },
                    { icon: MessageSquare, title: 'Deep Logic', desc: 'Analyse contextuelle multiniveaux.' },
                  ].map((item, idx) => (
                    <motion.div
                      key={item.title}
                      whileHover={{ y: -5, backgroundColor: 'rgba(var(--color-primary-rgb), 0.08)', borderColor: 'rgba(var(--color-primary-rgb), 0.4)' }}
                      className={`rounded-[2rem] border ${item.highlighted ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5 shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.15)]' : 'border-[color:var(--color-border)] bg-[color:var(--color-bg)]/40'} p-6 backdrop-blur-md transition-all shadow-xl relative overflow-hidden`}
                    >
                      {item.highlighted && (
                        <div className="absolute top-0 right-0 p-3">
                          <div className="h-2 w-2 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
                        </div>
                      )}
                      <item.icon className={`h-7 w-7 ${item.highlighted ? 'text-[color:var(--color-primary)]' : 'text-[color:var(--color-primary)]'} mb-5 shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)]`} />
                      <p className="text-xs font-bold text-[color:var(--color-text)] uppercase tracking-wide">{item.title}</p>
                      <p className="mt-2 text-xs text-[color:var(--color-text-muted)] leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-6">
                  <button
                    onClick={() => {
                      if (user) {
                        openVoice();
                      } else {
                        navigate('/connexion?redirect=%2F');
                      }
                    }}
                    className="group relative overflow-hidden inline-flex items-center gap-4 rounded-2xl bg-[color:var(--color-primary)] px-10 py-5 text-xs font-black uppercase tracking-[0.2em] text-[color:var(--color-primary-contrast)] shadow-[0_20px_40px_-10px_rgba(var(--color-primary-rgb),0.5)] transition hover:scale-105 active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      <Mic className="h-4 w-4 animate-pulse" />
                      {user ? 'Lancer la Vocal' : 'Activer Vocal'}
                    </span>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </button>

                  <Link
                    to={user ? '/assistant' : '/connexion?redirect=%2Fassistant'}
                    className="group flex items-center gap-3 px-6 py-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/30 text-xs font-semibold text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/30 transition-all"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chat Classique
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                {/* HUD Elements Around Visualizer */}
                <div className="absolute -top-10 -left-10 w-24 h-24 border-t-2 border-l-2 border-[color:var(--color-primary)]/40 rounded-tl-[3rem] opacity-50" />
                <div className="absolute -bottom-10 -right-10 w-24 h-24 border-b-2 border-r-2 border-[color:var(--color-primary)]/40 rounded-br-[3rem] opacity-50" />

                {/* Scanning Lines Effect */}
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[3rem]">
                  <motion.div
                    animate={{ y: ["0%", "100%", "0%"] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="w-full h-[2px] bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/20 to-transparent shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)]"
                  />
                </div>

                <div className="relative space-y-6 rounded-[3.5rem] border border-[color:var(--color-primary)]/30 bg-black/60 shadow-[0_0_80px_-20px_rgba(var(--color-primary-rgb),0.4)] backdrop-blur-3xl min-h-[620px] flex flex-col overflow-hidden group/visualizer">

                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-10 pt-8">
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="w-1.5 h-4 rounded-full bg-[color:var(--color-primary)]/20 overflow-hidden relative">
                            <motion.div
                              animate={{ height: ["20%", "100%", "20%"] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                              className="absolute bottom-0 left-0 right-0 bg-[color:var(--color-primary)]"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-primary)]">Analyse vocale active</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center gap-2 px-3 py-1 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/5"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                        <span className="text-[10px] font-bold text-white">Live</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* The Cortex Core Visualization */}
                  <div className="relative flex-1 flex items-center justify-center py-4">
                    {/* Background Rings */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute w-[400px] h-[400px] border border-dashed border-[color:var(--color-primary)]/40 rounded-full"
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute w-[300px] h-[300px] border border-[color:var(--color-primary)]/30 rounded-full border-t-transparent border-b-transparent"
                      />
                    </div>

                    {/* Central Pulsing Orb */}
                    <div className="relative z-10">
                      <motion.div
                        animate={{
                          scale: [1, 1.15, 1],
                          boxShadow: [
                            "0 0 20px rgba(var(--color-primary-rgb), 0.3)",
                            "0 0 50px rgba(var(--color-primary-rgb), 0.6)",
                            "0 0 20px rgba(var(--color-primary-rgb), 0.3)"
                          ]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-40 h-40 rounded-full bg-gradient-to-br from-[color:var(--color-primary)] via-indigo-600 to-[color:var(--color-primary)] flex items-center justify-center relative overflow-hidden group-hover/visualizer:scale-110 transition-transform duration-700"
                      >
                        <div className="absolute inset-0 bg-white/10 mix-blend-overlay animate-pulse" />
                        <Mic className="w-16 h-16 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />

                        {/* Audio Wave Over Orb */}
                        <div className="absolute inset-0 flex items-center justify-between px-6 opacity-30">
                          {[...Array(8)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: ["20%", "60%", "20%"] }}
                              transition={{ duration: ORB_WAVE_DURATIONS[i] ?? 0.8, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 bg-white rounded-full"
                            />
                          ))}
                        </div>
                      </motion.div>

                      {/* Floating Data Nodes */}
                      {[0, 90, 180, 270].map((angle, idx) => (
                        <motion.div
                          key={idx}
                          animate={{
                            y: [0, -10, 0],
                            opacity: [0.3, 0.7, 0.3]
                          }}
                          transition={{ duration: 4, repeat: Infinity, delay: idx * 1 }}
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-120px)`
                          }}
                          className="flex flex-col items-center gap-1"
                        >
                          <div className="h-2 w-2 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_8px_rgba(var(--color-primary-rgb),1)]" />
                          <span className="text-[6px] font-black uppercase text-[color:var(--color-primary)] tracking-widest hidden group-hover/visualizer:block">Canal {idx + 1}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Transcription Feed */}
                  <div className="px-10 space-y-4 pb-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      className="inline-flex gap-3 items-center rounded-2xl bg-white/5 border border-white/10 p-4 max-w-[90%] backdrop-blur-md"
                    >
                      <div className="h-2 w-2 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
                      <p className="text-xs font-medium text-white/80 italic">
                        "Cortex, j'ai besoin d'un casque gaming ultra-confortable pour mes sessions de 4h..."
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gradient-to-r from-[color:var(--color-primary)]/20 to-indigo-500/20 border border-[color:var(--color-primary)]/30 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Sparkles className="w-4 h-4 text-[color:var(--color-primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Analyse complète</span>
                      </div>
                      <p className="text-sm font-black text-white leading-relaxed">
                        Entendu. Le <span className="text-[color:var(--color-primary)] underline decoration-dotted underline-offset-4">X-Elite Pro v2</span> est conçu pour l'endurance. Matériaux respirants et poids optimisé. Je vous détaille le confort ?
                      </p>

                      {/* Product Preview Card Inline */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="mt-4 flex items-center gap-4 bg-black/40 rounded-2xl p-3 border border-white/5 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/5 p-2 shrink-0">
                          <img src="/images/hero_premium_gadget.png" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white uppercase tracking-tight">X-Elite Pro v2</p>
                          <p className="text-[8px] text-[color:var(--color-primary)] font-black">Confort certifié · Filaire</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/40 ml-auto" />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Neural Waveform Footer */}
                  <div className="bg-gradient-to-t from-[color:var(--color-primary)]/10 to-transparent p-8 flex flex-col items-center gap-4">
                    <div className="flex items-end justify-center gap-1.5 h-16 w-full">
                      {WAVE_HEIGHTS.map((h, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [10, h, 10], opacity: [0.3, 0.8, 0.3] }}
                          transition={{ duration: WAVE_DURATIONS[i], repeat: Infinity, ease: 'easeInOut' }}
                          className={`w-1 rounded-full ${i % 2 === 0 ? 'bg-[color:var(--color-primary)]' : 'bg-[color:var(--color-secondary)]'}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (user) {
                          openVoice();
                        } else {
                          navigate('/connexion?redirect=%2F');
                        }
                      }}
                      className="text-xs font-medium text-white/60 hover:text-[color:var(--color-primary)] transition-colors flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3 text-[color:var(--color-primary)]" />
                      Lancer une analyse vocale
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        {/* 4. DEALS CAROUSEL */}
        <Hero2 />
        {/* 3. SECTION "BEST SELLERS" */}
        <section className="relative z-10 px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-screen-2xl">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 ring-1 ring-orange-500/20">
                  <TrendingUp className="h-3 w-3" />
                  Les plus populaires
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Le meilleur du moment</h2>
                <p className="text-sm text-[color:var(--color-text-muted)]">Notre sélection des produits préférés de nos clients.</p>
              </div>
              <Link to="/catalogue" className="hidden sm:flex items-center gap-2 text-sm font-bold text-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]/80 transition-all group">
                Voir tout le catalogue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-[400px] animate-pulse rounded-[2rem] border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]" />
                ))
              ) : (
                bestSellers.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-10 sm:hidden">
              <Button asMotion onClick={() => navigate('/catalogue')} variant="ghost" className="w-full text-[color:var(--color-primary)] border-[color:var(--color-primary)]/20">
                Voir tout le catalogue
              </Button>
            </div>
          </div>
        </section>




        {/* 5. SECTION "NOUVEAUTÉS" */}
        <section className="relative z-10 px-4 py-16 lg:px-8 border-y border-[color:var(--color-border)]">
          <div className="mx-auto max-w-screen-2xl">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[color:var(--color-primary)] uppercase tracking-wider">Arrivages récents</p>
                  <h2 className="text-2xl font-black">Nouveautés</h2>
                  <p className="text-sm text-[color:var(--color-text-muted)]">Tout juste arrivés dans notre catalogue.</p>
                </div>
              </div>
              <Link to="/catalogue?sort=newest" className="hidden sm:flex items-center gap-2 text-sm font-bold text-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]/80 transition-all group">
                Voir les nouveautés <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[380px] animate-pulse rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]" />
                ))
              ) : (
                recommended.map((product, idx) => (
                  <motion.div
                    key={`rec-${product.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 6. PRODUITS PAR CATÉGORIE */}
        {categoryBlocks.length > 0 && (
          <section className="relative z-10 px-4 py-16 lg:px-8 bg-[color:var(--color-card)]/15">
            <div className="mx-auto max-w-screen-2xl">
              <div className="mb-10 flex items-end justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-primary)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--color-primary)] ring-1 ring-[color:var(--color-primary)]/20">
                    <Layers className="h-3 w-3" />
                    Par catégorie
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Explorez nos univers</h2>
                </div>
                <Link to="/catalogue" className="hidden sm:flex items-center gap-2 text-sm font-bold text-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]/80 transition-all group">
                  Tout le catalogue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {categoryBlocks.map((block) => (
                  <div key={block.name} className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-3 text-base font-black uppercase tracking-tight">
                        <span className="w-1 h-5 bg-[color:var(--color-primary)] rounded-full" />
                        {block.name}
                      </h3>
                      <Link to={`/catalogue?category=${block.slug}`} className="text-xs font-medium text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-primary)] transition-colors flex items-center gap-1">
                        Tout voir <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {block.products.slice(0, 4).map(p => (
                        <Link
                          to={`/catalogue/${p.slug}`}
                          key={p.id}
                          className="group bg-[color:var(--color-card)]/50 border border-[color:var(--color-border)] rounded-2xl p-3.5 transition-all hover:bg-[color:var(--color-card)] hover:border-[color:var(--color-primary)]/25 hover:shadow-md"
                        >
                          <div className="aspect-square rounded-xl bg-[color:var(--color-bg-elevated)] p-3 mb-3 overflow-hidden">
                            <img
                              src={p.image_url || '/images/presentation.png'}
                              alt={p.name}
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/images/presentation.png';
                              }}
                            />
                          </div>
                          <p className="text-xs font-semibold text-[color:var(--color-text-muted)] truncate group-hover:text-[color:var(--color-text)] transition-colors leading-snug">{p.name}</p>
                          <p className="text-sm font-black text-[color:var(--color-primary)] mt-1">{p.price}€</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 7. SOCIAL PROOF */}
        <section className="relative z-10 px-4 py-20 lg:px-8 overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-400/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="mx-auto max-w-screen-2xl relative">
            {/* Header with overall rating */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row items-center justify-between gap-8 mb-14"
            >
              <div>
                <p className="text-xs font-semibold text-[color:var(--color-primary)] mb-2 uppercase tracking-wider">Avis clients</p>
                <h2 className="text-2xl sm:text-3xl font-black">+15 000 clients nous font confiance</h2>
                <p className="text-[color:var(--color-text-muted)] text-sm mt-2 max-w-sm">Découvrez ce que nos clients disent de leur expérience.</p>
              </div>

              {/* Overall rating card */}
              <div className="shrink-0 flex items-center gap-6 px-8 py-5 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-5xl font-black text-[color:var(--color-text)] leading-none">4.9</p>
                  <div className="flex gap-0.5 mt-2 justify-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-[color:var(--color-text-muted)] mt-1">+2 400 avis</p>
                </div>
                <div className="w-px h-14 bg-[color:var(--color-border)]" />
                <div className="space-y-1.5">
                  {[5, 4, 3].map((stars) => (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[color:var(--color-text-muted)] w-2">{stars}</span>
                      <div className="w-24 h-1.5 rounded-full bg-[color:var(--color-border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: stars === 5 ? '82%' : stars === 4 ? '13%' : '5%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Testimonials grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="relative group p-8 rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/30 backdrop-blur-sm hover:border-[color:var(--color-primary)]/25 hover:bg-[color:var(--color-card)]/50 transition-all duration-300"
                >
                  {/* Quote icon */}
                  <Quote className="absolute top-6 right-6 h-8 w-8 text-[color:var(--color-primary)]/10 group-hover:text-[color:var(--color-primary)]/20 transition-colors" />

                  <div className="flex gap-0.5 mb-5">
                    {[...Array(t.rating)].map((_, idx) => (
                      <Star key={idx} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-sm text-[color:var(--color-text-muted)] mb-7 leading-relaxed relative z-10">"{t.content}"</p>

                  <div className="flex items-center gap-3 pt-5 border-t border-[color:var(--color-border)]">
                    <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full border border-[color:var(--color-primary)]/20 ring-2 ring-[color:var(--color-primary)]/5" />
                    <div>
                      <p className="text-sm font-black text-[color:var(--color-text)]">{t.name}</p>
                      <p className="text-xs text-[color:var(--color-text-muted)] font-medium mt-0.5">
                        {t.city} · <span className="text-[color:var(--color-primary)]">{t.when}</span>
                      </p>
                    </div>
                    {t.verified && (
                      <div className="ml-auto">
                        <CheckCircle2 className="h-4 w-4 text-[color:var(--color-primary)]" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. AVANTAGES */}
        <section className="relative z-10 px-4 py-16 pb-16 lg:px-8">
          <div className="mx-auto max-w-screen-2xl">
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold text-[color:var(--color-primary)] uppercase tracking-wider mb-2">Pourquoi nous choisir</p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Notre engagement qualité</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ADVANTAGES.map(({ title, description, Icon }, idx) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/25 p-6 transition-all hover:bg-[color:var(--color-card)]/50 hover:border-[color:var(--color-primary)]/20 hover:shadow-md"
                >
                  <div className="relative z-10 space-y-4">
                    <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-[color:var(--color-primary)]/8 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/15 group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] transition-all duration-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[color:var(--color-text)]">{title}</h3>
                      <p className="text-xs leading-relaxed text-[color:var(--color-text-muted)] mt-1.5">{description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. CTA FINAL */}
        <section className="relative z-10 px-4 pb-24 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-screen-2xl relative overflow-hidden rounded-[3rem] bg-[color:var(--color-card)] border border-[color:var(--color-primary)]/10 p-12 sm:p-20 text-center shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/5 via-transparent to-indigo-500/5 opacity-50" />

            <div className="relative z-10 space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[color:var(--color-primary)] uppercase tracking-wider">Prêt à commencer ?</p>
                <h2 className="text-[color:var(--color-text)] text-3xl sm:text-4xl font-black tracking-tighter">
                  Trouvez l’équipement <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] via-indigo-400 to-[color:var(--color-primary)]">fait pour vous.</span>
                </h2>
                <p className="mx-auto max-w-xl text-base text-[color:var(--color-text-muted)] leading-relaxed">
                  Navigation fluide, conseiller IA personnel et sélection validée par +15 000 passionnés.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    asMotion
                    rightIcon={<ShoppingBag className="h-4 w-4" />}
                    onClick={() => navigate('/catalogue')}
                    className="bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] hover:bg-[color:var(--color-primary)]/90 px-8 h-12 text-sm font-black"
                  >
                    Voir le catalogue
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    asMotion
                    onClick={() => navigate('/contact')}
                    className="px-8 h-12 text-[color:var(--color-text)] border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)] font-black uppercase tracking-widest text-xs"
                  >
                    Aide & Conseil
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 pt-4 opacity-40">
                <div className="flex items-center gap-2 text-[color:var(--color-text-muted)]"><CreditCard className="h-3.5 w-3.5" /><span className="text-xs font-medium">Paiement sécurisé</span></div>
                <div className="flex items-center gap-2 text-[color:var(--color-text-muted)]"><Truck className="h-3.5 w-3.5" /><span className="text-xs font-medium">Livraison 24-48h</span></div>
                <div className="flex items-center gap-2 text-[color:var(--color-text-muted)]"><Smartphone className="h-3.5 w-3.5" /><span className="text-xs font-medium">Apple & Google Pay</span></div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>


    </div>
  );
}
