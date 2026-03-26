import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgePercent, Mic, MessageSquare, PackageCheck, ShieldCheck,
  Sparkles, Truck, Zap, ChevronRight, Star, ArrowRight,
  ShoppingBag, Layers, CreditCard, Headphones,
  Home as HomeIcon, Smartphone, CheckCircle2, TrendingUp, Users, Award, Quote,
  Leaf, FlaskConical, EyeOff, Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SEO from '../components/SEO';
import ProductCard from '../components/ProductCardV2';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import FuturisticBackground from '../components/home/FuturisticBackground';

import type { Product, Category } from '../lib/types';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useBudtenderStore } from '../store/budtenderStore';

import Hero from '../components/home/Hero';

// Pre-computed waveform values — stable across re-renders for the BudTender visualization
const WAVE_HEIGHTS = Array.from({ length: 32 }, (_, i) => 10 + ((i * 17 + 11) % 50));
const WAVE_DURATIONS = Array.from({ length: 32 }, (_, i) => parseFloat((0.4 + (i * 0.029) % 0.4).toFixed(2)));
const ORB_WAVE_DURATIONS = Array.from({ length: 8 }, (_, i) => parseFloat((0.5 + (i * 0.07) % 0.5).toFixed(2)));

const ADVANTAGES = [
  {
    title: 'Extraction Noble',
    description: 'Procédés au CO2 supercritique pour une pureté absolue et un spectre complet.',
    Icon: FlaskConical,
  },
  {
    title: 'Discrétion Totale',
    description: 'Colis neutres sans odeur. Livraison confidentielle en 24/48h partout en Europe.',
    Icon: EyeOff,
  },
  {
    title: 'IA BudTender',
    description: 'Votre sommelier du chanvre disponible en vocal pour un conseil sur-mesure.',
    Icon: Mic,
  },
  {
    title: 'Légalité & Pureté',
    description: 'Taux de THC < 0.3% certifié en laboratoire indépendant. Agriculture 100% bio.',
    Icon: Scale,
  },
] as const;

const TESTIMONIALS = [
  {
    name: 'Julien R.',
    city: 'Paris',
    when: 'Achat vérifié',
    verified: true,
    content: "La qualité de la fleur 'Amnesia Haze' est tout simplement exceptionnelle. Les arômes sont complexes et l'effet est exactement ce que je recherchais. La livraison en 24h est un vrai plus.",
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Julien'
  },
  {
    name: 'Sophie M.',
    city: 'Lyon',
    when: 'Achat vérifié',
    verified: true,
    content: "L'assistant vocal BudTender m'a bluffée. Il a compris mes besoins (sommeil et anxiété) et m'a orientée vers une huile 15% qui a changé mes nuits. Service premium.",
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie'
  },
  {
    name: 'Marcus T.',
    city: 'Bordeaux',
    when: 'Achat vérifié',
    verified: true,
    content: "Enfin une boutique sérieuse avec des analyses labo claires. On sait ce qu'on achète. Les résines sont puissantes et savoureuses. Un sans faute.",
    rating: 5,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus'
  }
];

export default function HomeV2() {
  const settings = useSettingsStore((s) => s.settings);
  const { user } = useAuthStore();
  const { openVoice } = useBudtenderStore();
  const navigate = useNavigate();
  const storeName = settings.store_name || 'Green Mood';

  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBlocks, setCategoryBlocks] = useState<{ name: string, id: string, slug: string, products: Product[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHomepageData() {
      try {
        // Fetch Categories and Products
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

        // Fetch Best Sellers (Featured products or just popular active ones)
        const { data: bestSellersData } = await supabase
          .from('products')
          .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
          .eq('is_active', true)
          .eq('is_available', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(12);

        const mappedBestSellers = (bestSellersData || []).map(p => ({
          ...p,
          avg_rating: (p as any).ratings?.[0]?.avg_rating ?? null,
          review_count: (p as any).ratings?.[0]?.review_count ?? 0,
        }));

        setBestSellers(mappedBestSellers as Product[]);

        // Fetch Recent Products (Arrivals)
        const { data: recData } = await supabase
          .from('products')
          .select('*, category:categories(*), ratings:product_ratings(avg_rating, review_count)')
          .eq('is_active', true)
          .eq('is_available', true)
          .order('created_at', { ascending: false })
          .limit(8);

        setRecommended((recData || []).map(p => ({
          ...p,
          avg_rating: (p as any).ratings?.[0]?.avg_rating ?? null,
          review_count: (p as any).ratings?.[0]?.review_count ?? 0,
        })) as Product[]);

        // Category blocks
        if (filteredCats && filteredCats.length > 0) {
          const blockCategories = filteredCats.slice(0, 6);
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

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] selection:bg-[color:var(--color-primary)]/40 selection:text-[color:var(--color-text)] relative overflow-hidden">
      <SEO
        title={`${storeName} | CBD Premium, Boutique de Chanvre Officielle & IA BudTender`}
        description={`${storeName} redéfinit l'expérience CBD avec une sélection premium (Fleurs, Huiles, Résines) et un assistant vocal intelligent pour vous guider vers le bien-être.`}
        keywords={`${storeName}, CBD premium, fleurs CBD, huiles CBD, résines chanvre, budtender IA, cannabis légal, bien-être naturel`}
        canonical="/"
      />

      <FuturisticBackground />

      {/* Decorative botanical glass layers */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div className="absolute top-[15%] -left-20 w-64 h-64 bg-green-900/10 blur-[100px] rounded-full" />
        <div className="absolute top-[60%] -right-20 w-80 h-80 bg-[color:var(--color-primary)]/5 blur-[120px] rounded-full" />
      </div>

      <main className="relative">
        {/* 1. HERO SECTION (WITH PRODUCT SLIDER) */}
        <Hero />

        {/* 2. ADVANTAGES STRIP */}
        <section className="relative z-30 border-y border-[color:var(--color-border)] bg-black/40 backdrop-blur-xl">
          <div className="mx-auto max-w-screen-2xl px-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
              {ADVANTAGES.map((adv, i) => (
                <motion.div
                  key={adv.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col gap-4 p-8 group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20 transition-transform group-hover:scale-110">
                    <adv.Icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">{adv.title}</h3>
                    <p className="text-[11px] text-[color:var(--color-text-muted)] leading-relaxed">{adv.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. CATEGORIES GRID */}
        <section className="relative z-10 py-24 px-4 lg:px-8">
          <div className="mx-auto max-w-screen-2xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-[1px] bg-[color:var(--color-primary)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-primary)]">Nos Univers</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Explorez la <span className="text-zinc-600">Pureté.</span></h2>
              </div>
              <Link to="/catalogue" className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-[color:var(--color-text-muted)] hover:text-white transition-colors">
                Voir tout le catalogue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] animate-pulse rounded-[2.5rem] bg-white/5 border border-white/5" />
                ))
              ) : (
                categories.slice(0, 4).map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link
                      to={`/catalogue?category=${cat.slug}`}
                      className="group relative flex flex-col items-center justify-end aspect-[4/5] rounded-[2.5rem] overflow-hidden border border-white/10 transition-all hover:border-[color:var(--color-primary)]/40 hover:scale-[1.02]"
                    >
                      <div className="absolute inset-0 z-0">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center">
                            <Leaf className="w-16 h-16 text-white/10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                      </div>

                      <div className="relative z-20 w-full p-8 text-center space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">Découvrir</span>
                        <h3 className="text-xl font-black uppercase text-white drop-shadow-lg">{cat.name}</h3>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 4. BUDTENDER INTERACTIVE HIGHLIGHT */}
        <section className="relative z-20 px-4 py-24 lg:px-8">
          <div className="mx-auto max-w-screen-2xl relative overflow-hidden rounded-[4rem] border border-white/5 bg-zinc-950/40 p-12 backdrop-blur-3xl lg:p-24 group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/5 via-transparent to-transparent pointer-events-none" />

            <div className="grid lg:grid-cols-2 gap-24 items-center relative z-10">
              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-3 rounded-full border border-zinc-800 bg-white/5 px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]">
                    Innovation Audio
                  </div>
                  <h2 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase italic leading-[0.85]">
                    Votre <br />
                    <span className="text-[color:var(--color-primary)] bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-700">Budtender.</span>
                  </h2>
                  <p className="text-xl text-[color:var(--color-text-muted)] leading-relaxed">
                    Marre de chercher des heures ? Parlez naturellement à notre <span className="text-white font-bold">BudTender IA</span>. Il analyse vos envies de détente, vos préférences gustatives et votre budget pour vous proposer la fleur parfaite en un instant.
                  </p>
                </div>

                <div className="grid gap-4">
                  {[
                    "Conseil personnalisé basé sur vos besoins (sommeil, détente, focus)",
                    "Expertise technique sur les terpènes et cannabinoïdes",
                    "Navigation vocale ultra-fluide pour faire vos achats"
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-4 animate-float" style={{ animationDelay: `${i * 0.5}s` }}>
                      <div className="h-6 w-6 rounded-full bg-[color:var(--color-primary)]/20 border border-[color:var(--color-primary)]/40 flex items-center justify-center shrink-0 mt-1">
                        <CheckCircle2 size={12} className="text-[color:var(--color-primary)]" />
                      </div>
                      <p className="text-sm font-medium text-zinc-300">{text}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (user) openVoice(); else navigate('/connexion?redirect=%2F');
                  }}
                  className="group relative h-20 px-12 bg-white text-black font-black uppercase tracking-[0.3em] text-xs rounded-3xl overflow-hidden hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                >
                  <span className="relative z-10 flex items-center gap-4">
                    <Mic className="w-5 h-5 animate-pulse" />
                    Démarrer la consultation
                  </span>
                  <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </button>
              </div>

              <div className="relative flex justify-center items-center h-[500px]">
                {/* Neural Core visualization */}
                <div className="relative w-80 h-80 rounded-full flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      boxShadow: ["0 0 20px rgba(16, 185, 129, 0.2)", "0 0 80px rgba(16, 185, 129, 0.4)", "0 0 20px rgba(16, 185, 129, 0.2)"]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border border-[color:var(--color-primary)]/20 bg-gradient-to-br from-[color:var(--color-primary)]/5 to-transparent backdrop-blur-3xl"
                  />

                  <div className="relative z-10 flex items-end gap-1.5 h-32 w-full justify-center">
                    {WAVE_HEIGHTS.map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: ['10%', `${h}%`, '10%'], opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: WAVE_DURATIONS[i], repeat: Infinity }}
                        className="w-1.5 rounded-full bg-[color:var(--color-primary)]"
                      />
                    ))}
                  </div>

                  {/* Floating data particles */}
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [-200, 200],
                        x: [Math.random() * -150, Math.random() * 150],
                        opacity: [0, 0.5, 0]
                      }}
                      transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.5 }}
                      className="absolute h-1 w-1 rounded-full bg-[color:var(--color-primary)] blur-[1px]"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. BEST SELLERS */}
        <section className="relative z-10 py-32 px-4 lg:px-8 bg-zinc-950/20">
          <div className="mx-auto max-w-screen-2xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="space-y-4 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <TrendingUp className="text-orange-500 w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500">Les Favoris</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">Best <span className="text-zinc-700">Sellers.</span></h2>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-[2.5rem] bg-white/5" />
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
          </div>
        </section>

        {/* 5.5 NOUVEAUTÉS */}
        {recommended.length > 0 && (
          <section className="relative z-10 py-32 px-4 lg:px-8 border-t border-white/5">
            <div className="mx-auto max-w-screen-2xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                <div className="space-y-4 text-center md:text-left">
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <Sparkles className="text-[color:var(--color-primary)] w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-primary)]">Derniers Arrivages</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">Nouveautés.</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                {recommended.map((product, idx) => (
                  <motion.div
                    key={`rec-${product.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. CATÉGORIES PRODUITS BLOCKS */}
        {categoryBlocks.length > 0 && (
          <section className="relative z-10 py-32 px-4 lg:px-8 bg-black/40 border-y border-white/5">
            <div className="mx-auto max-w-screen-2xl">
              <div className="grid lg:grid-cols-3 gap-12">
                {categoryBlocks.map((block) => (
                  <div key={block.id} className="space-y-8 p-8 rounded-[3rem] bg-white/[0.02] border border-white/5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-[color:var(--color-primary)] rounded-full animate-pulse" />
                        {block.name}
                      </h3>
                      <Link to={`/catalogue?category=${block.slug}`} className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] hover:text-white transition-colors">
                        Tout voir
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {block.products.slice(0, 4).map(p => (
                        <Link
                          to={`/catalogue/${p.slug}`}
                          key={p.id}
                          className="group relative bg-black/40 border border-white/5 rounded-2xl p-3 transition-all hover:border-[color:var(--color-primary)]/40"
                        >
                          <div className="aspect-square rounded-xl bg-zinc-900 overflow-hidden mb-3">
                            <img
                              src={p.image_url || '/images/presentation.png'}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-zinc-400 truncate uppercase tracking-tight">{p.name}</p>
                          <p className="text-xs font-black text-[color:var(--color-primary)] mt-1">{p.price}€</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 6. SOCIAL PROOF / TESTIMONIALS */}
        <section className="relative z-10 py-32 border-t border-white/5">
          <div className="mx-auto max-w-screen-2xl px-4 lg:px-8">
            <h2 className="text-3xl font-black text-center mb-20 uppercase tracking-tighter italic">La parole à nos <span className="text-[color:var(--color-primary)]">Connaisseurs.</span></h2>

            <div className="grid md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((test, i) => (
                <motion.div
                  key={test.name}
                  whileHover={{ y: -10 }}
                  className="p-8 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-sm relative"
                >
                  <Quote className="absolute top-8 right-8 w-10 h-10 text-white/5" />
                  <div className="flex items-center gap-4 mb-6">
                    <img src={test.avatar} className="w-12 h-12 rounded-2xl bg-zinc-800" alt={test.name} />
                    <div>
                      <h4 className="text-sm font-black text-white">{test.name}</h4>
                      <p className="text-[10px] text-zinc-500">{test.city} · {test.when}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} size={10} className="fill-[color:var(--color-primary)] text-[color:var(--color-primary)]" />)}
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed italic">"{test.content}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. FINAL CTA */}
        <section className="relative z-10 py-32 px-4">
          <div className="mx-auto max-w-4xl text-center space-y-12">
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.85]">
              Prêt pour le <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-800">Grand Calme ?</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Rejoignez les milliers de clients qui ont choisi la pureté et l'expertise de Green Mood. Expédition gratuite dès 50€ d'achat.
            </p>
            <div className="flex justify-center gap-6">
              <Button asMotion onClick={() => navigate('/catalogue')} className="h-20 px-12 rounded-3xl text-sm font-black uppercase tracking-[0.3em] bg-[color:var(--color-primary)] text-black">
                Shop Maintenant
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
