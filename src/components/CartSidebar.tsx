import { Link } from 'react-router-dom';
import { X, Trash2, Package, Truck, ShoppingBag, ArrowRight, Minus, Plus, ShieldCheck, Crown, Coins, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubscriptionFrequency } from '../lib/types';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import FreeShippingGauge from './FreeShippingGauge';
import EmptyCartSuggestions from './EmptyCartSuggestions';
import LoyaltyRedemption from './LoyaltyRedemption';
import { createPortal } from 'react-dom';

export default function CartSidebar() {
  const items = useCartStore(s => s.items);
  const isOpen = useCartStore(s => s.isOpen);
  const deliveryType = useCartStore(s => s.deliveryType);
  const closeSidebar = useCartStore(s => s.closeSidebar);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const setDeliveryType = useCartStore(s => s.setDeliveryType);
  const itemCount = useCartStore(s => s.itemCount());
  const subtotal = useCartStore(s => s.subtotal());
  const deliveryFee = useCartStore(s => s.deliveryFee());
  const pointsDiscount = useCartStore(s => s.pointsDiscount);

  const settings = useSettingsStore((s) => s.settings);
  const { profile } = useAuthStore();

  const sub = subtotal;

  // Tier Logic for benefits
  const points = profile?.loyalty_points ?? 0;
  const tiers = settings.loyalty_tiers || [];
  const currentTier = [...tiers].sort((a, b) => b.min_points - a.min_points).find(t => points >= t.min_points) || tiers[0];

  // 1. VIP Discount (from tier settings)
  const vipDiscount = (settings.loyalty_program_enabled && currentTier) ? Math.round(sub * currentTier.vip_discount * 100) / 100 : 0;

  // 3. Points Discount
  const pointsVal = pointsDiscount(points, settings.loyalty_redeem_rate || 5);

  // 2. Shipping Fee Logic (from tier settings)
  let fee = deliveryFee;
  if (deliveryType === 'delivery' && currentTier) {
    if (currentTier.free_shipping_threshold !== null) {
      fee = sub >= currentTier.free_shipping_threshold ? 0 : settings.delivery_fee;
    }
  }

  const tot = Math.max(0, sub + fee - vipDiscount - pointsVal);
  const count = itemCount;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-[color:var(--color-overlay)]/70 backdrop-blur-sm z-[2000]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-[900px] z-[2001] flex flex-col bg-[color:var(--color-bg)] border-l border-[color:var(--color-border)] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 lg:px-10 pt-5 pb-5 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)] relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[color:var(--color-primary)]/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
                  <h2 className="text-2xl lg:text-3xl font-serif font-black tracking-tighter text-[color:var(--color-text)] uppercase italic leading-none">
                    CONCIERGERIE.
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="px-2.5 py-0.5 rounded-full bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/20 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[color:var(--color-primary)] animate-pulse" />
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] font-black text-[color:var(--color-primary)]">
                        {count} ARTICLE{count > 1 ? 'S' : ''} SÉLECTIONNÉ{count > 1 ? 'S' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 p-1 rounded-xl bg-[color:var(--color-bg-elevated)]/50 border border-[color:var(--color-border)] shadow-sm">
                    <div className="flex items-center gap-2 pl-3">
                      <Package className="w-3 h-3 text-[color:var(--color-text-subtle)]" />
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-subtle)] hidden sm:inline">Réception</span>
                    </div>

                    <div className="relative w-40 lg:w-48 grid grid-cols-2 gap-0.5 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-lg p-0.5 shadow-inner">
                      <motion.div
                        layout
                        className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded-md bg-[color:var(--color-primary)] shadow-md"
                        animate={{ left: deliveryType === 'click_collect' ? 2 : 'calc(50%)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                      <button
                        onClick={() => setDeliveryType('click_collect')}
                        className={`relative z-10 flex items-center justify-center py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all duration-300 \${deliveryType === 'click_collect' ? 'text-[color:var(--color-primary-contrast)]' : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text-muted)]'}`}
                      >
                        Retrait
                      </button>
                      <button
                        onClick={() => setDeliveryType('delivery')}
                        className={`relative z-10 flex items-center justify-center py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all duration-300 \${deliveryType === 'delivery' ? 'text-[color:var(--color-primary-contrast)]' : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text-muted)]'}`}
                      >
                        Livraison
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={closeSidebar}
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)]/90 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] flex items-center justify-center transition-all group hover:scale-105 active:scale-95 shadow-lg shadow-black/5"
                  >
                    <X className="w-4 h-4 lg:w-5 lg:h-5 group-hover:rotate-90 transition-transform duration-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-[color:var(--color-bg)]">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 overflow-y-auto scrollbar-thin">
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
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-thin bg-[color:var(--color-bg-elevated)]/20">
                    <div className="p-4">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <AnimatePresence mode="popLayout">
                          {items.map((item) => (
                            <motion.div
                              key={item.product.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group relative flex gap-3 p-3 rounded-xl bg-[color:var(--color-bg)] border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/30 transition-all shadow-sm"
                            >
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[color:var(--color-card)] shrink-0">
                                <img
                                  src={getProductImageSrc(item.product.image_url)}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  onError={applyProductImageFallback}
                                />
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                              </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-[8px] font-black text-[color:var(--color-primary)] uppercase tracking-widest leading-none">
                                            {item.product.category?.name || 'Exception'}
                                          </p>
                                          {item.subscriptionFrequency && (
                                            <span className="flex items-center gap-1 text-[7px] font-black uppercase bg-emerald-400/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                                              <RefreshCw className="w-2 h-2" />
                                              {item.subscriptionFrequency === 'weekly' ? 'Hebdo' : item.subscriptionFrequency === 'biweekly' ? '15 jours' : 'Mensuel'}
                                            </span>
                                          )}
                                        </div>
                                        <h3 className="text-xs font-bold text-[color:var(--color-text)] truncate leading-tight">
                                          {item.product.name}
                                        </h3>
                                      </div>
                                      <button
                                        onClick={() => removeItem(item.product.id, item.subscriptionFrequency)}
                                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-500/10 text-[color:var(--color-text-muted)] hover:text-red-500 transition-all shrink-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-2">
                                    <div className="flex items-center p-0.5 rounded-lg bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)]">
                                      <button
                                        onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1), item.subscriptionFrequency)}
                                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] transition-colors"
                                      >
                                        <Minus className="w-2.5 h-2.5" />
                                      </button>
                                      <span className="w-7 text-center text-[11px] font-black text-[color:var(--color-text)]">{item.quantity}</span>
                                      <button
                                        onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.subscriptionFrequency)}
                                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[color:var(--color-bg)] text-[color:var(--color-text-muted)] transition-colors"
                                      >
                                        <Plus className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                    <div className="text-right">
                                      {item.subscriptionFrequency && (
                                        <p className="text-[9px] font-bold text-emerald-400 -mb-1">Abonnement</p>
                                      )}
                                      <p className="text-[13px] font-bold text-[color:var(--color-text)]">
                                        {(item.product.price * (1 - (item.subscriptionFrequency === 'weekly' ? 0.15 : item.subscriptionFrequency === 'biweekly' ? 0.10 : item.subscriptionFrequency === 'monthly' ? 0.05 : 0)) * item.quantity).toFixed(2)} €
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

                  <div className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
                    <div className="p-4 space-y-2">
                      <FreeShippingGauge variant="compact" />
                      <LoyaltyRedemption variant="compact" />

                      <div className="space-y-1.5 pt-2 border-t border-[color:var(--color-border)]/50">
                        <div className="flex justify-between text-[10px] text-[color:var(--color-text-subtle)]">
                          <span>Sous-total HT</span>
                          <span className="text-[color:var(--color-text)] font-medium">{(sub / 1.2).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[color:var(--color-text-subtle)]">
                          <span>TVA (20%)</span>
                          <span className="text-[color:var(--color-text)] font-medium">{(sub - sub / 1.2).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[color:var(--color-text-subtle)]">
                          <span>Livraison</span>
                          <span className={fee === 0 ? 'text-[color:var(--color-primary)] font-bold' : 'text-[color:var(--color-text)] font-medium'}>
                            {fee === 0 ? 'Offerte' : `${fee.toFixed(2)} €`}
                          </span>
                        </div>
                        {settings.loyalty_program_enabled && vipDiscount > 0 && (
                          <div className="flex justify-between text-[10px] font-bold text-yellow-500 bg-yellow-400/5 px-2 py-1 rounded-md border border-yellow-400/10">
                            <span className="flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" /> Remise {currentTier?.name || 'VIP'}
                            </span>
                            <span>−{vipDiscount.toFixed(2)} €</span>
                          </div>
                        )}
                        {pointsVal > 0 && (
                          <div className="flex justify-between text-[10px] font-bold text-amber-500 bg-amber-400/5 px-2 py-1 rounded-md border border-amber-400/10">
                            <span className="flex items-center gap-1">
                              <Coins className="w-2.5 h-2.5" /> Remise fidélité
                            </span>
                            <span>−{pointsVal.toFixed(2)} €</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 border-t border-[color:var(--color-border)] pt-3 space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[color:var(--color-text-subtle)] font-medium uppercase tracking-wider">Total TTC</span>
                          {settings.loyalty_program_enabled && (
                            <span className="text-[10px] font-bold text-amber-500">
                              +{Math.round(tot * (settings.loyalty_earn_rate || 1))} points
                            </span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-[color:var(--color-text)]">
                          {tot.toFixed(2)}<span className="text-[color:var(--color-primary)] text-sm ml-0.5">€</span>
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Link to="/commande" onClick={closeSidebar} className="block w-full group">
                          <div className="relative h-12 w-full flex items-center justify-center rounded-xl bg-[color:var(--color-primary)] overflow-hidden shadow-lg transition-all duration-300 hover:shadow-[color:var(--color-primary)]/25 active:scale-[0.98]">
                            <div className="relative flex items-center gap-2 text-[color:var(--color-primary-contrast)] font-black uppercase tracking-[0.15em] text-[10px]">
                              <span>Finaliser la commande</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center justify-center gap-4 py-1.5 border border-dashed border-[color:var(--color-border)] rounded-lg bg-[color:var(--color-bg-elevated)]/30">
                          <div className="flex items-center gap-1 text-[9px] font-bold text-[color:var(--color-text-subtle)] uppercase">
                            <ShieldCheck className="w-3 h-3 text-[color:var(--color-primary)]" />
                            Sécurisé
                          </div>
                          <div className="w-1 h-1 rounded-full bg-[color:var(--color-border)]" />
                          <div className="flex items-center gap-1 text-[9px] font-bold text-[color:var(--color-text-subtle)] uppercase">
                            <Truck className="w-3 h-3 text-[color:var(--color-primary)]" />
                            Suivi
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
    </AnimatePresence>,
    document.body
  );
}
