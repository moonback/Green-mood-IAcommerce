import { Link } from 'react-router-dom';
import { X, ShoppingCart, Trash2, Package, Truck, ShoppingBag, ArrowRight, Minus, Plus, ShieldCheck, Crown, Star, Coins } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import FreeShippingGauge from './FreeShippingGauge';
import EmptyCartSuggestions from './EmptyCartSuggestions';
import LoyaltyRedemption from './LoyaltyRedemption';
import { CATEGORY_SLUGS } from '../lib/constants';


export default function CartSidebar() {
  const {
    items,
    isOpen,
    deliveryType,
    closeSidebar,
    removeItem,
    updateQuantity,
    setDeliveryType,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    pointsDiscount,
  } = useCartStore();

  const settings = useSettingsStore((s) => s.settings);
  const { profile } = useAuthStore();

  const sub = subtotal();
  
  // Tier Logic for benefits
  const points = profile?.loyalty_points ?? 0;
  const tiers = settings.loyalty_tiers || [];
  const currentTier = [...tiers].sort((a, b) => b.min_points - a.min_points).find(t => points >= t.min_points) || tiers[0];

  // 1. VIP Discount (from tier settings)
  const vipDiscount = (settings.loyalty_program_enabled && currentTier) ? Math.round(sub * currentTier.vip_discount * 100) / 100 : 0;

  // 3. Points Discount
  const pointsVal = pointsDiscount(points, settings.loyalty_redeem_rate || 5);

  // 2. Shipping Fee Logic (from tier settings)
  let fee = deliveryFee();
  if (deliveryType === 'delivery' && currentTier) {
    if (currentTier.free_shipping_threshold !== null) {
      fee = sub >= currentTier.free_shipping_threshold ? 0 : settings.delivery_fee;
    }
  }

  const tot = Math.max(0, sub + fee - vipDiscount - pointsVal);
  const count = itemCount();

  // Flags for UI
  const isGold = currentTier?.id === 'gold';
  const isSilver = currentTier?.id === 'silver';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-[color:var(--color-overlay)]/70 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-[480px] z-[100] flex flex-col bg-[color:var(--color-bg)] border-l border-[color:var(--color-border)] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 lg:px-12 pt-8 pb-4 flex items-center justify-between border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
              <div className="space-y-0.5">
                <h2 className="text-lg lg:text-2xl font-serif font-bold tracking-tight text-[color:var(--color-text)] uppercase italic">
                  CONCIERGERIE.
                </h2>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
                  <p className="text-[10px] lg:text-xs font-mono uppercase tracking-[0.3em] text-[color:var(--color-text-subtle)]">
                    {count} ARTICLE{count > 1 ? 'S' : ''} SÉLECTIONNÉ{count > 1 ? 'S' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={closeSidebar}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)]/90 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] flex items-center justify-center transition-all group"
              >
                <X className="w-4 h-4 lg:w-5 lg:h-5 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 overflow-y-auto scrollbar-thin bg-[color:var(--color-bg)]">
                  <div className="space-y-6 shrink-0">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-[color:var(--color-card)]/85 border border-[color:var(--color-border)] flex items-center justify-center relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <ShoppingBag className="w-8 h-8 text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-primary)] transition-colors relative z-10" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-serif text-3xl font-black text-[color:var(--color-text)] italic">Votre sélection est vide</p>
                      <p className="text-[color:var(--color-text-subtle)] text-xs font-bold uppercase tracking-[0.2em] opacity-60">
                        Laissez-vous tenter par l'exception
                      </p>
                    </div>
                  </div>
                  {settings.empty_cart_suggestions_enabled && (
                    <div className="w-full max-w-2xl">
                      <EmptyCartSuggestions />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Items list — scrollable */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin bg-[color:var(--color-bg-elevated)]/20">
                    <div className="p-5 space-y-4">
                      {/* Cart Items */}
                      <div className="space-y-3">

                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.div
                          key={item.product.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="group relative flex gap-4 p-4 rounded-2xl bg-[color:var(--color-bg)] border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/30 transition-all"
                        >
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[color:var(--color-card)] shrink-0">
                            <img
                              src={getProductImageSrc(item.product.image_url)}
                              alt={item.product.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              onError={applyProductImageFallback}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-[color:var(--color-primary)] uppercase tracking-widest mb-0.5">
                                    {item.product.category?.name || 'Exception'}
                                  </p>
                                  <h3 className="text-sm font-bold text-[color:var(--color-text)] truncate leading-tight">
                                    {item.product.name}
                                  </h3>
                                </div>
                                <button
                                  onClick={() => removeItem(item.product.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-[color:var(--color-text-muted)] hover:text-red-500 transition-all shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-end justify-between gap-4 mt-4">
                              <div className="flex items-center p-1 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)]">
                                <button
                                  onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] transition-colors"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-10 text-center text-sm font-black text-[color:var(--color-text)]">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-right">
                                {item.product.original_value && item.product.original_value > item.product.price && (
                                  <p className="text-xs text-[color:var(--color-text-subtle)] font-medium line-through opacity-50">
                                    {(item.product.original_value * item.quantity).toFixed(2)} €
                                  </p>
                                )}
                                <p className="text-lg font-bold text-[color:var(--color-text)]">
                                  {(item.product.price * item.quantity).toFixed(2)} €
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                    </div>
                  </div>

                {/* Summary — sticky bottom panel */}
                <div className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
                  <div className="p-5 space-y-4">
                    {/* Delivery toggle */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-subtle)]">Mode de réception</p>
                      <div className="relative grid grid-cols-2 gap-1 bg-[color:var(--color-bg-elevated)]/50 border border-[color:var(--color-border)] rounded-xl p-1 shadow-inner">
                        <motion.div
                          layout
                          className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-[color:var(--color-primary)] shadow-lg shadow-[color:var(--color-primary)]/20"
                          animate={{ left: deliveryType === 'click_collect' ? 4 : 'calc(50%)' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        />
                        <button
                          onClick={() => setDeliveryType('click_collect')}
                          className={`relative z-10 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${deliveryType === 'click_collect' ? 'text-[color:var(--color-primary-contrast)]' : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text-muted)]'}`}
                        >
                          <Package className="w-3.5 h-3.5" />
                          Click & Collect
                        </button>
                        <button
                          onClick={() => setDeliveryType('delivery')}
                          className={`relative z-10 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 ${deliveryType === 'delivery' ? 'text-[color:var(--color-primary-contrast)]' : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text-muted)]'}`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Livraison
                        </button>
                      </div>
                    </div>

                    {/* Free shipping gauge */}
                    <FreeShippingGauge variant="compact" />

                    {/* Loyalty */}
                    <LoyaltyRedemption variant="compact" />

                    {/* Line Items */}
                    <div className="space-y-2 pt-2 border-t border-[color:var(--color-border)]/50">
                      <div className="flex justify-between text-xs text-[color:var(--color-text-subtle)]">
                        <span>Sous-total HT</span>
                        <span className="text-[color:var(--color-text)] font-medium">{(sub / 1.2).toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-xs text-[color:var(--color-text-subtle)]">
                        <span>TVA (20%)</span>
                        <span className="text-[color:var(--color-text)] font-medium">{(sub - sub / 1.2).toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-xs text-[color:var(--color-text-subtle)]">
                        <span>Livraison</span>
                        <span className={fee === 0 ? 'text-[color:var(--color-primary)] font-bold' : 'text-[color:var(--color-text)] font-medium'}>
                          {fee === 0 ? 'Offerte' : `${fee.toFixed(2)} €`}
                        </span>
                      </div>
                      {settings.loyalty_program_enabled && vipDiscount > 0 && (
                        <div className="flex justify-between text-xs font-bold text-yellow-500 bg-yellow-400/5 px-3 py-2 rounded-lg border border-yellow-400/10">
                          <span className="flex items-center gap-1.5">
                            <Crown className="w-3 h-3" /> Remise VIP
                          </span>
                          <span>−{vipDiscount.toFixed(2)} €</span>
                        </div>
                      )}
                      {pointsVal > 0 && (
                        <div className="flex justify-between text-xs font-bold text-amber-500 bg-amber-400/5 px-3 py-2 rounded-lg border border-amber-400/10">
                          <span className="flex items-center gap-1.5">
                            <Coins className="w-3 h-3" /> Remise fidélité
                          </span>
                          <span>−{pointsVal.toFixed(2)} €</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA Section */}
                  <div className="px-5 pb-5 border-t border-[color:var(--color-border)] pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-[color:var(--color-text-subtle)]">Total TTC</span>
                        {settings.loyalty_program_enabled && (
                          <span className="text-xs font-semibold text-amber-500">
                            +{Math.round(tot * (settings.loyalty_earn_rate || 1))} points gagnés
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black text-[color:var(--color-text)]">
                        {tot.toFixed(2)}<span className="text-[color:var(--color-primary)] text-base ml-0.5">€</span>
                      </span>
                    </div>

                    <div className="space-y-3">
                      <Link to="/commande" onClick={closeSidebar} className="block w-full group">
                        <div className="relative h-14 w-full flex items-center justify-center rounded-xl bg-[color:var(--color-primary)] overflow-hidden shadow-[0_0_20px_rgba(57,255,20,0.1)] transition-all duration-500 hover:shadow-[0_0_30px_rgba(57,255,20,0.25)] hover:-translate-y-0.5 active:scale-[0.98]">
                          <div className="absolute inset-0 bg-white/20 translate-y-[101%] group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                          <div className="relative flex items-center gap-3 text-[color:var(--color-primary-contrast)] font-black uppercase tracking-[0.2em] text-xs">
                            <span>Finaliser la commande</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-500" />
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center justify-center gap-4 py-2 border border-dashed border-[color:var(--color-border)] rounded-xl">
                        <div className="flex items-center gap-1.5 text-[color:var(--color-text-subtle)]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                          <span className="text-xs font-medium">Paiement sécurisé</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-[color:var(--color-border)]" />
                        <div className="flex items-center gap-1.5 text-[color:var(--color-text-subtle)]">
                          <Truck className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                          <span className="text-xs font-medium">Suivi immédiat</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
  );
}
