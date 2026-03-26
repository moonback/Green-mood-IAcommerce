import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Truck, CheckCircle, MessageSquare, Star, Zap, Lock, Loader2, ChevronLeft, ChevronRight, Mic, Flame } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../lib/types';
import { useBudtenderStore } from '../../store/budtenderStore';
import { useAuthStore } from '../../store/authStore';

const TRUST = [
  { icon: Truck, label: 'Livraison 24/48h', sub: 'Discrétion Totale' },
  { icon: Lock, label: 'Paiement Sécurisé', sub: 'Crypté & Anonyme' },
  { icon: CheckCircle, label: 'Certifié Labo', sub: 'Taux < 0.3% THC' },
  { icon: Zap, label: 'BudTender IA', sub: 'Conseil 24/7' },
] as const;

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const rafRef = useRef<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const { openVoice } = useBudtenderStore();
  const { user } = useAuthStore();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    });
  }, [mouseX, mouseY]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  useEffect(() => {
    async function fetchHeroProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(8);

        if (!error && data) setProducts(data as Product[]);
      } catch (err) {
        console.error('Hero fetch:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHeroProducts();
  }, []);

  useEffect(() => {
    if (products.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % products.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [products.length]);

  const paginate = (dir: number) => {
    setDirection(dir);
    setCurrentIndex(prev => (prev + dir + products.length) % products.length);
  };

  const product = products[currentIndex];

  const springX = useSpring(mouseX, { stiffness: 80, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 30 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8]);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  if (isLoading) {
    return (
      <section className="min-h-[95vh] flex items-center justify-center bg-[color:var(--color-bg)]">
        <Loader2 className="w-8 h-8 text-[color:var(--color-primary)] animate-spin" />
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[95vh] flex flex-col justify-center overflow-hidden bg-[color:var(--color-bg)] pt-20"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[color:var(--color-bg)] z-10" />
        <img src="/images/cbd_hero_premium_dark.png" className="w-full h-full object-cover opacity-60" alt="Background" />
      </div>

      <motion.div
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 lg:px-12 py-24 lg:py-0 lg:min-h-[85vh] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
      >
        <div className="flex flex-col gap-8 items-center lg:items-start text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]">
              Green Mood · Excellence Botanique
            </span>
          </motion.div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 w-full"
            >
              <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-black leading-[0.9] tracking-tighter text-white uppercase italic">
                {product ? (
                  <>
                    {product.name}
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] to-emerald-400">
                      Sensation Pure.
                    </span>
                  </>
                ) : (
                  <>
                    L'excellence <br />
                    <span className="text-[color:var(--color-primary)]">Du Chanvre.</span>
                  </>
                )}
              </h1>

              <p className="max-w-md text-lg text-zinc-400 leading-relaxed font-medium">
                {product?.description
                  ? `${product.description.slice(0, 150)}${product.description.length > 150 ? '…' : ''}`
                  : 'Une expérience CBD inégalée. Des fleurs nobles, des huiles pures, sélectionnées pour votre bien-être.'}
              </p>

              {product && (
                <div className="flex items-center gap-4 justify-center lg:justify-start">
                  <span className="text-4xl font-black text-white">
                    {product.price}€
                  </span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-[color:var(--color-primary)] text-[color:var(--color-primary)]" />)}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-6 pt-4 justify-center lg:justify-start">
                <button
                  onClick={() => navigate(product ? `/catalogue/${product.slug}` : '/catalogue')}
                  className="group relative h-16 px-10 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)] transition hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Voir le produit
                    <ArrowUpRight size={16} />
                  </span>
                  <div className="absolute inset-0 bg-[color:var(--color-primary)] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </button>

                <button
                  onClick={() => { if (user) openVoice(); else navigate('/connexion?redirect=%2F'); }}
                  className="group flex items-center gap-4 h-16 px-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md text-xs font-black uppercase tracking-[0.2em] text-white hover:border-[color:var(--color-primary)]/40 transition-all"
                >
                  <Mic size={18} className="text-[color:var(--color-primary)] animate-pulse" />
                  BudTender IA
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`vis-${currentIndex}`}
              custom={direction}
              initial={{ opacity: 0, scale: 0.9, rotate: direction > 0 ? 5 : -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: direction > 0 ? -5 : 5 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ rotateX, rotateY, perspective: 1200 }}
              className="relative w-full max-w-[500px] will-change-transform"
            >
              <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] aspect-[4/5] bg-zinc-900 group">
                <img
                  src={product?.image_url || '/images/cbd_hero_premium_dark.png'}
                  alt={product?.name || 'Produit Premium'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                
                {product?.category && (
                  <div className="absolute top-8 left-8">
                    <span className="px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      {product.category.name}
                    </span>
                  </div>
                )}
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-6 -right-6 lg:-right-10 inline-flex items-center gap-4 px-6 py-4 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl z-20"
              >
                <div className="h-10 w-10 rounded-xl bg-[color:var(--color-primary)]/20 border border-[color:var(--color-primary)]/30 flex items-center justify-center">
                  <Flame size={18} className="text-[color:var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Favori du mois</p>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Stock Limité</p>
                </div>
              </motion.div>
              <div className="absolute -inset-10 bg-[color:var(--color-primary)]/5 blur-[80px] rounded-full -z-10" />
            </motion.div>
          </AnimatePresence>

          {products.length > 1 && (
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
              <button
                onClick={() => paginate(-1)}
                className="w-12 h-12 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/40 hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                {products.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-[color:var(--color-primary)]' : 'w-2 bg-white/20'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => paginate(1)}
                className="w-12 h-12 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/40 hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 lg:px-12 mt-24 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-t border-white/5">
          {TRUST.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center gap-4 group"
            >
              <div className="h-11 w-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-[color:var(--color-primary)]/40 transition-all">
                <Icon size={18} className="text-zinc-500 group-hover:text-[color:var(--color-primary)] transition-colors" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</p>
                <p className="text-[10px] text-zinc-600 font-bold">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

