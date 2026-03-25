import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Truck, CheckCircle, MessageSquare, Star, Zap, Lock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../lib/types';

const TRUST = [
  { icon: Truck, label: 'Livraison 24/48h', sub: 'Suivie & Express' },
  { icon: Lock, label: 'Paiement Sécurisé', sub: 'SSL & 3DS' },
  { icon: CheckCircle, label: 'Certifié Premium', sub: 'Sélection Experte' },
  { icon: Zap, label: 'Garantie 1 An', sub: 'Support Dédié' },
] as const;

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const rafRef = useRef<number>(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState(0);

  // RAF-throttled mouse tracking for 3D effect
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
          .eq('is_featured', true)
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

  // Auto-play slider
  useEffect(() => {
    if (products.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % products.length);
    }, 6000);
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
      <section className="min-h-[92vh] flex items-center justify-center bg-[color:var(--color-bg)]">
        <Loader2 className="w-8 h-8 text-[color:var(--color-primary)] animate-spin" />
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden bg-[color:var(--color-bg)]"
    >
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_65%_45%,color-mix(in_srgb,var(--color-primary)_7%,transparent),transparent_80%)]" />
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_80%_80%_at_65%_40%,#000,transparent)]" />
      </div>

      <motion.div
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative z-10 w-full max-w-8xl mx-auto px-6 lg:px-12 py-24 lg:py-0 lg:min-h-[92vh] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
      >
        {/* ── LEFT: Content ── */}
        <div className="flex flex-col gap-8 items-center lg:items-start text-center lg:text-left">

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)] animate-pulse shrink-0" />
            <Truck size={11} className="text-[color:var(--color-primary)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
              Livraison Express · France Métropolitaine
            </span>
          </motion.div>

          {/* Headline — animated per slide */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ opacity: 0, y: direction > 0 ? 20 : -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -20 : 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 w-full"
            >
              <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-black leading-[1.05] tracking-tight text-[color:var(--color-text)]">
                {product ? (
                  <>
                    {product.name}
                    <br />
                    <span className="text-[color:var(--color-primary)]">Livré chez vous en 24h.</span>
                  </>
                ) : (
                  <>
                    La Performance<br />
                    <span className="text-[color:var(--color-primary)]">Sans Compromis.</span>
                  </>
                )}
              </h1>

              <p className="max-w-md text-base md:text-lg text-[color:var(--color-text-muted)] leading-relaxed font-light">
                {product?.description
                  ? `${product.description.slice(0, 130)}${product.description.length > 130 ? '…' : ''}`
                  : 'Une sélection rigoureuse des meilleurs produits. Testés, approuvés, livrés chez vous en express.'}
              </p>

              {product && (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-[color:var(--color-text)]">
                    {product.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20">
                    <Star size={10} className="text-[color:var(--color-primary)] fill-[color:var(--color-primary)]" />
                    <span className="text-[9px] font-black uppercase tracking-wide text-[color:var(--color-primary)]">Phare</span>
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate(product ? `/catalogue/${product.slug}` : '/catalogue')}
                  className="group relative h-14 px-8 bg-[color:var(--color-text)] text-[color:var(--color-bg)] font-black text-sm overflow-hidden rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  <span className="relative z-10 flex items-center gap-2 uppercase tracking-tight">
                    {product ? 'Voir le produit' : 'Explorer la boutique'}
                    <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-[color:var(--color-primary)] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[0.76,0,0.24,1]" />
                </button>

                <Link
                  to="/assistant"
                  className="group flex items-center gap-3 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                >
                  <div className="h-11 w-11 rounded-xl border border-[color:var(--color-border)] flex items-center justify-center group-hover:border-[color:var(--color-primary)]/40 group-hover:bg-[color:var(--color-primary)]/5 transition-all">
                    <MessageSquare size={16} className="group-hover:text-[color:var(--color-primary)] transition-colors" />
                  </div>
                  <div className="text-left">
                    <span className="block text-[9px] font-black uppercase tracking-[0.15em]">Conseil IA</span>
                    <span className="block text-[9px] text-[color:var(--color-text-subtle)]/60 font-semibold">Besoin d'aide ?</span>
                  </div>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── RIGHT: Product Visual ── */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`vis-${currentIndex}`}
              custom={direction}
              initial={{ opacity: 0, scale: 0.93, rotate: direction > 0 ? 3 : -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.93, rotate: direction > 0 ? -3 : 3 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ rotateX, rotateY, perspective: 1200 }}
              className="group relative w-full will-change-transform"
            >
              {/* Product frame */}
              <div className="relative rounded-[2.5rem] overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] group-hover:border-[color:var(--color-primary)]/30 transition-colors duration-500">
                <img
                  src={product?.image_url || '/images/hero_premium_gadget.png'}
                  alt={product?.name || 'Produit Premium'}
                  fetchPriority="high"
                  loading="eager"
                  className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />

                {/* Subtle scan line */}
                <motion.div
                  animate={{ top: ['-5%', '105%'] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-px bg-[color:var(--color-primary)] opacity-20 pointer-events-none z-10"
                />

                {/* Corner brackets */}
                <div className="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-[color:var(--color-primary)] opacity-30 group-hover:opacity-90 transition-opacity duration-500" />
                <div className="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-[color:var(--color-primary)] opacity-30 group-hover:opacity-90 transition-opacity duration-500" />
                <div className="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-[color:var(--color-primary)] opacity-30 group-hover:opacity-90 transition-opacity duration-500" />
                <div className="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-[color:var(--color-primary)] opacity-30 group-hover:opacity-90 transition-opacity duration-500" />

                {/* Certified badge */}
                <div className="absolute top-6 left-6 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[color:var(--color-bg)]/75 backdrop-blur-md border border-[color:var(--color-border)] z-20">
                  <CheckCircle size={13} className="text-[color:var(--color-primary)]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text)]">Certifié Premium</span>
                </div>

                {/* Bottom gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)]/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating stock badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-4 -right-4 lg:-right-8 inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-[color:var(--color-card)]/90 backdrop-blur-xl border border-[color:var(--color-border)] shadow-xl z-20"
              >
                <div className="h-9 w-9 rounded-xl bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/20 flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-[color:var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[color:var(--color-text)] uppercase tracking-wide leading-none">En Stock</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
                    <p className="text-[9px] text-[color:var(--color-text-muted)] font-semibold uppercase tracking-tight">Expédié 24h</p>
                  </div>
                </div>
              </motion.div>

              {/* Ambient glow */}
              <div className="absolute -inset-6 bg-[color:var(--color-primary)]/4 blur-3xl rounded-full -z-10" />
            </motion.div>
          </AnimatePresence>

          {/* Slider controls */}
          {products.length > 1 && (
            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
              <button
                onClick={() => paginate(-1)}
                aria-label="Précédent"
                className="w-10 h-10 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)]/60 backdrop-blur-sm flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/40 transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                {products.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                    aria-label={`Produit ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex
                        ? 'w-6 bg-[color:var(--color-primary)]'
                        : 'w-1.5 bg-[color:var(--color-border)] hover:bg-[color:var(--color-text-muted)]'
                      }`}
                  />
                ))}
              </div>

              <button
                onClick={() => paginate(1)}
                aria-label="Suivant"
                className="w-10 h-10 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)]/60 backdrop-blur-sm flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] hover:border-[color:var(--color-primary)]/40 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Trust bar */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 mt-16 lg:mt-24 pb-8 border-t border-[color:var(--color-border)] pt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.08 }}
              className="flex items-center gap-3 group"
            >
              <div className="h-9 w-9 rounded-lg bg-[color:var(--color-card)] border border-[color:var(--color-border)] flex items-center justify-center shrink-0 group-hover:border-[color:var(--color-primary)]/30 group-hover:bg-[color:var(--color-primary)]/5 transition-all">
                <Icon size={15} className="text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-primary)] transition-colors" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)]">{label}</p>
                <p className="text-[9px] text-[color:var(--color-text-subtle)]/60 font-semibold">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1 opacity-20 hover:opacity-60 transition-opacity cursor-default"
      >
        <span className="text-[8px] font-black uppercase tracking-[0.35em] text-[color:var(--color-text-muted)]">Défiler</span>
        <div className="w-px h-8 bg-gradient-to-b from-[color:var(--color-primary)] to-transparent" />
      </motion.div>
    </section>
  );
}
