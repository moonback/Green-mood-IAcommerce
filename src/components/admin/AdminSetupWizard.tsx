import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Store, Palette, FileText, Truck, Zap, MessageSquare, CheckCircle,
    ChevronRight, ChevronLeft, Check, Save, RefreshCw, ArrowRight, Sparkles,
    Phone, Mail, MapPin, Clock, Hash, Globe, Image as ImageIcon, Type,
    Award, Crown, Leaf, TrendingUp, Star, Upload,
    Users, ShoppingCart, Mic, Search, Shield, Clapperboard,
    Eye, Package, Coins, Wand2, PenLine, AlertCircle, Loader2, RotateCcw, Link2,
    CreditCard, Info, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore, type StoreSettings } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { saveStoreSettings } from '../../lib/settingsService';



// ─── Design constants ───────────────────────────────────────────────────────
const INPUT =
    'w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all';
const LABEL = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1';
const TEXTAREA =
    'w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all resize-none';

// ─── AI Models ───────────────────────────────────────────────────────────────

// ─── AI Models ───────────────────────────────────────────────────────────────
const AI_MODELS = [
    'mistralai/mistral-small-creative',
    'mistralai/mistral-medium',
    'openai/gpt-4o-mini',
    'anthropic/claude-haiku',
];

const FRENCH_VOICES = [
    { value: 'Kore', label: 'Kore (Femme - claire et professionnelle)' },
    { value: 'Aoede', label: 'Aoede (Femme - douce et posée)' },
    { value: 'Leda', label: 'Leda (Femme - chaleureuse et rassurante)' },
    { value: 'Callirrhoe', label: 'Callirrhoe (Femme - dynamique et vive)' },
    { value: 'Zephyr', label: 'Zephyr (Homme - grave et calme)' },
    { value: 'Autonoe', label: 'Autonoe (Femme - énergique et moderne)' },
    { value: 'Charon', label: 'Charon (Homme - profond et calme)' },
    { value: 'Puck', label: 'Puck (Homme - jovial et vif)' },
    { value: 'Orion', label: 'Orion (Homme - posé et neutre)' },
];

// ─── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
    { id: 'identity', label: 'Identité', icon: Store, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 'images', label: 'Images & Fonds', icon: ImageIcon, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { id: 'delivery', label: 'Livraison', icon: Truck, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { id: 'social', label: 'Réseaux', icon: Link2, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { id: 'modules', label: 'Modules', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'ai', label: 'IA & Fidélité', icon: MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { id: 'payment', label: 'Paiement', icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 'recap', label: 'Récapitulatif', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
];

// ─── Sub-components ──────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${enabled ? 'bg-emerald-500' : 'bg-white/10'}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

function ToggleRow({ label, description, enabled, onToggle, icon: Icon }: {
    label: string; description: string; enabled: boolean; onToggle: () => void; icon: React.ElementType;
}) {
    return (
        <div
            onClick={onToggle}
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all group ${enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'}`}
        >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                <Icon className={`w-4 h-4 ${enabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{label}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{description}</div>
            </div>
            <Toggle enabled={enabled} onToggle={onToggle} />
        </div>
    );
}

function RecapRow({ label, value }: { label: string; value: string | boolean | number }) {
    const display = typeof value === 'boolean' ? (value ? '✓ Actif' : '✗ Désactivé') : String(value || '—');
    const isActive = value === true;
    const isInactive = value === false;
    return (
        <div className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
            <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider w-40 shrink-0 pt-0.5">{label}</div>
            <div className={`text-sm font-semibold flex-1 ${isActive ? 'text-emerald-400' : isInactive ? 'text-red-400/70' : 'text-white'}`}>
                {display}
            </div>
        </div>
    );
}

function RecapImg({ label, url }: { label: string, url: string | undefined }) {
    return (
        <div className="space-y-1.5">
            <div className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">{label}</div>
            <div className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                {url ? <img src={url} className="w-full h-full object-cover" alt={label} /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-zinc-800" /></div>}
            </div>
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface AdminSetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminSetupWizard({ isOpen, onClose }: AdminSetupWizardProps) {
    const { settings, updateSettingsInStore } = useSettingsStore();
    const { addToast } = useToastStore();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [ws, setWs] = useState<Partial<StoreSettings>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState<string | null>(null);

    // Initialisation du wizard : seulement à l'ouverture
    useEffect(() => {
        if (isOpen) {
            setWs({ ...settings });
            setStep(0);
            setSaveSuccess(false);
        }
    }, [isOpen]); // On retire settings des dépendances pour éviter le reset lors d'un fetch background (ex: focus window après upload)

    // Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const upd = useCallback((partial: Partial<StoreSettings>) => setWs(prev => ({ ...prev, ...partial })), []);

    const goNext = () => { setDirection(1); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
    const goPrev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveStoreSettings(ws);
            updateSettingsInStore(ws);
            setSaveSuccess(true);
            setTimeout(() => { setSaveSuccess(false); onClose(); }, 2000);
        } catch (err) {
            console.error('Error saving wizard settings:', err);
            addToast({ type: 'error', message: 'Erreur lors de la sauvegarde.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof StoreSettings) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingImage(field as string);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `backgrounds/${field}-${Math.random().toString(36).slice(2)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
            upd({ [field]: publicUrl });
        } catch (err) {
            console.error(`Error uploading ${field}:`, err);
            addToast({ type: 'error', message: "Erreur lors de l'upload de l'image." });
        } finally {
            setIsUploadingImage(null);
            e.target.value = '';
        }
    };

    const progress = ((step) / (STEPS.length - 1)) * 100;
    const currentStep = STEPS[step];

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed inset-0 z-[9999] flex flex-col bg-zinc-950 overflow-hidden"
            >
                {/* Background glows — identical to AdminLayout */}
                <div className="pointer-events-none fixed top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[160px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="pointer-events-none fixed bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[140px] rounded-full translate-y-1/2 -translate-x-1/2" />

                {/* ── TOP HEADER BAR ── */}
                <div className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-white/[0.05] bg-black/30 backdrop-blur-xl relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Configuration Rapide</span>
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">{currentStep.label}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Étape</span>
                            <span className="text-[10px] font-black text-emerald-400">{step + 1}</span>
                            <span className="text-[10px] text-zinc-700">/</span>
                            <span className="text-[10px] font-black text-zinc-500">{STEPS.length}</span>
                        </div>
                        {/* Progress bar mini */}
                        <div className="hidden sm:block w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div className="h-full bg-emerald-500 rounded-full" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] flex items-center justify-center transition-all"
                        >
                            <X className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* ── MAIN AREA: sidebar + content ── */}
                <div className="flex flex-1 overflow-hidden relative z-10">

                    {/* ── LEFT SIDEBAR (desktop only) ── */}
                    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/[0.05] bg-black/20 relative">
                        <div className="p-6 pb-4 border-b border-white/[0.04]">
                            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 mb-1">Assistant Setup</div>
                            <div className="text-sm font-black text-white leading-tight">Configurez votre boutique</div>
                        </div>

                        {/* Steps nav */}
                        <nav className="flex-1 overflow-y-auto py-3 px-3">
                            {STEPS.map((s, i) => {
                                const Icon = s.icon;
                                const done = i < step;
                                const active = i === step;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-0.5 text-left transition-all relative group ${active ? 'bg-white/[0.06] border border-white/[0.08]' : done ? 'hover:bg-white/[0.03]' : 'hover:bg-white/[0.03] opacity-60 hover:opacity-80'}`}
                                    >
                                        {/* Active indicator */}
                                        {active && (
                                            <motion.div layoutId="sidebar-wizard-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-emerald-500 to-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                        )}
                                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all border ${done ? 'bg-emerald-500/20 border-emerald-500/30' : active ? 'bg-white/10 border-white/10' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                                            {done
                                                ? <Check className="w-3 h-3 text-emerald-400" />
                                                : <Icon className={`w-3 h-3 ${active ? 'text-white' : 'text-zinc-600'}`} />
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-[11px] font-black uppercase tracking-wider leading-none truncate ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-zinc-500'}`}>
                                                {s.label}
                                            </div>
                                            {active && (
                                                <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{getStepDescription(step).slice(0, 36)}…</div>
                                            )}
                                        </div>
                                        {done && <Check className="w-3 h-3 text-emerald-500 ml-auto shrink-0" />}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Sidebar bottom progress */}
                        <div className="p-4 border-t border-white/[0.04]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Progression</span>
                                <span className="text-[10px] font-black text-emerald-400">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                            </div>
                            <div className="text-[9px] text-zinc-600 mt-1.5">{step} étape{step > 1 ? 's' : ''} complétée{step > 1 ? 's' : ''} sur {STEPS.length}</div>
                        </div>
                    </aside>

                    {/* ── MOBILE steps (horizontal scroll) ── */}
                    <div className="lg:hidden shrink-0 absolute top-0 left-0 right-0 z-10 px-4 pt-3 pb-2 overflow-x-auto border-b border-white/[0.05] bg-zinc-950/95 backdrop-blur-xl">
                        <div className="flex gap-1.5 min-w-max">
                            {STEPS.map((s, i) => {
                                const Icon = s.icon;
                                const done = i < step;
                                const active = i === step;
                                return (
                                    <button key={s.id} onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all border text-[10px] font-black uppercase tracking-wider ${active ? 'bg-white/10 border-white/15 text-white' : done ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.03] border-white/[0.06] text-zinc-600'}`}>
                                        {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                                        <span className="hidden xs:inline">{s.label}</span>
                                        <span className="xs:hidden">{i + 1}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── RIGHT CONTENT ── */}
                    <div className="flex-1 overflow-y-auto lg:pt-0 pt-14">
                        <div className="max-w-8xl mx-auto px-6 py-8">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={step}
                                    custom={direction}
                                    initial={{ opacity: 0, x: direction * 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: direction * -30 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    className="space-y-5"
                                >
                                    {/* Step header card — matches AdminSettingsTab header style */}
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] px-7 py-5 flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl ${currentStep.bg} flex items-center justify-center shrink-0`}>
                                            <currentStep.icon className={`w-6 h-6 ${currentStep.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-0.5">Étape {step + 1} sur {STEPS.length}</div>
                                            <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">{getStepTitle(step)}</h2>
                                            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{getStepDescription(step)}</p>
                                        </div>
                                        {/* Mobile progress */}
                                        <div className="lg:hidden flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[10px] font-black text-emerald-400">{Math.round(progress)}%</span>
                                            <div className="w-14 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Step form card — matches AdminSettingsTab section cards */}
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] px-7 py-7">
                                        <div className="space-y-5">

                                            {/* ── Step 1: Identité ── */}
                                            {step === 0 && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={LABEL}>Nom de la boutique</label>
                                                            <input className={INPUT} value={ws.store_name || ''} onChange={e => upd({ store_name: e.target.value })} placeholder="Ex: Ma Boutique" />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}>Tagline / Slogan</label>
                                                            <input className={INPUT} value={ws.store_tagline || ''} onChange={e => upd({ store_tagline: e.target.value })} placeholder="Ex: Leader du marché" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}>Description de la boutique</label>
                                                        <textarea className={TEXTAREA} rows={3} value={ws.store_description || ''} onChange={e => upd({ store_description: e.target.value })} placeholder="Décrivez votre activité en quelques phrases..." />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={LABEL}>Secteur d'activité</label>
                                                            <input className={INPUT} value={ws.store_sector || ''} onChange={e => upd({ store_sector: e.target.value })} placeholder="Ex: Mode, Tech, Loisirs..." />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}>Ville</label>
                                                            <input className={INPUT} value={ws.store_city || ''} onChange={e => upd({ store_city: e.target.value })} placeholder="Paris" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className={LABEL}><ImageIcon className="inline w-3 h-3 mr-1" />Logo (Thème Clair)</label>
                                                            <div className="flex gap-3 items-start">
                                                                <label htmlFor="wizard-logo-upload" className="cursor-pointer shrink-0">
                                                                    <div className="w-24 h-24 relative flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-white/[0.1] rounded-2xl bg-white/[0.02] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group overflow-hidden">
                                                                        {isUploadingImage === 'store_logo_url' ? (
                                                                            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                                                                        ) : ws.store_logo_url ? (
                                                                            <>
                                                                                <img src={ws.store_logo_url} alt="logo" className="w-full h-full object-contain p-2" />
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Changer</span>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ImageIcon className="w-6 h-6 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                                                                                <span className="text-[9px] font-bold text-zinc-600 group-hover:text-zinc-300 uppercase tracking-wider transition-colors text-center leading-tight px-1">Uploader</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                                <input id="wizard-logo-upload" type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'store_logo_url')} />
                                                                <div className="flex-1">
                                                                    <input className={INPUT} value={ws.store_logo_url || ''} onChange={e => upd({ store_logo_url: e.target.value })} placeholder="/logo.png..." />
                                                                    <p className="text-[10px] text-zinc-600 mt-1.5 leading-snug">Logo principal (fond clair).</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className={LABEL}><ImageIcon className="inline w-3 h-3 mr-1" />Logo (Thème Sombre)</label>
                                                            <div className="flex gap-3 items-start">
                                                                <label htmlFor="wizard-logo-dark-upload" className="cursor-pointer shrink-0">
                                                                    <div className="w-24 h-24 relative flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-white/[0.1] rounded-2xl bg-[#020408] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group overflow-hidden">
                                                                        {isUploadingImage === 'store_logo_dark_url' ? (
                                                                            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                                                                        ) : ws.store_logo_dark_url ? (
                                                                            <>
                                                                                <img src={ws.store_logo_dark_url} alt="logo dark" className="w-full h-full object-contain p-2" />
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Changer</span>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ImageIcon className="w-6 h-6 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                                                                                <span className="text-[9px] font-bold text-zinc-600 group-hover:text-zinc-300 uppercase tracking-wider transition-colors text-center leading-tight px-1">Uploader</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                                <input id="wizard-logo-dark-upload" type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'store_logo_dark_url')} />
                                                                <div className="flex-1">
                                                                    <input className={INPUT} value={ws.store_logo_dark_url || ''} onChange={e => upd({ store_logo_dark_url: e.target.value })} placeholder="/logo-dark.png..." />
                                                                    <p className="text-[10px] text-zinc-600 mt-1.5 leading-snug">Logo optimisé pour fond sombre.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className={LABEL}><Mail className="inline w-3 h-3 mr-1" />Email</label>
                                                            <input className={INPUT} type="email" value={ws.store_email || ''} onChange={e => upd({ store_email: e.target.value })} placeholder="contact@..." />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}><Phone className="inline w-3 h-3 mr-1" />Téléphone</label>
                                                            <input className={INPUT} value={ws.store_phone || ''} onChange={e => upd({ store_phone: e.target.value })} placeholder="01 23 45 67 89" />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}><Globe className="inline w-3 h-3 mr-1" />Site web</label>
                                                            <input className={INPUT} value={ws.store_url || ''} onChange={e => upd({ store_url: e.target.value })} placeholder="https://..." />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}><MapPin className="inline w-3 h-3 mr-1" />Adresse</label>
                                                        <input className={INPUT} value={ws.store_address || ''} onChange={e => upd({ store_address: e.target.value })} placeholder="42 Rue de la Paix, 75001 Paris" />
                                                    </div>
                                                </div>
                                            )}


                                            {/* ── Step 2: Images & Fonds ── */}
                                            {step === 1 && (
                                                <div className="space-y-6">
                                                    {/* POS Background */}
                                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-4">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                                                <ImageIcon className="w-4 h-4 text-orange-400" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-black text-white uppercase tracking-wider">Fond d'écran POS</div>
                                                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Tablette & Caisse</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 items-center">
                                                            <div className="w-32 h-20 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative group shrink-0">
                                                                {ws.pos_background_url ? (
                                                                    <img src={ws.pos_background_url} alt="POS" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <ImageIcon className="w-5 h-5 text-zinc-700" />
                                                                    </div>
                                                                )}
                                                                {isUploadingImage === 'pos_background_url' && (
                                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 space-y-2">
                                                                <input className={INPUT} value={ws.pos_background_url || ''} onChange={e => upd({ pos_background_url: e.target.value })} placeholder="URL de l'image..." />
                                                                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                                                                    <Upload className="w-3 h-3" /> Uploader
                                                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'pos_background_url')} />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Heroes & Section backgrounds */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {[
                                                            { label: 'Hero Accueil', field: 'home_hero_bg_url' },
                                                            { label: 'Section Accueil', field: 'home_section_bg_url' },
                                                            { label: 'Hero Boutique', field: 'hero_bg_url' },
                                                            { label: 'Hero Produits', field: 'products_hero_bg_url' },
                                                            { label: 'Hero Assistant', field: 'budtender_hero_bg_url' },
                                                            { label: 'Hero Contact', field: 'contact_bg_url' },
                                                            { label: 'Hero Qualité', field: 'home_quality_bg_url' },
                                                        ].map(img => (
                                                            <div key={img.field} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 space-y-3">
                                                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{img.label}</div>
                                                                <div className="h-24 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden relative group">
                                                                    {(ws as any)[img.field] ? (
                                                                        <img src={(ws as any)[img.field]} alt={img.label} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <ImageIcon className="w-4 h-4 text-zinc-800" />
                                                                        </div>
                                                                    )}
                                                                    {isUploadingImage === img.field && (
                                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                                                                        </div>
                                                                    )}
                                                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                                        <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-[10px] font-black uppercase">Changer</span>
                                                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, img.field as keyof StoreSettings)} />
                                                                    </label>
                                                                </div>
                                                                <input 
                                                                    className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl px-3 py-2 text-[10px] text-zinc-400 focus:outline-none focus:border-emerald-500/30 transition-all font-mono" 
                                                                    value={(ws as any)[img.field] || ''} 
                                                                    onChange={e => upd({ [img.field]: e.target.value })} 
                                                                    placeholder="URL..." 
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Step 3: Livraison ── */}
                                            {step === 2 && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={LABEL}>Frais de livraison (€)</label>
                                                            <input className={INPUT} type="number" min="0" step="0.5" value={ws.delivery_fee ?? 0} onChange={e => upd({ delivery_fee: parseFloat(e.target.value) || 0 })} />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}>Livraison gratuite à partir de (€)</label>
                                                            <input className={INPUT} type="number" min="0" step="10" value={ws.delivery_free_threshold ?? 500} onChange={e => upd({ delivery_free_threshold: parseFloat(e.target.value) || 0 })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}><Clock className="inline w-3 h-3 mr-1" />Horaires d'ouverture</label>
                                                        <input className={INPUT} value={ws.store_hours || ''} onChange={e => upd({ store_hours: e.target.value })} placeholder="Lun–Ven 9h00–18h00" />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={LABEL}><Hash className="inline w-3 h-3 mr-1" />SIRET</label>
                                                            <input className={INPUT} value={ws.store_siret || ''} onChange={e => upd({ store_siret: e.target.value })} placeholder="123 456 789 00012" />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}>TVA Intracommunautaire</label>
                                                            <input className={INPUT} value={ws.store_tva_intra || ''} onChange={e => upd({ store_tva_intra: e.target.value })} placeholder="FR 12 345678901" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}>Taux de TVA (%)</label>
                                                        <input className={INPUT} type="number" min="0" max="100" step="1" value={ws.invoice_tax_rate ?? 20} onChange={e => upd({ invoice_tax_rate: parseFloat(e.target.value) || 0 })} />
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}>Mentions légales factures</label>
                                                        <textarea className={TEXTAREA} rows={3} value={ws.invoice_legal_text || ''} onChange={e => upd({ invoice_legal_text: e.target.value })} placeholder="Conformité CE, garantie constructeur..." />
                                                    </div>
                                                    {/* Quick info card */}
                                                    <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                                                        <Truck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                                        <div className="text-xs text-zinc-400">
                                                            Si les frais sont à <span className="text-white font-bold">0€</span>, la livraison est gratuite pour tous. Le seuil de livraison gratuite s'affiche dans le panier.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Step 4: Réseaux Sociaux ── */}
                                            {step === 3 && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={LABEL}><Link2 className="inline w-3 h-3 mr-1" />Instagram</label>
                                                            <input className={INPUT} value={ws.social_instagram || ''} onChange={e => upd({ social_instagram: e.target.value })} placeholder="https://instagram.com/..." />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}><Link2 className="inline w-3 h-3 mr-1" />Facebook</label>
                                                            <input className={INPUT} value={ws.social_facebook || ''} onChange={e => upd({ social_facebook: e.target.value })} placeholder="https://facebook.com/..." />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}><Link2 className="inline w-3 h-3 mr-1" />Twitter / X</label>
                                                            <input className={INPUT} value={ws.social_twitter || ''} onChange={e => upd({ social_twitter: e.target.value })} placeholder="https://twitter.com/..." />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}>TikTok</label>
                                                            <input className={INPUT} value={ws.social_tiktok || ''} onChange={e => upd({ social_tiktok: e.target.value })} placeholder="https://tiktok.com/@..." />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                                                        <Link2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                                                        <div className="text-xs text-zinc-400">
                                                            Les liens sociaux apparaissent dans le <span className="text-white font-bold">footer</span> du site et dans la page de contact. Laissez vide pour masquer l'icône correspondante.
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Step 5: Modules ── */}
                                            {step === 4 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    <ToggleRow label="Programme de Fidélité" description="Points, paliers et récompenses clients" enabled={!!ws.loyalty_program_enabled} onToggle={() => upd({ loyalty_program_enabled: !ws.loyalty_program_enabled })} icon={Award} />
                                                    <ToggleRow label="Chat BudTender / Conseiller IA" description="Assistant intelligent de recommandation" enabled={!!ws.budtender_chat_enabled} onToggle={() => upd({ budtender_chat_enabled: !ws.budtender_chat_enabled })} icon={MessageSquare} />
                                                    <ToggleRow label="Voix BudTender" description="Réponses vocales de l'assistant IA" enabled={!!ws.budtender_voice_enabled} onToggle={() => upd({ budtender_voice_enabled: !ws.budtender_voice_enabled })} icon={Mic} />
                                                    <ToggleRow label="Abonnements" description="Offres récurrentes et plans d'abonnement" enabled={!!ws.subscriptions_enabled} onToggle={() => upd({ subscriptions_enabled: !ws.subscriptions_enabled })} icon={Package} />
                                                    <ToggleRow label="Programme de Parrainage" description="Récompenses pour chaque filleul référé" enabled={!!ws.referral_program_enabled} onToggle={() => upd({ referral_program_enabled: !ws.referral_program_enabled })} icon={Users} />
                                                    <ToggleRow label="Barre de Recherche" description="Recherche de produits sur le site" enabled={!!ws.search_enabled} onToggle={() => upd({ search_enabled: !ws.search_enabled })} icon={Search} />
                                                    <ToggleRow label="Écran Splash / Intro" description="Vidéo ou image d'introduction au lancement" enabled={!!ws.splash_enabled} onToggle={() => upd({ splash_enabled: !ws.splash_enabled })} icon={Clapperboard} />
                                                    <ToggleRow label="Vérification d'Âge" description="Confirmation d'âge à l'entrée du site" enabled={!!ws.age_gate_enabled} onToggle={() => upd({ age_gate_enabled: !ws.age_gate_enabled })} icon={Shield} />
                                                    <ToggleRow label="Avis clients sur la Home" description="Section avis sur la page d'accueil" enabled={!!ws.home_reviews_enabled} onToggle={() => upd({ home_reviews_enabled: !ws.home_reviews_enabled })} icon={Star} />
                                                    <ToggleRow label="Meilleures Ventes sur la Home" description="Section best-sellers automatique" enabled={!!ws.home_best_sellers_enabled} onToggle={() => upd({ home_best_sellers_enabled: !ws.home_best_sellers_enabled })} icon={TrendingUp} />
                                                    <ToggleRow label="Suggestions Panier Vide" description="Recommandations quand le panier est vide" enabled={!!ws.empty_cart_suggestions_enabled} onToggle={() => upd({ empty_cart_suggestions_enabled: !ws.empty_cart_suggestions_enabled })} icon={ShoppingCart} />
                                                </div>
                                            )}

                                            {/* ── Step 6: IA & Fidélité ── */}
                                            {step === 5 && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className={LABEL}>Nom du Conseiller IA</label>
                                                            <input className={INPUT} value={ws.budtender_name || ''} onChange={e => upd({ budtender_name: e.target.value })} placeholder="Ex: Léa, Axel, Advisor..." />
                                                        </div>
                                                        <div>
                                                            <label className={LABEL}>Voix du Conseiller</label>
                                                            <select
                                                                className={INPUT}
                                                                value={ws.budtender_voice_name || 'Kore'}
                                                                onChange={e => upd({ budtender_voice_name: e.target.value })}
                                                                style={{ appearance: 'none' }}
                                                            >
                                                                {FRENCH_VOICES.map(v => (
                                                                    <option key={v.value} value={v.value} className="bg-zinc-900 text-white">
                                                                        {v.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="border-t border-white/[0.05] pt-4">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2"><Coins className="w-3 h-3" />Programme Fidélité</div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div>
                                                                <label className={LABEL}>Nom de la monnaie</label>
                                                                <input className={INPUT} value={ws.loyalty_currency_name || ''} onChange={e => upd({ loyalty_currency_name: e.target.value })} placeholder="TOKENS, POINTS..." />
                                                            </div>
                                                            <div>
                                                                <label className={LABEL}>Points / Euro dépensé</label>
                                                                <input className={INPUT} type="number" min="0" step="0.5" value={ws.loyalty_earn_rate ?? 1} onChange={e => upd({ loyalty_earn_rate: parseFloat(e.target.value) || 1 })} />
                                                            </div>
                                                            <div>
                                                                <label className={LABEL}>Points = 1€ de remise</label>
                                                                <input className={INPUT} type="number" min="1" step="1" value={ws.loyalty_redeem_rate ?? 5} onChange={e => upd({ loyalty_redeem_rate: parseFloat(e.target.value) || 5 })} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}>Prompt de base du conseiller IA</label>
                                                        <textarea className={TEXTAREA} rows={4} value={ws.budtender_base_prompt || ''} onChange={e => upd({ budtender_base_prompt: e.target.value })} placeholder="Tu es un conseiller expert qui aide les clients à choisir les meilleurs produits..." />
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Step 7: Paiement Stripe ── */}
                                            {step === 6 && (
                                                <div className="space-y-4">
                                                    {/* Enable toggle */}
                                                    <div
                                                        onClick={() => upd({ stripe_enabled: !ws.stripe_enabled })}
                                                        className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${ws.stripe_enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'}`}
                                                    >
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ws.stripe_enabled ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                                                            <CreditCard className={`w-4 h-4 ${ws.stripe_enabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-white">Activer le paiement Stripe</div>
                                                            <div className="text-[11px] text-zinc-500 mt-0.5">Formulaire Stripe Elements embarqué sur le checkout</div>
                                                        </div>
                                                        <button type="button" onClick={e => { e.stopPropagation(); upd({ stripe_enabled: !ws.stripe_enabled }); }}>
                                                            {ws.stripe_enabled
                                                                ? <ToggleRight className="w-7 h-7 text-emerald-400" />
                                                                : <ToggleLeft className="w-7 h-7 text-zinc-600" />}
                                                        </button>
                                                    </div>

                                                    {/* Public key */}
                                                    <div>
                                                        <label className={LABEL}>Clé publique Stripe (pk_test_… ou pk_live_…)</label>
                                                        <input
                                                            className={INPUT}
                                                            value={ws.stripe_public_key || ''}
                                                            onChange={e => upd({ stripe_public_key: e.target.value })}
                                                            placeholder="pk_test_51..."
                                                            spellCheck={false}
                                                        />
                                                    </div>

                                                    {/* Test mode */}
                                                    <div
                                                        onClick={() => upd({ stripe_test_mode: !ws.stripe_test_mode })}
                                                        className="flex items-center justify-between p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:border-white/[0.1] transition-all"
                                                    >
                                                        <div>
                                                            <div className="text-sm font-bold text-white">Mode Test</div>
                                                            <div className="text-[11px] text-zinc-500 mt-0.5">Clés de test Stripe pour le développement</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${ws.stripe_test_mode ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {ws.stripe_test_mode ? 'TEST' : 'LIVE'}
                                                            </span>
                                                            <button type="button" onClick={e => { e.stopPropagation(); upd({ stripe_test_mode: !ws.stripe_test_mode }); }}>
                                                                {ws.stripe_test_mode
                                                                    ? <ToggleRight className="w-7 h-7 text-amber-400" />
                                                                    : <ToggleLeft className="w-7 h-7 text-zinc-600" />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex gap-3 p-4 bg-blue-500/[0.06] border border-blue-500/[0.12] rounded-2xl">
                                                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                                        <div className="text-[11px] text-zinc-400 space-y-1">
                                                            <p className="text-blue-300 font-bold">Clé secrète côté serveur uniquement</p>
                                                            <p>Configurez <code className="bg-white/10 px-1 rounded">STRIPE_SECRET_KEY</code> et <code className="bg-white/10 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> via :</p>
                                                            <code className="block bg-black/40 rounded-xl px-3 py-2 text-[11px] text-zinc-300 mt-1.5">
                                                                npx supabase secrets set STRIPE_SECRET_KEY=sk_…
                                                            </code>
                                                        </div>
                                                    </div>

                                                    {/* Test cards */}
                                                    <div className="space-y-2">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Cartes de test</div>
                                                        {[
                                                            { number: '4242 4242 4242 4242', label: 'Succès', color: 'text-emerald-400' },
                                                            { number: '4000 0000 0000 0002', label: 'Refusé', color: 'text-red-400' },
                                                            { number: '4000 0025 0000 3155', label: '3D Secure', color: 'text-amber-400' },
                                                        ].map(({ number, label, color }) => (
                                                            <div key={number} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                                <code className="font-mono text-xs text-white tracking-wider">{number}</code>
                                                                <span className={`text-[10px] font-black uppercase ${color}`}>{label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Step 8: Récapitulatif ── */}
                                            {step === 7 && (
                                                <div className="space-y-4">
                                                    {saveSuccess ? (
                                                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-12 gap-4">
                                                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                                                            </div>
                                                            <div className="text-xl font-black text-white">Configuration sauvegardée !</div>
                                                            <div className="text-sm text-zinc-500">Votre boutique est maintenant configurée.</div>
                                                        </motion.div>
                                                    ) : (
                                                        <>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {/* Identity recap */}
                                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <Store className="w-4 h-4 text-blue-400" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Identité</span>
                                                                    </div>
                                                                    <RecapRow label="Nom" value={ws.store_name || ''} />
                                                                    <RecapRow label="Tagline" value={ws.store_tagline || ''} />
                                                                    <RecapRow label="Secteur" value={ws.store_sector || ''} />
                                                                    <RecapRow label="Ville" value={ws.store_city || ''} />
                                                                    <RecapRow label="Email" value={ws.store_email || ''} />
                                                                </div>

                                                                {/* Delivery recap */}
                                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <Truck className="w-4 h-4 text-amber-400" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Livraison</span>
                                                                    </div>
                                                                    <RecapRow label="Frais" value={`${ws.delivery_fee ?? 0}€`} />
                                                                    <RecapRow label="Gratuit dès" value={`${ws.delivery_free_threshold ?? 500}€`} />
                                                                    <RecapRow label="TVA" value={`${ws.invoice_tax_rate ?? 20}%`} />
                                                                    <RecapRow label="Horaires" value={ws.store_hours || ''} />
                                                                </div>
                                                                {/* Modules recap */}
                                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <Zap className="w-4 h-4 text-emerald-400" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Modules</span>
                                                                    </div>
                                                                    <RecapRow label="Fidélité" value={!!ws.loyalty_program_enabled} />
                                                                    <RecapRow label="Chat IA" value={!!ws.budtender_chat_enabled} />
                                                                    <RecapRow label="Voix IA" value={!!ws.budtender_voice_enabled} />
                                                                    <RecapRow label="Parrainage" value={!!ws.referral_program_enabled} />
                                                                    <RecapRow label="Abonnements" value={!!ws.subscriptions_enabled} />
                                                                    <RecapRow label="Recherche" value={!!ws.search_enabled} />
                                                                    <RecapRow label="Splash" value={!!ws.splash_enabled} />
                                                                    <RecapRow label="Vérif. âge" value={!!ws.age_gate_enabled} />
                                                                    <RecapRow label="Avis Home" value={!!ws.home_reviews_enabled} />
                                                                    <RecapRow label="Best Sales" value={!!ws.home_best_sellers_enabled} />
                                                                    <RecapRow label="Sug. Panier" value={!!ws.empty_cart_suggestions_enabled} />
                                                                </div>
                                                                {/* Stripe recap */}
                                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <CreditCard className="w-4 h-4 text-emerald-400" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Paiement</span>
                                                                    </div>
                                                                    <RecapRow label="Stripe activé" value={!!ws.stripe_enabled} />
                                                                    <RecapRow label="Mode" value={ws.stripe_test_mode ? 'Test' : 'Live'} />
                                                                    <RecapRow label="Clé publique" value={ws.stripe_public_key ? `${ws.stripe_public_key.slice(0, 12)}…` : '—'} />
                                                                </div>
                                                                {/* AI & Loyalty recap */}
                                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">IA & Fidélité</span>
                                                                    </div>
                                                                    <RecapRow label="Nom IA" value={ws.budtender_name || '—'} />
                                                                    <RecapRow label="Voix" value={ws.budtender_voice_name || '—'} />
                                                                    <RecapRow label="Monnaie" value={ws.loyalty_currency_name || '—'} />
                                                                    <RecapRow label="Gain" value={`${ws.loyalty_earn_rate} pts/€`} />
                                                                    <RecapRow label="Remise" value={`${ws.loyalty_redeem_rate} pts = 1€`} />
                                                                </div>
                                                                {/* Media recap */}
                                                                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:col-span-2">
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <ImageIcon className="w-4 h-4 text-orange-400" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Média & Fonds</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                                                        <RecapImg label="POS" url={ws.pos_background_url} />
                                                                        <RecapImg label="Home" url={ws.home_hero_bg_url} />
                                                                        <RecapImg label="Shop" url={ws.hero_bg_url} />
                                                                        <RecapImg label="AI" url={ws.budtender_hero_bg_url} />
                                                                        <RecapImg label="Qualité" url={ws.home_quality_bg_url} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                                                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                                <div className="text-xs text-zinc-400">
                                                                    Toutes les modifications seront synchronisées avec Supabase. Vous pourrez affiner chaque paramètre depuis <span className="text-white font-bold">Paramètres → Boutique / Design / etc.</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Bottom navigation */}
                <div className="px-6 py-4 border-t border-white/[0.05] shrink-0">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                        <button
                            onClick={goPrev}
                            disabled={step === 0}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" /> Précédent
                        </button>

                        <button
                            onClick={() => { setDirection(1); setStep(s => Math.min(s + 1, STEPS.length - 1)); }}
                            disabled={step === STEPS.length - 1}
                            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-0"
                        >
                            Passer cette étape
                        </button>

                        {step < STEPS.length - 1 ? (
                            <button
                                onClick={goNext}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-[0.98]"
                            >
                                Suivant <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={isSaving || saveSuccess}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-[0.98] disabled:opacity-70"
                            >
                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Sauvegarde...' : saveSuccess ? 'Sauvegardé !' : 'Sauvegarder & Lancer'}
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

// ─── Trigger card for dashboard ──────────────────────────────────────────────
export function WizardTriggerCard({ onOpen }: { onOpen: () => void }) {
    const { settings } = useSettingsStore();

    // Calculate completion score
    const checks = [
        !!settings.store_logo_url && settings.store_logo_url !== '/logo.png',
        !!settings.pos_background_url,
        !!settings.home_hero_bg_url,
        !!settings.social_instagram || !!settings.social_facebook,
        !!settings.store_address,
        !!settings.store_email,
    ];
    const completed = checks.filter(Boolean).length;
    const total = checks.length;
    const pct = Math.round((completed / total) * 100);
    const allDone = completed === total;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-br from-emerald-950/40 to-black border border-emerald-500/20 rounded-[2rem] p-6 cursor-pointer group hover:border-emerald-500/40 transition-all"
            onClick={onOpen}
        >
            {/* Glow */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500/70 mb-0.5">
                            {allDone ? 'Configuration complète' : 'Configuration Rapide'}
                        </div>
                        <div className="text-base font-black text-white">
                            {allDone ? 'Votre boutique est prête !' : 'Configurez votre boutique'}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                            {allDone
                                ? 'Toutes les informations clés sont renseignées.'
                                : `${completed}/${total} informations renseignées — Identité, design, modules et plus`}
                        </div>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all group-hover:scale-105 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    {allDone ? <Eye className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    {allDone ? 'Réviser' : 'Lancer'}
                </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex gap-1">
                        {checks.map((done, i) => (
                            <div key={i} className={`w-5 h-1.5 rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-white/10'}`} />
                        ))}
                    </div>
                    <span className={`text-[11px] font-black ${allDone ? 'text-emerald-400' : 'text-zinc-500'}`}>{pct}%</span>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Helper functions ────────────────────────────────────────────────────────
function getStepTitle(step: number): string {
    const titles = [
        'Identité de la boutique',
        'Images & Fonds d\'écran',
        'Livraison & Informations légales',
        'Réseaux Sociaux',
        'Modules & Fonctionnalités',
        'Assistant IA & Fidélité',
        'Paiement Stripe',
        'Récapitulatif & Confirmation',
    ];
    return titles[step] || '';
}

function getStepDescription(step: number): string {
    const descs = [
        'Définissez le nom, logo, coordonnées et secteur de votre enseigne.',
        'Configurez les images de fond pour le POS, l\'accueil et les différentes pages.',
        'Configurez les frais de livraison, horaires et informations légales.',
        'Ajoutez vos liens sociaux pour connecter votre communauté.',
        'Activez ou désactivez les fonctionnalités disponibles sur votre boutique.',
        'Paramétrez votre conseiller IA et votre programme de fidélité.',
        'Activez Stripe et renseignez votre clé publique pour les paiements en ligne.',
        'Vérifiez toutes vos configurations avant de sauvegarder.',
    ];
    return descs[step] || '';
}
