import { motion } from "motion/react";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../ThemeProvider";

export default function BudTenderHero() {
  const settings = useSettingsStore((s) => s.settings);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative flex flex-col items-center justify-center text-center py-20 px-6 overflow-hidden rounded-[2.5rem] border shadow-2xl group ${isLight ? 'border-slate-200' : 'border-white/5'}`}
    >
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={settings.budtender_hero_bg_url || '/images/budtender_hero_bg.png'}
          alt="Neural Ecosystem"
          className={`w-full h-full object-cover transition-opacity duration-700 scale-105 ${isLight ? 'opacity-10 group-hover:opacity-15' : 'opacity-30 group-hover:opacity-40'}`}
        />
        <div className={`absolute inset-0 ${isLight ? 'bg-gradient-to-b from-white/90 via-white/60 to-white/90' : 'bg-gradient-to-b from-zinc-950/80 via-transparent to-zinc-950'}`} />
        <div className={`absolute inset-0 ${isLight ? 'bg-slate-50/40' : 'bg-zinc-950/20'}`} />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-6">
        <div className="inline-flex px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-black text-emerald-500 uppercase tracking-[0.3em] backdrop-blur-md">
          Neural Synergie Engine v2.4
        </div>
        <h2 className={`text-4xl sm:text-7xl font-serif max-w-3xl leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
          La machine <span className="italic text-emerald-500">Idéale</span> pour
          votre espace loisirs.
        </h2>
        <p className={`max-w-lg mx-auto font-medium text-sm sm:text-lg leading-relaxed ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
          Analyse personnalisée de votre projet pour trouver la machine de
          divertissement qui vous correspond.
        </p>

        <div className="pt-4 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>
              Status
            </span>
            <span className="text-[11px] font-mono text-emerald-500 font-bold">
              OPTIMIZED
            </span>
          </div>
          <div className={`w-[1px] h-8 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
          <div className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-mono uppercase ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>
              Analysis
            </span>
            <span className="text-[11px] font-mono text-emerald-500 font-bold">
              ACTIVE
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
