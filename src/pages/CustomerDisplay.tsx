import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ShoppingBag, TrendingUp, Sparkles, Star, User, Gamepad2, Gift, Award } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CUSTOMER_DISPLAY_STORAGE_KEY,
  useCustomerDisplayChannel,
} from '../hooks/useCustomerDisplayChannel';
import { useSettingsStore } from '../store/settingsStore';
import { useTopProducts } from '../hooks/useTopProducts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartUpdateLine {
  id?: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
}

interface PreparedCartLine {
  id: string;
  name: string;
  quantity: number;
  lineTotal: number;
}

interface DisplayInfo {
  cart: CartUpdateLine[];
  customerName: string | null;
  customerEmail: string | null;
  loyaltyPointsUsed: number;
  loyaltyPointsBalance: number;
  promoDiscount: number;
  promoCode: string | null;
  manualDiscountValue: number;
  manualDiscountType: 'euro' | 'percent';
  loyaltyPointsToEarn: number;
  referralCode: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EXAMPLE_CART_STATE: CartUpdateLine[] = [
  { id: 'demo-1', name: 'Borne Arcade Retro', quantity: 1, unitPrice: 1290.0 },
  { id: 'demo-2', name: 'Flipper Stern Deadpool', quantity: 1, unitPrice: 8900.0 },
  { id: 'demo-3', name: 'Tabouret Arcade Pro', quantity: 2, unitPrice: 89.0 },
];

const EXAMPLE_CUSTOMER_NAME = 'Client en caisse';
const EXAMPLE_POINTS_USED = 120;

// 1 pt per €1 earned, 1000 pts = 10€ reward
const POINTS_PER_EURO = 1;
const REWARD_THRESHOLD = 1000;

const CURRENCY = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=800&q=80';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated number that springs to a new value */
function AnimatedCurrency({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { damping: 22, stiffness: 80 });
  const formatted = useTransform(spring, (v) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
  );

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{formatted}</motion.span>;
}

interface LoyaltyProgressBarProps {
  balance: number;
  toEarn: number;
  pointsUsed: number;
  currencyName?: string;
}

/** Loyalty progress bar toward next 1000-pt reward */
function LoyaltyProgressBar({ balance, toEarn, pointsUsed, currencyName = 'pts' }: LoyaltyProgressBarProps) {
  const effectiveBalance = Math.max(0, (balance || 0) - (pointsUsed || 0));
  const currentInTier = effectiveBalance % REWARD_THRESHOLD;
  const pct = Math.min(100, (currentInTier / REWARD_THRESHOLD) * 100);
  const remaining = REWARD_THRESHOLD - currentInTier;
  const projectedBalance = effectiveBalance + (toEarn || 0);
  const projectedPct = Math.min(100, (projectedBalance % REWARD_THRESHOLD || (projectedBalance >= REWARD_THRESHOLD ? 100 : 0)) / REWARD_THRESHOLD * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
        <span className="text-zinc-600">Cagnotte fidélité</span>
        <span className="text-emerald-400">{remaining} {currencyName} → 10€ offerts</span>
      </div>
      <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
        {/* Projected gain (lighter) */}
        {toEarn > 0 && (
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full bg-emerald-500/30"
            initial={{ width: 0 }}
            animate={{ width: `${projectedPct}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        )}
        {/* Current balance */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div className="flex items-center justify-between text-[9px] font-bold text-zinc-600">
        <span>{currentInTier} {currencyName}</span>
        <span>{REWARD_THRESHOLD} {currencyName}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerDisplay() {
  const { settings } = useSettingsStore();
  const topProducts = useTopProducts(3);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [displayInfo, setDisplayInfo] = useState<DisplayInfo>(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOMER_DISPLAY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed?.type === 'CART_UPDATE' && Array.isArray(parsed.cart)) {
          return {
            cart: parsed.cart as CartUpdateLine[],
            customerName: (parsed.customerName as string) ?? null,
            customerEmail: (parsed.customerEmail as string) ?? null,
            loyaltyPointsUsed: Number(parsed.loyaltyPointsUsed ?? 0),
            loyaltyPointsBalance: Number(parsed.loyaltyPointsBalance ?? 0),
            promoDiscount: Number(parsed.promoDiscount ?? 0),
            promoCode: (parsed.promoCode as string) ?? null,
            manualDiscountValue: Number(parsed.manualDiscountValue ?? 0),
            manualDiscountType: (parsed.manualDiscountType as 'euro' | 'percent') ?? 'euro',
            loyaltyPointsToEarn: Number(parsed.loyaltyPointsToEarn ?? 0),
            referralCode: (parsed.referralCode as string) ?? null,
          };
        }
      }
    } catch {
      // Ignore
    }

    return {
      cart: EXAMPLE_CART_STATE,
      customerName: EXAMPLE_CUSTOMER_NAME,
      customerEmail: settings.store_email || 'contact@esil-ventes.fr',
      loyaltyPointsUsed: EXAMPLE_POINTS_USED,
      loyaltyPointsBalance: 1450,
      promoDiscount: 0,
      promoCode: null,
      manualDiscountValue: 0,
      manualDiscountType: 'euro',
      loyaltyPointsToEarn: 76,
      referralCode: 'DEMO2026',
    };
  });

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 120000);
  }, []);

  const handleChannelMessage = useCallback((payload: unknown) => {
    resetIdleTimer();
    const p = payload as Record<string, unknown> | null;
    if (p?.type === 'CART_UPDATE' && Array.isArray(p.cart)) {
      setDisplayInfo({
        cart: p.cart as CartUpdateLine[],
        customerName: (p.customerName as string) ?? null,
        customerEmail: (p.customerEmail as string) ?? null,
        loyaltyPointsUsed: Number(p.loyaltyPointsUsed ?? 0),
        loyaltyPointsBalance: Number(p.loyaltyPointsBalance ?? 0),
        promoDiscount: Number(p.promoDiscount ?? 0),
        promoCode: (p.promoCode as string) ?? null,
        manualDiscountValue: Number(p.manualDiscountValue ?? 0),
        manualDiscountType: (p.manualDiscountType as 'euro' | 'percent') ?? 'euro',
        loyaltyPointsToEarn: Number(p.loyaltyPointsToEarn ?? 0),
        referralCode: (p.referralCode as string) ?? null,
      });
    }
  }, [resetIdleTimer]);

  useEffect(() => {
    resetIdleTimer();
    const handleInteraction = () => resetIdleTimer();
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [resetIdleTimer]);


  useEffect(() => {
    if (topProducts.length < 2) return;
    const t = setInterval(() => setSlideIndex(prev => (prev + 1) % topProducts.length), 5000);
    return () => clearInterval(t);
  }, [topProducts.length]);

  useCustomerDisplayChannel({ onMessage: handleChannelMessage });

  const preparedCart = useMemo<PreparedCartLine[]>(() =>
    displayInfo.cart.map((line, index) => {
      const unitPrice = Number(line.unitPrice ?? 0);
      const quantity = Number(line.quantity ?? 0);
      return { id: line.id ?? `${line.name}-${index}`, name: line.name ?? 'Produit', quantity, lineTotal: quantity * unitPrice };
    }),
    [displayInfo.cart]
  );

  const total = useMemo(() => preparedCart.reduce((sum, line) => sum + line.lineTotal, 0), [preparedCart]);
  const totalItems = useMemo(() => preparedCart.reduce((sum, line) => sum + line.quantity, 0), [preparedCart]);

  const customerLabel = displayInfo.customerName || 'Visiteur';
  const loyaltyPointsUsed = Math.max(0, Number(displayInfo.loyaltyPointsUsed || 0));
  const loyaltyValue = loyaltyPointsUsed / 100;

  const manualDiscount = displayInfo.manualDiscountValue <= 0
    ? 0
    : displayInfo.manualDiscountType === 'percent'
      ? Math.min(total, (total * displayInfo.manualDiscountValue) / 100)
      : Math.min(total, displayInfo.manualDiscountValue);

  const totalPromoDiscounts = Number(displayInfo.promoDiscount || 0) + manualDiscount;
  const finalTotal = Math.max(0, total - loyaltyValue - totalPromoDiscounts);

  const loyaltyPointsBalance = Number(displayInfo.loyaltyPointsBalance || 0);
  const loyaltyPointsToEarn = Number(displayInfo.loyaltyPointsToEarn || 0);

  // QR code URL
  const qrValue = displayInfo.referralCode
    ? `${window.location.origin}/inscription?ref=${displayInfo.referralCode}`
    : `${window.location.origin}/catalogue`;

  const qrLabel = displayInfo.referralCode
    ? `Parrainez un ami — gagnez 200 ${settings.loyalty_currency_name}`
    : 'Catalogue en ligne';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020408] text-zinc-100 font-inter">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020408] via-transparent to-[#020408] opacity-80" />
        <div className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-cyan-500/10 blur-[140px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      </div>

      <div className="relative mx-auto grid h-screen max-w-[1920px] grid-cols-12 gap-6 p-8">

        {/* ─────────── LEFT PANEL (col 8) ─────────── */}
        <section className="col-span-8 rounded-[2rem] border border-white/10 bg-zinc-900/70 backdrop-blur-xl p-8 flex flex-col shadow-2xl shadow-black/30 overflow-hidden">

          {/* Header: greeting + totals */}
          <header className="flex items-end justify-between border-b border-white/10 pb-6 flex-shrink-0">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-zinc-400 mb-3">{settings.store_name}</p>
              <h1 className="text-5xl font-black tracking-tight">Bonjour {customerLabel}</h1>
            </div>

            <div className="flex gap-4 min-w-[720px]">
              <div className="flex-1 rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">Sous-total</p>
                <p className="text-4xl font-black text-white/50 line-through decoration-white/20">{CURRENCY.format(total)}</p>
              </div>
              {(loyaltyValue > 0 || totalPromoDiscounts > 0) && (
                <div className="flex-1 rounded-3xl border border-red-500/20 bg-red-500/5 p-6 backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold mb-1">
                    Remises {displayInfo.promoCode ? `(${displayInfo.promoCode})` : (loyaltyPointsUsed > 0 ? `(${loyaltyPointsUsed} ${settings.loyalty_currency_name})` : '')}
                  </p>
                  <p className="text-4xl font-black text-red-400">-{CURRENCY.format(loyaltyValue + totalPromoDiscounts)}</p>
                </div>
              )}
              <div className="flex-1 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 backdrop-blur-md shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-bold mb-1">Total Final</p>
                <p className="text-4xl font-black text-emerald-400">
                  <AnimatedCurrency value={finalTotal} />
                </p>
              </div>
            </div>
          </header>

          {/* Customer row */}
          <div className="mt-5 flex-shrink-0 space-y-4">
            <div className="rounded-3xl border border-white/5 bg-white/[0.015] p-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-lg">
                    <User size={28} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">Client Privilège</span>
                      {displayInfo.customerName && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black tracking-widest border border-amber-500/20">
                          <Star size={10} fill="currentColor" /> PREMIUM
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-black text-white leading-none">{customerLabel}</p>
                    {displayInfo.customerEmail && (
                      <p className="text-xs font-bold text-zinc-500 mt-1.5 opacity-60">{displayInfo.customerEmail}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8 pr-4">
                  {/* Current balance */}
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-bold mb-1">Cagnotte</span>
                    <p className="text-2xl font-black text-zinc-100 flex items-center justify-end gap-2">
                      {loyaltyPointsBalance}
                      <span className="text-xs text-zinc-500 font-bold tracking-widest uppercase">{settings.loyalty_currency_name}</span>
                    </p>
                  </div>

                  {/* Points to earn badge */}
                  {loyaltyPointsToEarn > 0 && preparedCart.length > 0 && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                    >
                      <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-black mb-0.5">Sur cet achat</span>
                      <span className="text-xl font-black text-emerald-400">+{loyaltyPointsToEarn} {settings.loyalty_currency_name}</span>
                      <span className="text-[9px] text-zinc-500 font-bold mt-0.5">
                        → {loyaltyPointsBalance + loyaltyPointsToEarn} {settings.loyalty_currency_name} total
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Loyalty progress bar */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <LoyaltyProgressBar
                  balance={loyaltyPointsBalance}
                  toEarn={preparedCart.length > 0 ? loyaltyPointsToEarn : 0}
                  pointsUsed={loyaltyPointsUsed}
                  currencyName={settings.loyalty_currency_name}
                />
              </div>
            </div>
          </div>

          {/* Cart items */}
          <div className="mt-6 flex-1 overflow-hidden">
            {preparedCart.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center rounded-[3rem] border border-white/5 bg-black/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity scale-110" style={{ backgroundImage: "url('/images/N10.png')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px]" />
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative flex flex-col items-center"
                >
                  <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/20">
                    <Gamepad2 size={48} strokeWidth={1.5} className="animate-pulse" />
                  </div>
                  <h2 className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.4em] mb-4">{settings.store_name} – Expérience Boutique</h2>
                  <p className="max-w-xl text-center text-5xl font-black leading-tight text-white tracking-tighter">
                    Prêt pour l'<br /><span className="text-emerald-400">Expérience ?</span>
                  </p>
                  <p className="mt-6 text-zinc-500 font-medium text-lg italic">Déposez simplement vos articles pour commencer.</p>
                </motion.div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto pr-2">
                <AnimatePresence initial={false}>
                  {preparedCart.map((line, index) => (
                    <motion.article
                      key={line.id}
                      initial={{ opacity: 0, y: 28, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -26, scale: 0.98 }}
                      transition={{ duration: 0.28, ease: 'easeOut', delay: index * 0.02 }}
                      className="mb-4 flex items-center justify-between rounded-3xl border border-white/5 bg-white/[0.02] pl-8 pr-10 py-6 group hover:bg-white/[0.04] transition-all relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-60" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600 mb-1 group-hover:text-emerald-500 transition-colors">Article Sélectionné</span>
                        <h2 className="text-[2.2rem] font-black leading-tight text-white tracking-tight">{line.name}</h2>
                      </div>
                      <div className="flex items-center gap-12">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600 mb-1">Quantité</span>
                          <p className="text-3xl font-black text-white/40">
                            <span className="text-xl text-zinc-500 font-bold mr-1">×</span>{line.quantity}
                          </p>
                        </div>
                        <div className="flex flex-col text-right min-w-[140px]">
                          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500/50 mb-1">Prix Ligne</span>
                          <p className="text-4xl font-black text-emerald-300 tabular-nums">{CURRENCY.format(line.lineTotal)}</p>
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Discount breakdown */}
          {(loyaltyValue > 0 || manualDiscount > 0 || displayInfo.promoDiscount > 0) && (
            <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap gap-4 flex-shrink-0">
              {loyaltyValue > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">{settings.loyalty_currency_name} Fidélité</span>
                  <span className="text-lg font-black text-orange-200">-{CURRENCY.format(loyaltyValue)}</span>
                </div>
              )}
              {manualDiscount > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Remises POS</span>
                  <span className="text-lg font-black text-red-200">-{CURRENCY.format(manualDiscount)}</span>
                </div>
              )}
              {displayInfo.promoDiscount > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Coupon Promo</span>
                    {displayInfo.promoCode && <span className="text-[8px] font-bold text-cyan-400/60 uppercase">{displayInfo.promoCode}</span>}
                  </div>
                  <span className="text-lg font-black text-cyan-200">-{CURRENCY.format(displayInfo.promoDiscount)}</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─────────── RIGHT PANEL (col 4) ─────────── */}
        <aside className="col-span-4 flex flex-col gap-6">

          {/* Top Sales Slideshow */}
          <div className="flex-1 rounded-[2.5rem] border border-white/10 bg-zinc-900/60 backdrop-blur-xl overflow-hidden flex flex-col shadow-2xl relative">
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-emerald-500/90 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 backdrop-blur-md">
              <TrendingUp size={14} strokeWidth={3} className="animate-bounce" />
              Sélection Élite
            </div>

            <div className="relative flex-1 bg-black/40">
              <AnimatePresence mode="wait">
                {topProducts.length > 0 ? (
                  <motion.div
                    key={topProducts[slideIndex]?.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                  >
                    <motion.img
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      src={topProducts[slideIndex]?.image_url || FALLBACK_IMG}
                      alt={topProducts[slideIndex]?.name}
                      className="h-full w-full object-cover opacity-50 grayscale-[0.3] transition-all duration-1000"
                    />
                    <div className="absolute bottom-10 left-8 right-8 z-10">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col gap-4"
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-white/5 text-zinc-400 border border-white/10 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                            {topProducts[slideIndex]?.benefit}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold flex items-center gap-2">
                            <Sparkles size={12} className="animate-spin-slow" /> Populaire en ce moment
                          </p>
                          <h3 className="text-4xl font-serif font-bold italic leading-tight text-white mb-2 drop-shadow-2xl">
                            {topProducts[slideIndex]?.name}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                          <p className="text-3xl font-black text-emerald-400">{CURRENCY.format(topProducts[slideIndex]?.price ?? 0)}</p>
                          <div className="flex gap-2">
                            {topProducts.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setSlideIndex(i)}
                                className={`h-1 rounded-full transition-all duration-500 ${i === slideIndex ? 'w-10 bg-emerald-500' : 'w-2 bg-white/20'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px]">Analyse des tendances...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ─── QR Cadeau Card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-emerald-400/20 bg-zinc-900/80 backdrop-blur-xl p-6 flex items-center gap-5 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-emerald-500/10 blur-[40px] pointer-events-none"
            />

            {/* QR Code */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[20px] rounded-2xl" />
              <div className="relative w-24 h-24 bg-white rounded-2xl p-2 shadow-xl">
                <QRCodeSVG
                  value={qrValue}
                  size={80}
                  bgColor="#ffffff"
                  fgColor="#020408"
                  level="M"
                />
              </div>
              {/* Gift badge */}
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <Gift size={12} className="text-black" />
              </div>
            </div>

            {/* Label */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Award size={14} className="text-emerald-400 flex-shrink-0" />
                <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-black">
                  {displayInfo.referralCode ? 'Parrainage' : 'Boutique en ligne'}
                </span>
              </div>
              <p className="text-sm font-black text-white leading-tight">{qrLabel}</p>
              {displayInfo.referralCode && (
                <p className="text-[10px] text-zinc-500 font-bold mt-1 font-mono tracking-widest">
                  CODE: {displayInfo.referralCode}
                </p>
              )}
              <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">
                Scannez avec votre téléphone
              </p>
            </div>
          </motion.div>
        </aside>
      </div>

      {/* ─────────── Idle Screensaver ─────────── */}
      <AnimatePresence>
        {isIdle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020408] overflow-hidden"
          >
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-cover bg-center opacity-[0.15] mix-blend-luminosity scale-105" style={{ backgroundImage: "url('/images/N10.png')" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
              <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
              <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
            </div>

            <motion.div
              animate={{ y: [0, -20, 0], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex flex-col items-center"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full scale-125" />
                <img
                  src={settings.store_logo_dark_url || settings.store_logo_url || "/logo.png"}
                  alt={`${useSettingsStore.getState().settings.store_name} Logo`}
                  className="relative h-[500px] w-[500px] object-cover rounded-full shadow-[0_0_80px_rgba(16,185,129,0.15)] border-4 border-white/5"
                />
              </div>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-16 flex flex-col items-center"
              >
                <div className="flex items-center gap-6 text-emerald-400 mb-6">
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30"><Sparkles size={8} /></div>
                  <div className="h-px w-24 bg-gradient-to-r from-transparent to-emerald-400/50" />
                  <span className="text-xl font-black tracking-[0.5em] uppercase">Divertissement Premium</span>
                  <div className="h-px w-24 bg-gradient-to-l from-transparent to-emerald-400/50" />
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30"><Sparkles size={8} /></div>
                </div>
                <h2 className="text-zinc-500 text-3xl uppercase font-black tracking-[0.8em] animate-pulse">{settings.store_name}</h2>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
