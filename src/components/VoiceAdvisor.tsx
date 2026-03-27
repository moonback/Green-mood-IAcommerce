import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, PhoneOff, Volume2, X, Radio, Headphones } from 'lucide-react';
import { Product, Review } from '../lib/types';
import { Product as PremiumProduct, Review as PremiumReview } from '../types/premiumProduct';
import { PastProduct, SavedPrefs, PastOrderSummary } from '../hooks/useBudTenderMemory';
import { useGeminiLiveVoice, VoiceState } from '../hooks/useGeminiLiveVoice';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from './ThemeProvider';
import { useWishlistStore } from '../store/wishlistStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Props {
    products: Product[];
    pastProducts: PastProduct[];
    pastOrders?: PastOrderSummary[];
    savedPrefs: SavedPrefs | null;
    userName: string | null;
    isOpen: boolean;
    onClose: () => void;
    onHangup?: () => void;
    onAddItem?: (product: Product, quantity: number) => void;
    onViewProduct?: (product: Product) => void;
    onNavigate?: (path: string) => void;
    onOpenModal?: (modalName: string) => void;
    onSavePrefs?: (prefs: any) => void;
    onApplyPromo?: (code: string) => Promise<{ success: boolean; discount?: number; message?: string }>;
    activeProduct?: (PremiumProduct & { reviews: PremiumReview[]; relatedProducts?: Product[] }) | null;
    showUI?: boolean;
    cartItems?: any[];
    customPrompt?: string;
    loyaltyPoints?: number;
    allowCloseSession?: boolean;
}

// ─── Status labels ───────────────────────────────────────────────────────────

const STATUS = (name: string): Record<VoiceState, string> => ({
    idle: 'Démarrage…',
    connecting: 'Connexion…',
    listening: 'À votre écoute',
    speaking: `${name} répond`,
    error: 'Erreur',
});

const STATUS_COLOR: Record<VoiceState, string> = {
    idle: 'text-zinc-400',
    connecting: 'text-zinc-400',
    listening: 'text-green-400',
    speaking: 'text-emerald-400',
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
                        className={`w-[3px] rounded-full ${isSpeaking ? 'bg-emerald-500' : 'bg-emerald-500/40'}`}
                        animate={{
                            height: isSpeaking
                                ? ['4px', `${maxH}px`, '4px']
                                : isListening
                                    ? ['3px', '8px', '3px']
                                    : '3px',
                            opacity: isSpeaking ? 1 : isListening ? [0.3, 0.6, 0.3] : 0.2
                        }}
                        transition={{
                            duration: isSpeaking ? 0.5 + centerDist * 0.05 : 2,
                            repeat: Infinity,
                            delay: isSpeaking ? delay : i * 0.2,
                            ease: 'easeInOut'
                        }}
                    />
                );
            })}
        </div>
    );
}

// ─── Central mic orb ────────────────────────────────────────────────────────

function MicOrb({ voiceState, isMuted }: { voiceState: VoiceState; isMuted: boolean }) {
    const { resolvedTheme } = useTheme();
    const isLightTheme = resolvedTheme === 'light';
    const isActive = voiceState === 'listening' || voiceState === 'speaking';
    const isListening = voiceState === 'listening';
    const isSpeaking = voiceState === 'speaking';

    return (
        <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
            {/* Immersive glow layers */}
            <AnimatePresence>
                {isActive && !isMuted && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-[-4px] rounded-full bg-emerald-500/5 blur-[15px]"
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full border border-emerald-500/20"
                            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Orb background */}
            <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 ${voiceState === 'error'
                ? 'bg-red-500/10 border-2 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                : isSpeaking
                    ? 'bg-emerald-500/20 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(57,255,20,0.3)]'
                    : isListening
                        ? 'bg-emerald-500/10 border-2 border-emerald-500/40 shadow-[0_0_15px_rgba(57,255,20,0.2)]'
                        : isLightTheme
                            ? 'bg-white border-2 border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.08)]'
                            : 'bg-zinc-800/60 border-2 border-white/5'
                }`}>
                <AnimatePresence mode="wait">
                    {voiceState === 'connecting' && (
                        <motion.div
                            key="spinner"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
                        />
                    )}
                    {isSpeaking && (
                        <motion.div key="vol" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            <Volume2 className="w-5 h-5 text-emerald-400" />
                        </motion.div>
                    )}
                    {(isListening || voiceState === 'idle' || voiceState === 'error') && (
                        <motion.div key="mic" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                            {isMuted
                                ? <MicOff className={`w-4 h-4 ${voiceState === 'error' ? 'text-red-400' : 'text-orange-400'}`} />
                                : <Mic className={`w-5 h-5 ${isActive ? 'text-emerald-400' : voiceState === 'error' ? 'text-red-400' : isLightTheme ? 'text-slate-400' : 'text-zinc-400'}`} />
                            }
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function VoiceAdvisor({
    products, pastProducts, pastOrders, savedPrefs, userName,
    isOpen, onClose, onHangup, onAddItem, onViewProduct, onNavigate, onOpenModal, onSavePrefs, onApplyPromo,
    activeProduct,
    showUI = true, cartItems = [], customPrompt, loyaltyPoints, allowCloseSession = true,
}: Props) {
    const { settings } = useSettingsStore();
    const { resolvedTheme } = useTheme();
    const isLightTheme = resolvedTheme === 'light';
    const { items: wishlistItems, toggleItem: onToggleFavorite } = useWishlistStore();

    const { voiceState, error, isMuted, isSupported, compatibilityError, startSession, stopSession, toggleMute } =
        useGeminiLiveVoice({
            products,
            pastProducts,
            pastOrders,
            savedPrefs,
            userName,
            activeProduct,
            onAddItem,
            deliveryFee: settings.delivery_fee,
            deliveryFreeThreshold: settings.delivery_free_threshold,
            onCloseSession: onClose,
            onViewProduct,
            onNavigate,
            onOpenModal,
            onSavePrefs,
            onApplyPromo,
            cartItems,
            customPrompt,
            loyaltyPoints,
            allowCloseSession,
            prewarmToken: isOpen,
            wishlistItems,
            onToggleFavorite,
        });

    // Auto-start ONCE when the panel opens — never on subsequent voiceState changes.
    // Without this guard, every time Gemini Live closes the WS cleanly (code 1000)
    // voiceState resets to 'idle' and this effect would restart the session in a loop.
    const hasAutoStartedRef = useRef(false);
    useEffect(() => {
        if (isOpen && isSupported) {
            if (!hasAutoStartedRef.current) {
                hasAutoStartedRef.current = true;
                const timer = setTimeout(() => startSession(), 400);
                return () => clearTimeout(timer);
            }
        } else {
            // Panel closed: reset so next open auto-starts fresh
            hasAutoStartedRef.current = false;
        }
    }, [isOpen, isSupported, startSession]);

    const isActive = voiceState === 'listening' || voiceState === 'speaking';
    const statusHint = voiceState === 'connecting'
        ? 'Préparation de la session premium…'
        : voiceState === 'listening'
            ? 'Parlez naturellement, vous pouvez interrompre à tout moment.'
            : voiceState === 'speaking'
                ? 'Réponse vocale en cours… touchez le micro pour couper.'
                : voiceState === 'error'
                    ? 'Connexion interrompue — relancez en un geste.'
                    : 'Prêt à démarrer une session vocale.';

    const handleClose = () => {
        stopSession();
        onClose();
    };

    const handleHangup = () => {
        stopSession();
        onClose();
        if (onHangup) onHangup();
    };

    if (!showUI) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                /* ── Floating panel anchored bottom-right, site stays accessible ── */
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 12, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.9, y: 12, filter: 'blur(4px)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    /* Position: refined and more compact */
                    className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-[99998] w-[min(280px,calc(100vw-2rem))] pointer-events-auto"
                    style={{ originX: 1, originY: 1 }}
                >
                    <div
                        className={`relative rounded-[2rem] overflow-hidden border ${isLightTheme ? 'border-slate-200' : 'border-white/[0.08]'}`}
                        style={{
                            background: isLightTheme ? 'rgba(255, 255, 255, 0.94)' : 'rgba(10, 10, 15, 0.92)',
                            backdropFilter: 'blur(40px)',
                            boxShadow: isActive
                                ? isLightTheme
                                    ? '0 20px 40px -15px rgba(15,23,42,0.12), 0 0 30px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.8)'
                                    : '0 24px 48px -12px rgba(0,0,0,0.8), 0 0 40px rgba(57,255,20,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
                                : isLightTheme
                                    ? '0 12px 32px -12px rgba(15,23,42,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
                                    : '0 20px 40px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                    >
                        {/* Immersive background mesh-glow */}
                        <AnimatePresence>
                            {isActive && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 pointer-events-none overflow-hidden"
                                >
                                    <motion.div
                                        animate={{
                                            opacity: [0.02, 0.05, 0.02],
                                            scale: [1, 1.15, 1],
                                            x: [-15, 15, -15],
                                            y: [-15, 15, -15],
                                        }}
                                        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                        className="absolute top-0 left-0 w-full h-full bg-emerald-500/15 blur-[80px]"
                                    />
                                    {/* Scanline effect */}
                                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] bg-[length:100%_2px] opacity-10" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Header ── */}
                        <div className={`flex items-center justify-between px-3 pt-3 pb-2 border-b ${isLightTheme ? 'border-slate-100' : 'border-white/[0.04]'}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <Headphones className="w-3 h-3 text-emerald-400" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${isLightTheme ? 'text-slate-800' : 'text-white'}`}>
                                        {settings.budtender_name || 'Vendeur'} IA
                                    </span>
                                    {isActive && (
                                        <motion.span
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                                        />
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className={`p-1.5 rounded-lg transition-all ${isLightTheme ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                                aria-label="Fermer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>

                        {/* ── Body ── */}
                        <div className="px-3.5 py-3 flex items-center gap-3">
                            {/* Orb */}
                            <MicOrb voiceState={voiceState} isMuted={isMuted} />

                            {/* Status + waveform */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <motion.p
                                        key={voiceState}
                                        initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                                        className={`text-[11px] font-bold tracking-tight ${STATUS_COLOR[voiceState]}`}
                                    >
                                        {STATUS(settings.budtender_name || 'Vendeur IA')[voiceState]}
                                    </motion.p>
                                    <WaveformBars state={voiceState} />
                                </div>
                                <p className={`text-[10px] mt-0.5 truncate leading-tight ${isLightTheme ? 'text-slate-500' : 'text-zinc-500'}`} aria-live="polite">
                                    {compatibilityError || error || (
                                        voiceState === 'speaking' ? 'Réponse audio…' :
                                            voiceState === 'listening' ? 'À votre écoute' :
                                                voiceState === 'connecting' ? 'Initialisation…' :
                                                    voiceState === 'error' ? 'Échec connexion' :
                                                        'Prêt à vous aider'
                                    )}
                                </p>
                                {!compatibilityError && !error && (
                                    <p className={`text-[10px] mt-1 leading-relaxed ${isLightTheme ? 'text-slate-400' : 'text-zinc-400'}`} aria-live="polite">
                                        {statusHint}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ── Controls ── */}
                        <div className="px-3 pb-3 flex items-center gap-1.5">
                            {/* Unsupported browser */}
                            {!isSupported && (
                                <div className={`flex-1 text-[9px] text-center pb-1 ${isLightTheme ? 'text-slate-500' : 'text-zinc-500'}`}>
                                    Navigateur non compatible
                                </div>
                            )}

                            {/* Error → retry */}
                            {voiceState === 'error' && isSupported && (
                                <button
                                    type="button"
                                    onClick={() => startSession()}
                                    className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black text-[10px] uppercase tracking-wider active:scale-[0.98] transition-all"
                                >
                                    Réessayer
                                </button>
                            )}

                            {/* Active controls: mute + hangup */}
                            {(isActive || voiceState === 'connecting') && isSupported && (
                                <>
                                    <button
                                        type="button"
                                        onClick={toggleMute}
                                        disabled={voiceState === 'connecting'}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 border ${isMuted
                                            ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.1)]'
                                            : isLightTheme
                                                ? 'bg-white border-slate-200 text-slate-600'
                                                : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white'
                                            }`}
                                        aria-label={isMuted ? 'Réactiver' : 'Couper'}
                                    >
                                        {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
                                        {isMuted ? 'Muet' : 'Micro'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleHangup}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all"
                                        aria-label="Quitter"
                                    >
                                        <PhoneOff size={12} />
                                        Quitter
                                    </button>
                                </>
                            )}

                            {/* Idle → start */}
                            {voiceState === 'idle' && isSupported && (
                                <button
                                    type="button"
                                    onClick={() => startSession()}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black text-[10px] uppercase tracking-wider active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                                >
                                    Démarrer
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
