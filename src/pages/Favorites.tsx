import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { useWishlistStore } from '../store/wishlistStore';
import ProductCard from '../components/ProductCardV2';
import { useSettingsStore } from '../store/settingsStore';
import AccountPageLayout from '../components/AccountPageLayout';

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

  const exploreBtn = (
    <Link
      to="/catalogue"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
        border: '1px solid #f43f5e28',
        color: 'var(--color-text)',
      }}
    >
      <ShoppingBag className="w-3.5 h-3.5" style={{ color: '#f43f5e' }} />
      Explorer
    </Link>
  );

  return (
    <AccountPageLayout
      seoTitle={`Mes Favoris — ${settings.store_name}`}
      seoDescription="Retrouvez vos sélections préférées."
      icon={Heart}
      iconColor="#f43f5e"
      title="Mes Favoris"
      subtitle="Vos produits coup de cœur sauvegardés"
      stat={wishlistIds.length}
      statLabel="Produits"
      headerActions={exploreBtn}
      footerText={`Vos favoris sont synchronisés sur tous vos appareils`}
    >
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-[1.75rem] p-4"
              style={{
                background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
              }}
            >
              <div className="aspect-[4/5] rounded-2xl bg-[color:var(--color-bg)]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-[color:var(--color-bg)] rounded-lg w-2/3" />
                <div className="h-6 bg-[color:var(--color-bg)] rounded-lg w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center space-y-6 rounded-[2rem]"
          style={{
            background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
            border: '1px dashed color-mix(in srgb, var(--color-border) 100%, transparent)',
          }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center relative"
            style={{ background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)', border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)' }}>
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #f43f5e10, transparent 70%)' }} />
            <Heart className="w-8 h-8 text-[color:var(--color-text-muted)]" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-[color:var(--color-text)]"
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
              Votre liste est vide
            </p>
            <p className="text-sm text-[color:var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">
              Parcourez notre catalogue et appuyez sur le cœur pour sauvegarder vos produits préférés.
            </p>
          </div>
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm text-white transition-all"
            style={{ background: '#f43f5e' }}
          >
            <ShoppingBag className="w-4 h-4" />
            Explorer le Catalogue
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {products.map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                layout
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </AccountPageLayout>
  );
}
