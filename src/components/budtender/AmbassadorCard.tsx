import { motion } from "motion/react";
import { Gift, Sparkles, CheckCircle2, Copy } from "lucide-react";

interface AmbassadorCardProps {
  hasShared: boolean;
  onShare: () => void;
  onCopyPromoCode: (code: string) => void;
  showPromoTooltip: boolean;
}

export default function AmbassadorCard({
  hasShared,
  onShare,
  onCopyPromoCode,
  showPromoTooltip,
}: AmbassadorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="mt-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-3 opacity-10">
        <Gift className="w-12 h-12 text-emerald-400" />
      </div>

      {!hasShared ? (
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-black uppercase tracking-wider text-white">
              Cadeau Ambassadeur 🏆
            </p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Partagez vos résultats ou invitez un ami à faire le test pour
            débloquer un code promo de{" "}
            <span className="text-emerald-400 font-bold">-10%</span> sur votre
            commande !
          </p>
          <button
            onClick={onShare}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs border border-zinc-700"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Partager & Débloquer
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <p className="text-xs font-black uppercase tracking-wider">
              Lien Partagé !
            </p>
          </div>
          <div className="bg-zinc-950/50 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between group">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                Votre code :
              </p>
              <p className="text-lg font-black text-emerald-400 tracking-tighter">
                BudTender10
              </p>
            </div>
            <button
              onClick={() => onCopyPromoCode("BudTender10")}
              className="relative p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg transition-all"
            >
              <Copy className="w-4 h-4" />
              {showPromoTooltip && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap shadow-xl">
                  Copié !
                </span>
              )}
            </button>
          </div>
          <p className="text-[10px] text-zinc-500 text-center italic">
            Valable sur tout le catalogue.
          </p>
        </div>
      )}
    </motion.div>
  );
}
