import { motion } from 'motion/react';
import { Coins, Info } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCartStore } from '../store/cartStore';

interface LoyaltyRedemptionProps {
  variant?: 'default' | 'compact';
}

export default function LoyaltyRedemption({ variant = 'default' }: LoyaltyRedemptionProps) {
  const { profile } = useAuthStore();
  const { settings } = useSettingsStore();
  const { usePoints, setUsePoints, subtotal } = useCartStore();

  const points = profile?.loyalty_points ?? 0;
  const canRedeem = settings.loyalty_program_enabled && points >= 100;

  if (!canRedeem || !profile) return null;

  const pointsValue = Math.floor(points / 100) * (settings.loyalty_redeem_rate || 5);
  const sub = subtotal();
  
  // Only show if subtotal is positive and there's value to redeem
  if (sub <= 0 || pointsValue <= 0) return null;

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group"
      >
        <label className="flex items-center justify-between gap-2 p-1.5 px-3 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 hover:bg-amber-500/[0.06] hover:border-amber-500/20 transition-all cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex items-center shrink-0">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
                className="peer h-3.5 w-3.5 cursor-pointer appearance-none rounded border border-amber-500/30 bg-transparent checked:bg-amber-500 checked:border-amber-500 transition-all"
              />
              <motion.div 
                initial={false}
                animate={{ scale: usePoints ? 1 : 0 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-black"
              >
                <svg className="h-2 w-2 fill-current" viewBox="0 0 20 20">
                  <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                </svg>
              </motion.div>
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <p className="text-[9px] font-black text-white uppercase tracking-tight truncate">Utiliser mes crédits</p>
              <p className="text-[8px] font-bold text-amber-500/50 uppercase tracking-tighter truncate">{points} points</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-black text-amber-500">−{pointsValue.toFixed(2)} €</span>
          </div>
        </label>
      </motion.div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-[color:var(--color-card)]/80 p-5 shadow-lg backdrop-blur-xl">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl" />
      
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Coins className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Privilège Fidélité</p>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Utiliser mes crédits</h3>
          </div>
        </div>

        <label className="group flex cursor-pointer items-start gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:border-amber-500/30">
          <div className="relative flex items-center pt-0.5">
            <input
              type="checkbox"
              checked={usePoints}
              onChange={(e) => setUsePoints(e.target.checked)}
              className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/20 bg-white/5 checked:bg-amber-500 checked:border-amber-500 transition-all"
            />
            <motion.div 
              initial={false}
              animate={{ scale: usePoints ? 1 : 0 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-black"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
              </svg>
            </motion.div>
          </div>
          
          <div className="space-y-1.5 flex-1">
            <p className="text-[11px] font-black text-white uppercase tracking-wide">
              Déduire {points} {settings.loyalty_currency_name || 'Points'}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-amber-500">
                −{pointsValue.toFixed(2)} €
              </span>
              <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-60 transition-opacity">
                <Info className="w-3 h-3 text-white" />
                <span className="text-[9px] font-bold text-white uppercase tracking-tighter">
                  100 points = {settings.loyalty_redeem_rate || 5}€
                </span>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
