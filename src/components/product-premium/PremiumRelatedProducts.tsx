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
    <section className="relative border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/50">
      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[color:var(--color-primary)] mb-2">Vous aimerez aussi</p>
            <h3 className="text-3xl font-['Inter',sans-serif] font-black text-[color:var(--color-text)] uppercase">Produits associés</h3>
          </div>
          <Link
            to="/catalogue"
            className="hidden sm:flex items-center gap-1.5 text-sm text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-primary)] transition-colors font-black uppercase tracking-widest"
          >
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {products.map((product, idx) => {
            const avgRating = (product as any).avg_rating ?? 4.5;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
              >
                <Link
                  to={`/catalogue/${product.slug}`}
                  className="group block rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] overflow-hidden hover:border-[color:var(--color-primary)]/35 hover:shadow-2xl transition-all duration-500"
                >
                  {/* Image */}
                  <div className="relative overflow-hidden aspect-[4/3] bg-[color:var(--color-bg-muted)]">
                    <img
                      src={getProductImageSrc(product.image_url)}
                      loading="lazy"
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={applyProductImageFallback}
                    />
                    {/* Category label */}
                    {product.category?.name && (
                      <span className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-[color:var(--color-bg)]/80 backdrop-blur-md text-[10px] font-black text-[color:var(--color-primary)] tracking-[0.2em] uppercase border border-[color:var(--color-primary)]/20 shadow-xl">
                        {product.category.name}
                      </span>
                    )}
                    {/* Shadow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Info */}
                  <div className="p-5 space-y-3">
                    <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[color:var(--color-text-subtle)]">Profil similaire</p>
                    <h4 className="text-base font-black text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors leading-tight uppercase">
                      {product.name}
                    </h4>

                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-[color:var(--color-bg-muted)]'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-[color:var(--color-text-subtle)] font-black">{Number(avgRating).toFixed(1)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[color:var(--color-border)]/50">
                      <p className="text-xl font-black text-[color:var(--color-primary)]">{product.price.toFixed(2)} €</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-primary)] transition-all transform group-hover:translate-x-1">
                        <span>Détails</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
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
