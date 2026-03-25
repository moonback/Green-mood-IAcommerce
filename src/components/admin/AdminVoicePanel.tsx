import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, PhoneOff, Volume2, X, Radio, ShieldCheck } from 'lucide-react';
import { useGeminiAdminVoice, VoiceState } from '../../hooks/useGeminiAdminVoice';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: string) => void;
    adminName: string;
    storeName: string;
}

// ─── Status labels ───────────────────────────────────────────────────────────

const STATUS: Record<VoiceState, string> = {
    idle: 'Démarrage…',
    connecting: 'Connexion…',
    listening: 'À votre écoute',
    speaking: 'Manon répond',
    error: 'Erreur',
};

const STATUS_COLOR: Record<VoiceState, string> = {
    idle: 'text-zinc-400',
    connecting: 'text-zinc-400',
    listening: 'text-green-400',
    speaking: 'text-[#39ff14]',
    error: 'text-red-400',
};

// ─── Animated waveform bars ──────────────────────────────────────────────────

function WaveformBars({ state }: { state: VoiceState }) {
    const barsCount = 9;
    const isSpeaking = state === 'speaking';
    const isListening = state === 'listening';

    if (state === 'idle' || state === 'connecting' || state === 'error') {
        return (
            <div className="flex items-center gap-[4px] h-6">
                {[...Array(barsCount)].map((_, i) => (
                    <div key={i} className="w-[3px] h-[3px] bg-zinc-800 rounded-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-[4px] h-6">
            {[...Array(barsCount)].map((_, i) => {
                const centerDist = Math.abs(i - Math.floor(barsCount / 2));
                const maxH = 28 - centerDist * 4;
                const delay = i * 0.08;

                return (
                    <motion.div
                        key={i}
                        className={`w-[3px] rounded-full ${isSpeaking ? 'bg-[#39ff14]' : 'bg-[#39ff14]/40'}`}
                        animate={{
                            height: isSpeaking
                                ? ['4px', `${maxH}px`, '4px']
                                : isListening
                                    ? ['3px', '8px', '3px']
                                    : '3px',
                            opacity: isSpeaking ? 1 : isListening ? [0.3, 0.6, 0.3] : 0.2,
                        }}
                        transition={{
                            duration: isSpeaking ? 0.5 + centerDist * 0.05 : 2,
                            repeat: Infinity,
                            delay: isSpeaking ? delay : i * 0.2,
                            ease: 'easeInOut',
                        }}
                    />
                );
            })}
        </div>
    );
}

// ─── Central mic orb ─────────────────────────────────────────────────────────

function MicOrb({ voiceState, isMuted }: { voiceState: VoiceState; isMuted: boolean }) {
    const isActive = voiceState === 'listening' || voiceState === 'speaking';
    const isListening = voiceState === 'listening';
    const isSpeaking = voiceState === 'speaking';

    return (
        <div className="relative flex items-center justify-center w-18 h-18">
            <AnimatePresence>
                {isActive && !isMuted && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-[-8px] rounded-full bg-[#39ff14]/5 blur-[20px]"
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border border-[#39ff14]/20"
                            animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border border-[#39ff14]/10"
                            animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
                        />
                    </>
                )}
            </AnimatePresence>

            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 ${
                voiceState === 'error'
                    ? 'bg-red-500/10 border-2 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                    : isSpeaking
                        ? 'bg-[#39ff14]/20 border-2 border-[#39ff14]/60 shadow-[0_0_30px_rgba(57,255,20,0.3)]'
                        : isListening
                            ? 'bg-[#39ff14]/10 border-2 border-[#39ff14]/40 shadow-[0_0_20px_rgba(57,255,20,0.2)]'
                            : 'bg-zinc-800/60 border-2 border-white/5'
            }`}>
                <AnimatePresence mode="wait">
                    {voiceState === 'connecting' && (
                        <motion.div
                            key="spinner"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="w-5 h-5 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin"
                        />
                    )}
                    {isSpeaking && (
                        <motion.div key="vol" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <Volume2 className="w-6 h-6 text-[#39ff14]" />
                        </motion.div>
                    )}
                    {(isListening || voiceState === 'idle' || voiceState === 'error') && (
                        <motion.div key="mic" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            {isMuted
                                ? <MicOff className={`w-6 h-6 ${voiceState === 'error' ? 'text-red-400' : 'text-orange-400'}`} />
                                : <Mic className={`w-6 h-6 ${isActive ? 'text-[#39ff14]' : voiceState === 'error' ? 'text-red-400' : 'text-zinc-400'}`} />
                            }
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminVoicePanel({ isOpen, onClose, onNavigate, adminName, storeName }: Props) {
    const { voiceState, error, isMuted, isSupported, compatibilityError, startSession, stopSession, toggleMute } =
        useGeminiAdminVoice({
            adminName,
            storeName,
            onNavigate,
            onCloseSession: onClose,
        });

    // Auto-start once when panel opens (same guard as VoiceAdvisor)
    const hasAutoStartedRef = useRef(false);
    useEffect(() => {
        if (isOpen && isSupported) {
            if (!hasAutoStartedRef.current) {
                hasAutoStartedRef.current = true;
                const timer = setTimeout(() => startSession(), 400);
                return () => clearTimeout(timer);
            }
        } else {
            hasAutoStartedRef.current = false;
        }
    }, [isOpen, isSupported, startSession]);

    const isActive = voiceState === 'listening' || voiceState === 'speaking';

    const handleClose = () => {
        stopSession();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 24 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="fixed bottom-24 right-6 z-[99998] w-[320px] pointer-events-auto"
                    style={{ originX: 1, originY: 1 }}
                >
                    <div
                        className="relative rounded-[2.5rem] overflow-hidden border border-white/[0.08]"
                        style={{
                            background: 'rgba(5, 5, 8, 0.95)',
                            backdropFilter: 'blur(50px)',
                            boxShadow: isActive
                                ? '0 30px 60px -12px rgba(0,0,0,0.9), 0 0 50px rgba(57,255,20,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
                                : '0 30px 60px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                    >
                        {/* Background glow when active */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 pointer-events-none overflow-hidden"
                                >
                                    <motion.div
                                        animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.2, 1], x: [-20, 20, -20], y: [-20, 20, -20] }}
                                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                        className="absolute top-0 left-0 w-full h-full bg-[#39ff14]/20 blur-[100px]"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Top border glow */}
                        {isActive && (
                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#39ff14]/30 to-transparent" />
                        )}

                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.04]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#39ff14]/20 to-emerald-500/20 border border-[#39ff14]/30 flex items-center justify-center shadow-lg shadow-[#39ff14]/10">
                                    <ShieldCheck className="w-4 h-4 text-[#39ff14]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-black text-white uppercase tracking-[0.2em]">
                                            Assistant Admin
                                        </span>
                                        <motion.span
                                            animate={isActive ? { opacity: [1, 0.6, 1] } : { opacity: 0.5 }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="inline-flex items-center gap-1 text-[8px] bg-[#39ff14]/10 text-[#39ff14] px-2 py-0.5 rounded-full border border-[#39ff14]/30 font-black tracking-widest"
                                        >
                                            <Radio size={8} className="animate-pulse" />
                                            MANON
                                        </motion.span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 font-bold mt-0.5 tracking-tight">
                                        IA Vocale · Gestion boutique
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="p-2 text-zinc-600 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                aria-label="Fermer l'assistant vocal admin"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="px-4 py-4 flex items-center gap-4">
                            <MicOrb voiceState={voiceState} isMuted={isMuted} />
                            <div className="flex-1 min-w-0">
                                <motion.p
                                    key={voiceState}
                                    initial={{ opacity: 0, y: 3 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`text-sm font-bold leading-tight ${STATUS_COLOR[voiceState]}`}
                                >
                                    {STATUS[voiceState]}
                                </motion.p>
                                <p className="text-[11px] text-zinc-600 mt-1 truncate leading-snug" aria-live="polite">
                                    {compatibilityError || error || (
                                        voiceState === 'speaking' ? 'Analyse et réponse en cours…' :
                                            voiceState === 'listening' ? 'Parlez naturellement' :
                                                voiceState === 'connecting' ? 'Connexion au service vocal…' :
                                                    voiceState === 'error' ? 'Appuyez sur Réessayer' :
                                                        'Prête à vous assister'
                                    )}
                                </p>
                                <div className="mt-2.5 h-6 flex items-center">
                                    <WaveformBars state={voiceState} />
                                </div>
                            </div>
                        </div>

                        {/* ── Controls ── */}
                        <div className="px-4 pb-4 flex items-center gap-2">
                            {!isSupported && (
                                <div className="flex-1 text-[10px] text-zinc-500 text-center py-2">
                                    Navigateur non compatible ·{' '}
                                    <button onClick={handleClose} className="underline text-zinc-400">Fermer</button>
                                </div>
                            )}

                            {voiceState === 'error' && isSupported && (
                                <button
                                    type="button"
                                    onClick={startSession}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff14] to-emerald-400 text-black font-black text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(57,255,20,0.2)] active:scale-[0.98] transition-all"
                                >
                                    🔄 Réessayer
                                </button>
                            )}

                            {(isActive || voiceState === 'connecting') && isSupported && (
                                <>
                                    <button
                                        type="button"
                                        onClick={toggleMute}
                                        disabled={voiceState === 'connecting'}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-40 border ${
                                            isMuted
                                                ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                                                : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
                                        }`}
                                        aria-label={isMuted ? 'Réactiver le micro' : 'Couper le micro'}
                                    >
                                        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                                        {isMuted ? 'Micro Off' : 'Micro On'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-all"
                                        aria-label="Terminer la session vocale"
                                    >
                                        <PhoneOff size={16} />
                                        Quitter
                                    </button>
                                </>
                            )}

                            {voiceState === 'idle' && isSupported && (
                                <button
                                    type="button"
                                    onClick={startSession}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff14] to-emerald-400 text-black font-black text-xs uppercase tracking-wider hover:shadow-[0_0_20px_rgba(57,255,20,0.2)] active:scale-[0.98] transition-all"
                                >
                                    🎤 Démarrer
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
