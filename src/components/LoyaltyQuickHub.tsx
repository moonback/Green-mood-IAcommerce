import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Star, Crown, ChevronRight, Zap, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

const TIER_METADATA = [
  { name: 'Bronze', icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10' },
  { name: 'Silver', icon: Star, color: 'text-zinc-300', bg: 'bg-zinc-300/10' },
  { name: 'Gold', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
];

export default function LoyaltyQuickHub() {
  const { profile, user } = useAuthStore();
  const { settings } = useSettingsStore();

  const points = profile?.loyalty_points ?? 0;

  const tiers = useMemo(() => {
    const settingsTiers = settings.loyalty_tiers || [];
    return settingsTiers.map(st => {
      const visual = TIER_METADATA.find(t => t.name.toLowerCase() === st.name.toLowerCase()) || TIER_METADATA[0];
      return {
        ...visual,
        ...st, // This adds id, name, min_points, etc.
        min: st.min_points,
      };
    }).sort((a, b) => a.min - b.min);
  }, [settings.loyalty_tiers]);

  const currentTier = useMemo(() => {
    if (tiers.length === 0) return null;
    return [...tiers].reverse().find(t => points >= (t.min ?? 0)) || tiers[0];
  }, [points, tiers]);

  const nextTier = useMemo(() => {
    if (!currentTier) return null;
    const idx = tiers.findIndex(t => t.id === currentTier.id);
    return idx < tiers.length - 1 ? tiers[idx + 1] : null;
  }, [currentTier, tiers]);

  const progress = useMemo(() => {
    if (!nextTier || !currentTier) return 100;
    const total = (nextTier.min ?? 0) - (currentTier.min ?? 0);
    const current = points - (currentTier.min ?? 0);
    return Math.min(Math.round((current / total) * 100), 100);
  }, [points, currentTier, nextTier]);

  if (!user || !currentTier) return null;

  const Icon = currentTier.icon || Award;

  return (
    <div className="flex items-center gap-2">
      <Link to="/compte/fidelite" className="group">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] rounded-2xl transition-all duration-500 overflow-hidden relative"
        >
          {/* Hover Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          {/* Tier Icon Badge */}
          <div className={`w-8 h-8 rounded-xl ${currentTier.bg} flex items-center justify-center shrink-0 border border-white/[0.05] group-hover:scale-110 transition-transform duration-500`}>
            <Icon className={`w-4 h-4 ${currentTier.color}`} />
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white leading-none">
                {points} <span className="text-[9px] text-zinc-500 font-mono tracking-tighter uppercase">{settings.loyalty_currency_name}</span>
              </span>
              <AnimatePresence>
                {nextTier && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <Zap className="w-2 h-2 text-emerald-400 fill-emerald-500" />
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                      -{nextTier.min - points}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Progress Mini Bar */}
            <div className="w-24 h-1 bg-white/[0.05] rounded-full mt-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-500 rounded-full shadow-[0_0_8px_rgba(57,255,20,0.4)]"
              />
            </div>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </motion.div>
      </Link>
    </div>
  );
}
