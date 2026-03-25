import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Package, RefreshCw, Heart, Scale } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../lib/types';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';


import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import { useWishlistStore } from '../store/wishlistStore';
import StockBadge from './StockBadge';
import StarRating from './StarRating';
import { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';


interface ProductCardProps {
  product: Product;
  isCompared?: boolean;
  onToggleCompare?: () => void;
}

export default function ProductCard({ product, isCompared, onToggleCompare }: ProductCardProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  const openSidebar = useCartStore((s) => s.openSidebar);
  const addToast = useToastStore((s) => s.addToast);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWished = useWishlistStore((s) => s.hasItem(product.id));

  const handleToggleWishlist = (e: MouseEvent) => {
    e.preventDefault();
    toggleWishlist(product.id);
    addToast({
      message: isWished ? `${product.name} retiré des favoris` : `${product.name} ajouté aux favoris`,
      type: isWished ? 'info' : 'success',
    });
  };

  const handleAddToCart = (e: MouseEvent) => {
    e.preventDefault();
    addItem(product, selectedQuantity);
    openSidebar();
    addToast({ message: `${product.name} (×${selectedQuantity}) ajouté au panier`, type: 'success' });
  };


  const { settings } = useSettingsStore();

  // All gaming products are sold per unit
  const isPerUnit = true;

  // Loyalty points calculation
  const earnedPoints = Math.round((product.price * selectedQuantity) * (settings.loyalty_earn_rate || 1));

  // Limit to 2 key tags for cleaner card
  const tags: { label: string; variant: 'spec' | 'feature' | 'attribute' | 'sales' }[] = [];

  // Sales Boosting logic
  if (product.avg_rating && product.avg_rating >= 4.5 && product.review_count && product.review_count > 5) {
    tags.push({ label: '⭐ Top Rated', variant: 'sales' });
  } else if (product.stock_quantity > 0 && product.stock_quantity <= 10) {
    tags.push({ label: '⚡ Stock Limité', variant: 'sales' });
  } else if (product.is_featured) {
    tags.push({ label: '💎 Best Pick', variant: 'sales' });
  }

  // Tech specs from attributes.specs
  for (const spec of (product.attributes?.specs || []).slice(0, 2)) {
    if (tags.length < 2) tags.push({ label: spec, variant: 'spec' });
  }

  // Fallback: brand badge
  if (tags.length < 2 && product.attributes?.brand) {
    tags.push({ label: product.attributes.brand, variant: 'feature' });
  }

  const tagStyles = {
    spec: 'bg-white/[0.05] text-zinc-300 border border-white/[0.1] backdrop-blur-md',
    feature: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md',
    attribute: 'bg-white/[0.03] text-zinc-400 border border-white/[0.05] backdrop-blur-md',
    sales: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black animate-pulse-slow',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative bg-zinc-900/30 rounded-[2rem] border overflow-hidden transition-all duration-500 shadow-xl ${isCompared ? 'border-indigo-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'border-white/10 hover:border-emerald-500/30'}`}
    >
      {/* Background Glow Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Bundle badge */}
      {product.is_bundle && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-purple-600/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
          <Package className="w-3 h-3" />
          Pack
        </div>
      )}

      {/* Featured badge */}
      {product.is_featured && !product.is_bundle && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-emerald-500 text-black backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[0_4px_20px_rgba(16,185,129,0.2)]">
          <Star className="w-3 h-3 fill-current" />
          Elite
        </div>
      )}

      {/* Wishlist + Compare + Subscription badges */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleToggleWishlist}
          className={`flex items-center justify-center w-9 h-9 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${isWished
            ? 'bg-red-500 border-red-500 text-white shadow-[0_2px_12px_rgba(239,68,68,0.2)]'
            : 'bg-zinc-950/40 border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/30'
            }`}
        >
          <Heart className={`w-4 h-4 ${isWished ? 'fill-current' : ''}`} />
        </button>
        {onToggleCompare && (
          <button
            onClick={(e) => { e.preventDefault(); onToggleCompare(); }}
            title={isCompared ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
            className={`flex items-center justify-center w-9 h-9 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${isCompared
              ? 'bg-indigo-500 border-indigo-500 text-white shadow-[0_2px_12px_rgba(99,102,241,0.2)]'
              : 'bg-zinc-950/40 border-white/10 text-zinc-400 hover:text-indigo-400 hover:border-indigo-400/30'
              }`}
          >
            <Scale className="w-4 h-4" />
          </button>
        )}
        {product.is_subscribable && (
          <div className="flex items-center justify-center w-9 h-9 bg-zinc-950/40 backdrop-blur-xl rounded-2xl border border-white/10 text-emerald-400 shadow-lg">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
          </div>
        )}
      </div>

      {/* Image — Aspect Square for better fit */}
      <Link to={`/catalogue/${product.slug}`} className="relative block aspect-square overflow-hidden bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors duration-500">
        <img
          src={getProductImageSrc(product.image_url)}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain p-6 sm:p-8 grayscale-[0.2] transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 translate-y-2"
          onError={applyProductImageFallback}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/20 via-transparent to-transparent opacity-40 group-hover:opacity-10 transition-opacity duration-500" />
      </Link>

      {/* Content */}
      <div className="p-5 md:p-6 space-y-4 relative z-10">
        <div className="space-y-2">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.label} className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${tagStyles[tag.variant]}`}>
                {tag.label}
              </span>
            ))}
          </div>

          {/* Name */}
          <Link
            to={`/catalogue/${product.slug}`}
            className="block font-serif font-bold text-lg md:text-xl text-white leading-tight line-clamp-1 group-hover:text-emerald-400 transition-colors duration-300"
          >
            {product.name}
          </Link>

          {/* Star rating */}
          {product.avg_rating !== undefined && product.avg_rating > 0 && (
            <div className="flex items-center gap-1">
              <StarRating
                rating={product.avg_rating}
                size="sm"
                showCount={false}
              />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">({product.review_count})</span>
            </div>
          )}
        </div>


        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="space-y-0.5">
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold font-serif text-white tracking-tight">
                {(product.price * selectedQuantity).toFixed(2)}<span className="text-emerald-400 ml-1">€</span>
              </span>
              
              {/* Loyalty Points Display */}
              {settings.loyalty_program_enabled && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-sm shadow-amber-500/5">
                    <span className="text-[8px] text-amber-500 font-black tracking-tighter italic">GOLD GEAR</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                  <span className="text-[10px] font-black text-amber-500/90 tracking-widest uppercase italic">
                    +{earnedPoints} {settings.loyalty_currency_name || 'POINTS'}
                  </span>
                </div>
              )}
            </div>

            {product.is_bundle && product.original_value && product.original_value > product.price && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 line-through">
                  {product.original_value.toFixed(2)}€
                </span>
                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                  −{(product.original_value - product.price).toFixed(2)}€
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.is_available || product.stock_quantity === 0}
            className="flex items-center justify-center w-12 h-12 md:w-auto md:px-6 md:py-3 bg-emerald-500 text-black rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all duration-300 hover:shadow-[0_2px_12px_rgba(16,185,129,0.2)] active:scale-95 disabled:opacity-30 group/btn"
          >
            <ShoppingCart className="w-4 h-4 md:mr-2 group-hover/btn:scale-110 transition-transform" />
            <span className="hidden md:inline text-[9px]">Acheter</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
