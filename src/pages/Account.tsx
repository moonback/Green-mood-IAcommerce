import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Package,
  MapPin,
  Coins,
  LogOut,
  RefreshCw,
  Star,
  Shield,
  ArrowRight,
  Heart,
  Settings,
  Award,
  Crown,
  Gift,
  Eye,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { supabase } from '../lib/supabase';
import SEO from '../components/SEO';
import AccountSidebar from '../components/AccountSidebar';

/* ── Tier metadata ─────────────────────────────────────────────────── */

interface TierVisual {
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon: typeof Award;
  color: string;
  gradient: string;
  glow: string;
  ringColor: string;
  ringGlow: string;
}

const TIERS: TierVisual[] = [
  {
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 499,
    icon: Award,
    color: 'text-amber-500',
    gradient: 'from-amber-900/30 to-amber-800/10',
    glow: 'bg-amber-500/15',
    ringColor: '#d97706',
    ringGlow: 'rgba(217,119,6,0.35)',
  },
  {
    name: 'Silver',
    minPoints: 500,
    maxPoints: 1499,
    icon: Star,
    color: 'text-slate-400',
    gradient: 'from-slate-600/30 to-slate-500/10',
    glow: 'bg-slate-500/10',
    ringColor: '#94a3b8',
    ringGlow: 'rgba(148,163,184,0.35)',
  },
  {
    name: 'Gold',
    minPoints: 1500,
    maxPoints: null,
    icon: Crown,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/30 to-yellow-400/10',
    glow: 'bg-yellow-400/15',
    ringColor: '#eab308',
    ringGlow: 'rgba(234,179,8,0.4)',
  },
];

/* ── SVG ring constants ─────────────────────────────────────────────── */
const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R; // ≈339.3

/* ── Service tile type ─────────────────────────────────────────────── */
interface ServiceTile {
  icon: typeof Award;
  label: string;
  description: string;
  to: string;
  stat?: string;
  accentHex: string;
  size: 'large' | 'small';
  enabled?: boolean;
}

export default function Account() {
  const { profile, user, signOut } = useAuthStore();
  const { settings } = useSettingsStore();
  const [orderCount, setOrderCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [greeting, setGreeting] = useState('');

  /* ── Font injection ── */
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const points = profile?.loyalty_points ?? 0;

  /* ── Tier logic ── */
  const tiers = useMemo(() => {
    const settingsTiers = settings.loyalty_tiers || [];
    return settingsTiers
      .map((st) => {
        const visual =
          TIERS.find((t) => t.name.toLowerCase() === st.name.toLowerCase()) ||
          TIERS[0];
        return { ...visual, ...st, minPoints: st.min_points };
      })
      .sort((a, b) => a.minPoints - b.minPoints);
  }, [settings.loyalty_tiers]);

  const currentTier = useMemo(
    () => [...tiers].reverse().find((t) => points >= t.minPoints) || tiers[0],
    [points, tiers],
  );

  const nextTier = useMemo(() => {
    const idx = tiers.findIndex((t) => t.id === currentTier?.id);
    return idx < tiers.length - 1 ? tiers[idx + 1] : null;
  }, [currentTier, tiers]);

  const TierIcon = currentTier?.icon || Award;

  const progressPercent = useMemo(() => {
    if (!nextTier || !currentTier) return 100;
    const range = nextTier.minPoints - currentTier.minPoints;
    const progress = points - currentTier.minPoints;
    return Math.min(Math.round((progress / range) * 100), 100);
  }, [points, currentTier, nextTier]);

  const ringColor = currentTier?.ringColor || '#d97706';
  const ringGlow = currentTier?.ringGlow || 'rgba(217,119,6,0.3)';
  const ringOffset = RING_C * (1 - progressPercent / 100);

  const initials = profile?.full_name
    ? profile.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : '?';

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })
    : '';

  const eurValue = (points * ((settings.loyalty_redeem_rate || 5) / 100)).toFixed(2);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir');
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setOrderCount(count ?? 0));
  }, [user]);

  const handleCopyCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ── Service tiles ── */
  const services: ServiceTile[] = [
    {
      icon: Package,
      label: 'Mes Commandes',
      description: 'Suivre & gérer vos achats',
      to: '/compte/commandes',
      stat: `${orderCount} commande${orderCount > 1 ? 's' : ''}`,
      accentHex: '#3b82f6',
      size: 'large',
    },
    {
      icon: Coins,
      label: 'Programme Fidélité',
      description: 'Vos points & récompenses',
      to: '/compte/fidelite',
      stat: `${points} ${settings.loyalty_currency_name}`,
      accentHex: '#eab308',
      size: 'large',
    },
    {
      icon: Gift,
      label: 'Cadeau Anniversaire',
      description: "L'IA choisit pour vous !",
      to: '/compte/cadeau-anniversaire',
      accentHex: '#10b981',
      size: 'large',
    },
    {
      icon: MapPin,
      label: 'Adresses',
      description: 'Lieux de livraison',
      to: '/compte/adresses',
      accentHex: '#06b6d4',
      size: 'small',
    },
    {
      icon: Heart,
      label: 'Favoris',
      description: 'Produits sauvegardés',
      to: '/compte/favoris',
      accentHex: '#f43f5e',
      size: 'small',
    },
    {
      icon: Star,
      label: 'Mes Avis',
      description: 'Témoignages & notes',
      to: '/compte/avis',
      accentHex: '#f97316',
      size: 'small',
    },
    {
      icon: RefreshCw,
      label: 'Abonnements',
      description: 'Livraisons automatiques',
      to: '/compte/abonnements',
      accentHex: '#22c55e',
      size: 'small',
      enabled: settings.subscriptions_enabled,
    },
    {
      icon: Users,
      label: 'Parrainage',
      description: `Invitez & gagnez des ${settings.loyalty_currency_name}`,
      to: '/compte/parrainage',
      accentHex: '#6edf11',
      size: 'small',
    },
    {
      icon: Settings,
      label: 'Paramètres',
      description: 'Infos & sécurité',
      to: '/compte/profil',
      accentHex: '#64748b',
      size: 'small',
    },
  ].filter((t) => t.enabled !== false) as ServiceTile[];

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-20">
      <SEO
        title={`Mon Espace — ${settings.store_name}`}
        description={`Votre espace personnel ${settings.store_name}.`}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">

        {/* ═══════════════════════════════════════════════════════════
            HERO
            ═══════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[2.75rem] overflow-hidden mb-8"
          style={{ boxShadow: '0 32px 96px rgba(0,0,0,0.28)' }}
        >
          {/* Botanical bg */}
          <div className="absolute inset-0">
            <img
              src="/account_hero_bg.png"
              className="w-full h-full object-cover scale-105"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-bg)]/90 via-[color:var(--color-bg)]/60 to-[color:var(--color-bg)]/80 backdrop-blur-[2px]" />
            {/* tier-tinted atmospheric bloom */}
            <motion.div
              animate={{ opacity: [0.18, 0.32, 0.18], scale: [1, 1.12, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 80% 70% at 65% 50%, ${ringColor}22, transparent 70%)`,
              }}
            />
          </div>

          <div className="relative p-8 sm:p-10 md:p-12 lg:p-14 text-[color:var(--color-text)]">
            <div className="flex flex-col xl:flex-row items-center xl:items-start gap-10 xl:gap-16 w-full">

              {/* ─── Avatar + ring ─── */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', bounce: 0.28, duration: 0.9 }}
                  className="relative"
                  style={{ width: 148, height: 148 }}
                >
                  {/* Inner avatar circle */}
                  <div
                    className="absolute inset-[16px] rounded-full flex items-center justify-center"
                    style={{
                      background: 'color-mix(in srgb, var(--color-text) 5%, transparent)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid color-mix(in srgb, var(--color-text) 10%, transparent)',
                    }}
                  >
                    <span
                      className="text-[color:var(--color-text)]"
                      style={{
                        fontFamily: "'DM Serif Display', Georgia, serif",
                        fontSize: '2.4rem',
                        letterSpacing: '0.04em',
                        lineHeight: 1,
                      }}
                    >
                      {initials}
                    </span>
                  </div>

                  {/* SVG progress ring */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 148 148"
                    style={{ transform: 'rotate(-90deg)' }}
                  >
                    {/* Track */}
                    <circle
                      cx="74" cy="74" r={RING_R}
                      fill="none"
                      stroke="color-mix(in srgb, var(--color-text) 8%, transparent)"
                      strokeWidth="5"
                    />
                    {/* Glow under ring */}
                    <circle
                      cx="74" cy="74" r={RING_R}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C * (1 - progressPercent / 100)}
                      style={{ filter: `blur(6px) opacity(0.4)` }}
                    />
                    {/* Main ring */}
                    <motion.circle
                      cx="74" cy="74" r={RING_R}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      initial={{ strokeDashoffset: RING_C }}
                      animate={{ strokeDashoffset: ringOffset }}
                      transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
                      style={{ filter: `drop-shadow(0 0 6px ${ringColor})` }}
                    />
                  </svg>

                  {/* Tier badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.65, type: 'spring', bounce: 0.5 }}
                    className="absolute -bottom-0.5 -right-0.5 p-2 rounded-xl"
                    style={{
                      background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)',
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${ringColor}45`,
                      boxShadow: `0 0 18px ${ringGlow}`,
                    }}
                  >
                    <TierIcon className={`w-4 h-4 ${currentTier?.color}`} />
                  </motion.div>
                </motion.div>

                {/* Progression hint */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.95 }}
                  className="text-center mt-2"
                >
                  {nextTier ? (
                    <p
                      className="text-[10px] uppercase tracking-widest text-[color:var(--color-text)] opacity-70 font-bold"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      {nextTier.minPoints - points} pts → {nextTier.name}
                    </p>
                  ) : (
                    <p
                      className="text-[10px] uppercase tracking-widest text-[color:var(--color-text)] opacity-70 font-bold"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      Niveau maximum ✦
                    </p>
                  )}
                </motion.div>
              </div>

              {/* ─── Name + tier badge ─── */}
              <div className="flex-1 flex flex-col justify-center text-center xl:text-left min-w-0">
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="text-[11px] uppercase tracking-[0.28em] mb-2.5 text-[color:var(--color-text)] opacity-70 font-bold"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {greeting}
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.34 }}
                  className="text-5xl md:text-6xl lg:text-7xl leading-none text-[color:var(--color-text)] mb-5 truncate"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  {profile?.full_name ?? 'Membre'}
                </motion.h1>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.44 }}
                  className="flex flex-wrap items-center gap-2.5 justify-center xl:justify-start"
                >
                  {/* Tier chip */}
                  <span
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text)]"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      background: `color-mix(in srgb, ${ringColor} 20%, transparent)`,
                      border: `1px solid ${ringColor}`,
                      boxShadow: `0 0 16px ${ringGlow}`,
                    }}
                  >
                    <TierIcon className="w-3 h-3" style={{ color: ringColor }} />
                    {currentTier?.name ?? 'Bronze'}
                  </span>

                  {/* Member since */}
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[color:var(--color-text)] opacity-70 font-bold"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    <Shield className="w-3 h-3 opacity-60" />
                    Depuis {memberSince}
                  </span>
                </motion.div>
              </div>

              {/* ─── Editorial stats ─── */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.42 }}
                className="flex items-stretch divide-x divide-[color:var(--color-border)] shrink-0"
              >
                {/* Points */}
                <div className="px-7 text-center flex flex-col items-center justify-center gap-1">
                  <p
                    className="leading-none text-[color:var(--color-text)]"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: '3.2rem',
                    }}
                  >
                    {points.toLocaleString('fr-FR')}
                  </p>
                  <p
                    className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-text)] opacity-70 font-bold mt-1"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {settings.loyalty_currency_name}
                  </p>
                  <p
                    className="text-[color:var(--color-text)] opacity-80 font-bold"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '10px',
                    }}
                  >
                    ≈ {eurValue}€
                  </p>
                </div>

                {/* Orders */}
                <div className="px-7 text-center flex flex-col items-center justify-center gap-1">
                  <p
                    className="leading-none text-[color:var(--color-text)]"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: '3.2rem',
                    }}
                  >
                    {orderCount}
                  </p>
                  <p
                    className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-text)] opacity-70 font-bold mt-1"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    Commandes
                  </p>
                </div>

                {/* Progression */}
                <div className="px-7 text-center flex flex-col items-center justify-center gap-1">
                  <p
                    className="leading-none text-[color:var(--color-text)]"
                    style={{
                      fontFamily: "'DM Serif Display', Georgia, serif",
                      fontSize: '3.2rem',
                    }}
                  >
                    {progressPercent}%
                  </p>
                  <p
                    className="text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-text)] opacity-70 font-bold mt-1"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    Progression
                  </p>
                  <p
                    className="text-[color:var(--color-text)] opacity-80 font-bold"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '10px',
                    }}
                  >
                    → {nextTier?.name ?? 'Max'}
                  </p>
                </div>
              </motion.div>

            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            LAYOUT: Sidebar + Main
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <AccountSidebar />

          <div className="flex-1 space-y-8 min-w-0">

            {/* ── Quick actions bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
              className="flex flex-wrap gap-3"
            >
              {/* Referral code */}
              <div
                className="flex items-center gap-3.5 px-5 py-3 rounded-2xl flex-1 min-w-[220px]"
                style={{
                  background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/12 flex items-center justify-center shrink-0 border border-purple-500/20">
                  <Gift className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[9px] uppercase tracking-wider text-[color:var(--color-text-muted)] leading-none mb-1"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    Code parrainage
                  </p>
                  <p
                    className="text-sm font-bold text-[color:var(--color-text)] truncate"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {profile?.referral_code || '———'}
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0"
                  style={{
                    background: copied
                      ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                      : 'color-mix(in srgb, var(--color-bg) 100%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        <Check className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy className="w-3.5 h-3.5 text-[color:var(--color-text-muted)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Catalogue */}
              <Link
                to="/catalogue"
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-300 group"
                style={{
                  background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center group-hover:bg-[color:var(--color-primary)] transition-colors duration-300">
                  <Eye className="w-4 h-4 text-[color:var(--color-primary)] group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="text-sm font-bold text-[color:var(--color-text)]">Catalogue</span>
              </Link>

              {/* Signout */}
              <button
                onClick={signOut}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-300 group"
                style={{
                  background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 transition-colors duration-300">
                  <LogOut className="w-4 h-4 text-red-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <span className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-red-500 transition-colors duration-300">
                  Déconnexion
                </span>
              </button>
            </motion.div>

            {/* ── Section label ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48 }}
              className="flex items-center gap-3"
            >
              <div className="w-1 h-5 rounded-full bg-[color:var(--color-primary)]" />
              <p
                className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]"
                style={{ fontFamily: "'DM Mono', monospace" }}
              >
                Privilèges Client
              </p>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════
                BENTO GRID
                ═══════════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {services.map((service, i) => {
                const isLarge = service.size === 'large';
                return (
                  <motion.div
                    key={service.label}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.52 + i * 0.055, ease: [0.16, 1, 0.3, 1] }}
                    className={isLarge ? 'col-span-2' : 'col-span-1'}
                  >
                    <ServiceCard service={service} isLarge={isLarge} />
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ── Support card ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Link
                to="/contact"
                className="group flex flex-col md:flex-row items-center gap-6 rounded-[2rem] overflow-hidden transition-all duration-500 relative"
                style={{
                  background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                  padding: '1.75rem 2rem',
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse at 0% 50%, color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 60%)',
                  }}
                />
                {/* Top accent line on hover */}
                <div className="absolute top-0 left-8 right-8 h-px bg-[color:var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-full" />

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:bg-[color:var(--color-primary)]"
                  style={{
                    background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
                  }}
                >
                  <Sparkles className="w-6 h-6 text-[color:var(--color-primary)] group-hover:text-white transition-colors duration-500" />
                </div>

                <div className="flex-1 text-center md:text-left relative z-10">
                  <h3
                    className="text-xl font-bold text-[color:var(--color-text)] mb-1"
                    style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                  >
                    Besoin d'aide ?
                  </h3>
                  <p className="text-sm text-[color:var(--color-text-muted)] max-w-md">
                    Notre équipe d'experts est disponible 7j/7 pour vous accompagner.
                  </p>
                </div>

                <div
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all duration-500 shrink-0 w-full md:w-auto justify-center relative z-10 group-hover:bg-[color:var(--color-primary)] group-hover:text-white group-hover:border-[color:var(--color-primary)]"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                    color: 'var(--color-text)',
                  }}
                >
                  <span>Nous contacter</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>

            {/* Security footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="flex items-center justify-center gap-2 pt-2"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: 'var(--color-text-muted)',
                fontSize: '9px',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
              }}
            >
              <Shield className="w-3 h-3 text-[color:var(--color-primary)]" />
              <span>
                Données protégées & chiffrées · {settings.store_name} Elite
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SERVICE CARD — extracted for clean hover state management
   ═══════════════════════════════════════════════════════════════════════ */
function ServiceCard({
  service,
  isLarge,
}: {
  service: ServiceTile;
  isLarge: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const { accentHex } = service;

  return (
    <Link
      to={service.to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col overflow-hidden rounded-[1.75rem] h-full transition-all duration-450"
      style={{
        background: 'color-mix(in srgb, var(--color-card) 85%, transparent)',
        border: `1px solid ${hovered ? `${accentHex}45` : 'color-mix(in srgb, var(--color-border) 100%, transparent)'}`,
        minHeight: isLarge ? 200 : 170,
        padding: isLarge ? '1.75rem 2rem' : '1.4rem 1.5rem',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 10px 40px ${accentHex}18, 0 4px 16px rgba(0,0,0,0.06)` : 'none',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-[2px] rounded-b-full transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentHex}, transparent)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Corner radial glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-600"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 0% 0%, ${accentHex}0f, transparent 70%)`,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Icon row */}
      <div className="relative z-10 flex items-start justify-between mb-auto">
        <div
          className="flex items-center justify-center rounded-xl transition-all duration-400"
          style={{
            width: isLarge ? 52 : 44,
            height: isLarge ? 52 : 44,
            background: `${accentHex}18`,
            border: `1px solid ${accentHex}28`,
            transform: hovered ? 'scale(1.1) rotate(3deg)' : 'scale(1) rotate(0deg)',
          }}
        >
          <service.icon
            style={{
              width: isLarge ? 22 : 18,
              height: isLarge ? 22 : 18,
              color: accentHex,
            }}
          />
        </div>
        <ArrowRight
          className="w-4 h-4 text-[color:var(--color-text-muted)] transition-all duration-350"
          style={{
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
          }}
        />
      </div>

      {/* Text */}
      <div className="relative z-10 mt-5">
        <h3
          className="font-black tracking-tight text-[color:var(--color-text)] transition-colors duration-400 leading-tight"
          style={{
            fontFamily: isLarge ? "'DM Serif Display', Georgia, serif" : 'inherit',
            fontSize: isLarge ? '1.15rem' : '0.9rem',
            color: hovered ? accentHex : undefined,
          }}
        >
          {service.label}
        </h3>
        <p className="text-xs text-[color:var(--color-text-muted)] mt-1 leading-relaxed">
          {service.description}
        </p>

        {service.stat && (
          <div className="mt-3.5 flex items-center gap-2.5">
            <div className="h-px flex-1 bg-[color:var(--color-border)]" />
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{
                fontFamily: "'DM Mono', monospace",
                color: accentHex,
              }}
            >
              {service.stat}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
