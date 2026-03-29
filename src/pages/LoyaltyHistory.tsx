import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, TrendingUp, TrendingDown, Settings2, Sparkles, Star, Award, Crown, Gift, Zap, ChevronLeft, ChevronRight, RefreshCw, Package, Users, Cake } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import type { LoyaltyTransaction } from '../lib/types';
import AccountPageLayout from '../components/AccountPageLayout';

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
    color: 'text-amber-500',
    bgGlow: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    gradient: 'from-amber-600/30 via-amber-500/10 to-transparent',
    benefits: ['1 point par euro', 'Offres membres exclusives', 'Newsletter Privilège'],
  },
  {
    name: 'Silver',
    minPoints: 500,
    maxPoints: 1499,
    icon: Star,
    color: 'text-zinc-300',
    bgGlow: 'bg-zinc-400/20',
    border: 'border-zinc-400/30',
    gradient: 'from-zinc-500/40 via-zinc-400/10 to-transparent',
    benefits: ['1.5x points par euro', 'Livraison offerte dès 30\u00A0\u20AC', 'Ventes privées anticipées', 'Cadeau de bienvenue'],
  },
  {
    name: 'Gold',
    minPoints: 1500,
    maxPoints: null,
    icon: Crown,
    color: 'text-yellow-400',
    bgGlow: 'bg-yellow-400/25',
    border: 'border-yellow-400/40',
    gradient: 'from-yellow-500/40 via-yellow-400/10 to-transparent',
    benefits: ['2x points par euro', 'Livraison offerte illimitée', 'Accès Masterclasses VIP', 'Réductions VIP -15%', 'Service Conciergerie'],
  },
];

/* ── Transaction type config ──────────────────────────────────────── */

const getTypeConfig = (c: string) => ({
  earned: { label: `${c} gagnés`, icon: TrendingUp, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', sign: '+' },
  redeemed: { label: `${c} utilisés`, icon: TrendingDown, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', sign: '\u2212' },
  adjusted: { label: 'Ajustement', icon: Settings2, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', sign: '\u00B1' },
  expired: { label: `${c} expirés`, icon: TrendingDown, color: 'text-zinc-500 bg-zinc-800 border-zinc-700', sign: '\u2212' },
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
    <AccountPageLayout
      seoTitle={`Programme Privilège — ${settings.store_name}`}
      seoDescription="Consultez l'historique de vos points de fidélité."
      icon={Coins}
      iconColor="#eab308"
      title="Fidélité"
      subtitle="L'excellence récompensée à chaque instant"
      stat={points}
      statLabel={`Solde ${settings.loyalty_currency_name}`}
      footerText={`Programme fidélité ${settings.store_name} — Cultivons l'excellence`}
    >
      <div className="space-y-8">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
            {[
              { id: 'status', label: 'Statut & Avantages', icon: Star },
              { id: 'history', label: 'Mon Portefeuille', icon: RefreshCw },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
                    isActive ? 'text-black' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabWallet"
                      className="absolute inset-0 bg-white rounded-lg"
                      transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
                    />
                  )}
                  <Icon className={`w-3.5 h-3.5 relative z-10`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[600px]">
          <AnimatePresence mode="wait">
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
                <div className={`relative bg-zinc-900/40 border ${currentTier.border} rounded-[2.5rem] p-8 md:p-12 overflow-hidden group shadow-2xl backdrop-blur-md`}>
                  <div className={`absolute -top-24 -right-24 w-80 h-80 ${currentTier.bgGlow} blur-[120px] pointer-events-none opacity-50`} />
                  
                  <div className="relative flex flex-col lg:flex-row items-center gap-12 text-center lg:text-left">
                    {/* Tier icon with massive presence */}
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="relative shrink-0"
                    >
                      <div className={`absolute inset-0 ${currentTier.bgGlow} blur-[60px] rounded-full opacity-60`} />
                      <div className={`w-40 h-40 bg-zinc-950 border-2 ${currentTier.border} rounded-[2.5rem] flex items-center justify-center relative shadow-3xl overflow-hidden`}>
                        <TierIcon className={`w-16 h-16 ${currentTier.color} relative z-10 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                        <div className={`absolute inset-0 bg-gradient-to-t ${currentTier.gradient} opacity-50`} />
                        <motion.div
                          animate={{ top: ['100%', '-100%'] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-1/3 bg-gradient-to-t from-transparent via-white/[0.08] to-transparent pointer-events-none"
                        />
                      </div>
                      <div className="absolute -bottom-3 -right-3 bg-white text-black p-2.5 rounded-2xl shadow-xl z-20 border border-zinc-200">
                        <Zap className="w-5 h-5 fill-current" />
                      </div>
                    </motion.div>

                    {/* Tier info & Progress */}
                    <div className="flex-1 space-y-8 w-full">
                      <div>
                        <div className="flex flex-col items-center lg:items-start gap-3 mb-4">
                          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
                            Membre Privilège
                          </span>
                          <h2 className={`text-5xl md:text-7xl font-black uppercase tracking-tighter italic ${currentTier.color} drop-shadow-sm`}>
                            {currentTier.name}
                          </h2>
                        </div>
                        <p className="text-sm text-zinc-400 max-w-xl leading-relaxed mx-auto lg:mx-0 font-medium italic">
                          {currentTier.name === 'Bronze' && `Bienvenue dans l'univers ${settings.store_name}. Chaque achat cultive vos privilèges et prépare votre passage à l'excellence.`}
                          {currentTier.name === 'Silver' && 'Un nouveau standard de fidélité. Vous accédez désormais à une sélection exclusive et des services personnalisés.'}
                          {currentTier.name === 'Gold' && `L'apogée de l'expérience ${settings.store_name}. Vous bénéficiez d'une attention totale et de privilèges sans compromis.`}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-end justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          <div className="flex flex-col gap-1">
                             <span className={currentTier.color}>{currentTier.name}</span>
                             <span className="text-white text-xl font-black tracking-tight">{points} <span className="text-[10px] text-zinc-500 uppercase">{settings.loyalty_currency_name}</span></span>
                          </div>
                          {nextTier ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="opacity-50">Vers {nextTier.name}</span>
                              <span className="text-white">-{pointsToNext} pts</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 py-1 px-3 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-500">
                              <Crown className="w-3 h-3" /> Statut Ultime
                            </div>
                          )}
                        </div>

                        <div className="relative h-2.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden p-[2px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                            className={`h-full rounded-full relative ${
                              currentTier.name === 'Gold' ? 'bg-gradient-to-r from-yellow-600 to-yellow-300' :
                              currentTier.name === 'Silver' ? 'bg-gradient-to-r from-zinc-600 to-zinc-300' :
                              'bg-gradient-to-r from-amber-700 to-amber-500'
                            }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Grid */}
                  <div className="mt-12 pt-10 border-t border-zinc-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentTier.benefits.map((benefit, i) => (
                        <motion.div
                          key={benefit}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                          className="flex items-start gap-4 p-5 rounded-[1.5rem] bg-zinc-950/50 border border-zinc-800 transition-all group/benefit hover:border-zinc-700"
                        >
                          <div className={`w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0`}>
                            <Sparkles className={`w-4 h-4 ${currentTier.color} opacity-60`} />
                          </div>
                          <span className="text-sm text-zinc-300 font-medium leading-relaxed">{benefit}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ═══ Tiers Overview ══════════════════════════════════ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {tiers.map((tier, idx) => {
                    const isActive = tier.name === currentTier.name;
                    const TIcon = tier.icon;
                    const maxPoints = idx < tiers.length - 1 ? tiers[idx + 1].minPoints - 1 : null;
                    return (
                      <div
                        key={tier.name}
                        className={`relative rounded-[2rem] p-6 transition-all duration-500 border ${isActive
                          ? `bg-zinc-900 ${tier.border} shadow-2xl scale-105 z-10`
                          : 'bg-zinc-950/50 border-zinc-800 opacity-40 hover:opacity-60'
                          }`}
                      >
                        <TIcon className={`w-10 h-10 mb-6 ${tier.color}`} />
                        <h4 className={`text-xl font-black uppercase tracking-tight mb-1 ${tier.color}`}>{tier.name}</h4>
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                          {maxPoints ? `${tier.minPoints} – ${maxPoints}` : `${tier.minPoints}+`} pts
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* ═══ How to Earn ═════════════════════════════════════ */}
                <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden">
                   <h3 className="text-2xl font-black uppercase tracking-tight mb-6">Comment accumuler ?</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     {[
                       { icon: Package, title: 'Achats', desc: `1€ = ${settings.loyalty_earn_rate || 1} pts` },
                       { icon: Users, title: 'Parrainage', desc: `${settings.referral_reward_points || 500} pts` },
                       { icon: Star, title: 'Avis', desc: `50 pts` },
                       { icon: Cake, title: 'Cadeau', desc: 'Anniversaire' },
                     ].map((item, i) => (
                       <div key={i} className="space-y-2">
                         <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                           <item.icon className="w-4 h-4 text-emerald-400" />
                         </div>
                         <p className="font-bold text-white uppercase text-[10px] tracking-wider">{item.title}</p>
                         <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.desc}</p>
                       </div>
                     ))}
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
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 animate-pulse h-24" />
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-zinc-800 rounded-[2.5rem]">
                    <Sparkles className="w-12 h-12 text-zinc-700 mb-4" />
                    <p className="text-xl font-black uppercase text-white">Aucun mouvement</p>
                    <Link to="/boutique" className="mt-6 px-8 py-3 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all">
                      Explorer la Boutique
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {currentTransactions.map((tx, i) => {
                      const TYPE_CONFIG = getTypeConfig(settings.loyalty_currency_name);
                      const config = TYPE_CONFIG[tx.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.earned;
                      const Icon = config.icon;
                      const isCredit = tx.type === 'earned' || tx.type === 'referral' || (tx.type === 'adjusted' && tx.points > 0);
                      const isRedemption = tx.type === 'redeemed';

                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex items-center gap-6 hover:border-zinc-700 transition-all group"
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                            isCredit ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            isRedemption ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}>
                            <Icon size={20} />
                          </div>

                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                  isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                                }`}>
                                  {config.label}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-600">ID: {tx.id.slice(0, 8)}</span>
                             </div>
                             <h4 className="text-white font-bold leading-tight">{tx.note || 'Transaction Loyalty'}</h4>
                             <p className="text-[10px] font-black tracking-widest text-zinc-500 mt-1 uppercase">
                               {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                             </p>
                          </div>

                          <div className="text-right">
                             <div className="flex items-center justify-end gap-1.5">
                               <p className={`text-xl font-black tabular-nums group-hover:scale-110 transition-transform ${isCredit ? 'text-emerald-400' : 'text-amber-500'}`}>
                                 {isCredit ? '+' : '-'}{Math.abs(tx.points)}
                               </p>
                             </div>
                             <p className="text-[9px] text-zinc-500 font-bold mt-1">Solde: {tx.balance_after}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-12 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-4">
                     <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-3 text-white disabled:opacity-20"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Page {currentPage} / {totalPages}</span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-3 text-white disabled:opacity-20"
                      >
                        <ChevronRight size={20} />
                      </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AccountPageLayout>
  );
}