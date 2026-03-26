import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Coins, ArrowLeft, TrendingUp, TrendingDown, Settings2, Sparkles, Star, Award, Crown, Gift, Zap, Shield, Plus, ChevronLeft, ChevronRight, RefreshCw, Package, Users, Cake } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import type { LoyaltyTransaction } from '../lib/types';
import SEO from '../components/SEO';
import AccountSidebar from '../components/AccountSidebar';

/* ── Tier definitions ─────────────────────────────────────────────── */

interface Tier {
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon: typeof Award;
  color: string;
  bgGlow: string;
  border: string;
  gradient: string;
  benefits: string[];
}

const TIERS: Tier[] = [
  {
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 499,
    icon: Award,
    color: 'text-amber-600',
    bgGlow: 'bg-amber-500/15',
    border: 'border-amber-600/30',
    gradient: 'from-amber-900/20 via-amber-800/10 to-transparent',
    benefits: ['1 point par euro', 'Accès aux offres membres', 'Newsletter exclusive'],
  },
  {
    name: 'Silver',
    minPoints: 500,
    maxPoints: 1499,
    icon: Star,
    color: 'text-[color:var(--color-text-subtle)]',
    bgGlow: 'bg-[color:var(--color-text)]/10',
    border: 'border-[color:var(--color-border-strong)]',
    gradient: 'from-zinc-600/20 via-zinc-500/10 to-transparent',
    benefits: ['1.5x points par euro', 'Livraison offerte dès 30\u00A0\u20AC', 'Accès ventes privées', 'Cadeau anniversaire'],
  },
  {
    name: 'Gold',
    minPoints: 1500,
    maxPoints: null,
    icon: Crown,
    color: 'text-yellow-400',
    bgGlow: 'bg-yellow-400/15',
    border: 'border-yellow-400/30',
    gradient: 'from-yellow-500/20 via-yellow-400/10 to-transparent',
    benefits: ['2x points par euro', 'Livraison offerte illimitée', 'Accès avant-premières', 'Réductions VIP -15%', 'Service prioritaire'],
  },
];

function getCurrentTier(points: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) return TIERS[i];
  }
  return TIERS[0];
}

function getNextTier(points: number): Tier | null {
  const current = getCurrentTier(points);
  const idx = TIERS.indexOf(current);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

/* ── Transaction type config ──────────────────────────────────────── */

const getTypeConfig = (c: string) => ({
  earned: { label: `${c} gagnés`, icon: TrendingUp, color: 'text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/25', sign: '+' },
  redeemed: { label: `${c} utilisés`, icon: TrendingDown, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', sign: '\u2212' },
  adjusted: { label: 'Ajustement', icon: Settings2, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', sign: '\u00B1' },
  expired: { label: `${c} expirés`, icon: TrendingDown, color: 'text-[color:var(--color-text-muted)] bg-[color:var(--color-bg-elevated)]/85 border-[color:var(--color-border)]', sign: '\u2212' },
  referral: { label: 'Bonus Parrainage', icon: Gift, color: 'text-pink-500 bg-pink-500/10 border-pink-500/20', sign: '+' },
});

/* ── Component ────────────────────────────────────────────────────── */

export default function LoyaltyHistory() {
  const { user, profile } = useAuthStore();
  const { settings } = useSettingsStore();

  if (!settings.loyalty_program_enabled) {
    return <Navigate to="/compte" replace />;
  }

  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');
  const itemsPerPage = 10;

  const points = profile?.loyalty_points ?? 0;

  // Merge Visual Metadata with Settings Tiers
  const tiers = useMemo(() => {
    const settingsTiers = settings.loyalty_tiers || [];
    return settingsTiers.map(st => {
      const visual = TIERS.find(t => t.name.toLowerCase() === st.name.toLowerCase()) || TIERS[0];

      // Auto-generate benefits text based on settings if not manually defined
      const benefits = [
        `${st.multiplier}x points par euro`,
        st.free_shipping_threshold === 0 ? 'Livraison offerte illimitée' : st.free_shipping_threshold ? `Livraison offerte dès ${st.free_shipping_threshold}€` : 'Accès aux offres membres',
        st.vip_discount > 0 ? `Réduction VIP -${st.vip_discount * 100}%` : 'Newsletter exclusive'
      ];

      return {
        ...visual,
        ...st,
        minPoints: st.min_points,
        benefits: st.benefits && st.benefits.length > 0 ? st.benefits : benefits
      };
    }).sort((a, b) => a.min_points - b.min_points);
  }, [settings.loyalty_tiers]);

  const currentTier = useMemo(() => {
    return [...tiers].reverse().find(t => points >= t.minPoints) || tiers[0];
  }, [points, tiers]);

  const nextTier = useMemo(() => {
    const idx = tiers.findIndex(t => t.id === currentTier?.id);
    return idx < tiers.length - 1 ? tiers[idx + 1] : null;
  }, [currentTier, tiers]);

  const progressPercent = useMemo(() => {
    if (!nextTier) return 100;
    const range = nextTier.minPoints - currentTier.minPoints;
    const progress = points - currentTier.minPoints;
    return Math.min(Math.round((progress / range) * 100), 100);
  }, [points, currentTier, nextTier]);

  const pointsToNext = nextTier ? nextTier.minPoints - points : 0;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setTransactions((data as LoyaltyTransaction[]) ?? []);
        setIsLoading(false);
      });
  }, [user]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const TierIcon = currentTier.icon;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
      <SEO title={`Programme Privilège — L'Excellence ${settings.store_name}`} description="Consultez l'historique de vos points de fidélité." />

      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <AccountSidebar />
          <div className="flex-1 space-y-8">

            {/* Header */}
            <div className="mb-8">
              <Link to="/compte" className="inline-flex items-center gap-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] text-xs font-bold uppercase tracking-wider transition-colors mb-4">
                <ArrowLeft className="w-3.5 h-3.5" />
                Mon Espace
              </Link>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center border border-yellow-400/20">
                      <Coins className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-4xl font-black tracking-tight uppercase">
                        Votre Odyssée <span className="text-[color:var(--color-primary)]">Privilège</span>
                      </h1>
                      <p className="text-xs text-[color:var(--color-text-muted)] font-mono uppercase tracking-widest mt-1">L'excellence récompensée à chaque instant</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[color:var(--color-card)]/80 px-6 py-4 rounded-2xl border border-[color:var(--color-border)] shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] mb-0.5">Solde Actuel</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[color:var(--color-text)]">{points}</span>
                    <span className="text-[10px] font-black uppercase text-yellow-600 tracking-tighter">{settings.loyalty_currency_name}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 bg-[color:var(--color-card)]/80 backdrop-blur-xl border border-[color:var(--color-border)] rounded-[1.5rem] mb-10 w-fit">
                {[
                  { id: 'status', label: 'Statut & Avantages', icon: Star },
                  { id: 'history', label: 'Historique des points', icon: RefreshCw },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all relative overflow-hidden group ${isActive ? 'text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
                        }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-[color:var(--color-card)]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon className={`w-4 h-4 relative z-10 transition-colors ${isActive ? 'text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary)]'}`} />
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[600px]">
              {activeTab === 'status' ? (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8"
                >
                  {/* ═══ Gamified Tier Card ══════════════════════════════════════ */}
                  <div className={`relative bg-[color:var(--color-card)]/80 border ${currentTier.border.replace('border-', 'border-')} rounded-[2.5rem] p-8 md:p-12 overflow-hidden group shadow-sm`}>
                    <div className={`absolute -top-24 -right-24 w-80 h-80 ${currentTier.bgGlow} blur-[120px] pointer-events-none opacity-50 transition-opacity group-hover:opacity-100 duration-1000`} />
                    <div className={`absolute -bottom-24 -left-24 w-60 h-60 ${currentTier.bgGlow} blur-[100px] pointer-events-none opacity-20`} />

                    <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-10">
                      {/* Tier icon with massive presence */}
                      <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="relative shrink-0"
                      >
                        <div className={`absolute inset-0 ${currentTier.bgGlow} blur-3xl rounded-full opacity-60`} />
                        <div className={`w-32 h-32 bg-[color:var(--color-card)]/80 border-2 ${currentTier.border} rounded-[2rem] flex items-center justify-center relative overflow-hidden shadow-2xl`}>
                          <TierIcon className={`w-14 h-14 ${currentTier.color} relative z-10`} />
                          <div className={`absolute inset-0 bg-gradient-to-t ${currentTier.gradient} opacity-50`} />

                          {/* Animated scan line effect */}
                          <motion.div
                            animate={{ top: ['100%', '-100%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-1/2 bg-gradient-to-t from-transparent via-white/5 to-transparent pointer-events-none"
                          />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[color:var(--color-primary)] text-[color:var(--color-text)] p-2 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.5)] z-20">
                          <Zap className="w-5 h-5 fill-current" />
                        </div>
                      </motion.div>

                      {/* Tier info & Progress */}
                      <div className="flex-1 space-y-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h2 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter ${currentTier.color}`}>
                              {currentTier.name}
                            </h2>
                            <span className="px-3 py-1.5 rounded-xl bg-[color:var(--color-bg-elevated)]/85 border border-white/[0.1] text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-text-muted)]">
                              Palier Actuel
                            </span>
                          </div>
                          <p className="text-base text-[color:var(--color-text-muted)] max-w-xl leading-relaxed">
                            {currentTier.name === 'Bronze' && `Votre voyage d'exception commence. Chaque interaction au sein de l'univers ${settings.store_name} cultive vos privilèges futurs.`}
                            {currentTier.name === 'Silver' && 'Un nouveau standard d\'excellence. Votre fidélité exemplaire vous ouvre les portes d\'une expérience personnalisée.'}
                            {currentTier.name === 'Gold' && `Le sommet de l'excellence. Vous incarnez l'esprit ${settings.store_name} et bénéficiez de notre attention la plus absolue.`}
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest font-mono">
                            <span className={currentTier.color}>{currentTier.name}</span>
                            {nextTier ? (
                              <span className="text-[color:var(--color-text-muted)]">Prochain : {nextTier.name} ({pointsToNext} {settings.loyalty_currency_name} restants)</span>
                            ) : (
                              <span className="text-yellow-400 flex items-center gap-2">
                                <Crown className="w-3.5 h-3.5" /> Statut Ultime Atteint
                              </span>
                            )}
                          </div>

                          <div className="relative h-4 bg-[color:var(--color-bg-elevated)] rounded-full border border-[color:var(--color-border)] p-1 shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 1.5, ease: "circOut" }}
                              className="h-full rounded-full relative overflow-hidden"
                              style={{
                                background: currentTier.name === 'Gold'
                                  ? 'linear-gradient(90deg, #facc15, #f59e0b)'
                                  : currentTier.name === 'Silver'
                                    ? 'linear-gradient(90deg, #a1a1aa, #d4d4d8)'
                                    : 'linear-gradient(90deg, #b45309, #d97706)',
                              }}
                            >
                              {/* Gloss effect */}
                              <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                              <motion.div
                                animate={{ x: ['100%', '-100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                              />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Benefits Grid */}
                    <div className="mt-12 pt-10 border-t border-[color:var(--color-border)]">
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">
                          Vos Privilèges {currentTier.name}
                        </p>
                        <div className="w-24 h-px bg-gradient-to-r from-transparent to-white/10 hidden md:block" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentTier.benefits.map((benefit, i) => (
                          <motion.div
                            key={benefit}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            whileHover={{ y: -5, backgroundColor: 'rgba(37,99,235,0.05)' }}
                            className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-[color:var(--color-bg)] border border-[color:var(--color-border)] transition-all group/benefit"
                          >
                            <div className={`w-10 h-10 rounded-xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] flex items-center justify-center shrink-0 group-hover/benefit:border-[color:var(--color-primary)]/20`}>
                              <Sparkles className={`w-4 h-4 ${currentTier.color} opacity-60 group-hover/benefit:opacity-100 transition-opacity`} />
                            </div>
                            <span className="text-sm text-[color:var(--color-text-subtle)] font-medium leading-relaxed">{benefit}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ═══ Tiers Overview ══════════════════════════════════ */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]">Panorama des Paliers</h3>
                      <div className="flex-1 h-px bg-[color:var(--color-bg-elevated)]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {tiers.map((tier, idx) => {
                        const isActive = tier.name === currentTier.name;
                        const TIcon = tier.icon;
                        const maxPoints = idx < tiers.length - 1 ? tiers[idx + 1].minPoints - 1 : null;
                        return (
                          <div
                            key={tier.name}
                            className={`relative rounded-[2rem] p-6 transition-all duration-500 border ${isActive
                              ? `bg-[color:var(--color-card)]/80 ${tier.border} shadow-xl`
                              : 'bg-[color:var(--color-bg)] border-[color:var(--color-border)] grayscale opacity-50 hover:grayscale-0 hover:opacity-80'
                              }`}
                          >
                            {isActive && (
                              <div className="absolute top-6 right-6">
                                <div className="w-2.5 h-2.5 bg-[color:var(--color-primary)] rounded-full animate-ping absolute" />
                                <div className="w-2.5 h-2.5 bg-[color:var(--color-primary)] rounded-full relative" />
                              </div>
                            )}
                            <TIcon className={`w-10 h-10 mb-6 ${tier.color}`} />
                            <h4 className={`text-xl font-black uppercase tracking-tight mb-1 ${tier.color}`}>{tier.name}</h4>
                            <p className="text-xs font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
                              {maxPoints ? `${tier.minPoints} – ${maxPoints}` : `${tier.minPoints}+`} points
                            </p>

                            {isActive && (
                              <div className="mt-8 pt-6 border-t border-[color:var(--color-border)]">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[color:var(--color-primary)]/60">Position Actuelle</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ═══ How to Earn ═════════════════════════════════════ */}
                  <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                      <Gift className="w-20 h-20 text-[color:var(--color-primary)]/10 -rotate-12" />
                    </div>

                    <div className="relative">
                      <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Comment accumuler ?</h3>
                      <p className="text-sm text-[color:var(--color-text-muted)] mb-8 max-w-md">Multipliez vos privilèges en interagissant avec l'écosystème {settings.store_name}.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { icon: Package, title: 'Achats', desc: `1€ = ${settings.loyalty_earn_rate || 1} ${settings.loyalty_currency_name}` },
                          { icon: Users, title: 'Parrainage', desc: `${settings.referral_reward_points || 500} ${settings.loyalty_currency_name} par ami` },
                          { icon: Star, title: 'Avis', desc: `50 ${settings.loyalty_currency_name} par avis` },
                          { icon: Cake, title: 'Anniversaire', desc: 'Cadeau surprise offert' },
                        ].map((item, i) => (
                          <div key={i} className="space-y-3">
                            <div className="w-12 h-12 rounded-[1rem] bg-[color:var(--color-bg)] flex items-center justify-center border border-[color:var(--color-border)]">
                              <item.icon className="w-5 h-5 text-[color:var(--color-primary)]" />
                            </div>
                            <div>
                              <p className="font-bold text-[color:var(--color-text)] uppercase text-xs tracking-wider">{item.title}</p>
                              <p className="text-[11px] text-[color:var(--color-text-muted)] font-mono mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Historique des Flux</h3>
                      <p className="text-xs text-[color:var(--color-text-muted)] font-mono uppercase tracking-[0.2em] mt-1">Traçabilité complète de vos avantages</p>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)]">
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[color:var(--color-primary)]" /> Gains</span>
                      <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Dépenses</span>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-[1.5rem] p-6 animate-pulse h-24" />
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-[color:var(--color-card)]/80 border border-dashed border-[color:var(--color-border)] rounded-[2.5rem]">
                      <div className="w-20 h-20 rounded-full bg-[color:var(--color-bg)] flex items-center justify-center border border-[color:var(--color-border)]">
                        <Sparkles className="w-8 h-8 text-[color:var(--color-text-subtle)]" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xl font-black uppercase tracking-tight text-[color:var(--color-text)]">Aucun mouvement détecté</p>
                        <p className="text-xs text-[color:var(--color-text-muted)] max-w-xs mx-auto leading-relaxed uppercase tracking-widest">Votre capital d'excellence est en attente de sa première transaction.</p>
                      </div>
                      <Link to="/boutique" className="px-8 py-3 bg-[color:var(--color-card)] text-[color:var(--color-text)] text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-colors">
                        Explorer la Boutique
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {currentTransactions.map((tx, i) => {
                        const TYPE_CONFIG = getTypeConfig(settings.loyalty_currency_name);
                        const config = TYPE_CONFIG[tx.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.adjusted;
                        const Icon = config.icon;
                        const isCredit = tx.type === 'earned' || tx.type === 'referral' || (tx.type === 'adjusted' && tx.points > 0);

                        return (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`group relative flex flex-col items-center justify-center gap-4 p-8 rounded-[2.5rem] border transition-all duration-700 ${isCredit
                              ? 'bg-[color:var(--color-primary)]/10 border-emerald-500 shadow-sm'
                              : 'bg-[color:var(--color-card)]/80 border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/35'
                              }`}
                          >
                            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all group-hover:scale-105 shadow-xl ${config.color.replace('bg-', 'bg-[color:var(--color-card)]/80 ').replace('emerald-500/10', 'emerald-50').replace('white/[0.04]', 'zinc-50')}`}>
                              <Icon className="w-6 h-6" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-black uppercase tracking-tight text-[color:var(--color-text)]">{config.label}</p>
                                <span className="px-2 py-0.5 rounded-lg bg-[color:var(--color-bg)] border border-[color:var(--color-border)] text-[8px] font-black uppercase tracking-[0.15em] text-[color:var(--color-text-muted)]">
                                  #{tx.id.slice(0, 8)}
                                </span>
                              </div>

                              {tx.note && (
                                <p className="text-xs text-[color:var(--color-text-muted)] font-medium mb-2">{tx.note}</p>
                              )}

                              <div className="flex items-center gap-4">
                                <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
                                  {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                <div className="w-1 h-1 rounded-full bg-[color:var(--color-text-subtle)]" />
                                <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
                                  Solde : {tx.balance_after} {settings.loyalty_currency_name}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className={`text-2xl font-black ${isCredit ? 'text-[color:var(--color-primary)]' : 'text-yellow-600'}`}>
                                {config.sign}{tx.points}
                              </p>
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{settings.loyalty_currency_name}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-12 pt-8 border-t border-[color:var(--color-border)]">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)]">
                        Séquence <span className="text-[color:var(--color-text)]">{currentPage}</span> / {totalPages}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="w-12 h-12 flex items-center justify-center bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl hover:bg-[color:var(--color-bg)] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="w-5 h-5 text-[color:var(--color-text)]" />
                        </button>

                        <div className="hidden sm:flex gap-1.5">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-12 h-12 rounded-2xl text-[10px] font-black transition-all border ${currentPage === page
                                  ? 'bg-[color:var(--color-card)] border-[color:var(--color-border)] text-[color:var(--color-text)] shadow-lg shadow-zinc-900/20'
                                  : 'bg-transparent border-[color:var(--color-border)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg)]'
                                  }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="w-12 h-12 flex items-center justify-center bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl hover:bg-[color:var(--color-bg)] disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="w-5 h-5 text-[color:var(--color-text)]" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
              <Shield className="w-3 h-3" />
              <span>Programme fidélité {settings.store_name} — Cultivons l'excellence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}