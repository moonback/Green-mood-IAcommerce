import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import {
    Truck,
    Store,
    Eye,
    X,
    Plus,
    Mic,
    Search,
    Leaf,
    RefreshCw,
    Save,
    Star,
    TrendingUp,
    Award,
    Users,
    Palette,
    Image as ImageIcon,
    Upload,
    ChevronRight,
    MessageSquare,
    Check,
    Coins,
    Crown,
    MapPin,
    Phone,
    Clock,
    Mail,
    FileText,
    Shield,
    RotateCcw,
    Tag,
    Clapperboard,
    Info,
    Video,
    Power,
    Zap,
    Download,
    AlertTriangle,
    CreditCard,
    ToggleLeft,
    ToggleRight,
    Type
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { saveStoreSettings } from '../../lib/settingsService';
import { Tab } from './layout/AdminSidebar';

const INPUT =
    'w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all';
const LABEL = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1';
const HEX_COLOR_REGEX = /^#([\da-fA-F]{3}|[\da-fA-F]{6})$/;

type TabType = 'store' | 'delivery' | 'design' | 'features' | 'content' | 'payment';

export default function AdminSettingsTab({ activeTab = 'store', onTabChange }: { activeTab?: TabType, onTabChange?: (tab: Tab) => void }) {
    const { settings, updateSettingsInStore } = useSettingsStore();
    const { addToast } = useToastStore();
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const normalizedSettings = {
                ...localSettings,
                theme_color_neon: HEX_COLOR_REGEX.test(localSettings.theme_color_neon)
                    ? localSettings.theme_color_neon
                    : settings.theme_color_neon,
                theme_color_dark: HEX_COLOR_REGEX.test(localSettings.theme_color_dark)
                    ? localSettings.theme_color_dark
                    : settings.theme_color_dark,
                theme_color_primary: HEX_COLOR_REGEX.test(localSettings.theme_color_primary)
                    ? localSettings.theme_color_primary
                    : settings.theme_color_primary,
            };

            await saveStoreSettings(normalizedSettings);
            updateSettingsInStore(normalizedSettings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            addToast({ type: 'error', message: 'Erreur lors de la sauvegarde des paramètres.' });
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Export ──────────────────────────────────────────────────────────────
    const handleExport = () => {
        const date = new Date().toISOString().slice(0, 10);
        const blob = new Blob([JSON.stringify(localSettings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `settings-${localSettings.store_name || 'boutique'}-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Import ──────────────────────────────────────────────────────────────
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError('');
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Format invalide');
                const merged = { ...localSettings, ...parsed };
                setLocalSettings(merged);
                await saveStoreSettings(merged);
                updateSettingsInStore(merged);
                setImportSuccess(true);
                setTimeout(() => setImportSuccess(false), 3000);
            } catch {
                setImportError('Fichier JSON invalide ou corrompu.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ─── Reset ───────────────────────────────────────────────────────────────
    const handleReset = async () => {
        setResetConfirm(false);
        setIsSaving(true);
        try {
            await saveStoreSettings(DEFAULT_SETTINGS);
            updateSettingsInStore(DEFAULT_SETTINGS);
            setLocalSettings(DEFAULT_SETTINGS);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error resetting settings:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'store', label: 'Boutique', icon: Store, color: 'text-blue-400' },
        { id: 'design', label: 'Design', icon: Palette, color: 'text-pink-400' },
        { id: 'delivery', label: 'Livraison', icon: Truck, color: 'text-amber-400' },
        { id: 'features', label: 'Modules', icon: Plus, color: 'text-purple-400' },
        { id: 'payment', label: 'Paiement', icon: CreditCard, color: 'text-emerald-400' },
        { id: 'content', label: 'Contenu', icon: FileText, color: 'text-orange-400' },
    ] as const;

    return (
        <div className="space-y-8">
            {/* Header with Save Button */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2.5rem] sticky top-6 z-30 backdrop-blur-xl shadow-2xl">
                <div>
                    <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Configuration Système</h3>
                    <div className="flex items-center gap-3">
                        {activeTab === 'store' && <Store className="w-5 h-5 text-blue-400" />}
                        {activeTab === 'design' && <Palette className="w-5 h-5 text-pink-400" />}
                        {activeTab === 'delivery' && <Truck className="w-5 h-5 text-amber-400" />}
                        {activeTab === 'features' && <Plus className="w-5 h-5 text-purple-400" />}
                        {activeTab === 'payment' && <CreditCard className="w-5 h-5 text-emerald-400" />}
                        {activeTab === 'content' && <FileText className="w-5 h-5 text-orange-400" />}
                        <span className="text-white font-black text-lg uppercase tracking-tight">
                            {activeTab === 'store' && 'Identité Boutique'}
                            {activeTab === 'design' && 'Design & Apparence'}
                            {activeTab === 'delivery' && 'Frais & Logistique'}
                            {activeTab === 'features' && 'Modules & Extensions'}
                            {activeTab === 'payment' && 'Paiement & Stripe'}
                            {activeTab === 'content' && 'Contenu & White-Label'}
                        </span>
                    </div>
                </div>

                {/* Horizontal Navigation Tabs */}
                <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onTabChange?.(`settings_${t.id}` as Tab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t.id
                                ? 'bg-white/10 text-white shadow-lg font-black'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                        >
                            <t.icon className={`w-3.5 h-3.5 ${activeTab === t.id ? t.color : ''}`} />
                            {t.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className={`min-w-[200px] flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${saveSuccess
                        ? 'bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                        : 'bg-emerald-500 text-black hover:bg-white hover:scale-105 active:scale-[0.98] shadow-[0_0_30px_rgba(57,255,20,0.2)]'
                        } disabled:opacity-50`}
                >
                    {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : saveSuccess ? (
                        <Check className="w-4 h-4" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Synchronisation...' : saveSuccess ? 'Confirmé' : 'Sauvegarder les modifications'}
                </button>
            </div>

            {/* ── Import / Export / Reset bar ── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Hidden file input */}
                <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportFile} />

                {/* Export */}
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] text-zinc-300 text-[11px] font-black uppercase tracking-wider transition-all"
                >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Exporter JSON
                </button>

                {/* Import */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.15] text-zinc-300 text-[11px] font-black uppercase tracking-wider transition-all"
                >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    Importer JSON
                </button>

                {/* Reset */}
                {!resetConfirm ? (
                    <button
                        onClick={() => setResetConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-red-500/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-[11px] font-black uppercase tracking-wider transition-all"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Réinitialiser
                    </button>
                ) : (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/30"
                        >
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="text-[11px] text-red-300 font-bold">Réinitialiser tous les paramètres ?</span>
                            <button onClick={handleReset} className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-400 transition-all">
                                Confirmer
                            </button>
                            <button onClick={() => setResetConfirm(false)} className="px-3 py-1 bg-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-white/20 transition-all">
                                Annuler
                            </button>
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* Feedback messages */}
                <AnimatePresence>
                    {importSuccess && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400 font-bold">Importé & sauvegardé</span>
                        </motion.div>
                    )}
                    {importError && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-[11px] text-red-400 font-bold">{importError}</span>
                            <button onClick={() => setImportError('')}><X className="w-3 h-3 text-red-400" /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="space-y-6"
                    >
                        {/* --- BOUTIQUE TAB --- */}
                        {activeTab === 'store' && (
                            <div className="space-y-6">
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-400/10 flex items-center justify-center">
                                            <Store className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Identité de la Boutique</h2>
                                            <p className="text-xs text-zinc-500">Gérez le branding et les coordonnées de votre enseigne.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                                        {/* Logo Section - Grouped */}
                                        <div className="space-y-6">
                                            {/* Light Logo */}
                                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                                                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Logo Thème Clair (Principal)</label>
                                                <div className="relative group w-40 h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden flex items-center justify-center transition-all hover:border-emerald-500/40 shadow-inner">
                                                    {localSettings.store_logo_url ? (
                                                        <>
                                                            <img src={localSettings.store_logo_url} alt="Logo clair" className="w-full h-full object-contain p-4 drop-shadow-2xl" />
                                                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                                <button type="button" onClick={() => document.getElementById('logo-light-upload')?.click()} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><Upload className="w-4 h-4" /></button>
                                                                <button type="button" onClick={() => setLocalSettings({ ...localSettings, store_logo_url: '' })} className="p-2 bg-red-500/20 hover:bg-red-500 rounded-lg text-red-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <button type="button" onClick={() => document.getElementById('logo-light-upload')?.click()} className="flex flex-col items-center gap-2 text-zinc-600 hover:text-emerald-400 transition-colors">
                                                            <ImageIcon className="w-6 h-6" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Upload Clair</span>
                                                        </button>
                                                    )}
                                                    <input id="logo-light-upload" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                        const file = e.target.files?.[0]; if (!file) return;
                                                        try {
                                                            const fileExt = file.name.split('.').pop();
                                                            const fileName = `logo-light-${Math.random()}.${fileExt}`;
                                                            const filePath = `store/${fileName}`;
                                                            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
                                                            if (uploadError) throw uploadError;
                                                            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                                            setLocalSettings({ ...localSettings, store_logo_url: publicUrl });
                                                        } catch (error) { console.error('Error:', error); addToast({ type: 'error', message: "Erreur upload." }); }
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Dark Logo */}
                                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                                                <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Logo Thème Sombre</label>
                                                <div className="relative group w-40 h-40 bg-black/40 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden flex items-center justify-center transition-all hover:border-emerald-500/40 shadow-inner">
                                                    {localSettings.store_logo_dark_url ? (
                                                        <>
                                                            <img src={localSettings.store_logo_dark_url} alt="Logo sombre" className="w-full h-full object-contain p-4 drop-shadow-2xl" />
                                                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                                <button type="button" onClick={() => document.getElementById('logo-dark-upload')?.click()} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><Upload className="w-4 h-4" /></button>
                                                                <button type="button" onClick={() => setLocalSettings({ ...localSettings, store_logo_dark_url: '' })} className="p-2 bg-red-500/20 hover:bg-red-500 rounded-lg text-red-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <button type="button" onClick={() => document.getElementById('logo-dark-upload')?.click()} className="flex flex-col items-center gap-2 text-zinc-600 hover:text-emerald-400 transition-colors">
                                                            <ImageIcon className="w-6 h-6" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest">Upload Sombre</span>
                                                        </button>
                                                    )}
                                                    <input id="logo-dark-upload" type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                                        const file = e.target.files?.[0]; if (!file) return;
                                                        try {
                                                            const fileExt = file.name.split('.').pop();
                                                            const fileName = `logo-dark-${Math.random()}.${fileExt}`;
                                                            const filePath = `store/${fileName}`;
                                                            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file);
                                                            if (uploadError) throw uploadError;
                                                            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                                            setLocalSettings({ ...localSettings, store_logo_dark_url: publicUrl });
                                                        } catch (error) { console.error('Error:', error); addToast({ type: 'error', message: "Erreur upload." }); }
                                                    }} />
                                                </div>
                                            </div>
                                            <p className="mt-2 text-[10px] text-zinc-600 leading-relaxed italic text-center">
                                                Utilisez des logos transparents (PNG/SVG) pour un résultat optimal.
                                            </p>
                                        </div>

                                        {/* Details Section */}
                                        <div className="space-y-8 bg-white/[0.01] border border-white/[0.03] p-8 rounded-3xl">
                                            <div>
                                                <label className={LABEL}>
                                                    <Store className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                    Nom de la boutique
                                                </label>
                                                <input
                                                    value={localSettings.store_name}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, store_name: e.target.value })}
                                                    className={`${INPUT} text-lg font-bold`}
                                                    placeholder="Mon Dispensaire Green"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className={LABEL}>
                                                        <MapPin className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                        Adresse Civique / Coordonnées GPS
                                                    </label>
                                                    <input
                                                        value={localSettings.store_address}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, store_address: e.target.value })}
                                                        className={INPUT}
                                                        placeholder="12 rue de la Source, 75000 Paris"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>
                                                        <MapPin className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                        Ville (White-Label)
                                                    </label>
                                                    <input
                                                        value={localSettings.store_city || ''}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, store_city: e.target.value })}
                                                        className={INPUT}
                                                        placeholder="Paris"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className={LABEL}>
                                                        <Mail className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                        Contact E-mail
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={localSettings.store_email || ''}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, store_email: e.target.value })}
                                                        className={INPUT}
                                                        placeholder="contact@mondispensaire.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>
                                                        <Phone className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                        Téléphone
                                                    </label>
                                                    <input
                                                        value={localSettings.store_phone}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, store_phone: e.target.value })}
                                                        className={INPUT}
                                                        placeholder="01 23 45 67 89"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className={LABEL}>
                                                        <FileText className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                        N° SIRET (Facture)
                                                    </label>
                                                    <input
                                                        value={localSettings.store_siret || ''}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, store_siret: e.target.value })}
                                                        className={INPUT}
                                                        placeholder="123 456 789 00012"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>
                                                        <Shield className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                        N° TVA Intracommunautaire
                                                    </label>
                                                    <input
                                                        value={localSettings.store_tva_intra || ''}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, store_tva_intra: e.target.value })}
                                                        className={INPUT}
                                                        placeholder="FR 12 345678901"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className={LABEL}>
                                                    <Clock className="w-4 h-4 mr-2 inline-block text-zinc-400" />
                                                    Horaires d'ouverture
                                                </label>
                                                <input
                                                    value={localSettings.store_hours}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, store_hours: e.target.value })}
                                                    className={INPUT}
                                                    placeholder="Lun–Sam 10h–20h"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-pink-400/10 flex items-center justify-center">
                                            <MessageSquare className="w-6 h-6 text-pink-400" />
                                        </div>
                                        <h2 className="text-xl font-black text-white">Réseaux Sociaux</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={LABEL}>Profil Instagram (URL)</label>
                                            <input
                                                type="url"
                                                value={localSettings.social_instagram}
                                                onChange={(e) => setLocalSettings({ ...localSettings, social_instagram: e.target.value })}
                                                className={INPUT}
                                                placeholder="https://instagram.com/ma_boutique"
                                            />
                                        </div>
                                        <div>
                                            <label className={LABEL}>Page Facebook (URL)</label>
                                            <input
                                                type="url"
                                                value={localSettings.social_facebook}
                                                onChange={(e) => setLocalSettings({ ...localSettings, social_facebook: e.target.value })}
                                                className={INPUT}
                                                placeholder="https://facebook.com/ma_page"
                                            />
                                        </div>
                                        <div>
                                            <label className={LABEL}>Profil Twitter / X (URL)</label>
                                            <input
                                                type="url"
                                                value={localSettings.social_twitter}
                                                onChange={(e) => setLocalSettings({ ...localSettings, social_twitter: e.target.value })}
                                                className={INPUT}
                                                placeholder="https://twitter.com/ma_boutique"
                                            />
                                        </div>
                                        <div>
                                            <label className={LABEL}>Profil TikTok (URL)</label>
                                            <input
                                                type="url"
                                                value={localSettings.social_tiktok}
                                                onChange={(e) => setLocalSettings({ ...localSettings, social_tiktok: e.target.value })}
                                                className={INPUT}
                                                placeholder="https://tiktok.com/@ma_boutique"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- DESIGN TAB --- */}
                        {activeTab === 'design' && (
                            <div className="space-y-6">

                                {/* --- THEME COLORS --- */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                            <Palette className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Couleurs du Thème</h2>
                                            <p className="text-xs text-zinc-500">Personnalisez l'esthétique générale de la boutique.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="space-y-3 p-5 bg-white/[0.02] rounded-3xl border border-white/[0.05]">
                                            <label className={LABEL}>Couleur Primaire (Accent)</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative group overflow-hidden rounded-xl w-14 h-14 border-2 border-white/10 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={localSettings.theme_color_primary || '#10B981'}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, theme_color_primary: e.target.value })}
                                                        className="absolute -inset-4 w-24 h-24 p-0 m-0 cursor-pointer opacity-100"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={localSettings.theme_color_primary || '#10B981'}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, theme_color_primary: e.target.value })}
                                                    className={INPUT}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3 p-5 bg-white/[0.02] rounded-3xl border border-white/[0.05]">
                                            <label className={LABEL}>Couleur Néon (Actions)</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative group overflow-hidden rounded-xl w-14 h-14 border-2 border-white/10 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={localSettings.theme_color_neon || '#39FF14'}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, theme_color_neon: e.target.value })}
                                                        className="absolute -inset-4 w-24 h-24 p-0 m-0 cursor-pointer opacity-100"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={localSettings.theme_color_neon || '#39FF14'}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, theme_color_neon: e.target.value })}
                                                    className={INPUT}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3 p-5 bg-white/[0.02] rounded-3xl border border-white/[0.05]">
                                            <label className={LABEL}>Couleur Fond (Dark)</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative group overflow-hidden rounded-xl w-14 h-14 border-2 border-white/10 shrink-0">
                                                    <input
                                                        type="color"
                                                        value={localSettings.theme_color_dark || '#020408'}
                                                        onChange={(e) => setLocalSettings({ ...localSettings, theme_color_dark: e.target.value })}
                                                        className="absolute -inset-4 w-24 h-24 p-0 m-0 cursor-pointer opacity-100"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={localSettings.theme_color_dark || '#020408'}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, theme_color_dark: e.target.value })}
                                                    className={INPUT}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* --- TYPOGRAPHY --- */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                                            <Type className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Typographie</h2>
                                            <p className="text-xs text-zinc-500">Configurez la police principale et vos tailles de titres.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="col-span-full space-y-3">
                                            <label className={LABEL}>Police de titres (Doit être importée dans CSS)</label>
                                            <input
                                                type="text"
                                                value={localSettings.font_heading || 'Inter'}
                                                onChange={(e) => setLocalSettings({ ...localSettings, font_heading: e.target.value })}
                                                className={INPUT}
                                                placeholder="ex: Inter, Outfit, Bodoni Moda..."
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className={LABEL}>Taille H1 (px)</label>
                                            <input
                                                type="number"
                                                value={localSettings.font_heading_size_h1 || 48}
                                                onChange={(e) => setLocalSettings({ ...localSettings, font_heading_size_h1: parseInt(e.target.value) || 48 })}
                                                className={INPUT}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className={LABEL}>Taille H2 (px)</label>
                                            <input
                                                type="number"
                                                value={localSettings.font_heading_size_h2 || 36}
                                                onChange={(e) => setLocalSettings({ ...localSettings, font_heading_size_h2: parseInt(e.target.value) || 36 })}
                                                className={INPUT}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className={LABEL}>Taille H3 (px)</label>
                                            <input
                                                type="number"
                                                value={localSettings.font_heading_size_h3 || 30}
                                                onChange={(e) => setLocalSettings({ ...localSettings, font_heading_size_h3: parseInt(e.target.value) || 30 })}
                                                className={INPUT}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className={LABEL}>Taille H4 (px)</label>
                                            <input
                                                type="number"
                                                value={localSettings.font_heading_size_h4 || 24}
                                                onChange={(e) => setLocalSettings({ ...localSettings, font_heading_size_h4: parseInt(e.target.value) || 24 })}
                                                className={INPUT}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className={LABEL}>Taille H5 (px)</label>
                                            <input
                                                type="number"
                                                value={localSettings.font_heading_size_h5 || 20}
                                                onChange={(e) => setLocalSettings({ ...localSettings, font_heading_size_h5: parseInt(e.target.value) || 20 })}
                                                className={INPUT}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className={LABEL}>Taille H6 (px)</label>
                                            <input
                                                type="number"
                                                value={localSettings.font_heading_size_h6 || 18}
                                                onChange={(e) => setLocalSettings({ ...localSettings, font_heading_size_h6: parseInt(e.target.value) || 18 })}
                                                className={INPUT}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                                <Eye className="w-6 h-6 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-white">Bannière & Ticker</h2>
                                                <p className="text-xs text-zinc-500">Messages défilants en haut du site.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={localSettings.banner_enabled}
                                                onChange={(e) => setLocalSettings({ ...localSettings, banner_enabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-black"></div>
                                        </label>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className={LABEL}>Texte Principal</label>
                                            <input
                                                value={localSettings.banner_text}
                                                onChange={(e) => setLocalSettings({ ...localSettings, banner_text: e.target.value })}
                                                className={INPUT}
                                                placeholder="✦ Bienvenue dans votre boutique — Livraison Express en 30min ✦"
                                            />
                                        </div>

                                        <div className="pt-6 border-t border-white/[0.05]">
                                            <label className={LABEL}>Messages secondaires du Ticker</label>
                                            <div className="space-y-3 mb-4">
                                                {(localSettings.ticker_messages || []).map((msg, idx) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        key={idx}
                                                        className="flex gap-3"
                                                    >
                                                        <input
                                                            value={msg}
                                                            onChange={(e) => {
                                                                const newMsgs = [...localSettings.ticker_messages];
                                                                newMsgs[idx] = e.target.value;
                                                                setLocalSettings({ ...localSettings, ticker_messages: newMsgs });
                                                            }}
                                                            className={INPUT}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newMsgs = localSettings.ticker_messages.filter((_, i) => i !== idx);
                                                                setLocalSettings({ ...localSettings, ticker_messages: newMsgs });
                                                            }}
                                                            className="p-3.5 text-zinc-600 hover:text-red-400 bg-white/[0.03] hover:bg-red-400/10 rounded-2xl transition-all"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLocalSettings({
                                                        ...localSettings,
                                                        ticker_messages: [...(localSettings.ticker_messages || []), "✦ Nouveau Message ✦"]
                                                    });
                                                }}
                                                className="group flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-emerald-500 hover:text-black"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Ajouter au ticker
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-pink-400/10 flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-pink-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Fond d'écran POS</h2>
                                            <p className="text-xs text-zinc-500">Image d'accueil du point de vente.</p>
                                        </div>
                                    </div>

                                    <div className="relative group w-full h-48 bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-3xl overflow-hidden flex items-center justify-center transition-all hover:border-emerald-500/40 shadow-inner">
                                        {localSettings.pos_background_url ? (
                                            <>
                                                <img
                                                    src={localSettings.pos_background_url}
                                                    alt="POS Background"
                                                    className="w-full h-full object-cover opacity-60"
                                                />
                                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                                                    {isSaving ? (
                                                        <div className="flex flex-col items-center gap-3">
                                                            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white">Upload en cours...</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => document.getElementById('pos-bg-upload')?.click()}
                                                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                                Changer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setLocalSettings({ ...localSettings, pos_background_url: '/images/hero-bg-shop.png' })}
                                                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500 rounded-xl text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                                Réinitialiser
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() => document.getElementById('pos-bg-upload')?.click()}
                                                className="flex flex-col items-center gap-4 text-zinc-600 hover:text-emerald-400 transition-colors disabled:opacity-50"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <RefreshCw className="w-8 h-8 animate-spin" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Upload en cours...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 group-hover:scale-110 transition-all">
                                                            <ImageIcon className="w-8 h-8" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Choisir un fond d'écran</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        <input
                                            id="pos-bg-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                // 2MB Limit
                                                const MAX_SIZE = 4 * 1024 * 1024;
                                                if (file.size > MAX_SIZE) {
                                                    addToast({ type: 'error', message: "L'image est trop volumineuse (max 4 Mo). Veuillez compresser votre image." });
                                                    return;
                                                }

                                                setIsSaving(true);
                                                try {
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `pos-bg-${Math.random()}.${fileExt}`;
                                                    const filePath = `store/${fileName}`;

                                                    const { error: uploadError } = await supabase.storage
                                                        .from('product-images')
                                                        .upload(filePath, file, {
                                                            cacheControl: '3600',
                                                            upsert: false
                                                        });

                                                    if (uploadError) throw uploadError;

                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from('product-images')
                                                        .getPublicUrl(filePath);

                                                    setLocalSettings({ ...localSettings, pos_background_url: publicUrl });
                                                } catch (error: any) {
                                                    console.error('Error uploading POS background:', error);
                                                    if (error.message?.includes('maximum allowed size')) {
                                                        addToast({ type: 'error', message: "L'image dépasse la taille maximale autorisée par le serveur. Essayez une image plus petite." });
                                                    } else {
                                                        addToast({ type: 'error', message: "Erreur lors de l'upload : " + (error.message || 'Erreur inconnue') });
                                                    }
                                                } finally {
                                                    setIsSaving(false);
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="mt-4 text-[10px] text-zinc-600 leading-relaxed italic">
                                        Format recommandé : 1920x1080px (Paysage). Cette image sera affichée en fond sur l'écran d'identification client du POS.
                                    </p>
                                </div>

                                {/* --- HERO BACKGROUNDS CARD --- */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-400/10 flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Images de fond & Heroes</h2>
                                            <p className="text-xs text-zinc-500">Personnalisez les images d'arrière-plan de chaque section du site.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {([
                                            { key: 'hero_bg_url', label: 'Hero principal (Shop & Login)', defaultVal: '/images/hero-bg-shop.png', uploadId: 'hero-bg-upload' },
                                            { key: 'home_hero_bg_url', label: 'Hero Homepage', defaultVal: '/images/hero_new.png', uploadId: 'home-hero-upload' },
                                            { key: 'home_section_bg_url', label: 'Section Homepage (image secondaire)', defaultVal: '/images/solution-hero-bg.png', uploadId: 'home-section-upload' },
                                            { key: 'products_hero_bg_url', label: 'Hero Catalogue / Produits', defaultVal: '/images/presentation.png', uploadId: 'products-hero-upload' },
                                            { key: 'home_quality_bg_url', label: 'Section Qualité (Homepage)', defaultVal: '/images/quality-hero-bg.png', uploadId: 'home-quality-upload' },
                                            { key: 'budtender_hero_bg_url', label: 'Hero Assistant IA', defaultVal: '/images/budtender_hero_bg.png', uploadId: 'budtender-hero-upload' },
                                            { key: 'contact_bg_url', label: 'Fond page Contact', defaultVal: '/images/lifestyle-relax.png', uploadId: 'contact-bg-upload' },
                                        ] as { key: keyof typeof localSettings; label: string; defaultVal: string; uploadId: string }[]).map((item) => {
                                            const currentUrl = (localSettings[item.key] as string) || item.defaultVal;
                                            return (
                                                <div key={item.key} className="space-y-3 p-5 bg-white/[0.02] rounded-3xl border border-white/[0.05]">
                                                    <label className={LABEL}>{item.label}</label>
                                                    <div className="relative group w-full h-28 bg-zinc-950/50 border border-white/10 rounded-2xl overflow-hidden">
                                                        <img
                                                            src={currentUrl}
                                                            alt={item.label}
                                                            className="w-full h-full object-cover opacity-60"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => document.getElementById(item.uploadId)?.click()}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                <Upload className="w-3 h-3" />
                                                                Changer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setLocalSettings({ ...localSettings, [item.key]: item.defaultVal })}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500 rounded-lg text-red-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                <RotateCcw className="w-3 h-3" />
                                                                Reset
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        id={item.uploadId}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const MAX_SIZE = 4 * 1024 * 1024;
                                                            if (file.size > MAX_SIZE) {
                                                                addToast({ type: 'error', message: 'Image trop volumineuse (max 4 Mo).' });
                                                                return;
                                                            }
                                                            try {
                                                                const ext = file.name.split('.').pop();
                                                                const filePath = `store/${item.key}-${Math.random().toString(36).slice(2)}.${ext}`;
                                                                const { error: upErr } = await supabase.storage.from('product-images').upload(filePath, file, { cacheControl: '3600', upsert: false });
                                                                if (upErr) throw upErr;
                                                                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                                                setLocalSettings({ ...localSettings, [item.key]: publicUrl });
                                                            } catch (err: any) {
                                                                console.error('Upload error:', err);
                                                                addToast({ type: 'error', message: 'Erreur upload : ' + (err.message || 'Erreur inconnue') });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* --- SPLASH SCREEN --- */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center">
                                            <Clapperboard className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Écran de démarrage</h2>
                                            <p className="text-xs text-zinc-500">Splash affiché au premier chargement (une fois par navigateur).</p>
                                        </div>
                                    </div>

                                    {/* Toggle activer/désactiver */}
                                    <div className="flex items-center justify-between p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05] mb-6">
                                        <div className="flex items-center gap-3">
                                            <Power className="w-4 h-4 text-zinc-400" />
                                            <div>
                                                <p className="text-sm font-bold text-white">Activer l'écran de démarrage</p>
                                                <p className="text-[10px] text-zinc-500">Affiche le splash à chaque nouveau visiteur.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setLocalSettings({ ...localSettings, splash_enabled: !localSettings.splash_enabled })}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${localSettings.splash_enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${localSettings.splash_enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {/* Type de média */}
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Type de média</label>
                                        <div className="flex gap-3">
                                            {[
                                                { value: 'video', label: 'Vidéo', icon: Video },
                                                { value: 'image', label: 'Image', icon: ImageIcon },
                                            ].map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => setLocalSettings({ ...localSettings, splash_media_type: value as 'video' | 'image' })}
                                                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-bold transition-all ${localSettings.splash_media_type === value
                                                        ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                                                        : 'bg-white/[0.02] border-white/[0.05] text-zinc-500 hover:border-zinc-600'}`}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* URL + upload */}
                                    <div className="space-y-3 mb-6">
                                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                            {localSettings.splash_media_type === 'video' ? 'URL de la vidéo (.mp4)' : "URL de l'image"}
                                        </label>
                                        <input
                                            type="text"
                                            value={localSettings.splash_media_url}
                                            onChange={(e) => setLocalSettings({ ...localSettings, splash_media_url: e.target.value })}
                                            placeholder={localSettings.splash_media_type === 'video' ? '/splash.mp4' : 'https://...'}
                                            className="w-full bg-zinc-900 border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400/40"
                                        />
                                        {localSettings.splash_media_type === 'image' ? (
                                            <div>
                                                <input
                                                    id="splash-img-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const MAX_SIZE = 4 * 1024 * 1024;
                                                        if (file.size > MAX_SIZE) {
                                                            addToast({ type: 'error', message: 'Image trop volumineuse (max 4 Mo).' });
                                                            return;
                                                        }
                                                        try {
                                                            const ext = file.name.split('.').pop();
                                                            const filePath = `store/splash-${Math.random().toString(36).slice(2)}.${ext}`;
                                                            const { error: upErr } = await supabase.storage
                                                                .from('product-images')
                                                                .upload(filePath, file, { cacheControl: '3600', upsert: false });
                                                            if (upErr) throw upErr;
                                                            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
                                                            setLocalSettings({ ...localSettings, splash_media_url: publicUrl });
                                                        } catch (err: any) {
                                                            addToast({ type: 'error', message: 'Erreur upload : ' + (err.message || 'Erreur inconnue') });
                                                        }
                                                    }}
                                                />
                                                <label
                                                    htmlFor="splash-img-upload"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition-colors"
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    Uploader une image
                                                </label>
                                            </div>
                                        ) : (
                                            <p className="flex items-center gap-2 text-[11px] text-zinc-500">
                                                <Info className="w-3.5 h-3.5 shrink-0" />
                                                Collez l'URL d'un fichier .mp4 accessible publiquement (ex : /splash.mp4 pour un fichier dans /public).
                                            </p>
                                        )}
                                    </div>

                                    {/* Aperçu */}
                                    {localSettings.splash_media_url && (
                                        <div className="rounded-2xl overflow-hidden border border-white/[0.05] bg-black flex items-center justify-center max-h-40">
                                            {localSettings.splash_media_type === 'image' ? (
                                                <img
                                                    src={localSettings.splash_media_url}
                                                    alt="Aperçu splash"
                                                    className="max-h-40 w-auto object-contain"
                                                />
                                            ) : (
                                                <video
                                                    src={localSettings.splash_media_url}
                                                    muted
                                                    playsInline
                                                    className="max-h-40 w-auto object-contain"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- DELIVERY TAB --- */}
                        {activeTab === 'delivery' && (
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">Logistique & Livraison</h2>
                                        <p className="text-xs text-zinc-500">Configurez les frais de port et la gratuité.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="p-6 bg-white/[0.02] rounded-[2rem] border border-white/[0.05] space-y-4">
                                        <label className={LABEL}>Frais de base (€)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={localSettings.delivery_fee}
                                                onChange={(e) => setLocalSettings({ ...localSettings, delivery_fee: parseFloat(e.target.value) || 0 })}
                                                className={`${INPUT} text-lg font-bold pl-12`}
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</div>
                                        </div>
                                        <p className="text-[10px] text-zinc-600 px-1">Frais fixes appliqués par défaut.</p>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] rounded-[2rem] border border-white/[0.05] space-y-4">
                                        <label className={LABEL}>Livraison Offerte dès (€)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="1"
                                                value={localSettings.delivery_free_threshold}
                                                onChange={(e) => setLocalSettings({ ...localSettings, delivery_free_threshold: parseInt(e.target.value) || 0 })}
                                                className={`${INPUT} text-lg font-bold pl-12`}
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</div>
                                        </div>
                                        <p className="text-[10px] text-emerald-400/70 font-bold px-1 uppercase tracking-widest">
                                            Actif : Gratuit à partir de {localSettings.delivery_free_threshold}€
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- FEATURES TAB --- */}
                        {activeTab === 'features' && (
                            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-400/10 flex items-center justify-center">
                                        <Plus className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">Modules & Expérience Client</h2>
                                        <p className="text-xs text-zinc-500">Activez ou désactivez les fonctionnalités intelligentes.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        { id: 'search_enabled', label: 'Recherche IA', desc: 'Active la barre de recherche intelligente.', icon: Search },
                                        { id: 'loyalty_program_enabled', label: 'Programme Fidélité', desc: 'Active le programme de fidélité, cartes et points de récompense.', icon: Coins },
                                        { id: 'subscriptions_enabled', label: 'Abonnements', desc: 'Permet les livraisons récurrentes.', icon: RefreshCw },
                                        { id: 'home_reviews_enabled', label: 'Avis Clients', desc: 'Affiche le carrousel d\'avis.', icon: Star },
                                        { id: 'home_best_sellers_enabled', label: 'Top Ventes', desc: 'Section meilleures ventes.', icon: TrendingUp },
                                        { id: 'empty_cart_suggestions_enabled', label: 'Suggestions', desc: 'Conseils produit si panier vide.', icon: Award },
                                        { id: 'age_gate_enabled', label: 'Vérif. d\'âge', desc: 'Affiche un écran de vérification d\'âge (18+) à l\'entrée du site.', icon: Shield },
                                    ].map((feat) => {
                                        const Icon = feat.icon;
                                        const enabled = (localSettings as any)[feat.id];
                                        return (
                                            <button
                                                key={feat.id}
                                                onClick={() => setLocalSettings({ ...localSettings, [feat.id]: !enabled })}
                                                className={`flex flex-col text-left p-6 rounded-[2rem] border transition-all ${enabled
                                                    ? 'bg-purple-500/10 border-purple-500/20 shadow-[0_10px_30px_rgba(168,85,247,0.1)]'
                                                    : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl mb-4 flex items-center justify-center ${enabled ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-sm font-black text-white mb-2">{feat.label}</h3>
                                                <p className="text-[10px] text-zinc-500 leading-normal flex-1">{feat.desc}</p>
                                                <div className="mt-4 flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${enabled ? 'text-emerald-400' : 'text-zinc-700'}`}>
                                                        {enabled ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* --- CONTENU & WHITE-LABEL TAB --- */}
                        {activeTab === 'content' && (
                            <div className="space-y-6">
                                {/* Card 1: Identity & Tagline */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-400/10 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-orange-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Identité & Tagline</h2>
                                            <p className="text-xs text-zinc-500">Personnalisez le message, le secteur et la description SEO de votre boutique.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className={LABEL}>Accroche / Tagline (affiché dans le header)</label>
                                            <input
                                                value={localSettings.store_tagline}
                                                onChange={(e) => setLocalSettings({ ...localSettings, store_tagline: e.target.value })}
                                                className={INPUT}
                                                placeholder="Premium CBD Experiences"
                                            />
                                        </div>
                                        <div>
                                            <label className={LABEL}>Description SEO (meta description, og:description)</label>
                                            <textarea
                                                value={localSettings.store_description}
                                                onChange={(e) => setLocalSettings({ ...localSettings, store_description: e.target.value })}
                                                className={`${INPUT} resize-none`}
                                                rows={3}
                                                placeholder="Votre boutique de référence — produits premium, conseils experts..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className={LABEL}>Secteur d'activité (contexte IA)</label>
                                                <input
                                                    value={localSettings.store_sector}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, store_sector: e.target.value })}
                                                    className={INPUT}
                                                    placeholder="Ex: CBD, Alimentation Bio, Cosmétiques, Thé & Infusions..."
                                                />
                                            </div>
                                            <div>
                                                <label className={LABEL}>Gamme Signature / Molécule Directrice</label>
                                                <input
                                                    value={localSettings.store_brand_range || ''}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, store_brand_range: e.target.value })}
                                                    className={INPUT}
                                                    placeholder="Ex: N10, H4CBD, Premium, etc."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Homepage Categories */}


                                {/* Card 3: Invoice & AI */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10 space-y-8">
                                    {/* Invoice section */}
                                    <div>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 flex items-center justify-center">
                                                <Shield className="w-6 h-6 text-amber-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-white">Facturation</h2>
                                                <p className="text-xs text-zinc-500">Taux de TVA et mentions légales sur les factures PDF.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className={LABEL}>Taux de TVA (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="100"
                                                    value={localSettings.invoice_tax_rate}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, invoice_tax_rate: parseFloat(e.target.value) || 0 })}
                                                    className={INPUT}
                                                    placeholder="20"
                                                />
                                            </div>
                                            <div>
                                                <label className={LABEL}>Mentions légales facture (une ligne par retour à la ligne)</label>
                                                <textarea
                                                    value={localSettings.invoice_legal_text}
                                                    onChange={(e) => setLocalSettings({ ...localSettings, invoice_legal_text: e.target.value })}
                                                    className={`${INPUT} resize-none`}
                                                    rows={4}
                                                    placeholder="Produits conformes à la réglementation en vigueur."
                                                />
                                                <p className="text-[10px] text-zinc-600 mt-2 ml-1">La ligne SIRET/TVA est générée automatiquement. Ce champ remplace les mentions intermédiaires.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/[0.05] pt-8">
                                        {/* AI Base Prompt section */}
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                                <MessageSquare className="w-6 h-6 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-white">Prompt de base de l'IA</h2>
                                                <p className="text-xs text-zinc-500">Instructions injectées en priorité dans tous les prompts BudTender. Laissez vide pour conserver le comportement par défaut.</p>
                                            </div>
                                        </div>
                                        <textarea
                                            value={localSettings.budtender_base_prompt}
                                            onChange={(e) => setLocalSettings({ ...localSettings, budtender_base_prompt: e.target.value })}
                                            className={`${INPUT} resize-none font-mono text-xs`}
                                            rows={6}
                                            placeholder="Ex: Tu es un expert en thé et infusions biologiques de [Boutique]. Tu conseilles uniquement les produits de notre gamme..."
                                        />
                                        <p className="text-[10px] text-zinc-600 mt-2 ml-1">Ce texte est ajouté en fin de prompt avec la mention INSTRUCTIONS SPÉCIFIQUES (priorité absolue).</p>
                                    </div>
                                </div>


                            </div>
                        )}

                        {/* --- PAIEMENT TAB --- */}
                        {activeTab === 'payment' && (
                            <div className="space-y-6">
                                {/* Card: Stripe Configuration */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                            <CreditCard className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Stripe</h2>
                                            <p className="text-xs text-zinc-500">Configurez votre intégration de paiement Stripe.</p>
                                        </div>
                                        <div className="ml-auto">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${localSettings.stripe_enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {localSettings.stripe_enabled ? '● Activé' : '○ Désactivé'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Enable Stripe toggle */}
                                        <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                                            <div>
                                                <p className="text-sm font-bold text-white">Activer le paiement Stripe</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">Remplace la simulation par le formulaire Stripe Elements en production</p>
                                            </div>
                                            <button
                                                onClick={() => setLocalSettings({ ...localSettings, stripe_enabled: !localSettings.stripe_enabled })}
                                                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                            >
                                                {localSettings.stripe_enabled
                                                    ? <ToggleRight className="w-8 h-8" />
                                                    : <ToggleLeft className="w-8 h-8 text-zinc-600" />
                                                }
                                            </button>
                                        </div>

                                        {/* Public key */}
                                        <div>
                                            <label className={LABEL}>Clé publique Stripe (pk_test_… ou pk_live_…)</label>
                                            <input
                                                value={localSettings.stripe_public_key || ''}
                                                onChange={(e) => setLocalSettings({ ...localSettings, stripe_public_key: e.target.value })}
                                                className={INPUT}
                                                placeholder="pk_test_51..."
                                                spellCheck={false}
                                            />
                                        </div>

                                        {/* Test mode toggle */}
                                        <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                                            <div>
                                                <p className="text-sm font-bold text-white">Mode Test</p>
                                                <p className="text-xs text-zinc-500 mt-0.5">Utilisez les clés de test Stripe pour vos développements et tests</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${localSettings.stripe_test_mode ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {localSettings.stripe_test_mode ? 'TEST' : 'LIVE'}
                                                </span>
                                                <button
                                                    onClick={() => setLocalSettings({ ...localSettings, stripe_test_mode: !localSettings.stripe_test_mode })}
                                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                                >
                                                    {localSettings.stripe_test_mode
                                                        ? <ToggleRight className="w-8 h-8 text-amber-400" />
                                                        : <ToggleLeft className="w-8 h-8 text-zinc-600" />
                                                    }
                                                </button>
                                            </div>
                                        </div>

                                        {/* Info note */}
                                        <div className="flex gap-3 p-4 bg-blue-500/[0.08] border border-blue-500/[0.15] rounded-2xl">
                                            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-zinc-400 space-y-1">
                                                <p className="text-blue-300 font-bold">Configuration côté serveur requise</p>
                                                <p>La clé secrète <code className="bg-white/10 px-1 rounded text-blue-200">STRIPE_SECRET_KEY</code> et <code className="bg-white/10 px-1 rounded text-blue-200">STRIPE_WEBHOOK_SECRET</code> doivent être configurées dans les secrets Supabase :</p>
                                                <div className="mt-2 bg-black/40 rounded-xl p-3 font-mono text-[11px] text-zinc-300 space-y-1">
                                                    <p>npx supabase secrets set STRIPE_SECRET_KEY=sk_test_…</p>
                                                    <p>npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card: Test cards cheat sheet */}
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 lg:p-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                            <Shield className="w-6 h-6 text-amber-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">Cartes de test</h2>
                                            <p className="text-xs text-zinc-500">Numéros à utiliser en mode TEST — date future quelconque, CVC 3 chiffres</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { number: '4242 4242 4242 4242', label: 'Succès', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                                            { number: '4000 0000 0000 0002', label: 'Refusé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                                            { number: '4000 0025 0000 3155', label: '3D Secure requis', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                                        ].map(({ number, label, color, bg }) => (
                                            <div key={number} className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border ${bg}`}>
                                                <code className="font-mono text-sm text-white tracking-wider">{number}</code>
                                                <span className={`text-xs font-bold ${color}`}>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}


                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
