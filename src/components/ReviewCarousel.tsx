import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight, Sparkles, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Product, Review } from '../lib/types';
import { useSettingsStore } from '../store/settingsStore';

interface ReviewWithProduct extends Review {
    product: {
        id: string;
        name: string;
        slug: string;
        image_url: string | null;
    };
    profile: {
        full_name: string | null;
    };
}

export default function ReviewCarousel() {
    const { settings } = useSettingsStore();
    const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollXProgress } = useScroll({
        container: containerRef,
    });

    const scrollVelocity = useSpring(scrollXProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        async function fetchReviews() {
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .select(`
            id,
            rating,
            comment,
            created_at,
            product:products(id, name, slug, image_url),
            profile:profiles(full_name)
          `)
                    .eq('is_published', true)
                    .order('created_at', { ascending: false })
                    .limit(12);

                if (error) throw error;

                // Filter out any reviews that didn't join correctly or don't have comments
                const validReviews = (data as any[] || []).filter(
                    r => r.product && r.comment && r.comment.length > 10
                ) as ReviewWithProduct[];

                setReviews(validReviews);
            } catch (err) {
                console.error('Error fetching reviews for carousel:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchReviews();
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (containerRef.current) {
            const { scrollLeft, clientWidth } = containerRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            containerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    if (!loading && reviews.length === 0) return null;

    return (
        <section className="py-24 md:py-32 relative overflow-hidden bg-[color:var(--color-bg)] font-sans border-t border-[color:var(--color-border)]">
            {/* Decorative Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[color:var(--color-primary)]/10 blur-[120px] rounded-full pointer-events-none opacity-50 dark:opacity-100" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-5 mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 text-[color:var(--color-primary)] text-[10px] font-bold uppercase tracking-[0.2em]"
                        >
                            <Sparkles className="w-3 h-3" />
                            Retours d'expérience
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-6xl font-serif font-black text-[color:var(--color-text)] leading-tight uppercase"
                        >
                            Ce que pensent <br />
                            <span className="text-[color:var(--color-primary)] italic font-serif lowercase">nos clients.</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-[color:var(--color-text-muted)] text-lg font-light leading-relaxed max-w-xl"
                        >
                            Des centaines de clients font confiance à notre expertise pour dynamiser leurs espaces de bien-être. Découvrez leurs expériences.
                        </motion.p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => scroll('left')}
                            className="w-14 h-14 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-card)] hover:border-[color:var(--color-primary)]/30 transition-all group backdrop-blur-md"
                            disabled={loading}
                        >
                            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-14 h-14 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-card)] hover:border-[color:var(--color-primary)]/30 transition-all group backdrop-blur-md"
                            disabled={loading}
                        >
                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Carousel Container */}
            <div
                ref={containerRef}
                className="flex gap-6 overflow-x-auto snap-x snap-mandatory px-5 md:px-[calc((100vw-min(1280px,95vw))/2)] no-scrollbar pb-12 cursor-grab active:cursor-grabbing"
                style={{ scrollbarWidth: 'none' }}
            >
                {loading ? (
                    // Skeleton State
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="min-w-[320px] md:min-w-[420px] max-w-[420px] h-[450px] bg-[color:var(--color-card)]/50 border border-[color:var(--color-border)] rounded-[2.5rem] p-10 animate-pulse">
                            <div className="w-12 h-12 bg-[color:var(--color-bg-muted)] rounded-2xl mb-8" />
                            <div className="h-6 bg-[color:var(--color-bg-muted)] rounded-lg w-3/4 mb-4" />
                            <div className="h-6 bg-[color:var(--color-bg-muted)] rounded-lg w-1/2 mb-8" />
                        </div>
                    ))
                ) : (
                    reviews.map((review, i) => (
                        <motion.div
                            key={review.id}
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="snap-start min-w-[320px] md:min-w-[420px] max-w-[420px]"
                        >
                            <div className="h-full bg-[color:var(--color-card)]/60 backdrop-blur-xl border border-[color:var(--color-border)] rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group hover:border-[color:var(--color-primary)]/30 transition-all duration-500 shadow-[var(--shadow-card)]">
                                {/* Card Background Glow */}
                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[color:var(--color-primary)]/5 blur-[60px] rounded-full group-hover:bg-[color:var(--color-primary)]/10 transition-colors" />

                                <div className="relative z-10 space-y-8 flex flex-col h-full">
                                    {/* Quote Icon */}
                                    <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-surface)] flex items-center justify-center text-[color:var(--color-primary)] border border-[color:var(--color-border)] shadow-sm">
                                        <Quote className="w-6 h-6" />
                                    </div>

                                    {/* Review Content */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, idx) => (
                                                <Star
                                                    key={idx}
                                                    className={`w-4 h-4 ${idx < review.rating ? 'text-[color:var(--color-primary)] fill-[color:var(--color-primary)]' : 'text-[color:var(--color-text-subtle)]/30'}`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xl md:text-2xl text-[color:var(--color-text)] font-light leading-relaxed italic line-clamp-4">
                                            "{review.comment}"
                                        </p>
                                    </div>

                                    {/* User & Product Info */}
                                    <div className="pt-8 border-t border-[color:var(--color-border)] flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[color:var(--color-surface)] flex items-center justify-center text-[color:var(--color-text-muted)] border border-[color:var(--color-border)] font-bold uppercase text-[10px] shadow-sm">
                                                {review.profile?.full_name?.charAt(0) || 'G'}
                                            </div>
                                            <div>
                                                <p className="text-[color:var(--color-text)] font-black text-xs tracking-wide uppercase">
                                                    {(review.profile?.full_name ?? `Client ${settings.store_name}`).split(' ')[0]}
                                                </p>
                                                <p className="text-[color:var(--color-text-subtle)] text-[9px] uppercase tracking-widest">Achat vérifié</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Linked Product - Premium UI */}
                                    <Link
                                        to={`/catalogue/${review.product.slug}`}
                                        className="mt-4 flex items-center gap-4 p-4 rounded-2xl bg-[color:var(--color-surface)]/40 border border-[color:var(--color-border)] group-hover:bg-[color:var(--color-surface)]/60 group-hover:border-[color:var(--color-primary)]/20 transition-all shadow-sm"
                                    >
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[color:var(--color-surface)] shrink-0 border border-[color:var(--color-border)]">
                                            <img
                                                src={review.product.image_url || '/images/N10.png'}
                                                alt={review.product.name}
                                                className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[color:var(--color-text)] font-black text-xs uppercase truncate mb-1">{review.product.name}</h4>
                                            <span className="text-[color:var(--color-primary)] text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                <ShoppingBag className="w-3 h-3" />
                                                Voir le produit
                                            </span>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* View All Bar */}
            <div className="max-w-7xl mx-auto px-5 mt-8 flex justify-center">
                <Link
                    to="/catalogue"
                    className="group inline-flex items-center gap-3 px-8 py-3 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-primary)]/30 transition-all font-bold uppercase tracking-[0.2em] text-[10px] backdrop-blur-md shadow-sm"
                >
                    Découvrir tous nos produits
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </section>
    );
}
