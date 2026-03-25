import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, Star, Package } from 'lucide-react';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { useRecentlyViewedStore } from '../store/recentlyViewedStore';

interface RecentlyViewedProductsProps {
  currentProductId: string;
}

export default function RecentlyViewedProducts({ currentProductId }: RecentlyViewedProductsProps) {
  const items = useRecentlyViewedStore((s) => s.items);
  const products = useMemo(
    () => items.filter((item) => item.id !== currentProductId).slice(0, 4),
    [items, currentProductId]
  );

  if (products.length === 0) return null;

  return (
    <section className="mt-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
          <Eye className="w-4 h-4 text-zinc-300" />
        </div>
        <h2 className="font-serif text-2xl font-bold">Produits récemment consultés</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-transparent ml-2" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product, i) => (
          <motion.article
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            viewport={{ once: true }}
            className="group relative bg-zinc-900/50 rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/20 transition-all duration-300"
          >
            {product.is_bundle ? (
              <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-purple-600 px-2 py-0.5 rounded-full text-xs font-bold text-white">
                <Package className="w-3 h-3" />
                Pack
              </span>
            ) : product.is_featured ? (
              <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-emerald-500 px-2 py-0.5 rounded-full text-xs font-bold text-black">
                <Star className="w-3 h-3" />
                Top
              </span>
            ) : null}

            <Link to={`/catalogue/${product.slug}`} className="block aspect-[4/5] overflow-hidden bg-zinc-800/50">
              <img
                src={getProductImageSrc(product.image_url)}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                decoding="async"
                onError={applyProductImageFallback}
              />
            </Link>

            <div className="p-3 space-y-2">
              <Link
                to={`/catalogue/${product.slug}`}
                className="font-semibold text-sm text-white hover:text-emerald-400 transition-colors line-clamp-2"
              >
                {product.name}
              </Link>


              <p className="text-base font-bold text-emerald-400">{Number(product.price).toFixed(2)} €</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
