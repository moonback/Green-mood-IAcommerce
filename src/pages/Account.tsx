import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Users,
  Package,
  MapPin,
  Coins,
  LogOut,
  RefreshCw,
  Star,
  Shield,
  Sparkles,
  ArrowRight,
  Heart,
  Settings,
  Award,
  Crown,
  Zap,
  TrendingUp,
  Gift,
  Calendar,
  ShoppingBag,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { supabase } from '../lib/supabase';
import SEO from '../components/SEO';
import AccountSidebar from '../components/AccountSidebar';

/* ── Tier helpers ──────────────────────────────────────────────────── */

interface Tier {
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon: typeof Award;
  color: string;
  gradient: string;
  glow: string;
}

const TIERS: Tier[] = [
  { name: 'Bronze', minPoints: 0, maxPoints: 499, icon: Award, color: 'text-amber-600', gradient: 'from-amber-900/30 to-amber-800/10', glow: 'bg-amber-500/15' },
  { name: 'Silver', minPoints: 500, maxPoints: 1499, icon: Star, color: 'text-[color:var(--color-text-subtle)]', gradient: 'from-zinc-600/30 to-zinc-500/10', glow: 'bg-[color:var(--color-text)]/10' },
  { name: 'Gold', minPoints: 1500, maxPoints: null, icon: Crown, color: 'text-yellow-400', gradient: 'from-yellow-500/30 to-yellow-400/10', glow: 'bg-yellow-400/15' },
];



export default function Account() {
  const { profile, user, signOut } = useAuthStore();
  const { settings } = useSettingsStore();
  const [orderCount, setOrderCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'activity'>('services');
  const [greeting, setGreeting] = useState('');

  const points = profile?.loyalty_points ?? 0;

  // Merge Visual Metadata with Settings Tiers
  const tiers = useMemo(() => {
    const settingsTiers = settings.loyalty_tiers || [];
    return settingsTiers.map(st => {
      const visual = TIERS.find(t => t.name.toLowerCase() === st.name.toLowerCase()) || TIERS[0];
      return {
        ...visual,
        ...st,
        minPoints: st.min_points,
      };
    }).sort((a, b) => a.minPoints - b.minPoints);
  }, [settings.loyalty_tiers]);

  const currentTier = useMemo(() => {
    return [...tiers].reverse().find(t => points >= t.minPoints) || tiers[0];
  }, [points, tiers]);

  const nextTier = useMemo(() => {
    const idx = tiers.findIndex(t => t.id === currentTier?.id);
    return idx < tiers.length - 1 ? tiers[idx + 1] : null;
  }, [currentTier, tiers]);

  const TierIcon = currentTier?.icon || Award;

  const progressPercent = useMemo(() => {
    if (!nextTier || !currentTier) return 100;
    const range = nextTier.minPoints - currentTier.minPoints;
    const progress = points - currentTier.minPoints;
    return Math.min(Math.round((progress / range) * 100), 100);
  }, [points, currentTier, nextTier]);

  const initials = profile?.full_name
    ? profile.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    : '?';

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
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

  /* ── Service tiles ───────────────────────────────────────────────── */
  const services = [
    {
      icon: Package,
      label: 'Mes Commandes',
      description: 'Suivre & gérer vos achats',
      to: '/compte/commandes',
      stat: `${orderCount} commande${orderCount > 1 ? 's' : ''}`,
      color: 'group-hover:bg-blue-500 group-hover:text-[color:var(--color-text)]',
      accent: 'blue',
      size: 'large',
    },
    {
      icon: Coins,
      label: 'Programme Fidélité',
      description: 'Vos points & récompenses',
      to: '/compte/fidelite',
      stat: `${points} ${settings.loyalty_currency_name}`,
      color: 'group-hover:bg-yellow-500 group-hover:text-[color:var(--color-text)]',
      accent: 'yellow',
      size: 'large',
    },
    {
      icon: Gift,
      label: 'Cadeau Anniversaire',
      description: 'L\'IA choisit pour vous !',
      to: '/compte/cadeau-anniversaire',
      color: 'group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-text)]',
      accent: 'green-neon',
      size: 'large',
    },
    {
      icon: MapPin,
      label: 'Adresses',
      description: 'Lieux de livraison',
      to: '/compte/adresses',
      color: 'group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-text)]',
      accent: 'emerald',
      size: 'small',
    },
    {
      icon: Heart,
      label: 'Favoris',
      description: 'Produits sauvegardés',
      to: '/compte/favoris',
      color: 'group-hover:bg-rose-500 group-hover:text-[color:var(--color-text)]',
      accent: 'rose',
      size: 'small',
    },
    {
      icon: Star,
      label: 'Mes Avis',
      description: 'Témoignages & notes',
      to: '/compte/avis',
      color: 'group-hover:bg-orange-500 group-hover:text-[color:var(--color-text)]',
      accent: 'orange',
      size: 'small',
    },
    {
      icon: RefreshCw,
      label: 'Abonnements',
      description: 'Livraisons automatiques',
      to: '/compte/abonnements',
      color: 'group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-text)]',
      accent: 'green',
      size: 'small',
      enabled: settings.subscriptions_enabled,
    },
    {
      icon: Users,
      label: 'Parrainage',
      description: `Invitez & gagnez des ${settings.loyalty_currency_name}`,
      to: '/compte/parrainage',
      color: 'group-hover:bg-purple-500 group-hover:text-[color:var(--color-text)]',
      accent: 'purple',
      size: 'small',
    },
    {
      icon: Settings,
      label: 'Paramètres',
      description: 'Infos & sécurité',
      to: '/compte/profil',
      color: 'group-hover:bg-zinc-600 group-hover:text-[color:var(--color-text)]',
      accent: 'zinc',
      size: 'small',
    },
  ].filter((t) => t.enabled !== false);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
      <SEO
        title={`Mon Espace — L'Excellence ${settings.store_name}`}
        description={`Votre espace personnel ${settings.store_name}.`}
      />

      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ════════════════════════════════════════════════════════════
            HERO — Welcome Banner
            ════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative rounded-[3rem] overflow-hidden mb-8 shadow-sm border border-[color:var(--color-border)]"
        >
          {/* Light Premium background */}
          <div className="absolute inset-0 bg-[color:var(--color-card)]/80" />
          <motion.div
            animate={{
              opacity: [0.3, 0.5, 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 w-[600px] h-[600px] bg-[color:var(--color-primary)]/10 blur-[150px] pointer-events-none"
          />
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[color:var(--color-primary)]/[0.05] blur-[120px] pointer-events-none"
          />

          {/* Elegant grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: `linear-gradient(to right, #f4f4f5 1px, transparent 1px), linear-gradient(to bottom, #f4f4f5 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative p-6 sm:p-8 md:p-12 lg:p-16">
            <div className="flex flex-col xl:flex-row items-start xl:items-center gap-8 lg:gap-12 xl:gap-16 w-full">
              {/* Left: Avatar + Name */}
              <div className="flex items-center gap-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', bounce: 0.3 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-[color:var(--color-primary)]/10 blur-3xl group-hover:bg-[color:var(--color-primary)]/20 transition-all duration-1000 rounded-full" />
                  <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] flex items-center justify-center relative shadow-sm group-hover:border-[color:var(--color-primary)]/40/50 transition-all duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-surface)] to-transparent opacity-50" />
                    <span className="text-3xl md:text-4xl font-['Inter',sans-serif] font-black text-[color:var(--color-primary)] tracking-widest relative z-10">
                      {initials}
                    </span>
                  </div>
                  {/* Tier badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
                    className={`absolute -bottom-1 -right-1 p-1.5 rounded-xl shadow-lg border border-zinc-800 ${currentTier.glow}`}
                  >
                    <TierIcon className={`w-4 h-4 ${currentTier.color}`} />
                  </motion.div>
                </motion.div>

                <div>
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-[color:var(--color-text-muted)] font-mono uppercase tracking-wider mb-1"
                  >
                    {greeting} 👋
                  </motion.p>
                  <motion.h1
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-2xl md:text-3xl font-['Inter',sans-serif] font-black tracking-tight text-[color:var(--color-text)]"
                  >
                    {profile?.full_name ?? 'Membre'}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-[color:var(--color-text-muted)] mt-1 flex items-center gap-1.5"
                  >
                    <Shield className="w-3 h-3 text-[color:var(--color-primary)]" />
                    Membre depuis {memberSince}
                  </motion.p>
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 lg:gap-6 w-full">
                {/* Tier Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative group/stat overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[color:var(--color-bg)]/50 backdrop-blur-3xl rounded-3xl border border-[color:var(--color-border)] transition-colors group-hover/stat:border-green-neon/50" />
                  <div className="relative p-5 md:p-6">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${currentTier.glow} shadow-sm group-hover/stat:scale-110 transition-transform`}>
                      <TierIcon className={`w-5 h-5 ${currentTier.color}`} />
                    </div>
                    <p className={`text-xl md:text-2xl font-black tracking-tight ${currentTier.color}`}>{currentTier.name}</p>
                    <p className="text-[9px] text-[color:var(--color-text-muted)] font-black uppercase tracking-[0.2em] mt-1">Niveau Privilège</p>
                  </div>
                </motion.div>

                {/* Points Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="relative group/stat overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[color:var(--color-bg)]/50 backdrop-blur-3xl rounded-3xl border border-[color:var(--color-border)] transition-colors group-hover/stat:border-yellow-200" />
                  <div className="relative p-5 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-yellow-50 flex items-center justify-center shadow-sm group-hover/stat:scale-110 transition-transform">
                        <Coins className="w-5 h-5 text-yellow-600" />
                      </div>
                      <Link
                        to="/compte/fidelite/achat"
                        className="p-2 rounded-lg bg-[color:var(--color-primary)]/10 hover:bg-[color:var(--color-primary)] transition-all group/btn"
                      >
                        <Zap className="w-3 h-3 text-[color:var(--color-primary)] group-hover/btn:text-[color:var(--color-text)] group-hover/btn:fill-white" />
                      </Link>
                    </div>
                    <p className="text-xl md:text-2xl font-black tracking-tight text-[color:var(--color-text)]">{points}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-[color:var(--color-text-muted)] font-black uppercase tracking-[0.2em] mt-1">{settings.loyalty_currency_name} Disponibles</p>
                      <span className="text-[9px] text-[color:var(--color-primary)] font-black font-mono">≈{(points * ((settings.loyalty_redeem_rate || 5) / 100)).toFixed(2)}€</span>
                    </div>
                  </div>
                </motion.div>

                {/* Orders Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="relative group/stat overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[color:var(--color-bg)]/50 backdrop-blur-3xl rounded-3xl border border-[color:var(--color-border)] transition-colors group-hover/stat:border-green-neon/50" />
                  <div className="relative p-5 md:p-6">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 shadow-sm group-hover/stat:scale-110 transition-transform">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xl md:text-2xl font-black tracking-tight text-[color:var(--color-text)]">{orderCount}</p>
                    <p className="text-[9px] text-[color:var(--color-text-muted)] font-black uppercase tracking-[0.2em] mt-1">Achats Réalisés</p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Progress bar to next tier */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 pt-6 border-t border-[color:var(--color-border)]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-[color:var(--color-primary)]" />
                  Progression vers {nextTier ? nextTier.name : 'le sommet'}
                </span>
                <span className="text-[10px] font-mono text-[color:var(--color-text-muted)]">
                  {nextTier ? `${nextTier.minPoints - points} ${settings.loyalty_currency_name} restants` : 'Niveau maximum !'}
                </span>
              </div>
              <div className="relative w-full h-2 bg-[color:var(--color-bg-elevated)] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.8 }}
                  className="h-full rounded-full relative"
                  style={{
                    background: currentTier.name === 'Gold'
                      ? 'linear-gradient(90deg, #facc15, #f59e0b)'
                      : currentTier.name === 'Silver'
                        ? 'linear-gradient(90deg, #a1a1aa, #d4d4d8)'
                        : 'linear-gradient(90deg, #b45309, #d97706)',
                    boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            ACCOUNT CONTENT AREA (Sidebar + Dashboard)
            ════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 mt-12">
          {/* Persistent Sidebar */}
          <AccountSidebar />

          {/* Main Content Dashboard */}
          <div className="flex-1 space-y-12">
            {/* Quick Actions Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
            >
              {/* Referral code */}
              <div className="bg-[color:var(--color-card)]/80 backdrop-blur-xl rounded-2xl p-4 border border-[color:var(--color-border)] shadow-sm flex items-center gap-3 col-span-1 sm:col-span-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-wider">Code parrainage</p>
                  <p className="text-sm font-mono font-bold text-[color:var(--color-text)] truncate">{profile?.referral_code || '---'}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="w-10 h-10 rounded-xl bg-[color:var(--color-bg)] hover:bg-purple-100 border border-[color:var(--color-border)] flex items-center justify-center transition-all shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[color:var(--color-primary)]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[color:var(--color-text-muted)]" />
                  )}
                </button>
              </div>

              {/* Quick link: Browse Shop */}
              <Link
                to="/catalogue"
                className="bg-[color:var(--color-card)]/80 rounded-2xl p-4 border border-[color:var(--color-border)] shadow-sm flex items-center gap-3 hover:border-green-neon/35 hover:bg-[color:var(--color-primary)]/10/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-text)] transition-all">
                  <Eye className="w-5 h-5 text-[color:var(--color-primary)] group-hover:text-[color:var(--color-text)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[color:var(--color-text)]">Catalogue</p>
                  <p className="text-[10px] text-[color:var(--color-text-muted)]">Parcourir</p>
                </div>
              </Link>

              {/* Sign Out */}
              <button
                onClick={signOut}
                className="bg-[color:var(--color-card)]/80 rounded-2xl p-4 border border-[color:var(--color-border)] shadow-sm flex items-center gap-3 hover:border-red-300 hover:bg-red-50 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[color:var(--color-bg)] flex items-center justify-center shrink-0 group-hover:bg-red-500 transition-all font-black">
                  <LogOut className="w-5 h-5 text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)] transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[color:var(--color-text)] group-hover:text-red-500 transition-colors">Déconnexion</p>
                  <p className="text-[10px] text-[color:var(--color-text-muted)]">Session</p>
                </div>
              </button>
            </motion.div>

            {/* ════════════════════════════════════════════════════════════
            BENTO GRID — Services
            ════════════════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[color:var(--color-primary)]" />
                  Privilèges Client
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {services.map((service, i) => {
                  const isLarge = service.size === 'large';
                  return (
                    <motion.div
                      key={service.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className={isLarge ? 'col-span-1 sm:col-span-2' : 'col-span-1'}
                    >
                      <Link
                        to={service.to}
                        className="group relative flex flex-col justify-between h-full min-h-[180px] md:min-h-[220px] p-6 md:p-8 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] shadow-sm rounded-[2.5rem] hover:bg-[color:var(--color-bg)] hover:border-[color:var(--color-primary)]/35 hover:shadow-md transition-all duration-500 overflow-hidden"
                      >
                        {/* Immersive glow effect */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[color:var(--color-primary)]/[0.03] blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                        <div className="relative z-10 flex items-start justify-between">
                          <div className={`w-14 h-14 rounded-2xl bg-[color:var(--color-card)]/85 border border-[color:var(--color-border)] flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-text)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]`}>
                            <service.icon className="w-6 h-6" />
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                            <ArrowRight className="w-4 h-4 text-[color:var(--color-primary)]" />
                          </div>
                        </div>

                        <div className="relative z-10">
                          <h3 className="text-base md:text-lg font-black text-[color:var(--color-text)] tracking-tight group-hover:text-[color:var(--color-primary)] transition-colors duration-500">{service.label}</h3>
                          <p className="text-xs text-[color:var(--color-text-muted)] mt-1 font-medium leading-relaxed">{service.description}</p>
                          {service.stat && (
                            <div className="mt-4 flex items-center gap-2">
                              <div className="h-px flex-1 bg-[color:var(--color-border)]" />
                              <span className="text-[10px] font-black font-mono text-[color:var(--color-primary)] uppercase tracking-widest">{service.stat}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* ════════════════════════════════════════════════════════════
            ASSISTANCE FOOTER CARD
            ════════════════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Link
                to="/contact"
                className="group flex flex-col md:flex-row items-center gap-6 p-6 md:p-8 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] shadow-sm rounded-[2rem] hover:border-green-neon/50 hover:shadow-md transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-[color:var(--color-primary)]/[0.03] blur-[80px]" />
                </div>

                <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[color:var(--color-primary)] group-hover:shadow-[0_0_30px_rgba(var(--theme-neon-rgb),0.15)] transition-all duration-500">
                  <Zap className="w-6 h-6 text-[color:var(--color-primary)] group-hover:text-[color:var(--color-text)] transition-colors" />
                </div>

                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-base font-bold text-[color:var(--color-text)] mb-1">
                    Besoin d'aide ?
                  </h3>
                  <p className="text-sm text-[color:var(--color-text-muted)] max-w-md">
                    Notre équipe d'experts est disponible 7j/7 pour vous accompagner dans votre expérience.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 px-6 py-3 bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-xl group-hover:bg-[color:var(--color-primary)] group-hover:text-[color:var(--color-primary-contrast)] group-hover:border-[color:var(--color-primary)]/40 font-bold text-sm uppercase tracking-wider text-[color:var(--color-text)] transition-all duration-500 shrink-0 w-full md:w-auto">
                  <span>Nous contacter</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>

            {/* Security Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-12 flex items-center justify-center gap-2 text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-[0.3em]"
            >
              <Shield className="w-3 h-3 text-[color:var(--color-primary)]" />
              <span>Données protégées & chiffrées · {settings.store_name} Elite</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}