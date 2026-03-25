import { motion } from "motion/react";
import { Leaf, Mic, History, RotateCcw, X, Minimize2, Maximize2 } from "lucide-react";
import { useTheme } from "../ThemeProvider";

interface HeaderActionProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  isActive?: boolean;
  label: string;
  isCompact?: boolean;
}

function HeaderAction({ icon, title, onClick, isActive, label, isCompact }: HeaderActionProps) {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === 'light';

  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex flex-col items-center justify-center transition-all group relative overflow-hidden border
        ${isCompact ? 'w-8 h-8 rounded-lg gap-0' : 'gap-1.5 px-3 py-2 rounded-xl'}
        ${isActive
          ? "bg-emerald-400 text-black border-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
          : isLightTheme
            ? "text-slate-500 hover:text-slate-900 bg-white/80 border-slate-200 hover:border-emerald-500/55 hover:bg-slate-50"
            : "text-zinc-400 hover:text-white bg-zinc-900/65 border-white/10 hover:border-emerald-500/55 hover:bg-zinc-800/75"
        }`}
    >
      <div className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? "scale-110" : ""}`}>
        {icon}
      </div>
      {!isCompact && (
        <span className={`text-[9px] font-black uppercase tracking-[0.2em] hidden sm:block ${isActive ? "text-black" : isLightTheme ? "text-slate-500 group-hover:text-emerald-600" : "text-zinc-500 group-hover:text-emerald-400/80"}`}>
          {label}
        </span>
      )}
      {isActive && (
        <motion.div layoutId="header-action-active" className="absolute inset-0 bg-emerald-500/10 -z-10" />
      )}
    </button>
  );
}

interface BudTenderHeaderProps {
  budtenderName: string;
  userName?: string;
  isLoggedIn: boolean;
  isVoiceEnabled: boolean;
  onVoiceClick: () => void;
  onHistoryClick: () => void;
  isHistoryOpen: boolean;
  onReset: () => void;
  onClose: () => void;
  showSkipQuizActions: boolean;
  onSkipQuiz: () => void;
  onStartQuiz: () => void;
  viewMode: 'fullscreen' | 'bubble';
  onToggleView: () => void;
}

export default function BudTenderHeader({
  budtenderName,
  userName,
  isLoggedIn,
  isVoiceEnabled,
  onVoiceClick,
  onHistoryClick,
  isHistoryOpen,
  onReset,
  onClose,
  showSkipQuizActions,
  onSkipQuiz,
  onStartQuiz,
  viewMode,
  onToggleView,
}: BudTenderHeaderProps) {
  const isCompact = viewMode === 'bubble';
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolvedTheme === 'light';

  return (
    <div className={`relative z-40 border-b backdrop-blur-3xl ${isLightTheme ? 'border-slate-200 bg-white/75' : 'border-white/10 bg-zinc-950/45'} ${isCompact ? 'px-4 py-2.5' : 'px-6 py-6 sm:py-6'}`}><div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(16,185,129,0.10),transparent_45%,rgba(56,189,248,0.08))]" />
      <div className="relative max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
        {/* Left: Branding & Status */}
        <div className={`flex items-center ${isCompact ? 'gap-3' : 'gap-5'}`}>
          <div className="relative group flex-shrink-0">
            <div className={`${isCompact ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 sm:w-16 sm:h-16 rounded-2xl'} ${isLightTheme ? 'bg-white border border-emerald-500/20 shadow-[0_12px_28px_rgba(15,23,42,0.10)]' : 'bg-zinc-900/50 border border-emerald-500/30 shadow-[0_0_30px_rgba(57,255,20,0.1)]'} flex items-center justify-center transition-all group-hover:border-emerald-500/60 overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-10 group-hover:opacity-30 transition-opacity" />
              <Leaf className={`${isCompact ? 'w-4 h-4' : 'w-7 h-7 sm:w-9 sm:h-9'} text-emerald-400 transition-transform group-hover:scale-110`} />
              <motion.div
                animate={{ y: [-20, 60] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500 opacity-20"
              />
            </div>
            <span className={`absolute -bottom-1 -right-1 ${isCompact ? 'w-3 h-3 border-[3px]' : 'w-5 h-5 border-[4px]'} bg-emerald-500 rounded-full ${isLightTheme ? 'border-white' : 'border-zinc-950'} shadow-[0_0_15px_rgba(57,255,20,0.6)]`} />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`${isCompact ? 'text-sm' : 'text-2xl sm:text-3xl'} font-serif tracking-tighter italic truncate ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                {budtenderName}{" "}
                <span className="text-emerald-400 not-italic font-sans font-black">AI</span>
              </h3>
              {!isCompact && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(57,255,20,1)]" />
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-tighter">en ligne</span>
                </div>
              )}
              {isCompact && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-tighter">
                    {isLoggedIn && userName ? userName.split(' ')[0] : 'en ligne'}
                  </span>
                </div>
              )}
            </div>
            {!isCompact && (
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-xs font-mono uppercase tracking-widest ${isLightTheme ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {isLoggedIn && userName ? `SYNC_USER: ${userName.toUpperCase()}` : "NEURAL_PRECISION_ECOSYSTEM"}
                </p>
                <span className={`text-[10px] ${isLightTheme ? 'text-slate-300' : 'text-zinc-800'}`}>|</span>
                <span className="text-[10px] font-mono text-emerald-400/60 animate-pulse uppercase">Trouvez la machine idéale</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className={`flex items-center ${isCompact ? 'gap-1' : 'gap-2 sm:gap-3'}`}>
          {showSkipQuizActions && !isCompact && (
            <>
              <button onClick={onSkipQuiz} className={`px-3 py-2 sm:px-4 sm:py-2.5 border rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${isLightTheme ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50' : 'bg-white/10 hover:bg-white text-white hover:text-black border-white/10'}`} title="Générer avec mes préférences">
                Recommandations
              </button>
              <button onClick={onStartQuiz} className="px-3 py-2 sm:px-4 sm:py-2.5 bg-emerald-500 text-black rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap" title="Refaire le Quiz">
                Quiz
              </button>
              <div className={`h-8 w-[1px] mx-1 hidden sm:block ${isLightTheme ? 'bg-slate-200' : 'bg-white/10'}`} />
            </>
          )}

          {isVoiceEnabled && (
            <HeaderAction icon={<Mic className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />} title="Conseiller vocal" onClick={onVoiceClick} label="Vocal" isCompact={isCompact} />
          )}

          <HeaderAction icon={<History className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />} title="Historique" onClick={onHistoryClick} isActive={isHistoryOpen} label="Archives" isCompact={isCompact} />

          {!isCompact && (
            <HeaderAction icon={<RotateCcw className="w-5 h-5" />} title="Nouvelle session" onClick={onReset} label="Reset" />
          )}

          <HeaderAction
            icon={viewMode === 'fullscreen' ? <Minimize2 className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} /> : <Maximize2 className={isCompact ? 'w-4 h-4' : 'w-5 h-5'} />}
            title={viewMode === 'fullscreen' ? 'Passer en mode bulle' : 'Passer en plein écran'}
            onClick={onToggleView}
            label={viewMode === 'fullscreen' ? 'Bulle' : 'Écran'}
            isCompact={isCompact}
          />

          <div className={`${isCompact ? 'h-6 mx-0.5' : 'h-10 mx-1 sm:mx-2'} w-[1px] ${isLightTheme ? 'bg-slate-200' : 'bg-white/10'}`} />

          <button
            onClick={onClose}
            className={`${isCompact ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-xl'} flex items-center justify-center transition-all border hover:border-red-500/50 hover:bg-red-500/5 ${isLightTheme ? 'bg-white text-slate-500 hover:text-slate-900 border-slate-200' : 'bg-white/5 text-zinc-400 hover:text-white border-white/10'}`}
            title="Quitter"
          >
            <X className={isCompact ? 'w-4 h-4' : 'w-6 h-6'} />
          </button>
        </div>
      </div>
    </div>
  );
}
