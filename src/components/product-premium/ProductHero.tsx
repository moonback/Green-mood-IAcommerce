import { useState, memo } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag, Shield, Truck, RefreshCw, Star, Minus, Plus,
  Wrench, CheckCircle2, Sparkles, BookOpen,
} from 'lucide-react';
import { applyProductImageFallback, getProductImageSrc } from '../../lib/productImage';
import type { Product } from '../../types/premiumProduct';
import { useSettingsStore } from '../../store/settingsStore';

import SubscriptionSelector from '../SubscriptionSelector';
import type { SubscriptionFrequency } from '../../lib/types';

interface Props {
  product: Product;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: (frequency?: SubscriptionFrequency | null) => void;
  onBuyNow: (frequency?: SubscriptionFrequency | null) => void;
  onOpenModal: (type: 'specs' | 'performance' | 'story' | 'reviews' | 'related') => void;
}

const discoveryButtons = [
  { id: 'specs', label: 'Specs', icon: <Wrench className="w-3.5 h-3.5 text-blue-400" /> },
  { id: 'performance', label: 'Efficacité', icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: 'story', label: 'Concept', icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" /> },
  { id: 'reviews', label: 'Avis', icon: <Star className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'related', label: 'Similaires', icon: <Plus className="w-3.5 h-3.5 text-purple-400" /> },
] as const;

const ProductHero = memo(({ product, quantity, onQuantityChange, onAddToCart, onOpenModal }: Props) => {
  const { settings } = useSettingsStore();
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedFrequency, setSelectedFrequency] = useState<SubscriptionFrequency | null>(null);

  // States for the image zoom feature
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const images = [getProductImageSrc(product.image_url)];
  const inStock = (product as any).stock_quantity > 0 && (product as any).is_available !== false;
  const avgRating: number | null = (product as any).avg_rating ?? null;
  const reviewCount: number = (product as any).review_count ?? 0;

  // Calculate price with subscription discount
  const getSubDiscount = (freq: SubscriptionFrequency | null) => {
    if (freq === 'weekly') return 0.15;
    if (freq === 'biweekly') return 0.10;
    if (freq === 'monthly') return 0.05;
    return 0;
  };

  const currentPrice = product.price * (1 - getSubDiscount(selectedFrequency));

  return (
    <section className="relative overflow-hidden bg-[color:var(--color-bg)] py-4 sm:py-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_50%_at_0%_0%,rgba(var(--theme-neon-rgb),0.08),transparent_70%)]" />

      <div className="relative mx-auto px-4 max-w-[1400px]">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[400px_1fr] gap-6 lg:gap-10 items-start">

          {/* ── LEFT: Visual Column ── */}
          <div className="space-y-4">
            {/* Image Container */}
            <motion.div
              className="group relative aspect-square overflow-hidden rounded-[2rem] border border-[color:var(--color-border)]/40 bg-[color:var(--color-card)]/60 shadow-[0_20px_60px_rgba(0,0,0,0.15)] backdrop-blur-2xl cursor-crosshair transition-all duration-700 hover:shadow-[0_40px_80px_rgba(15,28,22,0.2)] hover:border-green-neon/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => {
                setIsZooming(false);
                setTimeout(() => setZoomPos({ x: 50, y: 50 }), 300); // resets gently after transition
              }}
              onMouseMove={handleMouseMove}
            >
              {/* Featured & Stock Badges */}
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 pointer-events-none">
                {(product as any).is_featured && (
                  <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--color-bg-elevated)] border border-amber-500/30 px-2 py-0.5 backdrop-blur-md">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Premium</span>
                  </div>
                )}
                <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 backdrop-blur-md border ${inStock
                  ? 'bg-green-500/10 border-green-500/30 text-green-500'
                  : 'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}>
                  <div className={`w-1 h-1 rounded-full ${inStock ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{inStock ? 'Stock' : 'Rupture'}</span>
                </div>
              </div>

              <motion.img
                key={selectedImg}
                src={images[selectedImg]}
                alt={product.name}
                className={`h-full w-full object-cover pointer-events-none ${isZooming ? 'scale-[2.5]' : 'scale-100 group-hover:scale-105'}`}
                style={{
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transition: isZooming ? 'transform 0.15s ease-out' : 'transform 0.5s ease-out, transform-origin 0.5s ease-out',
                }}
                onError={applyProductImageFallback}
              />
            </motion.div>

            {/* Reassurance Row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Shield className="w-3 h-3" />, text: 'Garantie' },
                { icon: <Truck className="w-3 h-3" />, text: 'Express' },
                { icon: <RefreshCw className="w-3 h-3" />, text: '30j Retours' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[color:var(--color-card)]/20 border border-[color:var(--color-border)] text-center opacity-70">
                  <span className="text-[color:var(--color-primary)]">{item.icon}</span>
                  <span className="text-[7px] font-black uppercase tracking-tight text-[color:var(--color-text-muted)]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Details Column ── */}
          <div className="flex flex-col gap-4">

            {/* Title Block */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[color:var(--color-primary)]">
                  {settings.store_name}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-[color:var(--color-primary)]/40 to-transparent" />
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-[color:var(--color-text)] tracking-tight drop-shadow-sm" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {product.name}
              </h1>

              <div className="flex items-center gap-3">
                {avgRating !== null && avgRating > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-[color:var(--color-text-muted)] opacity-30'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-400">{avgRating.toFixed(1)}</span>
                    <span className="text-[10px] text-[color:var(--color-text-muted)]">({reviewCount} avis)</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-[color:var(--color-text-muted)] italic">Édition Exclusive</span>
                )}
                {product.category?.name && (
                  <span className="rounded-md bg-[color:var(--color-primary)]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[color:var(--color-primary)]">
                    {product.category.name}
                  </span>
                )}
                {(product.cbd_percentage != null && product.cbd_percentage > 0) && (
                  <span className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-card)]/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)]">
                    CBD {Number(product.cbd_percentage).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Description Snippet */}
            <div
              className="text-sm text-[color:var(--color-text-muted)] leading-relaxed line-clamp-4 max-w-xl opacity-80"
              dangerouslySetInnerHTML={{ __html: product.shortDescription }}
            />

            {/* Subscription Selector */}
            {settings.subscriptions_enabled && (
              <SubscriptionSelector
                isSubscribable={product.is_subscribable}
                selectedFrequency={selectedFrequency}
                onFrequencyChange={setSelectedFrequency}
              />
            )}

            {/* Specs Grid — Premium & Professional */}
            {(product.productSpecs || []).length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {product.productSpecs.slice(0, 4).map((spec) => (
                  <div
                    key={spec.name}
                    className="group relative flex items-center gap-3 rounded-2xl bg-[color:var(--color-card)]/40 border border-[color:var(--color-border)]/60 p-3 transition-all duration-300 hover:border-green-neon/30 hover:bg-[color:var(--color-bg-elevated)] hover:shadow-[0_8px_30px_rgba(15,28,22,0.12)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-bg)] border border-[color:var(--color-border)]/80 text-[color:var(--color-primary)] transition-transform duration-500 group-hover:scale-110 group-hover:border-green-neon/50 group-hover:text-green-neon group-hover:shadow-[0_0_15px_rgba(var(--theme-neon-rgb),0.3)] shadow-sm">
                      <span className="text-sm">{spec.icon}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] truncate mb-0.5">
                        {spec.name}
                      </span>
                      <span
                        className="text-[11px] font-bold text-[color:var(--color-text)] block"
                        dangerouslySetInnerHTML={{
                          __html: spec.description?.includes(':')
                            ? (spec.description.split(':').pop()?.trim() || '')
                            : (spec.description || '')
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA Box (Buy Zone) */}
            <div className="mt-4 rounded-[2.5rem] border border-[color:var(--color-border)]/50 bg-[color:var(--color-card)]/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl relative overflow-hidden transition-all duration-500 hover:border-green-neon/30 hover:shadow-[0_30px_60px_rgba(15,28,22,0.2)]">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-neon/5 blur-[80px] rounded-full pointer-events-none" />
              <div className="flex flex-wrap items-center justify-between gap-4">

                {/* Price Section */}
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[color:var(--color-text)]">{currentPrice.toFixed(2)}</span>
                    <span className="text-lg font-bold text-[color:var(--color-primary)]">€</span>
                  </div>
                  {(quantity > 1 || selectedFrequency) && (
                    <span className="text-[10px] text-[color:var(--color-text-muted)] uppercase tracking-widest">
                      Total: <span className="text-[color:var(--color-text)] font-bold">{(currentPrice * quantity).toFixed(2)}€</span>
                    </span>
                  )}
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-3">
                  {/* Qty Selector */}
                  <div className="flex items-center rounded-lg bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] p-1">
                    <button
                      onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[color:var(--color-bg-muted)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-xs font-black text-[color:var(--color-text)]">{quantity}</span>
                    <button
                      onClick={() => onQuantityChange(quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[color:var(--color-bg-muted)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={() => onAddToCart(selectedFrequency)}
                    disabled={!inStock}
                    className="relative group overflow-hidden flex items-center gap-3 rounded-2xl bg-[color:var(--color-primary)] px-6 min-h-[48px] font-black text-black uppercase tracking-[0.15em] text-[11px] shadow-[0_8px_20px_rgba(var(--theme-neon-rgb),0.3)] transition-all duration-300 hover:shadow-[0_12px_25px_rgba(var(--theme-neon-rgb),0.5)] active:scale-95 disabled:opacity-50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                    <ShoppingBag className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">{selectedFrequency ? 'S\'abonner' : 'Commander'}</span>
                  </button>
                </div>
              </div>

              {/* Loyalty snippet */}
              {settings.loyalty_program_enabled && inStock && (
                <div className="mt-3 flex items-center gap-2 border-t border-[color:var(--color-border)] pt-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400/80">
                    Gain de {Math.round(product.price * quantity * (settings.loyalty_earn_rate || 1))} {settings.loyalty_currency_name || 'points'} club
                  </p>
                </div>
              )}
            </div>

            {/* Discovery Bar */}
            <div className="flex flex-wrap gap-2 pt-2">
              {discoveryButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => onOpenModal(btn.id as any)}
                  className="flex items-center gap-2 rounded-xl bg-[color:var(--color-card)]/[0.3] backdrop-blur-md border border-[color:var(--color-border)]/50 px-3 py-2 transition-all hover:bg-[color:var(--color-bg-elevated)] hover:border-[color:var(--color-primary)]/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95 group"
                >
                  <span className="opacity-70 group-hover:opacity-100 transition-opacity">{btn.icon}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)] transition-colors">{btn.label}</span>
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
});

export default ProductHero;
