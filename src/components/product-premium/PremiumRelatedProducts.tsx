import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Star } from 'lucide-react';
import { applyProductImageFallback, getProductImageSrc } from '../../lib/productImage';
import type { Product } from '../../types/premiumProduct';

interface Props {
  products: Product[];
}

export default function PremiumRelatedProducts({ products }: Props) {
  if (!products.length) return null;

  return (
    <section className="relative transition-all">
      <div className="mx-auto max-w-[1200px] px-0 py-0">
        <div className="flex items-end justify-between mb-6">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--color-primary)]">Recommandations</p>
            <h3 className="text-xl font-black uppercase tracking-tight text-[color:var(--color-text)]">Produits associés</h3>
          </div>
          <Link
            to="/catalogue"
            className="flex items-center gap-1 text-[10px] text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-primary)] transition-colors font-black uppercase tracking-widest"
          >
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, idx) => {
            const avgRating = (product as any).avg_rating || 0;
            const reviewCount = (product as any).review_count || 0;
            const cbd = (product as any).attributes?.cbd_percentage || (product as any).cbd_percentage;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <Link
                  to={`/catalogue/${product.slug}`}
                  className="group block rounded-[1.5rem] border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 overflow-hidden hover:border-[color:var(--color-primary)]/40 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden aspect-[1.4/1] bg-[color:var(--color-bg-muted)]">
                    <img
                      src={getProductImageSrc(product.image_url)}
                      loading="lazy"
                      alt={product.name}
                      className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
                      onError={applyProductImageFallback}
                    />
                    {/* Corner Badge */}
                    {cbd && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] text-[8px] font-black uppercase tracking-tighter shadow-lg">
                        {cbd}% CBD
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2.5">
                    <h4 className="text-[13px] font-black text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors leading-tight uppercase truncate">
                      {product.name}
                    </h4>

                    <div className="flex items-center gap-2">
                      {reviewCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold text-[color:var(--color-text-subtle)]">{avgRating.toFixed(1)}</span>
                          <span className="text-[9px] text-[color:var(--color-text-muted)] opacity-50">({reviewCount})</span>
                        </div>
                      ) : (
                        <span className="text-[8px] font-bold text-[color:var(--color-text-muted)] uppercase tracking-tighter opacity-60">Nouvelle Variété</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[color:var(--color-border)]/50">
                      <p className="text-base font-black text-[color:var(--color-primary)]">{product.price.toFixed(2)} €</p>
                      <ArrowRight className="w-3.5 h-3.5 text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary)] transition-all transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
