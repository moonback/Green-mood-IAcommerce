import { X, ShoppingCart, Star, Package, CheckCircle, XCircle, TrendingDown, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../lib/types';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';

interface ProductCompareModalProps {
  products: Product[];
  onClose: () => void;
}

function StarRow({ rating, count }: { rating?: number; count?: number }) {
  if (!rating || rating === 0) return <span className="text-[color:var(--color-text-muted)] text-sm">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-[color:var(--color-text-subtle)]'}`}
          />
        ))}
      </div>
      <span className="text-xs text-[color:var(--color-text-muted)]">{rating.toFixed(1)}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-[color:var(--color-text-subtle)]">({count})</span>
      )}
    </div>
  );
}

function BestBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--color-primary-contrast)] bg-[color:var(--color-primary)] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(var(--theme-neon-rgb),0.3)]">
      <Award className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export default function ProductCompareModal({ products, onClose }: ProductCompareModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const openSidebar = useCartStore((s) => s.openSidebar);
  const addToast = useToastStore((s) => s.addToast);

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
    openSidebar();
    addToast({ message: `${product.name} ajouté au panier`, type: 'success' });
  };

  // Compute best values for highlighting
  const bestPrice = Math.min(...products.map((p) => p.price));
  const bestRating = Math.max(...products.map((p) => p.avg_rating ?? 0));

  const colCount = products.length;
  const gridCols = colCount === 2 ? 'grid-cols-2' : 'grid-cols-3';
  const rows: { label: string; render: (p: Product, i: number) => React.ReactNode }[] = [
    {
      label: 'Prix',
      render: (p) => (
        <div className="space-y-1">
          <span className={`text-xl font-bold ${p.price === bestPrice ? 'text-[color:var(--color-primary)]' : 'text-[color:var(--color-text)]'}`}>
            {p.price.toFixed(2)}€
          </span>
          {p.price === bestPrice && products.length > 1 && <BestBadge label="Meilleur prix" />}
        </div>
      ),
    },
    {
      label: 'Poids',
      render: (p) => (
        <span className="text-sm text-[color:var(--color-text-muted)]">
          {p.weight_grams != null ? `${p.weight_grams}g` : '—'}
        </span>
      ),
    },
    {
      label: 'Note clients',
      render: (p) => (
        <div className="space-y-1">
          <StarRow rating={p.avg_rating} count={p.review_count} />
          {p.avg_rating === bestRating && bestRating > 0 && products.length > 1 && <BestBadge label="Mieux noté" />}
        </div>
      ),
    },
    {
      label: 'Effets',
      render: (p) => {
        const b = p.attributes?.benefits || p.attributes?.effects || p.attributes?.effets || [];
        const benefits = Array.isArray(b) ? b : [];
        if (benefits.length === 0) return <span className="text-[color:var(--color-text-muted)] text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {benefits.map((benefit: string) => (
              <span key={benefit} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20">
                {benefit}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: 'Arômes',
      render: (p) => {
        const a = p.attributes?.aromas || p.attributes?.flavors || p.attributes?.aromes || [];
        const aromas = Array.isArray(a) ? a : [];
        if (aromas.length === 0) return <span className="text-[color:var(--color-text-muted)] text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {aromas.map((aroma: string) => (
              <span key={aroma} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[color:var(--color-text)]/5 text-[color:var(--color-text-muted)] border border-[color:var(--color-border)]">
                {aroma}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: 'Catégorie',
      render: (p) => (
        <span className="text-sm text-[color:var(--color-text-muted)]">{p.category?.name ?? '—'}</span>
      ),
    },
    {
      label: 'Disponibilité',
      render: (p) => (
        p.is_available && p.stock_quantity > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--color-primary)]">
            <CheckCircle className="w-3.5 h-3.5" />
            En stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400">
            <XCircle className="w-3.5 h-3.5" />
            Épuisé
          </span>
        )
      ),
    },
    {
      label: 'Type',
      render: (p) => (
        <div className="flex flex-wrap gap-1.5">
          {p.is_featured && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-primary-strong)] text-[color:var(--color-primary-contrast)]">Elite</span>
          )}
          {p.is_bundle && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-600/80 text-white">
              <Package className="w-2.5 h-2.5" />Pack
            </span>
          )}
          {p.is_subscribable && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/20">Abonnement</span>
          )}
          {!p.is_featured && !p.is_bundle && !p.is_subscribable && (
            <span className="text-[color:var(--color-text-muted)] text-sm">Standard</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-[color:var(--color-overlay)] backdrop-blur-xl flex flex-col"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col h-full max-w-6xl mx-auto w-full bg-[color:var(--color-bg)] shadow-[0_-20px_80px_rgba(0,0,0,0.5)] md:rounded-t-[3rem] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--color-border)] flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[color:var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[color:var(--color-text)] uppercase tracking-tight">Comparatif Produits</h2>
                <p className="text-[10px] text-[color:var(--color-text-muted)] font-bold uppercase tracking-widest">{products.length} produits sélectionnés</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-text)]/5 flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-text)]/20 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 custom-scrollbar">
            {/* Product images + names header */}
            <div className={`grid ${gridCols} gap-4 mb-8 sticky top-0 z-10 bg-[color:var(--color-bg)]/80 backdrop-blur-xl pb-4 border-b border-[color:var(--color-border)]`}>
              {products.map((p) => (
                <div key={p.id} className="space-y-3 text-center">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-[color:var(--color-text)]/5 max-w-[160px] mx-auto border border-[color:var(--color-border)]">
                    <img
                      src={getProductImageSrc(p.image_url)}
                      alt={p.name}
                      className="w-full h-full object-contain p-2"
                      onError={applyProductImageFallback}
                    />
                  </div>
                  <h3 className="font-bold text-[color:var(--color-text)] text-sm leading-tight line-clamp-2 px-2">{p.name}</h3>
                </div>
              ))}
            </div>

            {/* Comparison rows */}
            <div className="space-y-0">
              {rows.map((row, rowIdx) => (
                <div
                  key={row.label}
                  className={`grid gap-4 py-4 border-b border-[color:var(--color-border)]/30 ${rowIdx % 2 === 0 ? 'bg-[color:var(--color-text)]/[0.015]' : ''}`}
                  style={{ gridTemplateColumns: `140px repeat(${colCount}, 1fr)` }}
                >
                  <div className="flex items-start pt-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">{row.label}</span>
                  </div>
                  {products.map((p, i) => (
                    <div key={p.id} className="flex items-start">
                      {row.render(p, i)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Footer — add to cart buttons */}
          <div className="flex-shrink-0 border-t border-[color:var(--color-border)] px-6 py-5 bg-[color:var(--color-bg)]/80 backdrop-blur-xl">
            <div className={`grid ${gridCols} gap-4`}>
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  disabled={!p.is_available || p.stock_quantity === 0}
                  className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-primary-strong)] text-[color:var(--color-primary-contrast)] font-bold uppercase tracking-widest text-xs rounded-2xl hover:shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.3)] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <ShoppingCart className="w-4 h-4 transition-transform group-hover:-rotate-12" />
                  <span className="hidden sm:inline">Ajouter</span>
                  <span className="text-[10px] font-black">{p.price.toFixed(2)}€</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-[color:var(--color-text-muted)]" />
                <span className="text-[10px] text-[color:var(--color-text-muted)] font-bold uppercase tracking-widest">
                  Économie max: {(Math.max(...products.map(p => p.price)) - bestPrice).toFixed(2)}€
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-xs text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] font-bold uppercase tracking-widest transition-colors"
              >
                Fermer la comparaison
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
