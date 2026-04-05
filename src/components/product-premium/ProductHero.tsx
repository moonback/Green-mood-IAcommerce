import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Shield, Truck, RefreshCw, Star, Minus, Plus, ChevronDown, Wrench, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { applyProductImageFallback, getProductImageSrc } from '../../lib/productImage';
import type { Product } from '../../types/premiumProduct';
import { useSettingsStore } from '../../store/settingsStore';

interface Props {
  product: Product;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onOpenModal: (type: 'specs' | 'performance' | 'story' | 'reviews' | 'related') => void;
}

const trustBadges = [
  { icon: <Shield className="w-3.5 h-3.5" />, label: 'Achat Sécurisé' },
  { icon: <Wrench className="w-3.5 h-3.5" />, label: 'Garantie Inclus' },
  { icon: <Truck className="w-3.5 h-3.5" />, label: 'Livraison 24h' },
];

export default function ProductHero({ product, quantity, onQuantityChange, onAddToCart, onBuyNow, onOpenModal }: Props) {
  const { settings } = useSettingsStore();
  const [selectedImg, setSelectedImg] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const images = [getProductImageSrc(product.image_url)];

  const inStock = (product as any).stock_quantity > 0 && (product as any).is_available !== false;
  // null = aucune note réelle — on n'affiche pas d'étoiles fictives
  const avgRating: number | null = (product as any).avg_rating ?? null;
  const reviewCount: number = (product as any).review_count ?? 0;

  return (
    <section className="relative overflow-hidden bg-[color:var(--color-bg)] h-full">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_10%_30%,rgba(var(--theme-neon-rgb),0.08),transparent_60%)]" />

      <div className="relative mx-auto px-4 py-6 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 xl:gap-16">

          {/* ── LEFT: Image gallery ── */}
          <div className="space-y-3">
            {/* Main image */}
            <motion.div
              className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] backdrop-blur-xl shadow-sm"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Featured badge */}
              {(product as any).is_featured && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/40 px-3 py-1.5 backdrop-blur-sm">
                  <Star className="w-3 h-3 fill-[color:var(--color-primary)] text-[color:var(--color-primary)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-primary)]">Vedette</span>
                </div>
              )}

              {/* Stock badge */}
              <div className={`absolute top-4 right-4 z-10 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm ${inStock
                ? 'bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/40 text-[color:var(--color-primary)]'
                : 'bg-red-500/10 border border-red-500/30 text-red-600'
                }`}>
                {inStock ? '● En stock' : '○ Rupture'}
              </div>

              <motion.img
                key={selectedImg}
                src={images[selectedImg]}
                alt={product.name}
                loading="eager"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="aspect-square w-full object-cover"
                whileHover={{ scale: 1.03 }}
                onError={applyProductImageFallback}
              />
            </motion.div>

            {/* Thumbnails (if multiple) */}
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === selectedImg ? 'border-[color:var(--color-primary)] shadow-[0_10px_25px_rgba(var(--theme-neon-rgb),0.35)]' : 'border-[color:var(--color-border)] opacity-70 hover:opacity-100'
                      }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" onError={applyProductImageFallback} />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] backdrop-blur-xl py-3 px-1 text-center shadow-sm">
                  <span className="text-[color:var(--color-primary)]">{b.icon}</span>
                  <span className="text-[9px] font-bold text-[color:var(--color-text-muted)] leading-tight uppercase tracking-wider">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Info + Buy ── */}
          <div className="flex flex-col gap-6">
            {/* Brand + Category */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-primary)]">{settings.store_name}</span>
                {product.category?.name && (
                  <>
                    <span className="text-[color:var(--color-text-subtle)]">·</span>
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[color:var(--color-text-muted)]">{product.category.name}</span>
                  </>
                )}
              </div>

              <h1 className="text-3xl text-[color:var(--color-text)] leading-tight md:text-5xl xl:text-6xl" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                {product.name}
              </h1>

              {/* Rating row — affiché uniquement si note réelle en BDD */}
              <div className="mt-3 flex items-center gap-2 min-h-[24px]">
                {avgRating !== null && avgRating > 0 ? (
                  <>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.round(avgRating!) ? 'fill-amber-400 text-amber-400' : 'text-[color:var(--color-text-subtle)]'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-[color:var(--color-text)]">{Number(avgRating).toFixed(1)}</span>
                    {reviewCount > 0 && (
                      <span className="text-sm text-[color:var(--color-text-muted)]">({reviewCount} avis)</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-[color:var(--color-text-muted)] italic">Aucune note pour le moment</span>
                )}
              </div>
            </div>

            {/* Tech Feature chips */}
            {(product.techFeatures || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(product.techFeatures || []).map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-muted)]/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] hover:border-[color:var(--color-primary)]/30 hover:text-[color:var(--color-primary)] transition-colors shadow-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            )}

            {/* Quick Tech Specs Bar */}
            <div className="grid grid-cols-2 gap-3">
              {(product.productSpecs || []).slice(0, 4).map((spec) => (
                <div
                  key={spec.name}
                  className="flex flex-col gap-2 p-3.5 rounded-2xl bg-[color:var(--color-card)]/40 backdrop-blur-md border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/40 transition-all duration-300 shadow-sm relative overflow-hidden group hover:shadow-[0_4px_20px_rgba(var(--theme-primary-rgb),0.05)] hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)] flex items-center gap-2 relative z-10">
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] text-xs text-[color:var(--color-text)] group-hover:bg-[color:var(--color-primary)]/10 group-hover:text-[color:var(--color-primary)] group-hover:border-[color:var(--color-primary)]/30 transition-colors shadow-inner">
                      {spec.icon}
                    </span>
                    <span className="truncate">{spec.name}</span>
                  </span>
                  <p className="text-[11px] font-medium text-[color:var(--color-text)] leading-relaxed relative z-10 break-words line-clamp-2">
                    {spec.description?.split(':').pop()?.trim() || spec.description}
                  </p>
                </div>
              ))}
              {/* Fallback if no specs are found */}
              {((product.productSpecs || []).length === 0) && (
                <div className="col-span-2 flex items-center justify-center p-6 rounded-2xl bg-[color:var(--color-card)]/20 backdrop-blur-sm border border-[color:var(--color-border)] border-dashed">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-subtle)] flex items-center gap-2 opacity-60">
                    <BookOpen className="w-4 h-4" /> Fiche technique en cours d'élaboration...
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div
              className="text-base text-[color:var(--color-text-muted)] leading-relaxed border-l-2 border-[color:var(--color-primary)]/40 pl-6 font-medium [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:text-[color:var(--color-primary)]"
              dangerouslySetInnerHTML={{ __html: product.shortDescription }}
            />

            {/* ── BUY BOX (Amazon-style sticky card) ── */}
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)] backdrop-blur-xl shadow-md p-5 space-y-5">

              {/* Price */}
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-[color:var(--color-text)]">{product.price.toFixed(2)}<span className="text-xl ml-1 text-[color:var(--color-text-muted)]">€</span></span>
                <div className="mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inStock ? 'text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10' : 'text-red-700 bg-red-50'
                    }`}>
                    {inStock ? 'En stock' : 'Rupture de stock'}
                  </span>
                </div>
              </div>

              {/* Subtotal */}
              {quantity > 1 && (
                <p className="text-xs text-[color:var(--color-text-muted)]">
                  Sous-total : <span className="text-[color:var(--color-text)] font-bold">{(product.price * quantity).toFixed(2)} €</span>
                </p>
              )}

              {/* Quantity selector */}
              <div className="flex items-center gap-0">
                <span className="text-xs text-[color:var(--color-text-muted)] mr-3">Qté :</span>
                <div className="flex items-center border border-[color:var(--color-border)] rounded-xl overflow-hidden bg-[color:var(--color-bg-elevated)]">
                  <button
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-muted)] transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-[color:var(--color-text)]">{quantity}</span>
                  <button
                    onClick={() => onQuantityChange(quantity + 1)}
                    disabled={quantity >= Math.max(1, Number((product as any).stock_quantity || 1))}
                    className="w-10 h-10 flex items-center justify-center text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-muted)] transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="grid gap-3">
                <button
                  onClick={onAddToCart}
                  disabled={!inStock}
                  className="group flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[color:var(--color-primary)] px-6 py-3 font-bold text-[color:var(--color-primary-contrast)] transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(var(--theme-neon-rgb),0.45)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Ajouter au panier
                    </div>
                    {settings.loyalty_program_enabled && (
                      <div className="flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full bg-[color:var(--color-bg-muted)] border border-[color:var(--color-border)]">
                        <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 italic">
                          +{Math.round(product.price * quantity * (settings.loyalty_earn_rate || 1))} {settings.loyalty_currency_name || 'POINTS'}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              </div>

              {/* Urgency / Social Proof */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-400/10 border border-amber-300/20">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-[10px] font-bold text-amber-500/90 uppercase tracking-widest">
                  {Math.floor(Math.random() * 12) + 3} personnes consultent ce produit
                </p>
              </div>

              {/* Reassurance */}
              <div className="flex items-center justify-between pt-1 border-t border-[color:var(--color-border)]">
                {[
                  { icon: <Truck className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />, text: 'Expédition Rapide en 24h' },
                  { icon: <RefreshCw className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />, text: 'Retours faciles sous 30 jours' },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />, text: 'Paiement sécurisé en 3x/4x' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* ── INTERACTIVE DISCOVERY BUTTONS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {[
                { id: 'specs', label: 'Specs', icon: <Wrench className="w-5 h-5" />, color: 'var(--color-primary)' },
                { id: 'performance', label: 'Performance', icon: <Sparkles className="w-5 h-5 text-cyan-400" />, color: 'rgb(34, 211, 238)' },
                { id: 'story', label: 'Histoire', icon: <BookOpen className="w-5 h-5 text-amber-400" />, color: 'rgb(251, 191, 36)' },
                { id: 'reviews', label: 'Avis', icon: <Star className="w-5 h-5 text-emerald-400" />, color: 'rgb(52, 211, 153)' },
                { id: 'related', label: 'Plus', icon: <Plus className="w-5 h-5 text-purple-400" />, color: 'rgb(192, 132, 252)' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => onOpenModal(item.id as any)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 backdrop-blur-md p-3 transition-all hover:scale-105 hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-card)] shadow-sm group"
                >
                  <div className="p-2 rounded-xl bg-[color:var(--color-bg-elevated)] group-hover:bg-[color:var(--color-primary)]/10 transition-colors">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
