import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, X, CheckCircle2, AlertTriangle, RotateCcw, Camera, CameraOff, Keyboard } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../../../lib/supabase';
import { Profile } from '../../../lib/types';
import { useSettingsStore } from '../../../store/settingsStore';

interface POSQRScannerProps {
    onCustomerFound: (customer: Profile) => void;
    onClose: () => void;
    isLightTheme?: boolean;
}

/**
 * Extracts the user ID from a loyalty QR payload.
 * Format: greenmood://loyalty/{uuid}
 */
function parseQRPayload(raw: string): string | null {
    const urlMatch = raw.match(/greenmood:\/\/loyalty\/([a-f0-9-]{36})/i);
    if (urlMatch) return urlMatch[1];
    // Also accept bare UUID as fallback
    const uuidMatch = raw.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
    if (uuidMatch) return uuidMatch[1];
    return null;
}

const SCANNER_ELEMENT_ID = 'pos-qr-reader';

export default function POSQRScanner({ onCustomerFound, onClose, isLightTheme }: POSQRScannerProps) {
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [status, setStatus] = useState<'idle' | 'scanning' | 'searching' | 'found' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Profile | null>(null);
    const { settings } = useSettingsStore();
    const [manualInput, setManualInput] = useState('');
    const [cameraError, setCameraError] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const hasFoundRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const lookupUser = async (userId: string) => {
        if (hasFoundRef.current) return;
        hasFoundRef.current = true;
        setStatus('searching');
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error || !data) throw new Error('Client introuvable');
            setFoundCustomer(data as Profile);
            setStatus('found');
            // Stop the camera once found
            await stopCamera();
            setTimeout(() => {
                onCustomerFound(data as Profile);
            }, 1400);
        } catch {
            hasFoundRef.current = false;
            setStatus('error');
            setErrorMsg('Client introuvable dans la base de données.');
        }
    };

    const stopCamera = async () => {
        const scanner = scannerRef.current;
        if (!scanner) return;

        // Immediately clear the ref to prevent multiple calls to stop()
        scannerRef.current = null;

        try {
            // Html5Qrcode.stop() can throw synchronously if the scanner is not in a stoppable state.
            // We check the state first if possible, and always wrap in try-catch.
            // States: 3 = SCANNING, 4 = PAUSED
            const state = (scanner as any).getState?.() ?? 0;
            if (state === 3 || state === 4) {
                await scanner.stop();
            }
        } catch (err) {
            // This is often just a "Scanner not running" error which we can safely ignore
            console.warn('POSQRScanner: Error during stopCamera:', err);
        } finally {
            try {
                scanner.clear();
            } catch (clearErr) {
                // Ignore clear errors
            }
        }
    };

    const startCamera = async () => {
        setCameraError('');
        setStatus('scanning');
        hasFoundRef.current = false;
        try {
            const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false,
            });
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 240, height: 240 },
                    aspectRatio: 1,
                },
                (decodedText) => {
                    const userId = parseQRPayload(decodedText);
                    if (userId && !hasFoundRef.current) {
                        lookupUser(userId);
                    }
                },
                () => { } // ignore ongoing failures
            );
        } catch (err: any) {
            setCameraError(
                err?.message?.includes('Permission')
                    ? 'Accès caméra refusé. Autorisez l\'accès dans les paramètres du navigateur.'
                    : 'Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.'
            );
            setStatus('idle');
            setMode('manual');
        }
    };

    // Start camera on mount, stop on unmount
    useEffect(() => {
        if (mode === 'camera') {
            const timer = setTimeout(() => {
                startCamera();
            }, 100);
            return () => {
                clearTimeout(timer);
                stopCamera();
            };
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Switch modes
    const switchToCamera = () => {
        setMode('camera');
        setStatus('idle');
        setErrorMsg('');
        hasFoundRef.current = false;
        // Ensure any previous scanner is stopped
        stopCamera().then(() => {
            // Small delay to let the DOM mount the element if it was hidden
            setTimeout(() => startCamera(), 150);
        });
    };

    const switchToManual = () => {
        stopCamera();
        setMode('manual');
        setStatus('idle');
        setErrorMsg('');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleManualSearch = async () => {
        const userId = parseQRPayload(manualInput.trim());
        if (!userId) {
            setStatus('error');
            setErrorMsg('Format invalide. Scannez le QR code ou collez l\'URL complète.');
            return;
        }
        await lookupUser(userId);
    };

    const reset = async () => {
        hasFoundRef.current = false;
        await stopCamera();
        setStatus(mode === 'camera' ? 'scanning' : 'idle');
        setErrorMsg('');
        setFoundCustomer(null);
        setManualInput('');
        if (mode === 'camera') {
            startCamera();
        }
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className={`w-full max-w-md rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden border flex flex-col transition-all ${isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-900 border-zinc-800'}`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-5 border-b shrink-0 transition-all ${isLightTheme ? 'bg-emerald-50/70 border-emerald-100' : 'bg-zinc-800/50 border-zinc-800'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center ${isLightTheme ? 'bg-emerald-100 text-emerald-600' : 'bg-green-500/10 text-green-400'}`}>
                            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <p className={`font-black text-xs sm:text-sm ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Scanner Carte Fidélité</p>
                            <p className={`text-[8px] sm:text-[10px] font-bold ${isLightTheme ? 'text-emerald-600/50' : 'text-zinc-500'}`}>
                                {mode === 'camera' ? 'Caméra active' : 'Saisie manuelle'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { stopCamera(); onClose(); }}
                        className={`p-2 rounded-xl transition-all ${isLightTheme ? 'hover:bg-emerald-100 text-emerald-400' : 'hover:bg-zinc-800 text-zinc-500 hover:text-white'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mode toggle */}
                <div className={`flex border-b shrink-0 transition-all ${isLightTheme ? 'border-emerald-100' : 'border-zinc-800'}`}>
                    <button
                        onClick={switchToCamera}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${mode === 'camera'
                            ? (isLightTheme ? 'border-emerald-600 text-emerald-700' : 'border-green-500 text-white')
                            : (isLightTheme ? 'border-transparent text-emerald-300 hover:text-emerald-700' : 'border-transparent text-zinc-600 hover:text-zinc-300')
                            }`}
                    >
                        <Camera className="w-3.5 h-3.5" />
                        Caméra
                    </button>
                    <button
                        onClick={switchToManual}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${mode === 'manual'
                            ? (isLightTheme ? 'border-emerald-600 text-emerald-700' : 'border-green-500 text-white')
                            : (isLightTheme ? 'border-transparent text-emerald-300 hover:text-emerald-700' : 'border-transparent text-zinc-600 hover:text-zinc-300')
                            }`}
                    >
                        <Keyboard className="w-3.5 h-3.5" />
                        Manuel
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {/* SUCCESS state */}
                        {status === 'found' && foundCustomer && (
                            <motion.div
                                key="found"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`flex flex-col items-center gap-4 py-6 sm:py-8 rounded-2xl sm:rounded-3xl ${isLightTheme ? 'bg-emerald-50' : 'bg-green-500/5'}`}
                            >
                                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                                    <CheckCircle2 className="w-9 h-9 text-green-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Client identifié</p>
                                    <p className={`text-xl font-black ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{foundCustomer.full_name}</p>
                                    <p className="text-sm font-bold text-amber-500 mt-1">★ {foundCustomer.loyalty_points} {settings.loyalty_currency_name}</p>
                                </div>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map(i => (
                                        <motion.div
                                            key={i}
                                            className="w-2 h-2 rounded-full bg-green-500"
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                        />
                                    ))}
                                </div>
                                <p className={`text-xs font-bold ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`}>Chargement en cours…</p>
                            </motion.div>
                        )}

                        {/* ERROR state */}
                        {status === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`flex flex-col items-center gap-4 py-8 rounded-3xl ${isLightTheme ? 'bg-red-50' : 'bg-red-500/5'}`}
                            >
                                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-red-500" />
                                </div>
                                <p className={`text-sm font-bold text-center max-w-xs ${isLightTheme ? 'text-red-700' : 'text-red-400'}`}>{errorMsg}</p>
                                <button
                                    onClick={reset}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${isLightTheme ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'}`}
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Réessayer
                                </button>
                            </motion.div>
                        )}

                        {/* CAMERA mode */}
                        {status !== 'found' && status !== 'error' && mode === 'camera' && (
                            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                {cameraError ? (
                                    <div className={`flex flex-col items-center gap-3 py-8 rounded-3xl text-center ${isLightTheme ? 'bg-orange-50 border border-orange-100' : 'bg-zinc-800/50'}`}>
                                        <CameraOff className={`w-10 h-10 ${isLightTheme ? 'text-orange-400' : 'text-zinc-600'}`} />
                                        <p className={`text-sm font-bold max-w-xs ${isLightTheme ? 'text-orange-700' : 'text-zinc-400'}`}>{cameraError}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Camera viewport */}
                                        <div className="relative rounded-3xl overflow-hidden bg-black aspect-square">
                                            {/* The html5-qrcode library renders into this div */}
                                            <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

                                            {/* Corner overlay markers */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="absolute top-6 left-6 w-8 h-8 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-xl" />
                                                <div className="absolute top-6 right-6 w-8 h-8 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-xl" />
                                                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-xl" />
                                                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-[3px] border-r-[3px] border-green-400 rounded-br-xl" />
                                                {/* Scanning beam */}
                                                <motion.div
                                                    className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                                                    animate={{ top: ['15%', '85%', '15%'] }}
                                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                                />
                                            </div>

                                            {/* Searching overlay */}
                                            {status === 'searching' && (
                                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                                                    <RotateCcw className="w-10 h-10 text-green-400 animate-spin" />
                                                    <p className="text-sm font-black text-white">Identification…</p>
                                                </div>
                                            )}
                                        </div>

                                        <p className={`text-center text-xs font-bold ${isLightTheme ? 'text-emerald-500/60' : 'text-zinc-500'}`}>
                                            Pointez la caméra vers le QR code de la carte fidélité
                                        </p>
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* MANUAL mode */}
                        {status !== 'found' && status !== 'error' && mode === 'manual' && (
                            <motion.div key="manual" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                <div className={`flex flex-col items-center gap-2 sm:gap-3 py-4 sm:py-6 rounded-2xl sm:rounded-3xl mb-2 ${isLightTheme ? 'bg-emerald-50 border border-emerald-100' : 'bg-zinc-800/50 border border-zinc-800'}`}>
                                    <QrCode className={`w-10 h-10 ${isLightTheme ? 'text-emerald-300' : 'text-zinc-600'}`} />
                                    <p className={`text-xs font-bold text-center max-w-xs ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>
                                        Branchez un lecteur de codes QR filaire — ou collez l'URL de la carte ci-dessous.
                                    </p>
                                </div>

                                <div>
                                    <label className={`block text-[9px] font-black uppercase tracking-[0.25em] mb-2 ${isLightTheme ? 'text-emerald-600/50' : 'text-zinc-500'}`}>
                                        Code QR / URL
                                    </label>
                                    <div className="relative">
                                        <QrCode className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightTheme ? 'text-emerald-400' : 'text-zinc-600'}`} />
                                        <input
                                            ref={inputRef}
                                            value={manualInput}
                                            onChange={(e) => {
                                                setManualInput(e.target.value);
                                                // Auto-trigger if it looks like a full QR payload
                                                if (e.target.value.startsWith('greenmood://loyalty/')) {
                                                    const userId = parseQRPayload(e.target.value.trim());
                                                    if (userId) lookupUser(userId);
                                                }
                                            }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch(); }}
                                            placeholder="greenmood://loyalty/…  ou coller ici"
                                            className={`w-full pl-10 sm:pl-11 pr-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-4 focus:ring-green-500/10 ${isLightTheme
                                                ? 'bg-emerald-50 border border-emerald-100 text-emerald-950 placeholder-emerald-300 focus:border-green-500'
                                                : 'bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-700 focus:border-green-500'
                                                }`}
                                        />
                                    </div>
                                    <p className={`text-[9px] mt-1.5 ${isLightTheme ? 'text-emerald-400/50' : 'text-zinc-600'}`}>
                                        Appuyez sur Entrée ou cliquez le bouton
                                    </p>
                                </div>

                                <button
                                    onClick={handleManualSearch}
                                    disabled={!manualInput.trim() || status === 'searching'}
                                    className={`w-full py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isLightTheme
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-50 disabled:text-emerald-200'
                                        : 'bg-green-500 text-black hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600'
                                        }`}
                                >
                                    {status === 'searching' ? <RotateCcw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                                    Identifier le client
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
