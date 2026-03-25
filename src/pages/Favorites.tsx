import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ArrowLeft, ShoppingBag, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { useWishlistStore } from '../store/wishlistStore';
import ProductCard from '../components/ProductCardV2';
import SEO from '../components/SEO';
import { useSettingsStore } from '../store/settingsStore';

export default function Favorites() {
    const { items: wishlistIds } = useWishlistStore();
    const settings = useSettingsStore((s) => s.settings);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadFavorites() {
            if (wishlistIds.length === 0) {
                setProducts([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*, category:categories(*)')
                    .in('id', wishlistIds)
                    .eq('is_active', true);

                if (error) throw error;

                if (data && data.length > 0) {
                    const productIds = data.map((p) => p.id);
                    const { data: ratingsData } = await supabase
                        .from('reviews')
                        .select('product_id, rating')
                        .in('product_id', productIds)
                        .eq('is_published', true);

                    const ratingMap = new Map<string, { sum: number; count: number }>();
                    (ratingsData ?? []).forEach((r: { product_id: string; rating: number }) => {
                        const cur = ratingMap.get(r.product_id) ?? { sum: 0, count: 0 };
                        ratingMap.set(r.product_id, { sum: cur.sum + r.rating, count: cur.count + 1 });
                    });

                    const withRatings = data.map((p) => {
                        const r = ratingMap.get(p.id);
                        return r ? { ...p, avg_rating: r.sum / r.count, review_count: r.count } : p;
                    });
                    setProducts(withRatings as Product[]);
                } else {
                    setProducts([]);
                }
            } catch (error) {
                console.error('Error loading favorites:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadFavorites();
    }, [wishlistIds]);

    return (
        <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
            <SEO title={`Mes Favoris — L'Excellence ${settings.store_name}`} description="Retrouvez vos sélections préférées." />

            <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <Link to="/compte" className="inline-flex items-center gap-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] text-xs font-bold uppercase tracking-wider transition-colors mb-4">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Mon Espace
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] flex items-center justify-center border border-[color:var(--color-primary)]/20">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[color:var(--color-text)]">
                                    Mes Favoris
                                </h1>
                            </div>
                            <p className="text-sm text-[color:var(--color-text-muted)]">Vos produits coup de cœur sauvegardés.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-[color:var(--color-text-muted)] bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] px-4 py-2 rounded-xl shadow-sm">
                                {wishlistIds.length} produit{wishlistIds.length > 1 ? 's' : ''}
                            </span>
                            <Link
                                to="/catalogue"
                                className="inline-flex items-center gap-2 bg-[color:var(--color-card)] text-[color:var(--color-text)] font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-all"
                            >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                Explorer
                            </Link>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="animate-pulse bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-3xl p-4 shadow-sm">
                                <div className="aspect-[4/5] bg-[color:var(--color-bg)] rounded-2xl" />
                                <div className="p-3 space-y-2">
                                    <div className="h-4 bg-[color:var(--color-bg-elevated)] rounded-lg w-2/3" />
                                    <div className="h-6 bg-[color:var(--color-bg-elevated)] rounded-lg w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-[color:var(--color-card)]/80 border border-dashed border-[color:var(--color-border)] rounded-[2.5rem] shadow-sm">
                        <div className="w-20 h-20 rounded-full bg-[color:var(--color-bg)] flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-[color:var(--color-primary)]/5 rounded-full blur-xl" />
                            <Heart className="w-8 h-8 text-[color:var(--color-text-subtle)]" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xl font-black text-[color:var(--color-text)] uppercase">Votre liste est vide</p>
                            <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">
                                Parcourez notre catalogue et appuyez sur le cœur pour sauvegarder vos produits préférés.
                            </p>
                        </div>
                        <Link
                            to="/catalogue"
                            className="inline-flex items-center gap-2 bg-[color:var(--color-card)] text-[color:var(--color-text)] font-black uppercase tracking-wider px-8 py-3 rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-all text-sm"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Explorer le Catalogue
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                        <AnimatePresence mode="popLayout">
                            {products.map((product, idx) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{
                                        delay: idx * 0.05,
                                        duration: 0.4,
                                        ease: [0.25, 0.1, 0.25, 1]
                                    }}
                                    layout
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
                    <Shield className="w-3 h-3" />
                    <span>Vos favoris sont synchronisés sur tous vos appareils</span>
                </div>
            </div>
        </div>
    );
}