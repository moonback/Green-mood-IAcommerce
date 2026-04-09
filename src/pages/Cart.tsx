import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ArrowLeft, Trash2, Package, Truck, ShoppingBag, ShieldCheck, Sparkles, ArrowRight, CreditCard } from 'lucide-react';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';
import QuantitySelector from '../components/QuantitySelector';
import SEO from '../components/SEO';
import FreeShippingGauge from '../components/FreeShippingGauge';
import LoyaltyRedemption from '../components/LoyaltyRedemption';
import { useAuthStore } from '../store/authStore';
import { Coins } from 'lucide-react';

export default function Cart() {
  const {
    items,
    deliveryType,
    setDeliveryType,
    removeItem,
    updateQuantity,
    subtotal,
    deliveryFee,
    total,
    pointsDiscount,
  } = useCartStore();
  const { profile } = useAuthStore();
  const { settings } = useSettingsStore();
  const addToast = useToastStore((s) => s.addToast);
  const pendingUndoTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sub = subtotal();
  const fee = deliveryFee();
  const pointsVal = pointsDiscount(profile?.loyalty_points || 0, settings.loyalty_redeem_rate || 5);
  const tot = Math.max(0, sub + fee - pointsVal);

  useEffect(() => {
    return () => {
      Object.values(pendingUndoTimeouts.current).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const handleRemoveItem = (product: typeof items[number]['product'], quantity: number) => {
    const productId = product.id;
    const existingUndoTimeout = pendingUndoTimeouts.current[productId];
    if (existingUndoTimeout) {
      clearTimeout(existingUndoTimeout);
    }

    removeItem(productId);

    const timeoutId = setTimeout(() => {
      delete pendingUndoTimeouts.current[productId];
      addToast({
        type: 'info',
        message: `${product.name} supprimé définitivement du panier`,
        duration: 2400,
      });
    }, 5000);

    pendingUndoTimeouts.current[productId] = timeoutId;

    addToast({
      type: 'info',
      message: `${product.name} retiré du panier`,
      duration: 5000,
      action: {
        label: 'Annuler (5s)',
        onClick: () => {
          const currentTimeout = pendingUndoTimeouts.current[productId];
          if (currentTimeout) {
            clearTimeout(currentTimeout);
            delete pendingUndoTimeouts.current[productId];
            const { items: currentItems, addItem, updateQuantity } = useCartStore.getState();
            const existingItem = currentItems.find((item) => item.product.id === productId);
            if (existingItem) {
              updateQuantity(productId, existingItem.quantity + quantity);
            } else {
              addItem(product, quantity);
            }
          }
        },
      },
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] flex flex-col items-center justify-center px-4 overflow-hidden relative font-sans">
        <SEO title={`Mon Panier — L'Expérience ${settings.store_name}`} description={`Votre panier d'achats ${settings.store_name}.`} />

        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[color:var(--color-primary)]/5 rounded-full blur-[160px] -z-10 animate-pulse" />
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-[color:var(--color-card)]/30 border border-[color:var(--color-border)] rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl shadow-2xl relative overflow-hidden"
        >
          {/* Subtle reflection effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[color:var(--color-primary)]/20 to-transparent" />

          {/* Left Side: Visual */}
          <div className="relative aspect-square rounded-[2rem] overflow-hidden group shadow-2xl border border-white/5">
            <motion.img
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
              src="/images/products-flower.png"
              alt="Zen empty cart"
              className="w-full h-full object-cover grayscale-[0.2] brightness-75 group-hover:brightness-90 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-bg)]/80 via-transparent to-transparent" />

            <div className="absolute bottom-8 left-8 right-8 text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[color:var(--color-primary)] mb-2">Patience & Découverte</p>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Votre panier attend de <br /><span className="italic font-serif text-emerald-300">précieux</span> choix.</h2>
            </div>
          </div>

          {/* Right Side: Content & Actions */}
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 leading-none">Panier Vide</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white">
                Un espace <br /><span className="text-[color:var(--color-primary)] italic font-serif">à remplir.</span>
              </h1>
              <p className="text-sm text-[color:var(--color-text-subtle)] font-medium leading-relaxed">
                Le chemin vers le bien-être commence souvent par une simple question. Nos experts et notre intelligence artificielle sont là pour vous guider.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Link
                to="/assistant"
                className="group relative flex items-center justify-between bg-emerald-500 text-slate-950 font-black text-[11px] uppercase tracking-widest px-8 py-5 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_12px_40px_rgba(16,185,129,0.3)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <span className="relative z-10 flex items-center gap-3">
                  <Sparkles className="w-4 h-4" />
                  Consulter le BudTender
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              </Link>

              <Link
                to="/catalogue"
                className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-black text-[11px] uppercase tracking-widest px-8 py-5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all font-sans"
              >
                Découvrir la Boutique
              </Link>
            </div>

            <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Besoin d'aide ?</p>
                <p className="text-[11px] text-white/60 font-medium">Réponse en <span className="text-emerald-400">10s</span> via WhatsApp</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Livraison</p>
                <p className="text-[11px] text-white/60 font-medium"><span className="text-emerald-400">Offerte</span> dès 40€ d'achat</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating Icons decoration */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[15%] left-[10%] opacity-20 hidden lg:block"
        >
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 rotate-12">
            <Package className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[20%] right-[10%] opacity-20 hidden lg:block"
        >
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 -rotate-12">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] font-sans selection:bg-[color:var(--color-primary)]/30">
      <SEO title={`Mon Panier — L'Excellence ${settings.store_name}`} description="Récapitulatif de votre panier d'achats." />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05),transparent_50%)]" />

        <div className="relative z-10">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="space-y-4 text-center md:text-left">
              <Link to="/catalogue" className="inline-flex items-center gap-2 text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-primary)] text-xs font-black uppercase tracking-wider transition-colors mb-2">
                <ArrowLeft className="w-4 h-4" />
                Retour au Catalogue
              </Link>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none text-[color:var(--color-text)]">
                VOTRE <span className="text-[color:var(--color-primary)] italic font-serif lowercase">SÉLECTION.</span>
              </h1>
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <span className="h-px w-8 bg-[color:var(--color-primary)]/30"></span>
                <p className="text-[color:var(--color-text-subtle)] font-black text-xs uppercase tracking-wider">
                  PANIER — {items.length} PIÈCE{items.length > 1 ? 'S' : ''} D'EXCEPTION
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence mode="popLayout">
                {items.map(({ product, quantity }) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative flex flex-col sm:flex-row gap-8 bg-[color:var(--color-card)]/70 border border-[color:var(--color-border)] rounded-[2.5rem] p-6 hover:bg-[color:var(--color-card)]/85 transition-all backdrop-blur-xl"
                  >
                    {/* Product Image */}
                    <div className="w-full sm:w-44 aspect-square rounded-[2rem] overflow-hidden border border-[color:var(--color-border)] shrink-0 bg-[color:var(--color-bg)]">
                      <img
                        src={getProductImageSrc(product.image_url)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]"
                        onError={applyProductImageFallback}
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 space-y-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <Link
                            to={`/catalogue/${product.slug}`}
                            className="text-2xl font-black uppercase tracking-tight text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors"
                          >
                            {product.name}
                          </Link>
                          <button
                            onClick={() => handleRemoveItem(product, quantity)}
                            aria-label={`Retirer ${product.name} du panier`}
                            className="p-3 text-[color:var(--color-text-subtle)] hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {product.attributes?.brand && (
                            <span className="text-xs font-black uppercase tracking-wider text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                              {product.attributes.brand}
                            </span>
                          )}
                          <span className="text-xs font-black uppercase tracking-wider text-[color:var(--color-text-subtle)] bg-[color:var(--color-bg-elevated)] px-3 py-1.5 rounded-full border border-[color:var(--color-border)]">
                            En Stock
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-[color:var(--color-border)]">
                        <div className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wider text-[color:var(--color-text-subtle)] block px-1">Quantité</span>
                          <QuantitySelector
                            quantity={quantity}
                            onChange={(q) => updateQuantity(product.id, q)}
                            max={product.stock_quantity}
                          />
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black uppercase tracking-wider text-[color:var(--color-text-subtle)] block mb-1">Total Article</span>
                          <p className="text-3xl font-black text-[color:var(--color-text)]">
                            {(product.price * quantity).toFixed(2)}<span className="text-[color:var(--color-primary)] text-sm ml-1">€</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Checkout Panel */}
            <div className="lg:col-span-4 space-y-6">
              {/* Delivery Methods Card */}
              <div className="bg-[color:var(--color-card)]/85 backdrop-blur-xl border border-[color:var(--color-border)] rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--color-primary)]/5 blur-[50px] -z-10" />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center border border-emerald-500/20">
                    <Truck className="w-5 h-5 text-[color:var(--color-primary)]" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-[color:var(--color-text-subtle)]">
                    Mode de Réception
                  </h3>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setDeliveryType('click_collect')}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${deliveryType === 'click_collect'
                      ? 'bg-[color:var(--color-primary)] border-emerald-500 text-[color:var(--color-primary-contrast)]'
                      : 'bg-[color:var(--color-bg-elevated)] border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-strong)]'
                      }`}
                  >
                    <Package className={`w-6 h-6 flex-shrink-0 ${deliveryType === 'click_collect' ? 'text-[color:var(--color-primary-contrast)]' : 'text-[color:var(--color-primary)]'}`} />
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase tracking-widest">Click & Collect</p>
                      <p className="text-xs opacity-70 uppercase tracking-wider mt-0.5">Retrait Boutique</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setDeliveryType('delivery')}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${deliveryType === 'delivery'
                      ? 'bg-[color:var(--color-primary)] border-emerald-500 text-[color:var(--color-primary-contrast)]'
                      : 'bg-[color:var(--color-bg-elevated)] border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:border-[color:var(--color-border-strong)]'
                      }`}
                  >
                    <Truck className={`w-6 h-6 flex-shrink-0 ${deliveryType === 'delivery' ? 'text-[color:var(--color-primary-contrast)]' : 'text-[color:var(--color-primary)]'}`} />
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase tracking-widest">Livraison</p>
                      <p className="text-xs opacity-70 uppercase tracking-wider mt-0.5">
                        {sub >= settings.delivery_free_threshold
                          ? 'Offerte — National'
                          : `${settings.delivery_fee.toFixed(2)}€ — Standard`}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="pt-4">
                  <FreeShippingGauge variant="full" />
                </div>

                <div className="pt-4">
                  <LoyaltyRedemption />
                </div>

                <div className="space-y-4 pt-6 border-t border-[color:var(--color-border)]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[color:var(--color-text-subtle)] uppercase tracking-widest">Sous-total</span>
                    <span className="font-black text-[color:var(--color-text)]">{sub.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[color:var(--color-text-subtle)] uppercase tracking-widest">Expédition</span>
                    <span className="font-black text-[color:var(--color-primary)]">{fee === 0 ? 'OFFERTE' : `${fee.toFixed(2)} €`}</span>
                  </div>
                  {pointsVal > 0 && (
                    <div className="flex justify-between items-center text-xs text-amber-500">
                      <span className="font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5" /> Fidélité
                      </span>
                      <span className="font-black">−{pointsVal.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="pt-6 flex justify-between items-end">
                    <span className="text-xs font-black uppercase tracking-wider text-[color:var(--color-text-subtle)] mb-1">Total TTC</span>
                    <p className="text-4xl font-black text-[color:var(--color-text)] tracking-tighter">
                      {tot.toFixed(2)}<span className="text-[color:var(--color-primary)] text-lg ml-1">€</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <Link
                    to="/commande"
                    className="group flex w-full items-center justify-center gap-3 bg-[color:var(--color-primary)] hover:brightness-110 text-[color:var(--color-primary-contrast)] font-black uppercase text-xs tracking-widest py-5 rounded-2xl transition-all shadow-2xl shadow-emerald-500/20"
                  >
                    Commander
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <div className="flex items-center justify-center gap-4 mt-4 p-3 rounded-xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)]">
                    <ShieldCheck className="w-4 h-4 text-[color:var(--color-primary)]" />
                    <span className="text-xs text-[color:var(--color-text-muted)] font-semibold">
                      Paiement 100% sécurisé · Crypté SSL
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-8 text-center space-y-4">
                <p className="text-xs text-[color:var(--color-text-subtle)] leading-relaxed uppercase tracking-wider font-black">
                  Paiement crypté SSL <br />
                  Logistique certifiée {settings.store_name}
                </p>
                <div className="flex justify-center gap-4 opacity-20 grayscale">
                  <CreditCard className="w-6 h-6" />
                  <Package className="w-6 h-6" />
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
