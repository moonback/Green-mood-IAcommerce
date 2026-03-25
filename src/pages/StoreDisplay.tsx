import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Package, Star, Quote, Flame, Leaf, ShieldCheck, Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudDrizzle, CloudLightning, CloudFog, Megaphone, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Product } from '../lib/types';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../components/ThemeProvider';
import { Ad } from '../components/AdCard';
import { useStoreDisplayData, type ReviewItem } from '../hooks/useStoreDisplayData';

interface FlashPromo {
  enabled: boolean;
  title: string;
  subtitle: string;
  original_price: number;
  promo_price: number;
  end_date: string;
  product_id: string;
}

interface MachinesTip {
  id: string;
  enabled: boolean;
  title: string;
  content: string;
  icon: 'leaf' | 'zap' | 'shield' | 'star';
}

type SlideItem =
  | { kind: 'product'; product: Product }
  | { kind: 'grid'; products: Product[] }
  | { kind: 'tip'; tip: MachinesTip }
  | { kind: 'flash' }
  | { kind: 'ad'; ad: Ad };

interface DisplayConfig {
  product_ids: string[];
  rotation_interval: number;
  show_price: boolean;
  show_qr: boolean;
  show_ticker: boolean;
  ticker_text: string;
  video_url: string;
  background_image_url: string;
  show_reviews: boolean;
  display_mode: 'single' | 'grid';
  grid_count: 2 | 3 | 4;
  flash_promo: FlashPromo;
  show_scarcity: boolean;
  scarcity_threshold: number;
  show_tips: boolean;
  tip_frequency: number;
  cbd_tips: MachinesTip[];
  show_weather: boolean;
  weather_city: string;
  show_ads: boolean;
  ad_frequency: number;
}

const DEFAULT_TIPS: MachinesTip[] = [
  { id: 'entretien', enabled: true, title: 'Entretien de Votre Machine', content: 'Un nettoyage hebdomadaire des surfaces et un contrôle mensuel des câblages prolongent la durée de vie de votre machine de plusieurs années. Nos techniciens sont disponibles pour tout contrat de maintenance.', icon: 'shield' },
  { id: 'installation', enabled: true, title: 'Installation Optimale', content: 'Pour une expérience optimale, installez votre machine sur une surface stable et de niveau, à l\'écart des sources de chaleur. Prévoyez 60 cm d\'espace autour pour la circulation et la ventilation.', icon: 'zap' },
  { id: 'qualite', enabled: true, title: 'Qualité Certifiée CE', content: 'Toutes nos machines sont certifiées CE et conformes aux normes électriques européennes. Elles sont testées et révisées dans notre atelier avant livraison — zéro compromis sur la sécurité.', icon: 'star' },
  { id: 'sav', enabled: false, title: 'SAV France 48h', content: 'Notre service après-vente France intervient sous 48h maximum. Pièces détachées disponibles pour toutes nos machines pendant au moins 5 ans après la vente.', icon: 'leaf' },
  { id: 'roi', enabled: false, title: 'Rentabilité en Bar & Restaurant', content: 'Une borne d\'arcade bien placée génère en moyenne 200 à 800 € par mois en exploitation commerciale. Notre équipe peut vous conseiller sur le positionnement et le réglage optimal.', icon: 'zap' },
];

const DEFAULT_CONFIG: DisplayConfig = {
  product_ids: [],
  rotation_interval: 8,
  show_price: true,
  show_qr: true,
  show_ticker: false,
  ticker_text: `${useSettingsStore.getState().settings.store_name} Premium  ·  Bien-Être Naturel  ·  Produits 100% naturels  ·  Livraison offerte dès 40€`,
  video_url: '',
  background_image_url: '',
  show_reviews: true,
  display_mode: 'single',
  grid_count: 3,
  flash_promo: { enabled: false, title: '', subtitle: '', original_price: 0, promo_price: 0, end_date: '', product_id: '' },
  show_scarcity: true,
  scarcity_threshold: 5,
  show_tips: false,
  tip_frequency: 3,
  cbd_tips: DEFAULT_TIPS,
  show_weather: true,
  weather_city: 'Paris',
  show_ads: true,
  ad_frequency: 4,
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=1920&q=90';
const CURRENCY = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// ─────────────────────────────────────────────────────────────────
// UI primitives
// ─────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono tabular-nums">
      {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function LiveDate() {
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setDate(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-bold uppercase tracking-[0.15em]">
      {date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
    </span>
  );
}

// WMO weather code → lucide icon + label
function weatherIcon(code: number): { Icon: React.ElementType; color: string } {
  if (code === 0) return { Icon: Sun, color: 'text-yellow-300' };
  if (code <= 2) return { Icon: CloudSun, color: 'text-yellow-200' };
  if (code === 3) return { Icon: Cloud, color: 'text-zinc-300' };
  if (code <= 48) return { Icon: CloudFog, color: 'text-zinc-400' };
  if (code <= 55) return { Icon: CloudDrizzle, color: 'text-sky-300' };
  if (code <= 65) return { Icon: CloudRain, color: 'text-sky-400' };
  if (code <= 77) return { Icon: CloudSnow, color: 'text-blue-200' };
  if (code <= 82) return { Icon: CloudRain, color: 'text-sky-400' };
  return { Icon: CloudLightning, color: 'text-yellow-400' };
}

interface WeatherData { temp: number; code: number }

function WeatherWidget({ city }: { city: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!city.trim()) return;
    let cancelled = false;

    async function fetchWeather() {
      try {
        const query = city.trim();
        let geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=fr&format=json`;

        let geoRes = await fetch(geocodeUrl);
        let geoData = await geoRes.json();
        let loc = geoData?.results?.[0];

        // Fallback: Si pas de résultat et qu'il y a des espaces, essayer avec des tirets
        if (!loc && query.includes(' ')) {
          geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.replace(/\s+/g, '-'))}&count=1&language=fr&format=json`;
          geoRes = await fetch(geocodeUrl);
          geoData = await geoRes.json();
          loc = geoData?.results?.[0];
        }

        if (!loc || cancelled) return;

        const wxRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&temperature_unit=celsius`
        );
        const wxData = await wxRes.json();
        if (!cancelled && wxData?.current_weather) {
          setWeather({ temp: Math.round(wxData.current_weather.temperature), code: wxData.current_weather.weathercode });
        }
      } catch { /* silently fail */ }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [city]);

  if (!weather) return null;
  const { Icon, color } = weatherIcon(weather.code);

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
      <span className="text-lg font-bold text-white tabular-nums">{weather.temp}°</span>
    </div>
  );
}

/** Seamless horizontal scrolling ticker */
function Ticker({ text }: { text: string }) {
  const chunk = `${text}   ·   `.repeat(5);
  return (
    <div className="overflow-hidden">
      <motion.span
        className="inline-block whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 60, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
      >
        {chunk}{chunk}
      </motion.span>
    </div>
  );
}

/** Minimal stock badge integrated into badge row */
function StockBadge({ qty, threshold = 5, showScarcity = true }: { qty: number; threshold?: number; showScarcity?: boolean }) {
  if (qty <= 0) return (
    <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/25 text-[11px] font-black uppercase tracking-widest text-red-400 backdrop-blur-sm flex items-center gap-1.5">
      <Package className="w-3 h-3" /> Rupture de stock
    </span>
  );
  if (showScarcity && qty <= threshold) return (
    <motion.span
      className="px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-[11px] font-black uppercase tracking-widest text-red-400 backdrop-blur-sm flex items-center gap-2"
      animate={{ borderColor: ['rgba(239,68,68,0.3)', 'rgba(239,68,68,0.65)', 'rgba(239,68,68,0.3)'], boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 14px rgba(239,68,68,0.3)', '0 0 0px rgba(239,68,68,0)'] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.span
        className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
        animate={{ opacity: [1, 0.2, 1], scale: [1, 1.35, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      />
      Derniers articles · {qty} restant{qty > 1 ? 's' : ''}
    </motion.span>
  );
  return null; // Don't clutter badge row when in stock
}

function getTipIcon(icon: MachinesTip['icon']) {
  switch (icon) {
    case 'zap': return Zap;
    case 'shield': return ShieldCheck;
    case 'star': return Star;
    default: return Leaf;
  }
}

/** Animated review card */
function ReviewCard({ review, reviewKey }: { review: ReviewItem; reviewKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={reviewKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-md"
      >
        <div className="relative px-5 py-4 rounded-2xl bg-black/40 border border-white/8 backdrop-blur-xl overflow-hidden">
          {/* Amber left accent line */}
          <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-gradient-to-b from-amber-400/60 via-amber-300/40 to-transparent" />
          <div className="pl-3">
            {/* Stars */}
            <div className="flex items-center gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-3 h-3 ${i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />
              ))}
            </div>
            {review.comment && (
              <p className="text-sm text-zinc-300 font-light italic leading-snug line-clamp-2 mb-2.5">
                <Quote className="inline w-3 h-3 text-amber-400/40 mr-1 -mt-0.5" />
                {review.comment}
              </p>
            )}
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              — {review.profile?.full_name ?? 'Client vérifié'}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────
// Flash Promo slide
// ─────────────────────────────────────────────────────────────────

function useCountdown(endDate: string) {
  const calcRemaining = useCallback(() => {
    if (!endDate) return null;
    const diff = new Date(endDate).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, diff };
  }, [endDate]);
  const [remaining, setRemaining] = useState(calcRemaining);
  useEffect(() => {
    setRemaining(calcRemaining());
    const t = setInterval(() => setRemaining(calcRemaining()), 1_000);
    return () => clearInterval(t);
  }, [calcRemaining]);
  return remaining;
}

function CountdownUnit({ value, label, prevValue }: { value: number; label: string; prevValue: number }) {
  const changed = value !== prevValue;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10" />
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/8 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-black/40" />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={changed ? { y: -40, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center font-mono font-black text-5xl text-white tabular-nums"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
          >
            {String(value).padStart(2, '0')}
          </motion.span>
        </AnimatePresence>
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400/80 to-transparent" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300/60">{label}</span>
    </div>
  );
}

function FlashPromoSlide({ promo, productImg }: { promo: FlashPromo; productImg: string | null }) {
  const remaining = useCountdown(promo.end_date);
  const prevH = useRef(remaining?.h ?? 0);
  const prevM = useRef(remaining?.m ?? 0);
  const prevS = useRef(remaining?.s ?? 0);
  useEffect(() => {
    if (remaining) { prevH.current = remaining.h; prevM.current = remaining.m; prevS.current = remaining.s; }
  });

  const discount = promo.original_price > 0 ? Math.round((1 - promo.promo_price / promo.original_price) * 100) : 0;
  const savings = promo.original_price - promo.promo_price;
  const hasProduct = !!productImg;

  return (
    <motion.div
      key="flash-promo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      className="absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#0a0400]" />
      {productImg && <img src={productImg} alt="" className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-20" />}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-950/60 via-transparent to-black/80" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-orange-600/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-orange-900/20 blur-[100px]" />

      <div className={`absolute inset-0 flex ${hasProduct ? 'flex-row' : 'flex-col items-center justify-center'}`}>
        {hasProduct && (
          <div className="relative w-[48%] h-full flex-shrink-0">
            <motion.img
              initial={{ scale: 1.08, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              src={productImg}
              alt={promo.title}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
            {discount > 0 && (
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: -8 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
                className="absolute top-12 right-[-28px] z-20"
              >
                <div className="relative w-28 h-28 flex flex-col items-center justify-center rounded-full bg-orange-500 shadow-[0_0_60px_rgba(249,115,22,0.7)] border-4 border-orange-300/30">
                  <span className="text-black font-black text-3xl leading-none">-{discount}</span>
                  <span className="text-black font-black text-lg leading-none">%</span>
                </div>
              </motion.div>
            )}
            <motion.div
              className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent"
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
            />
          </div>
        )}

        <div className={`relative flex flex-col justify-center ${hasProduct ? 'flex-1 px-14 py-16' : 'items-center text-center max-w-3xl px-16 gap-8'}`}>
          <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className={`flex items-center gap-3 mb-6 ${hasProduct ? '' : 'justify-center'}`}>
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-orange-500/15 border border-orange-500/30 backdrop-blur-sm">
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>
                <Flame className="w-5 h-5 text-orange-400" />
              </motion.div>
              <span className="text-orange-300 font-black text-sm uppercase tracking-[0.3em]">Offre Flash</span>
            </div>
            {!hasProduct && discount > 0 && (
              <div className="px-4 py-2 rounded-full bg-orange-500 text-black font-black text-sm">-{discount}%</div>
            )}
          </motion.div>

          <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="mb-4">
            <h2 className="font-serif font-bold text-white leading-[0.95] tracking-tight" style={{ fontSize: hasProduct ? 'clamp(2.8rem, 5.5vw, 5.5rem)' : 'clamp(3rem, 7vw, 7rem)' }}>
              {promo.title}
            </h2>
            {promo.subtitle && <p className="mt-3 text-lg text-orange-200/60 font-light tracking-wider">{promo.subtitle}</p>}
          </motion.div>

          <motion.div initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ delay: 0.35, duration: 0.5 }} className={`h-px bg-gradient-to-r from-orange-500/50 to-transparent mb-6 ${hasProduct ? 'w-full origin-left' : 'w-64 origin-center'}`} />

          <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className={`flex items-end gap-5 mb-4 ${hasProduct ? '' : 'justify-center'}`}>
            <div className="flex flex-col gap-1">
              <span className="text-zinc-500 text-2xl line-through font-light tabular-nums">{CURRENCY.format(promo.original_price)}</span>
              <span className="font-black text-orange-400 tabular-nums leading-none" style={{ fontSize: hasProduct ? 'clamp(3.5rem, 7vw, 7rem)' : 'clamp(4rem, 9vw, 9rem)', textShadow: '0 0 80px rgba(251,146,60,0.45)' }}>
                {CURRENCY.format(promo.promo_price)}
              </span>
            </div>
          </motion.div>

          {savings > 0 && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-8 ${hasProduct ? '' : 'self-center'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-300 font-bold text-sm">Vous économisez {CURRENCY.format(savings)}</span>
            </motion.div>
          )}

          {remaining ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55 }} className={`flex flex-col gap-4 ${hasProduct ? '' : 'items-center'}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-400/50">Expire dans</p>
              <div className="flex items-end gap-3">
                {remaining.h > 0 && (<><CountdownUnit value={remaining.h} label="h" prevValue={prevH.current} /><span className="text-3xl font-black text-orange-500/40 pb-6">:</span></>)}
                <CountdownUnit value={remaining.m} label="min" prevValue={prevM.current} />
                <span className="text-3xl font-black text-orange-500/40 pb-6">:</span>
                <CountdownUnit value={remaining.s} label="sec" prevValue={prevS.current} />
              </div>
            </motion.div>
          ) : (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-base font-black text-red-400/80 uppercase tracking-[0.3em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Offre expirée
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Ad slide (Full screen for TV)
// ─────────────────────────────────────────────────────────────────

function AdSlide({ ad }: { ad: Ad }) {
  const badgeStyle: Record<string, string> = {
    neon: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_20px_rgba(57,255,20,0.3)]',
    amber: 'bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.3)]',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    pink: 'bg-pink-500/20 text-pink-400 border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  };

  const colorKey = ad.badge_color ?? 'amber';

  return (
    <motion.div
      key={`ad-${ad.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[#020408]" />
      {ad.image_url && (
        <motion.img
          animate={{ scale: [1, 1.1] }}
          transition={{ duration: 15, ease: 'linear' }}
          src={ad.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-black/80" />

      <div className="absolute inset-0 flex flex-col items-center justify-center p-20 gap-10">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-amber-400/15 border border-amber-400/30 backdrop-blur-md">
            <Megaphone className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-black uppercase tracking-[0.4em] text-amber-400">Sponsorisé</span>
          </div>
          {ad.badge_text && (
            <div className={`px-5 py-2 rounded-full border text-xs font-black uppercase tracking-[0.3em] ${badgeStyle[colorKey]}`}>
              {ad.badge_text}
            </div>
          )}
        </motion.div>

        <div className="text-center max-w-5xl space-y-8">
          <motion.h2
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="font-serif font-bold text-white leading-tight tracking-tight"
            style={{ fontSize: 'clamp(4rem, 8vw, 8rem)', textShadow: '0 0 80px rgba(251,191,36,0.2)' }}
          >
            {ad.title}
          </motion.h2>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mx-auto"
          />

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-3xl text-amber-100/70 font-light tracking-wide"
          >
            {ad.tagline}
          </motion.p>
        </div>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="flex items-center gap-6"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="px-10 py-5 bg-amber-400 text-black rounded-[2rem] font-black text-2xl uppercase tracking-widest shadow-[0_0_50px_rgba(251,191,36,0.4)]">
              {ad.cta_label || 'Voir l\'offre'}
            </div>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2">{ad.description}</p>
          </div>

          <div className="w-32 h-32 bg-white rounded-3xl p-3 shadow-2xl flex-shrink-0">
            <QRCodeSVG value={ad.cta_url} size={104} bgColor="#ffffff" fgColor="#020408" level="H" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scanner pour</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Profiter</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// Machines Tip slide — Option C (Premium Sales Layout)
// ─────────────────────────────────────────────────────────────────

// Stats & social proof per tip category
const TIP_META: Record<string, {
  stat: string; statLabel: string;
  testimonial: string; testimonialAuthor: string;
  cta: string;
  accentColor: string; glowColor: string; textColor: string;
  suggestedCategory: string; // used to pick a product to show beside the tip
}> = {
  entretien: { stat: '+5ans', statLabel: 'de durée de vie\navec un bon entretien', testimonial: '"Un technicien ESIL est venu réviser ma borne, elle tourne comme neuve !"', testimonialAuthor: 'Sophie M. · Cliente depuis 2023', cta: 'Prenez un contrat maintenance →', accentColor: 'from-emerald-600/20 to-teal-900/30', glowColor: 'rgba(16,185,129,0.15)', textColor: 'text-emerald-300', suggestedCategory: 'Jeux d\'Arcade' },
  installation: { stat: '48h', statLabel: 'pour une installation\ncomplète', testimonial: '"Installation impeccable en 2h par les techniciens ESIL. Machine opérationnelle immédiatement !"', testimonialAuthor: 'Laurent D. · Client vérifié', cta: 'Optez pour l\'installation pro →', accentColor: 'from-sky-600/20 to-blue-900/30', glowColor: 'rgba(56,189,248,0.12)', textColor: 'text-sky-300', suggestedCategory: 'Simulateurs' },
  qualite: { stat: '100%', statLabel: 'certifié CE\nconforme normes UE', testimonial: '"La certification CE et la qualité du SAV m\'ont convaincu d\'acheter ici."', testimonialAuthor: `Marie L. · Cliente ${useSettingsStore.getState().settings.store_name}`, cta: 'Voir les certifications en boutique →', accentColor: 'from-violet-600/20 to-indigo-900/30', glowColor: 'rgba(139,92,246,0.12)', textColor: 'text-violet-300', suggestedCategory: '' },
  sav: { stat: '48h', statLabel: 'délai d\'intervention\nSAV France', testimonial: '"Un technicien est intervenu le lendemain. Service impeccable et pièce remplacée sur place."', testimonialAuthor: 'Thomas R. · Client fidèle', cta: 'Contactez notre SAV →', accentColor: 'from-amber-600/20 to-yellow-900/30', glowColor: 'rgba(245,158,11,0.12)', textColor: 'text-amber-300', suggestedCategory: 'Flippers' },
  roi: { stat: '400€', statLabel: 'revenus mensuels\nmoyens en bar', testimonial: '"Ma borne d\'arcade est rentabilisée en 18 mois. Un vrai investissement !"', testimonialAuthor: 'Clara V. · Gérante bar vérifié', cta: 'Calculez votre ROI →', accentColor: 'from-rose-600/20 to-pink-900/30', glowColor: 'rgba(244,63,94,0.12)', textColor: 'text-rose-300', suggestedCategory: 'Jeux d\'Arcade' },
};

const DEFAULT_META = TIP_META['quality'];

function MachinesTipSlide({ tip, products }: { tip: MachinesTip; products: Product[] }) {
  const TipIcon = getTipIcon(tip.icon);
  const meta = TIP_META[tip.id] ?? DEFAULT_META;

  // Pick a suggested product from the preferred category, or any featured one
  const suggestedProduct = products.find(p =>
    p.is_active && meta.suggestedCategory && p.category?.name?.toLowerCase().includes(meta.suggestedCategory.toLowerCase())
  ) ?? products.find(p => p.is_active && p.is_featured) ?? products.find(p => p.is_active) ?? null;

  return (
    <motion.div
      key={`tip-${tip.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex overflow-hidden"
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-[#030a04]" />
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.accentColor}`} />
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-[200px]" style={{ background: meta.glowColor }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-black/40 blur-[100px]" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.025] pointer-events-none" />

      {/* ── Animated scan line ── */}
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      />

      {/* ══════════════════════════════════════════════
          LEFT COLUMN — Main Content
      ══════════════════════════════════════════════ */}
      <div className="relative flex flex-col justify-center pl-20 pr-10 py-20 w-[58%] gap-7">

        {/* Expert badge */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm`}>
            <TipIcon className={`w-4 h-4 ${meta.textColor}`} />
            <span className={`text-[11px] font-black uppercase tracking-[0.35em] ${meta.textColor} opacity-80`}>Conseil Expert Loisirs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">{useSettingsStore.getState().settings.store_name} Certified</span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-serif font-bold text-white leading-[1.05] tracking-tight"
          style={{ fontSize: 'clamp(2.6rem, 4.5vw, 4.5rem)', textShadow: `0 0 80px ${meta.glowColor}` }}
        >
          {tip.title}
        </motion.h2>

        {/* Separator */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className={`h-px w-32 origin-left bg-gradient-to-r from-white/20 to-transparent`}
        />

        {/* Body text */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="text-xl text-zinc-300 font-light leading-relaxed max-w-xl"
        >
          {tip.content}
        </motion.p>

        {/* Testimonial */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex items-start gap-4 px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm max-w-xl"
        >
          <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: `linear-gradient(to bottom, ${meta.glowColor.replace('0.', '0.8,').split(',')[0]}, transparent)` }} />
          <div>
            <p className="text-sm text-zinc-300 font-light italic leading-snug mb-2">  {meta.testimonial}</p>
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{meta.testimonialAuthor}</p>
          </div>
        </motion.div>

        {/* CTA */}
        {/* <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className={`inline-flex items-center gap-3 self-start px-6 py-3.5 rounded-2xl border font-black text-base tracking-wide cursor-pointer ${meta.textColor} border-current/20 bg-current/5`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {meta.cta}
        </motion.div> */}

        {/* Credentials strip at bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-5 pt-2"
        >
          {['✅ Certifié CE', '🛡️ Garantie 2 ans', '🔧 SAV 48h', '🚚 Livraison France'].map((badge) => (
            <span key={badge} className="text-[11px] font-bold text-zinc-600">{badge}</span>
          ))}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT COLUMN — Stat + Suggested Product
      ══════════════════════════════════════════════ */}
      <div className="relative flex flex-col justify-center items-center w-[42%] py-20 pr-16 gap-8">

        {/* Big impact stat */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 22 }}
          className="text-center"
        >
          <div
            className={`font-black leading-none tracking-tight ${meta.textColor}`}
            style={{ fontSize: 'clamp(5rem, 9vw, 8rem)', textShadow: `0 0 100px ${meta.glowColor}` }}
          >
            {meta.stat}
          </div>
          <p className={`text-sm font-bold tracking-widest uppercase whitespace-pre-line opacity-60 mt-2 ${meta.textColor}`}>
            {meta.statLabel}
          </p>
        </motion.div>

        {/* Decorative divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-px h-16 bg-gradient-to-b from-white/15 to-transparent"
        />

        {/* Suggested product card */}
        {suggestedProduct ? (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[280px] rounded-3xl overflow-hidden border border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.7)]"
          >
            {/* Product image */}
            <div className="relative aspect-[4/5] bg-zinc-900 overflow-hidden">
              <img
                src={suggestedProduct.image_url ?? FALLBACK_IMG}
                alt={suggestedProduct.name}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              {/* Top badge */}
              {suggestedProduct.is_featured && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider">
                  ★ Top Vente
                </div>
              )}

              {/* Bottom info */}
              <div className="absolute bottom-0 inset-x-0 p-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">{suggestedProduct.category?.name}</p>
                <p className="font-serif text-white font-bold text-lg leading-tight line-clamp-2">{suggestedProduct.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`font-black text-xl ${meta.textColor}`} style={{ textShadow: `0 0 20px ${meta.glowColor}` }}>
                    {CURRENCY.format(suggestedProduct.price)}
                  </span>
                  {suggestedProduct.attributes?.brand && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
                      {suggestedProduct.attributes.brand}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* "Demandez en boutique" footer */}
            <div className="px-4 py-3 bg-black/60 border-t border-white/5 text-center backdrop-blur-sm">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Demandez en boutique</p>
            </div>
          </motion.div>
        ) : (
          /* Fallback — big icon when no product */
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 22 }}
            className="relative"
          >
            <div className="absolute inset-0 blur-[60px] rounded-full scale-150" style={{ background: meta.glowColor }} />
            <div className="relative w-36 h-36 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <TipIcon className={`w-16 h-16 ${meta.textColor}`} />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Grid slide
// ─────────────────────────────────────────────────────────────────

function ProductGridSlide({ products, config, reviewsMap }: { products: Product[]; config: DisplayConfig; reviewsMap: Record<string, ReviewItem[]> }) {
  const colClass = products.length === 2 ? 'grid-cols-2' : products.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <motion.div
      key={`grid-${products.map(p => p.id).join('-')}`}
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-0 grid ${colClass} gap-0`}
    >
      {products.map((product, idx) => {
        const review = (reviewsMap[product.id] ?? [])[0] ?? null;
        return (
          <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden">
            <img src={product.image_url ?? FALLBACK_IMG} alt={product.name} className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />
            {idx < products.length - 1 && <div className="absolute top-0 right-0 w-px h-full bg-white/5" />}
            <div className="absolute inset-0 flex flex-col justify-end p-6 pb-10 gap-3">
              <div className="flex flex-wrap gap-1.5">
                {product.category?.name && <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[9px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-sm">{product.category.name}</span>}
                {product.attributes?.brand && <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest text-emerald-400 backdrop-blur-sm">{product.attributes.brand}</span>}
                {product.is_featured && <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest">★ Elite</span>}
              </div>
              <h3 className="font-serif font-bold text-white leading-tight" style={{ fontSize: products.length <= 2 ? 'clamp(1.6rem,3.5vw,3rem)' : 'clamp(1.1rem,2.2vw,2rem)' }}>{product.name}</h3>
              {config.show_price && (
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-emerald-400" style={{ fontSize: products.length <= 2 ? 'clamp(1.4rem,3vw,2.5rem)' : 'clamp(1rem,2vw,1.8rem)', textShadow: '0 0 30px rgba(57,255,20,0.4)' }}>{CURRENCY.format(product.price)}</span>
                  {product.weight_grams && <span className="text-zinc-500 text-sm font-light">{product.weight_grams}g</span>}
                </div>
              )}
              {config.show_reviews && review?.comment && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-black/50 border border-white/8 backdrop-blur-sm">
                  <Quote className="w-3 h-3 text-amber-400/50 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-zinc-400 italic line-clamp-2 leading-snug">"{review.comment}"</p>
                </div>
              )}
              {config.show_qr && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white rounded-lg p-1 flex-shrink-0">
                    <QRCodeSVG value={`${window.location.origin}/catalogue/${product.slug}`} size={32} bgColor="#ffffff" fgColor="#020408" level="L" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">Scanner</span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main display page
// ─────────────────────────────────────────────────────────────────

export default function StoreDisplay() {
  const { products, ads, config, isLoading, reviewsMap } = useStoreDisplayData<DisplayConfig>(DEFAULT_CONFIG);
  const [slideIndex, setSlideIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);

  useEffect(() => {
    const tryFullscreen = () => {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement)
        document.documentElement.requestFullscreen().catch(() => { });
    };
    document.addEventListener('click', tryFullscreen, { once: true });
    tryFullscreen();
    return () => document.removeEventListener('click', tryFullscreen);
  }, []);

  const isFlashActive = useMemo(() => { const fp = config.flash_promo; return fp.enabled && !!fp.title && (!fp.end_date || new Date(fp.end_date) > new Date()); }, [config.flash_promo]);

  const gridGroups = useMemo<Product[][]>(() => {
    if (config.display_mode !== 'grid' || products.length === 0) return [];
    const groups: Product[][] = [];
    for (let i = 0; i < products.length; i += config.grid_count) groups.push(products.slice(i, i + config.grid_count));
    return groups;
  }, [products, config.display_mode, config.grid_count]);

  const slideSequence = useMemo<SlideItem[]>(() => {
    const enabledTips = (config.show_tips && config.cbd_tips?.length > 0)
      ? config.cbd_tips.filter(t => t.enabled)
      : [];
    const freq = Math.max(1, config.tip_frequency ?? 3);
    const baseSlides: SlideItem[] = config.display_mode === 'grid'
      ? gridGroups.map(g => ({ kind: 'grid' as const, products: g }))
      : products.map(p => ({ kind: 'product' as const, product: p }));
    const result: SlideItem[] = [];
    let tipIdx = 0;
    baseSlides.forEach((slide, i) => {
      result.push(slide);
      if (enabledTips.length > 0 && (i + 1) % freq === 0) {
        result.push({ kind: 'tip', tip: enabledTips[tipIdx % enabledTips.length] });
        tipIdx++;
      }
    });

    if (config.show_ads && ads.length > 0) {
      const adFreq = Math.max(1, config.ad_frequency ?? 4);
      const intermediate: SlideItem[] = [];
      let adIdx = 0;
      result.forEach((slide, i) => {
        intermediate.push(slide);
        if ((i + 1) % adFreq === 0) {
          intermediate.push({ kind: 'ad', ad: ads[adIdx % ads.length] });
          adIdx++;
        }
      });
      if (isFlashActive) intermediate.push({ kind: 'flash' });
      return intermediate;
    }

    if (isFlashActive) result.push({ kind: 'flash' });
    return result;
  }, [products, gridGroups, config, isFlashActive, ads]);

  const totalSlides = Math.max(slideSequence.length, 1);

  useEffect(() => {
    if (totalSlides < 2) return;
    const t = setInterval(() => setSlideIndex(prev => (prev + 1) % totalSlides), config.rotation_interval * 1000);
    return () => clearInterval(t);
  }, [totalSlides, config.rotation_interval]);

  useEffect(() => { setSlideIndex(0); }, [products.length, config.display_mode, config.grid_count]);
  useEffect(() => { setReviewIndex(0); }, [slideIndex]);
  useEffect(() => {
    const item = slideSequence[slideIndex];
    const currentId = item?.kind === 'product' ? item.product.id : null;
    if (!currentId) return;
    const reviews = reviewsMap[currentId] ?? [];
    if (reviews.length < 2) return;
    const t = setInterval(() => setReviewIndex(prev => (prev + 1) % reviews.length), 5000);
    return () => clearInterval(t);
  }, [slideIndex, reviewsMap, slideSequence]);

  const currentSlideItem = slideSequence[slideIndex] ?? null;
  const isFlashSlide = currentSlideItem?.kind === 'flash';
  const isTipSlide = currentSlideItem?.kind === 'tip';
  const currentGridGroup = currentSlideItem?.kind === 'grid' ? currentSlideItem.products : null;
  const currentProduct = currentSlideItem?.kind === 'product' ? currentSlideItem.product : null;
  const flashProductImg = isFlashSlide ? (products.find(p => p.id === config.flash_promo.product_id)?.image_url ?? null) : null;
  const showIdle = !isLoading && slideSequence.length === 0;
  const currentReviews = currentProduct ? (reviewsMap[currentProduct.id] ?? []) : [];
  const currentReview = currentReviews[reviewIndex] ?? null;
  const isLowStock = (config.show_scarcity ?? true) && currentProduct !== null && currentProduct.stock_quantity > 0 && currentProduct.stock_quantity <= (config.scarcity_threshold ?? 5);

  return (
    <div className="relative min-h-screen w-full bg-[#020408] overflow-hidden text-white select-none">

      {/* ═══ BACKGROUND MEDIA ═══ */}
      {config.video_url ? (
        <video key={config.video_url} src={config.video_url} className="absolute inset-0 w-full h-full object-cover z-0" autoPlay muted loop playsInline />
      ) : config.background_image_url ? (
        <div className="absolute inset-0 w-full h-full bg-cover bg-center z-0" style={{ backgroundImage: `url(${config.background_image_url})` }} />
      ) : null}

      {/* ═══ TOP HEADER ═══ */}
      <header className="absolute top-0 inset-x-0 z-30 pointer-events-none">
        <div className="flex items-start justify-between px-10 pt-8 pb-24 bg-gradient-to-b from-black/75 via-black/25 to-transparent">

          {/* Left — Logo + Wordmark */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 bg-zinc-900/80 backdrop-blur-sm">
              <img src={useSettingsStore.getState().settings.store_logo_dark_url || useSettingsStore.getState().settings.store_logo_url || "/logo.png"} alt={useSettingsStore.getState().settings.store_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black text-white tracking-[0.08em] uppercase">{useSettingsStore.getState().settings.store_name}</span>
              <span className="text-[11px] font-bold text-emerald-400/55 tracking-[0.3em] uppercase mt-1">{useSettingsStore.getState().settings.store_name} Premium</span>
            </div>
          </motion.div>

          {/* Right — Clock + dots */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-end gap-3"
          >
            {/* Clock + Weather */}
            <div className="flex items-center gap-4">
              {(config.show_weather ?? true) && config.weather_city && (
                <div className="flex items-center gap-1.5 opacity-80">
                  <WeatherWidget city={config.weather_city} />
                </div>
              )}
              <div className="flex flex-col items-end">
                <span className="text-4xl font-black text-white font-mono tabular-nums tracking-tight leading-none" style={{ textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
                  <LiveClock />
                </span>
                <span className="text-[11px] text-zinc-500 mt-1.5"><LiveDate /></span>
              </div>
            </div>
            {/* Slide dots */}
            {totalSlides > 1 && (
              <div className="flex items-center gap-2">
                {Array.from({ length: totalSlides }).map((_, i) => {
                  const slide = slideSequence[i];
                  const isFlash = slide?.kind === 'flash';
                  const isTip = slide?.kind === 'tip';
                  return (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-500 ${i === slideIndex
                        ? isFlash
                          ? 'w-8 h-2 bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.7)]'
                          : isTip
                            ? 'w-8 h-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                            : slide?.kind === 'ad'
                              ? 'w-8 h-2 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                              : 'w-8 h-2 bg-emerald-500 shadow-[0_0_8px_rgba(57,255,20,0.7)]'
                        : isFlash
                          ? 'w-2 h-2 bg-orange-500/25'
                          : isTip
                            ? 'w-2 h-2 bg-emerald-500/25'
                            : slide?.kind === 'ad'
                              ? 'w-2 h-2 bg-amber-500/25'
                              : 'w-2 h-2 bg-white/15'
                        }`}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </header>

      {/* ═══ MAIN SLIDES ═══ */}
      <AnimatePresence mode="wait">

        {/* Flash promo */}
        {isFlashSlide ? (
          <FlashPromoSlide key="flash" promo={config.flash_promo} productImg={flashProductImg} />

          /* CBD Tip slide */
        ) : isTipSlide && currentSlideItem?.kind === 'tip' ? (
          <MachinesTipSlide key={`tip-${currentSlideItem.tip.id}-${slideIndex}`} tip={currentSlideItem.tip} products={products} />

          /* Ad slide */
        ) : currentSlideItem?.kind === 'ad' ? (
          <AdSlide key={`ad-${currentSlideItem.ad.id}-${slideIndex}`} ad={currentSlideItem.ad} />

          /* Grid mode */
        ) : currentGridGroup ? (
          <ProductGridSlide key={`grid-${slideIndex}`} products={currentGridGroup} config={config} reviewsMap={reviewsMap} />

          /* Idle screensaver */
        ) : showIdle ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Background elements */}
            {!config.video_url && !config.background_image_url && (
              <>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.015]" />
                <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full bg-emerald-500/4 blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/4 blur-[150px] animate-pulse" style={{ animationDuration: '13s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/3 blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
              </>
            )}
            {(config.video_url || config.background_image_url) && <div className="absolute inset-0 bg-black/65" />}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

            {/* Central content */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex flex-col items-center gap-10"
            >
              {/* Logo */}
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/12 blur-[100px] rounded-full scale-150 animate-pulse" style={{ animationDuration: '5s' }} />
                <div className="absolute inset-0 bg-emerald-500/6 blur-[50px] rounded-full scale-125" />
                <img
                  src={useSettingsStore.getState().settings.store_logo_dark_url || useSettingsStore.getState().settings.store_logo_url || "/logo.png" }
                  alt={useSettingsStore.getState().settings.store_name}
                  className="relative w-72 h-72 rounded-full object-cover border-2 border-white/8 shadow-2xl"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>

              {/* Wordmark */}
              <div className="text-center space-y-4">
                <div className="flex items-center gap-5 justify-center text-emerald-400/35">
                  <span className="w-24 h-px bg-gradient-to-r from-transparent to-current" />
                  <Zap className="w-5 h-5" />
                  <span className="w-24 h-px bg-gradient-to-l from-transparent to-current" />
                </div>
                <h1 className="text-8xl font-serif font-bold tracking-[-0.02em] text-white leading-none" style={{ textShadow: '0 0 80px rgba(57,255,20,0.08)' }}>
                  {useSettingsStore.getState().settings.store_name}
                </h1>
                <p className="text-xl font-light text-zinc-500 tracking-[0.5em] uppercase">Machines de Loisirs · Importateur Officiel</p>
              </div>

              {/* Value props */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center gap-6 mt-2"
              >
                {[
                  { icon: Leaf, label: '100% Naturel' },
                  { icon: ShieldCheck, label: 'Certifié laboratoire' },
                  { icon: Star, label: 'Avis vérifiés' },
                ].map(({ icon: Icon, label }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + i * 0.15 }}
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/4 border border-white/8 backdrop-blur-sm"
                  >
                    <Icon className="w-4 h-4 text-emerald-400/60" />
                    <span className="text-sm font-bold text-zinc-400 whitespace-nowrap">{label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>

          /* Single product slide */
        ) : currentProduct ? (
          <motion.div
            key={`${currentProduct.id}-${slideIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Product image — Ken Burns */}
            <motion.img
              key={currentProduct.id}
              src={currentProduct.image_url ?? FALLBACK_IMG}
              alt={currentProduct.name}
              animate={{ scale: [1, 1.06] }}
              transition={{ duration: config.rotation_interval * 1.5, ease: 'linear' }}
              className="absolute inset-0 w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
            />

            {/* Layered overlays — cinema grade */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/55 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.035] pointer-events-none" />

            {/* ─── Info panel (left 62%, bottom) ─── */}
            <div className="absolute left-0 bottom-0 w-[62%] px-14 pb-20 pt-32 flex flex-col justify-end">

              {/* Badges */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18, duration: 0.6 }}
                className="flex flex-wrap gap-2 mb-7"
              >
                {currentProduct.category?.name && (
                  <span className="px-3.5 py-1.5 rounded-full bg-white/8 border border-white/12 text-[11px] font-bold uppercase tracking-widest text-zinc-300 backdrop-blur-sm">
                    {currentProduct.category.name}
                  </span>
                )}
                {currentProduct.attributes?.brand && (
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/18 border border-emerald-500/28 text-[11px] font-bold uppercase tracking-widest text-emerald-400 backdrop-blur-sm">
                    {currentProduct.attributes.brand}
                  </span>
                )}
                {(currentProduct.attributes?.benefits ?? []).slice(0, 2).map(b => (
                  <span key={b} className="px-3.5 py-1.5 rounded-full bg-emerald-500/12 border border-emerald-500/22 text-[11px] font-bold uppercase tracking-widest text-emerald-300 backdrop-blur-sm">
                    {b}
                  </span>
                ))}
                {currentProduct.is_featured && (
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-black text-[11px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(57,255,20,0.4)]">
                    ★ Elite
                  </span>
                )}
                <StockBadge qty={currentProduct.stock_quantity} threshold={config.scarcity_threshold ?? 5} showScarcity={config.show_scarcity ?? true} />
              </motion.div>

              {/* Product name */}
              <motion.h2
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif font-bold text-white leading-[0.9] tracking-tight mb-7"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}
              >
                {currentProduct.name}
              </motion.h2>

              {/* Price block */}
              {config.show_price && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, duration: 0.6 }}
                  className="flex items-baseline gap-5 mb-6"
                >
                  <motion.span
                    className="font-black text-emerald-400 tabular-nums"
                    style={{ fontSize: 'clamp(3rem, 7vw, 6.5rem)' }}
                    animate={isLowStock ? {
                      textShadow: [
                        '0 0 60px rgba(57,255,20,0.5), 0 0 120px rgba(57,255,20,0.2)',
                        '0 0 60px rgba(239,68,68,0.7), 0 0 120px rgba(239,68,68,0.4)',
                        '0 0 60px rgba(57,255,20,0.5), 0 0 120px rgba(57,255,20,0.2)',
                      ]
                    } : { textShadow: '0 0 60px rgba(57,255,20,0.5), 0 0 120px rgba(57,255,20,0.2)' }}
                    transition={{ duration: 2, repeat: isLowStock ? Infinity : 0, ease: 'easeInOut' }}
                  >
                    {CURRENCY.format(currentProduct.price)}
                  </motion.span>
                  {currentProduct.is_bundle && currentProduct.original_value && currentProduct.original_value > currentProduct.price && (
                    <span className="text-3xl text-zinc-600 line-through font-light">{CURRENCY.format(currentProduct.original_value)}</span>
                  )}
                  {currentProduct.weight_grams && (
                    <span className="text-2xl text-zinc-500 font-light">{currentProduct.weight_grams}g</span>
                  )}
                </motion.div>
              )}

              {/* Description */}
              {currentProduct.description && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.38 }}
                  className="text-zinc-400 text-xl font-light leading-relaxed max-w-2xl line-clamp-2 mb-7"
                >
                  {currentProduct.description}
                </motion.p>
              )}

              {/* Review */}
              {config.show_reviews && currentReview && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <ReviewCard review={currentReview} reviewKey={`${currentProduct.id}-${reviewIndex}`} />
                </motion.div>
              )}

              {/* Review dots */}
              {config.show_reviews && currentReviews.length > 1 && (
                <div className="flex items-center gap-1.5 mt-4">
                  {currentReviews.slice(0, 5).map((_, i) => (
                    <div key={i} className={`rounded-full transition-all duration-300 ${i === reviewIndex ? 'w-4 h-1.5 bg-amber-400' : 'w-1.5 h-1.5 bg-zinc-700'}`} />
                  ))}
                </div>
              )}
            </div>

            {/* ─── QR code (right side, center-bottom) ─── */}
            {config.show_qr && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-20 right-14 flex flex-col items-center gap-4"
              >
                {/* Frosted glass card */}
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500/15 blur-[40px] rounded-3xl scale-110" />
                  <div className="relative p-4 rounded-3xl bg-white/6 border border-white/12 backdrop-blur-2xl shadow-2xl">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/8 to-transparent" />
                    <div className="relative bg-white rounded-2xl p-3 shadow-inner">
                      <QRCodeSVG
                        value={`${window.location.origin}/catalogue/${currentProduct.slug}`}
                        size={130}
                        bgColor="#ffffff"
                        fgColor="#020408"
                        level="M"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Commander en ligne</p>
                  <p className="text-[10px] font-bold text-zinc-700 mt-0.5 truncate max-w-[150px]">{window.location.hostname}</p>
                </div>
              </motion.div>
            )}

          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ═══ TICKER ═══ */}
      {config.show_ticker && config.ticker_text && (
        <div className="absolute z-30 inset-x-0 bottom-1 bg-zinc-950/70 backdrop-blur-md border-t border-white/4 py-2.5 px-6">
          <Ticker text={config.ticker_text} />
        </div>
      )}

      {/* ═══ PROGRESS BAR ═══ */}
      {slideSequence.length > 0 && currentSlideItem && (
        <div className="absolute bottom-0 inset-x-0 z-40 h-[3px] bg-white/4">
          <motion.div
            key={`progress-${slideIndex}`}
            className={`h-full rounded-full ${isFlashSlide
              ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]'
              : isTipSlide
                ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                : currentSlideItem?.kind === 'ad'
                  ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                  : 'bg-emerald-500 shadow-[0_0_10px_rgba(57,255,20,0.6)]'
              }`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: config.rotation_interval, ease: 'linear' }}
          />
        </div>
      )}

      {/* ═══ LOADING ═══ */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border border-emerald-500/10" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">Initialisation</span>
          </div>
        </div>
      )}
    </div>
  );
}
