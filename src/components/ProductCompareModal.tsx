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
  if (!rating || rating === 0) return <span className="text-slate-300 text-sm">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400">{rating.toFixed(1)}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-slate-300">({count})</span>
      )}
    </div>
  );
}

function BestBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white bg-[#2563eb] px-2 py-0.5 rounded-full">
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
          <span className={`text-xl font-bold font-['Inter',sans-serif] ${p.price === bestPrice ? 'text-cyan-300' : 'text-white'}`}>
            {p.price.toFixed(2)}€
          </span>
          {p.price === bestPrice && products.length > 1 && <BestBadge label="Meilleur prix" />}
        </div>
      ),
    },


    {
      label: 'Poids',
      render: (p) => (
        <span className="text-sm text-slate-300">
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
        const benefits = p.attributes?.benefits ?? [];
        if (benefits.length === 0) return <span className="text-slate-300 text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {benefits.map((b) => (
              <span key={b} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#2563eb]/10 text-cyan-300 border border-[#2563eb]/25">
                {b}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: 'Arômes',
      render: (p) => {
        const aromas = p.attributes?.aromas ?? [];
        if (aromas.length === 0) return <span className="text-slate-300 text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {aromas.map((a) => (
              <span key={a} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                {a}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: 'Catégorie',
      render: (p) => (
        <span className="text-sm text-slate-300">{p.category?.name ?? '—'}</span>
      ),
    },
    {
      label: 'Disponibilité',
      render: (p) => (
        p.is_available && p.stock_quantity > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300">
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
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gradient-to-r from-[#2563eb] to-[#06b6d4] text-white">Elite</span>
          )}
          {p.is_bundle && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-600/80 text-white">
              <Package className="w-2.5 h-2.5" />Pack
            </span>
          )}
          {p.is_subscribable && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">Abonnement</span>
          )}
          {!p.is_featured && !p.is_bundle && !p.is_subscribable && (
            <span className="text-slate-300 text-sm">Standard</span>
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
        className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col h-full max-w-6xl mx-auto w-full"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/25 flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Comparatif Produits</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{products.length} produits sélectionnés</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
            {/* Product images + names header */}
            <div className={`grid ${gridCols} gap-4 mb-8 sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl pb-4 border-b border-white/5`}>
              {products.map((p) => (
                <div key={p.id} className="space-y-3 text-center">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-slate-900/70 max-w-[160px] mx-auto">
                    <img
                      src={getProductImageSrc(p.image_url)}
                      alt={p.name}
                      className="w-full h-full object-contain p-2"
                      onError={applyProductImageFallback}
                    />
                  </div>
                  <h3 className="font-['Inter',sans-serif] font-bold text-white text-sm leading-tight line-clamp-2 px-2">{p.name}</h3>
                </div>
              ))}
            </div>

            {/* Comparison rows */}
            <div className="space-y-0">
              {rows.map((row, rowIdx) => (
                <div
                  key={row.label}
                  className={`grid gap-4 py-4 border-b border-white/[0.04] ${rowIdx % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
                  style={{ gridTemplateColumns: `140px repeat(${colCount}, 1fr)` }}
                >
                  <div className="flex items-start pt-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{row.label}</span>
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
          <div className="flex-shrink-0 border-t border-white/5 px-6 py-5 bg-slate-950/60 backdrop-blur-xl">
            <div className={`grid ${gridCols} gap-4`}>
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  disabled={!p.is_available || p.stock_quantity === 0}
                  className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#2563eb] to-[#06b6d4] text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Ajouter</span>
                  <span className="text-[10px] font-black">{p.price.toFixed(2)}€</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                  Économie max: {(Math.max(...products.map(p => p.price)) - bestPrice).toFixed(2)}€
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white font-bold uppercase tracking-widest transition-colors"
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
