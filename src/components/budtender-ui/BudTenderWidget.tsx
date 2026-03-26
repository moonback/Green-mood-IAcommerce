import { useState } from 'react';
import { motion } from 'motion/react';
import { Leaf, Mic, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useTheme } from '../ThemeProvider';

export interface BudTenderWidgetProps {
    /** Called when the user clicks the floating button */
    onClick: () => void;
    /** Called when the user clicks the quick voice button */
    onVoiceClick?: () => void;
    /** Whether the button should play the slow-pulse attention animation */
    pulse?: boolean;
    /** Whether a voice session is currently active */
    isVoiceActive?: boolean;
    /** Whether the chat feature is enabled */
    isChatEnabled?: boolean;
    /** Number of unread messages to show as a badge (0 = hidden) */
    unreadCount?: number;
    /** 'default' or 'expand' (when chat is shrunk) */
    mode?: 'default' | 'expand';
    /** Custom label */
    label?: string;
    /** Custom sub-label */
    subLabel?: string;
    /** Custom BudTender name */
    budtenderName?: string;
}

export default function BudTenderWidget({
    onClick,
    onVoiceClick,
    pulse = false,
    isVoiceActive = false,
    isChatEnabled = true,
    unreadCount = 0,
    mode = 'default',
    label,
    subLabel,
    budtenderName,
}: BudTenderWidgetProps) {
    const { settings } = useSettingsStore();
    const { resolvedTheme } = useTheme();
    const isExpand = mode === 'expand';
    const isLightTheme = resolvedTheme === 'light';

    const [isHidden, setIsHidden] = useState<boolean>(() => {
        try { return localStorage.getItem('budtender_widget_hidden') === 'true'; }
        catch { return false; }
    });

    const toggleHidden = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = !isHidden;
        setIsHidden(next);
        try { localStorage.setItem('budtender_widget_hidden', String(next)); } catch { /* noop */ }
    };

    const defaultName = budtenderName || settings.budtender_name || 'BudTender';
    const displayLabel = label || (isExpand ? 'Continuer' : defaultName);
    const displaySubLabel = subLabel || 'Chat + Vocal';

    return (
        <motion.div
            className="fixed right-0 bottom-20 sm:bottom-8 z-[99999] flex flex-row items-end lg:hidden"
            animate={{ x: isHidden ? 'calc(100% - 14px)' : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        >
            <button
                onClick={toggleHidden}
                aria-label={isHidden ? 'Afficher BudTender' : 'Réduire BudTender'}
                className={`flex-shrink-0 self-center w-3.5 h-11 border border-r-0 rounded-l-xl flex items-center justify-center transition-colors backdrop-blur-xl ${isLightTheme ? 'bg-white/90 border-slate-200 hover:bg-slate-50' : 'bg-zinc-950/90 border-white/[0.10] hover:bg-zinc-900'}`}
            >
                <motion.span
                    animate={{ rotate: isHidden ? 0 : 180 }}
                    transition={{ duration: 0.25 }}
                    className="flex"
                >
                    <ChevronRight className={`w-3 h-3 ${isLightTheme ? 'text-slate-500' : 'text-zinc-500'}`} />
                </motion.span>
            </button>

            <div className="relative flex flex-col items-end gap-3 pr-4 sm:pr-8">
                <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.22),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(56,189,248,0.18),transparent_55%)] blur-2xl" />
                {!isExpand && onVoiceClick && (
                    <div className="group relative">
                        <motion.button
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: 'spring', damping: 22, stiffness: 210 }}
                            whileHover={{ scale: 1.08, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => { e.stopPropagation(); onVoiceClick(); }}
                            aria-label="Ouvrir le mode vocal"
                            className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl border transition-all relative overflow-hidden backdrop-blur-2xl ${isVoiceActive
                                ? 'border-emerald-400/80 bg-emerald-500/15 text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.45)]'
                                : isLightTheme
                                    ? 'border-slate-200 bg-white/90 text-slate-600 hover:text-emerald-600 hover:border-emerald-500/60 shadow-[0_12px_24px_rgba(15,23,42,0.08)]'
                                    : 'border-white/15 bg-zinc-900/70 text-zinc-300 hover:text-emerald-300 hover:border-emerald-500/60 shadow-[0_8px_26px_rgba(0,0,0,0.45)]'
                                }`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                            {isVoiceActive && (
                                <motion.div
                                    animate={{ scale: [1, 1.35, 1], opacity: [0.2, 0.5, 0.2] }}
                                    transition={{ duration: 1.7, repeat: Infinity }}
                                    className="absolute inset-0 bg-emerald-500/25 rounded-2xl"
                                />
                            )}
                            <Mic className={`w-4 h-4 sm:w-5 sm:h-5 relative z-10 ${isVoiceActive ? 'animate-pulse' : ''}`} />
                        </motion.button>

                        <div className={`hidden sm:flex absolute right-14 top-1/2 -translate-y-1/2 items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-[0.12em] opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap backdrop-blur-2xl ${isLightTheme ? 'bg-white/95 border-slate-200 text-slate-700' : 'bg-zinc-950/95 border-white/10 text-zinc-200'}`}>
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            Vocal Live
                        </div>
                    </div>
                )}

                {isChatEnabled && (
                    <div className="group relative">
                        <motion.button
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 210, delay: 0.08 }}
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClick}
                            id="budtender-widget-btn"
                            aria-label={isExpand ? 'Rouvrir le chat IA' : 'Ouvrir le chat IA'}
                            className={`relative flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border rounded-[1.25rem] transition-all duration-500 overflow-hidden backdrop-blur-2xl before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent ${isExpand
                                ? isLightTheme
                                    ? 'border-emerald-400/60 bg-white/96 shadow-[0_18px_40px_rgba(16,185,129,0.16)]'
                                    : 'border-emerald-400/70 bg-zinc-950/85 shadow-[0_0_42px_rgba(16,185,129,0.22)]'
                                : isLightTheme
                                    ? 'border-slate-200 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.10)] hover:border-emerald-500/45'
                                    : 'border-white/15 bg-zinc-900/75 shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:border-emerald-500/45'
                                }`}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,185,129,0.16),transparent_38%,transparent_65%,rgba(56,189,248,0.14))] pointer-events-none" />
                            <motion.div
                                animate={{ opacity: [0.28, 0.55, 0.28], scale: [1, 1.02, 1] }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute inset-[1px] rounded-[1.1rem] border border-white/10 pointer-events-none"
                            />

                            <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                                <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center ${isLightTheme ? 'bg-slate-100 border-slate-200' : 'bg-zinc-950/70 border-white/10'}`}>
                                    <Leaf className={`w-4 h-4 sm:w-[18px] sm:h-[18px] transition-all duration-500 ${isExpand || pulse ? 'text-emerald-300 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]' : 'text-emerald-400'}`} />
                                    {unreadCount > 0 && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-2 -right-2 min-w-[17px] h-[17px] flex items-center justify-center bg-emerald-400 text-black text-[9px] font-black rounded-full border border-zinc-950 px-1 leading-none"
                                        >
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </motion.span>
                                    )}
                                </div>

                                <div className="flex flex-col items-start">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                                        {displayLabel}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.14em] leading-none ${isLightTheme ? 'text-slate-500' : 'text-zinc-300'}`}>
                                        <MessageCircle className="w-2.5 h-2.5 text-emerald-300" />
                                        {displaySubLabel}
                                    </span>
                                </div>
                            </div>

                            <div className="relative z-10 flex items-center gap-1.5">
                                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-emerald-500/20 text-[7px] font-black tracking-widest text-emerald-300 border border-emerald-400/30">IA</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.85)]" />
                            </div>
                        </motion.button>

                        {!isExpand && (
                            <div className={`hidden sm:block absolute right-full mr-3 top-1/2 -translate-y-1/2 p-3 rounded-2xl border backdrop-blur-3xl opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap text-left min-w-[190px] ${isLightTheme ? 'bg-white/95 border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.12)]' : 'bg-zinc-950/95 border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.65)]'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-[0.18em] leading-none ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>
                                    Assistant Premium
                                </p>
                                <p className={`mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] leading-relaxed ${isLightTheme ? 'text-slate-500' : 'text-zinc-400'}`}>
                                    Questions produits, suivi
                                    <br />
                                    & recommandations instantanées
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
