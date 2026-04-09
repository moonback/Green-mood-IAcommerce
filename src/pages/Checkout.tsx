import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, MapPin, Plus, CreditCard, Coins, ArrowLeft, ShieldCheck, Sparkles, CheckCircle2, Check, Star, Crown, FlaskConical, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';
import { Address } from '../lib/types';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import SEO from '../components/SEO';
import PromoCodeInput, { AppliedPromo } from '../components/PromoCodeInput';
import StripePaymentForm from '../components/StripePaymentForm';
import LoyaltyRedemption from '../components/LoyaltyRedemption';

// ─── Dev-only payment simulator ──────────────────────────────────────────────
function PaymentSimulator({
  amount,
  onSuccess,
  onError,
  onCancel,
}: {
  amount: number;
  onSuccess: () => void;
  onError: () => void;
  onCancel: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const simulate = async (succeed: boolean) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsLoading(false);
    succeed ? onSuccess() : onError();
  };

  return (
    <div className="bg-slate-900/80 border-2 border-dashed border-white/10 rounded-3xl p-8 space-y-6 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Mode Simulateur — Dev uniquement</p>
          <p className="text-xs text-slate-400 mt-0.5">Cette interface n'est visible qu'en développement local</p>
        </div>
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-5 py-4">
        <p className="text-xs text-emerald-400/70 font-mono">
          Montant simulé : <span className="text-emerald-400 font-black">{amount.toFixed(2)} €</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => simulate(true)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50"
        >
          {isLoading ? <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : '✅'}
          Paiement réussi
        </button>
        <button
          onClick={() => simulate(false)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
        >
          {isLoading ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> : '❌'}
          Paiement refusé
        </button>
      </div>

      <button onClick={onCancel} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-2 uppercase tracking-widest font-semibold">
        Annuler la commande
      </button>
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user, profile, fetchProfile } = useAuthStore();
  const {
    items,
    deliveryType,
    setDeliveryType,
    clearCart,
    subtotal,
    deliveryFee,
    total,
    usePoints,
    setUsePoints,
  } = useCartStore();
  const { settings } = useSettingsStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'payment'>('form');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // New address form
  const [newAddress, setNewAddress] = useState({
    label: 'Domicile',
    street: '',
    city: '',
    postal_code: '',
  });

  const sub = subtotal();

  // Tier Logic for benefits
  const points = profile?.loyalty_points ?? 0;
  const tiers = settings.loyalty_tiers || [];
  const currentTier = [...tiers].sort((a, b) => b.min_points - a.min_points).find(t => points >= t.min_points) || tiers[0];

  // 1. VIP Discount (from tier settings)
  const vipDiscount = currentTier ? Math.round(sub * currentTier.vip_discount * 100) / 100 : 0;

  // 2. Shipping Fee Logic (from tier settings)
  let fee = deliveryFee();
  if (deliveryType === 'delivery' && currentTier) {
    if (currentTier.free_shipping_threshold !== null) {
      fee = sub >= currentTier.free_shipping_threshold ? 0 : settings.delivery_fee;
    }
  }

  const pointsValue = usePoints && profile ? Math.floor(profile.loyalty_points / 100) * (settings.loyalty_redeem_rate || 5) : 0;
  const promoDiscount = appliedPromo ? appliedPromo.discount_amount : 0;

  // Flags for UI
  const isGold = currentTier?.id === 'gold';
  const isSilver = currentTier?.id === 'silver';

  // Total calculation with ALL discounts
  const tot = Math.max(0, sub + fee - pointsValue - promoDiscount - vipDiscount);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setAddresses(data as Address[]);
          const def = (data as Address[]).find((a) => a.is_default);
          setSelectedAddress(def?.id ?? data[0].id);
        }
      });
  }, [user]);

  const handleSaveAddress = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('addresses')
      .insert({ ...newAddress, user_id: user.id, is_default: addresses.length === 0 })
      .select()
      .single();
    if (data) {
      setAddresses((prev) => [...prev, data as Address]);
      setSelectedAddress(data.id);
      setShowAddressForm(false);
      setNewAddress({ label: 'Domicile', street: '', city: '', postal_code: '' });
    }
  };

  // ── Step 1: Create order + decrement stock + get Stripe clientSecret ────────
  const handlePrepareOrder = async () => {
    if (!user) return;
    if (deliveryType === 'delivery' && !selectedAddress) {
      setError('Veuillez sélectionner une adresse de livraison.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    console.info('[Checkout] Environment check:', { isDev: import.meta.env.DEV, mode: import.meta.env.MODE });

    try {
      const pointsRedeemed = usePoints && profile
        ? Math.floor(profile.loyalty_points / 100) * 100
        : 0;
      const multiplier = currentTier?.multiplier ?? 1;
      const pointsEarned = Math.floor(tot * multiplier * (settings.loyalty_earn_rate || 1));

      const { data: orderId, error: orderError } = await supabase.rpc('reserve_stock_and_create_order', {
        p_user_id: user.id,
        p_items: items.map((item) => {
          const discount = item.subscriptionFrequency === 'weekly' ? 0.15 : item.subscriptionFrequency === 'biweekly' ? 0.10 : item.subscriptionFrequency === 'monthly' ? 0.05 : 0;
          return {
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price * (1 - discount),
            subscription_frequency: item.subscriptionFrequency
          };
        }),
        p_delivery_type: deliveryType,
        p_address_id: deliveryType === 'delivery' ? selectedAddress : null,
        p_subtotal: sub,
        p_delivery_fee: fee,
        p_total: tot,
        p_points_earned: pointsEarned,
        p_points_redeemed: pointsRedeemed,
        p_promo_code: appliedPromo?.code ?? null,
        p_promo_discount: promoDiscount + vipDiscount,
      });

      if (orderError) {
        if (orderError.message?.startsWith('STOCK_INSUFFICIENT:')) {
          throw new Error('Stock insuffisant pour certains articles.');
        }
        if (orderError.message?.startsWith('PRODUCT_UNAVAILABLE:')) {
          throw new Error('Un ou plusieurs produits ne sont plus disponibles.');
        }
        throw new Error('Erreur lors de la création de la commande.');
      }
      if (!orderId) throw new Error('Erreur lors de la création de la commande.');

      setPendingOrderId(orderId);

      // 4. In DEV skip the Edge Function call — simulator doesn't need a clientSecret
      if (import.meta.env.DEV) {
        trackEvent('checkout_start', '/checkout', { order_id: orderId, total: tot });
        setCheckoutStep('payment');
        return;
      }

      // 5. Call stripe-payment Edge Function
      const { data: paymentData, error: paymentErr } = await supabase.functions.invoke('stripe-payment', {
        body: {
          orderId,
          amount: tot,
          customerEmail: profile?.email,
          description: `Commande #${orderId.slice(0, 8).toUpperCase()} — ${settings.store_name}`,
        },
      });

      if (paymentErr || paymentData?.error) {
        throw new Error(paymentData?.message || 'Erreur de création du paiement Stripe.');
      }

      setClientSecret(paymentData.clientSecret);
      trackEvent('checkout_start', '/checkout', { order_id: orderId, total: tot });
      setCheckoutStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 2a: Payment succeeded ───────────────────────────────────────────────
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!pendingOrderId) return;

    // Single source of truth: Stripe webhook finalizes payment status + loyalty points.
    // Frontend only tracks analytics and UI navigation.
    if (import.meta.env.DEV) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing',
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq('id', pendingOrderId)
        .eq('payment_status', 'pending');

      if (updateError) {
        console.error('Erreur simulation paiement:', updateError);
        alert('Erreur lors de la simulation du paiement. Vérifiez la console.');
        return;
      }
    }

    if (user) {
      await fetchProfile(user.id);

      // Create subscriptions for items with a frequency
      const subscriptionItems = items.filter(item => item.subscriptionFrequency);
      if (subscriptionItems.length > 0) {
        const subscriptionsToInsert = subscriptionItems.map(item => {
          const nextDate = new Date();
          if (item.subscriptionFrequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (item.subscriptionFrequency === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
          else if (item.subscriptionFrequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

          return {
            user_id: user.id,
            product_id: item.product.id,
            quantity: item.quantity,
            frequency: item.subscriptionFrequency,
            status: 'active',
            next_delivery_date: nextDate.toISOString().split('T')[0]
          };
        });

        const { error: subError } = await supabase
          .from('subscriptions')
          .insert(subscriptionsToInsert);
        
        if (subError) {
          console.error('Erreur lors de la création de l\'abonnement:', subError);
        }
      }
    }

    trackEvent('purchase', '/checkout', { order_id: pendingOrderId, total: tot });
    clearCart();
    navigate(`/commande/confirmation?id=${pendingOrderId}`);
  };

  // ── Step 2b: Payment failed — restore stocks + cancel order ─────────────────
  const handlePaymentError = async (message: string) => {
    setError(message);
    if (pendingOrderId) {
      await supabase.rpc('fail_order_and_restore_stock', {
        p_order_id: pendingOrderId,
        p_reason: message,
      });
    }
    setCheckoutStep('form');
    setPendingOrderId(null);
    setClientSecret(null);
  };

  // ── Step 2c: User cancels payment ────────────────────────────────────────────
  const handleCancelOrder = async () => {
    trackEvent('cart_abandon', '/checkout', { order_id: pendingOrderId ?? undefined });
    await handlePaymentError('Commande annulée.');
    setError('');
  };

  useEffect(() => {
    if (items.length === 0) {
      navigate('/panier');
    }
  }, [items.length, navigate]);

  if (items.length === 0) return null;

  const checkoutSteps = [
    {
      step: 1,
      label: 'Réception',
      caption: deliveryType === 'delivery' ? 'Livraison à domicile' : 'Retrait boutique',
      done: true,
      icon: deliveryType === 'delivery' ? Truck : Package,
    },
    {
      step: 2,
      label: 'Coordonnées',
      caption: deliveryType === 'click_collect' ? 'Aucune adresse requise' : selectedAddress ? 'Adresse confirmée' : 'Choisissez une adresse',
      done: deliveryType === 'click_collect' || !!selectedAddress,
      icon: MapPin,
    },
    {
      step: 3,
      label: 'Paiement',
      caption: checkoutStep === 'payment' ? 'Prêt à régler' : 'Validation finale',
      done: checkoutStep === 'payment',
      icon: CreditCard,
    },
  ];

  const savingsTotal = pointsValue + promoDiscount + vipDiscount;
  const rewardPreview = settings.loyalty_program_enabled && profile
    ? Math.floor(tot * (currentTier?.multiplier || 1) * (settings.loyalty_earn_rate || 1))
    : 0;
  const currentStepIndex = checkoutStep === 'payment'
    ? 2
    : deliveryType === 'click_collect' || selectedAddress
      ? 1
      : 0;
  const checkoutStepLabels = ['Livraison', 'Adresse', 'Paiement', 'Confirmation'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-10 pt-4 font-sans">
      <SEO title={`Finalisation — L'Excellence ${settings.store_name}`} description={`Finalisez votre commande ${settings.store_name}.`} />

      <div className="mx-auto max-w-12xl px-4 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 px-6 py-8 shadow-2xl backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-emerald-500/5 to-transparent lg:block" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <Link
                to="/panier"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-emerald-500/5 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400 transition hover:border-emerald-500/50 hover:text-emerald-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au panier
              </Link>
              <div className="space-y-3">
                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-emerald-400">Tunnel premium</p>
                <h1 className="max-w-2xl text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Finalisation de commande.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                  Vérifiez votre mode de réception, vos coordonnées et vos avantages avant de régler.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Articles</p>
                <p className="mt-3 text-3xl font-black">{items.length}</p>
                <p className="mt-2 text-xs text-slate-500">Produits prêts.</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400">Réception</p>
                <p className="mt-3 text-lg font-black text-white">
                  {deliveryType === 'delivery' ? 'Livraison' : 'Click & Collect'}
                </p>
                <p className="mt-2 text-xs text-emerald-400/60">
                  {deliveryType === 'delivery' ? 'Adresse requise.' : 'Retrait en boutique.'}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-500">Avantages</p>
                <p className="mt-3 text-lg font-black text-white">
                  {savingsTotal > 0 ? `−${savingsTotal.toFixed(2)} €` : 'Aucun'}
                </p>
                <p className="mt-2 text-xs text-amber-500/60">Privilèges VIP inclus.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center justify-between gap-2">
            {checkoutStepLabels.map((label, index) => {
              const isDone = currentStepIndex > index;
              const isCurrent = currentStepIndex === index;
              return (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                      : isCurrent
                        ? 'border-white text-white'
                        : 'border-slate-700 text-slate-500'
                  }`}>
                    {isDone ? '✓' : index + 1}
                  </div>
                  <span className={`hidden text-xs font-bold sm:inline ${
                    isDone ? 'text-emerald-400' : isCurrent ? 'text-white' : 'text-slate-500'
                  }`}>
                    {label}
                  </span>
                  {index < checkoutStepLabels.length - 1 && (
                    <div className={`h-px flex-1 ${
                      currentStepIndex > index ? 'bg-emerald-500' : 'bg-slate-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {checkoutSteps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className={`relative overflow-hidden rounded-3xl border px-5 py-5 transition-all backdrop-blur-xl ${item.done
                  ? 'border-emerald-500/30 bg-emerald-500/10 shadow-lg'
                  : 'border-white/10 bg-emerald-500/5'
                  }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.done ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-500/5 text-slate-500'}`}>
                    {item.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">0{item.step}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-base font-black uppercase tracking-wide text-white">{item.label}</p>
                  <p className="text-sm text-slate-400">{item.caption}</p>
                </div>
                {idx < checkoutSteps.length - 1 && item.done && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-emerald-500/10 to-transparent lg:block" />
                )}
              </div>
            );
          })}
        </section>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-8 lg:col-span-8">
            {checkoutStep === 'payment' && (
              <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.32em] text-emerald-400">Étape 03</p>
                    <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Paiement sécurisé</h2>
                    <p className="mt-2 text-sm text-slate-400">Votre commande est prête. Réglez en toute sécurité.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-400">Montant total</p>
                    <p className="mt-2 text-2xl font-black text-white">{tot.toFixed(2)} €</p>
                  </div>
                </div>

                {import.meta.env.DEV ? (
                  <PaymentSimulator
                    amount={tot}
                    onSuccess={() => handlePaymentSuccess(`sim_${Date.now()}`)}
                    onError={() => handlePaymentError('Paiement simulé refusé.')}
                    onCancel={handleCancelOrder}
                  />
                ) : (settings as any).stripe_enabled && clientSecret ? (
                  <StripePaymentForm
                    clientSecret={clientSecret}
                    amount={tot}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                ) : (
                  <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-sm text-amber-400">
                    Paiement non disponible.
                  </div>
                )}

                {error && (
                  <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-medium text-red-400">
                    {error}
                  </div>
                )}
              </section>
            )}

            <div className={checkoutStep === 'payment' ? 'hidden' : 'space-y-8'}>
              <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/5 px-6 py-5 sm:px-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 shadow-inner">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Étape 01</p>
                      <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Mode de réception</h2>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      onClick={() => setDeliveryType('click_collect')}
                      className={`group relative overflow-hidden rounded-[1.75rem] border p-6 text-left transition-all ${deliveryType === 'click_collect'
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-2xl shadow-emerald-500/20'
                        : 'border-white/10 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                        }`}
                    >
                      <div className="mb-6 flex items-start justify-between">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${deliveryType === 'click_collect' ? 'bg-slate-950/10 text-slate-950' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          <Package className="h-6 w-6" />
                        </div>
                        {deliveryType === 'click_collect' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                      </div>
                      <p className="text-base font-black uppercase tracking-wide">Click & Collect</p>
                      <p className={`mt-2 text-sm ${deliveryType === 'click_collect' ? 'text-slate-600' : 'text-slate-400'}`}>Retrait express en boutique.</p>
                    </button>

                    <button
                      onClick={() => setDeliveryType('delivery')}
                      className={`group relative overflow-hidden rounded-[1.75rem] border p-6 text-left transition-all ${deliveryType === 'delivery'
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-2xl shadow-emerald-500/20'
                        : 'border-white/10 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                        }`}
                    >
                      <div className="mb-6 flex items-start justify-between">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${deliveryType === 'delivery' ? 'bg-slate-950/10 text-slate-950' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          <Truck className="h-6 w-6" />
                        </div>
                        {deliveryType === 'delivery' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                      </div>
                      <p className="text-base font-black uppercase tracking-wide">Livraison standard</p>
                      <p className={`mt-2 text-sm ${deliveryType === 'delivery' ? 'text-slate-600' : 'text-slate-400'}`}>Expédition à domicile avec suivi.</p>
                    </button>
                  </div>

                  <AnimatePresence>
                    {deliveryType === 'click_collect' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/5 p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400">Point de retrait</p>
                              <p className="mt-3 text-lg font-black text-white">{settings.store_address}</p>
                              <p className="mt-2 text-sm text-slate-400">{settings.store_hours}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300">
                              <p className="font-semibold text-white">Contact boutique</p>
                              <p className="mt-1">{settings.store_phone}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {deliveryType === 'delivery' && (
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
                  <div className="border-b border-white/5 px-6 py-5 sm:px-8">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Étape 02</p>
                        <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">Adresse de livraison</h2>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                    <div className="grid gap-4 md:grid-cols-2">
                      {addresses.map((addr) => (
                        <button
                          key={addr.id}
                          onClick={() => setSelectedAddress(addr.id)}
                          className={`relative rounded-[1.75rem] border p-5 text-left transition-all ${selectedAddress === addr.id
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-lg'
                            : 'border-white/10 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                            }`}
                        >
                          <div className="mb-5 flex items-center justify-between">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${selectedAddress === addr.id ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-500/5 text-slate-500'}`}>
                              <MapPin className="h-5 w-5" />
                            </div>
                            {selectedAddress === addr.id && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                          </div>
                          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">{addr.label}</p>
                          <p className="mt-3 text-base font-bold text-white">{addr.street}</p>
                          <p className="mt-2 text-sm text-slate-400">{addr.postal_code} {addr.city}</p>
                        </button>
                      ))}

                      <button
                        onClick={() => setShowAddressForm(true)}
                        className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-[1.75rem] border-2 border-dashed border-white/10 bg-emerald-500/5 p-8 text-slate-500 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/5">
                          <Plus className="h-6 w-6" />
                        </div>
                        <div className="space-y-2 text-center">
                          <p className="text-sm font-black uppercase tracking-[0.24em]">Nouvelle adresse</p>
                          <p className="text-sm text-slate-500">Ajoutez une destination.</p>
                        </div>
                      </button>
                    </div>

                    <AnimatePresence>
                      {showAddressForm && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          className="rounded-[1.75rem] border border-white/10 bg-emerald-500/5 p-5 shadow-sm sm:p-6"
                        >
                          <div className="mb-6">
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400">Nouvelle fiche</p>
                            <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-white">Ajout des coordonnées</h3>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <input
                              placeholder="Libellé (ex : Domicile)"
                              value={newAddress.label}
                              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                            />
                            <input
                              placeholder="Adresse complète"
                              value={newAddress.street}
                              onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                            />
                            <input
                              placeholder="Code postal"
                              value={newAddress.postal_code}
                              onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                            />
                            <input
                              placeholder="Ville"
                              value={newAddress.city}
                              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                              className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                              onClick={handleSaveAddress}
                              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-emerald-500 px-6 py-4 text-[11px] font-black uppercase tracking-[0.26em] text-slate-950 transition hover:bg-emerald-500 hover:text-slate-950"
                            >
                              Enregistrer l’adresse
                            </button>
                            <button
                              onClick={() => setShowAddressForm(false)}
                              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-emerald-500/5 px-6 py-4 text-[11px] font-black uppercase tracking-[0.26em] text-slate-400 transition hover:text-white"
                            >
                              Annuler
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Avantage instantané</p>
                      <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-white">Code privilège</h2>
                    </div>
                  </div>
                  <PromoCodeInput subtotal={sub} onApply={setAppliedPromo} applied={appliedPromo} />
                </div>

                {settings.loyalty_program_enabled && profile && profile.loyalty_points >= 100 && (
                  <LoyaltyRedemption />
                )}
              </section>
            </div>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <div className="lg:sticky lg:top-6">
              <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/5 bg-slate-950 px-6 py-6 text-white sm:px-8">
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Récapitulatif</p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black tracking-tight">{tot.toFixed(2)} €</p>
                      <p className="mt-2 text-sm text-slate-400">Paiement {checkoutStep === 'payment' ? 'prêt' : 'à préparer'}.</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-500/5 px-4 py-3 text-right border border-white/10">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Économie</p>
                      <p className="mt-2 text-lg font-black text-emerald-400">{savingsTotal > 0 ? `−${savingsTotal.toFixed(2)} €` : '0.00 €'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 px-6 py-6 sm:px-8">
                  <div className="rounded-[1.5rem] border border-white/5 bg-emerald-500/5 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Panier</p>
                      <span className="text-xs font-semibold text-slate-400">{items.length} article(s)</span>
                    </div>
                    <div className="max-h-[260px] space-y-4 overflow-y-auto pr-1">
                      {items.map(({ product, quantity, subscriptionFrequency }) => {
                        const discount = subscriptionFrequency === 'weekly' ? 0.15 : subscriptionFrequency === 'biweekly' ? 0.10 : subscriptionFrequency === 'monthly' ? 0.05 : 0;
                        const finalPrice = product.price * (1 - discount);
                        
                        return (
                          <div key={`${product.id}-${subscriptionFrequency || 'none'}`} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-950 p-4 border border-white/5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-black uppercase tracking-[0.14em] text-white">{product.name}</p>
                                {subscriptionFrequency && (
                                  <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                                    <RefreshCw className="w-2 h-2 animate-[spin_4s_linear_infinite]" />
                                    {subscriptionFrequency === 'weekly' ? 'Hebdo' : subscriptionFrequency === 'biweekly' ? '15 jours' : 'Mensuel'}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                Quantité : {quantity} {subscriptionFrequency && <span className="text-emerald-500/60 ml-1">(Abonnement -{Math.round(discount * 100)}%)</span>}
                              </p>
                            </div>
                            <p className="text-sm font-bold text-white">{(finalPrice * quantity).toFixed(2)} €</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[1.5rem] border border-white/5 bg-slate-950 p-5">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Sous-total</span>
                      <span className="font-semibold text-white">{sub.toFixed(2)} €</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>{deliveryType === 'delivery' ? 'Livraison' : 'Retrait'}</span>
                      <span className="font-semibold text-emerald-400">{fee === 0 ? 'Gratuit' : `${fee.toFixed(2)} €`}</span>
                    </div>
                    {pointsValue > 0 && (
                      <div className="flex items-center justify-between text-sm text-amber-500">
                        <span>Fidélité</span>
                        <span className="font-semibold">−{pointsValue.toFixed(2)} €</span>
                      </div>
                    )}
                    {promoDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm text-emerald-500">
                        <span>Code {appliedPromo?.code}</span>
                        <span className="font-semibold">−{promoDiscount.toFixed(2)} €</span>
                      </div>
                    )}
                    {vipDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm text-amber-500">
                        <span className="inline-flex items-center gap-2">
                          <Crown className="h-4 w-4" /> Avantage VIP
                        </span>
                        <span className="font-semibold">−{vipDiscount.toFixed(2)} €</span>
                      </div>
                    )}
                    <div className="my-2 h-px bg-emerald-500/5" />
                    <div className="flex items-end justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.28em] text-slate-600">Total</span>
                      <span className="text-3xl font-black tracking-tight text-white">{tot.toFixed(2)} €</span>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-400">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <button
                      onClick={handlePrepareOrder}
                      disabled={isSubmitting || checkoutStep === 'payment'}
                      aria-busy={isSubmitting}
                      className="inline-flex w-full items-center justify-center gap-3 rounded-[1.25rem] bg-emerald-500 px-6 py-4 text-xs font-black uppercase tracking-[0.26em] text-slate-950 transition hover:bg-emerald-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                          Préparation…
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Procéder au paiement
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Garanties checkout</p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300">
                        <p className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Paiement chiffré SSL et confirmation immédiate.
                        </p>
                        <p className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Support client réactif en cas de besoin.
                        </p>
                        <p className="inline-flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Suivi de commande envoyé juste après paiement.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <ShieldCheck className="h-4 w-4" />
                          <span className="text-xs font-black uppercase tracking-[0.2em]">Sécurisé</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 uppercase tracking-widest font-bold">Confirmation immédiate</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-emerald-500/5 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Réception</p>
                        <p className="mt-2 text-xs font-bold text-white uppercase tracking-widest">{deliveryType === 'delivery' ? 'À domicile' : 'En boutique'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <p className="px-4 text-center text-xs font-bold uppercase tracking-[0.2em] leading-6 text-slate-600">
              {rewardPreview > 0 ? `Crédit fidélité estimé : +${rewardPreview} ${settings.loyalty_currency_name}. ` : ''}
              {import.meta.env.DEV ? 'Validation mode démonstration.' : 'Paiement crypté SSL.'}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
