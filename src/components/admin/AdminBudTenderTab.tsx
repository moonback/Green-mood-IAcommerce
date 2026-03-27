import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Leaf, Save, CheckCircle, ToggleLeft, ToggleRight, Sliders,
    Clock, Brain, MessageSquare, Zap, Info, Plus, Trash2, X,
    TrendingUp, ThumbsUp, ThumbsDown, Target, Star, Download,
    ChevronDown, ChevronUp, FileText, Volume2, Package, Mic, Gamepad2
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
    PieChart, Pie
} from 'recharts';
import { supabase } from '../../lib/supabase';

import { BudTenderSettings, TECH_ADVISOR_DEFAULTS as BUDTENDER_DEFAULTS } from '../../lib/budtenderSettings';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';

const INPUT =
    'w-full bg-zinc-950/50 border border-zinc-800/80 rounded-2xl px-5 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300 backdrop-blur-md';

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({
    enabled,
    onChange,
}: {
    enabled: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`group relative flex items-center h-8 w-14 rounded-full p-1 transition-all duration-300 ease-in-out ${enabled
                ? 'bg-emerald-500/20 border border-emerald-500/30'
                : 'bg-zinc-800 border border-zinc-700'
                }`}
        >
            <div
                className={`flex h-6 w-6 transform items-center justify-center rounded-full transition-all duration-300 ease-in-out ${enabled
                    ? 'translate-x-6 bg-emerald-500 shadow-[0_0_15px_rgba(57,255,20,0.5)]'
                    : 'translate-x-0 bg-zinc-500'
                    }`}
            >
                {enabled ? (
                    <span className="text-[8px] font-black text-black">ON</span>
                ) : (
                    <span className="text-[8px] font-black text-white">OFF</span>
                )}
            </div>
        </button>
    );
}

function Section({
    icon: Icon,
    title,
    description,
    children,
    badge,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
    children: React.ReactNode;
    badge?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 space-y-8 overflow-hidden transition-all hover:border-white/10"
        >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                <Icon className="w-48 h-48 -rotate-12 translate-x-12 -translate-y-12" />
            </div>

            <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-black/20">
                        <Icon className="w-6 h-6 text-emerald-400 glow-green" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                            {badge && (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">
                                    {badge}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-zinc-500 mt-1 max-w-md">{description}</p>
                    </div>
                </div>
            </div>
            <div className="relative space-y-6 pt-2">{children}</div>
        </motion.div>
    );
}

function SliderField({
    label,
    value,
    min,
    max,
    step,
    unit,
    onChange,
    hint,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (v: number) => void;
    hint?: string;
}) {
    return (
        <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-[0.2em]">
                    {label}
                </label>
                <div className="flex items-baseline gap-1 bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-1">
                    <span className="text-sm font-black text-emerald-400 glow-green">
                        {value}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-medium">{unit}</span>
                </div>
            </div>
            <div className="relative flex items-center h-6">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500 focus:outline-none active:scale-[0.98] transition-all"
                />
                <div
                    className="absolute h-1.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500 rounded-full pointer-events-none"
                    style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                />
            </div>
            {hint && <p className="text-[11px] text-zinc-600 italic leading-relaxed">{hint}</p>}
        </div>
    );
}


// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminBudTenderTab() {
    const { settings: globalSettings, updateSettingsInStore } = useSettingsStore();
    const { addToast } = useToastStore();
    const [settings, setSettings] = useState<BudTenderSettings>(BUDTENDER_DEFAULTS);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'memory' | 'quiz' | 'stats' | 'help'>('general');
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [stats, setStats] = useState({
        interactionTypes: [] as { name: string; value: number }[],
        topQuestions: [] as { question: string; count: number }[],
        satisfaction: { positive: 0, negative: 0, score: 0 },
        conversion: { rate: 0, buyersCount: 0, quizCount: 0, voiceCount: 0, textCount: 0 }
    });

    // Fine-tuning: interaction drilldown
    interface InteractionRow {
        id: string;
        user_message: string | null;
        ai_response: string | null;
        feedback: 'positive' | 'negative' | null;
        feedback_reason: string | null;
        is_gold_standard: boolean;
        admin_note: string | null;
        created_at: string;
    }
    const [interactions, setInteractions] = useState<InteractionRow[]>([]);
    const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
    const [filterFeedback, setFilterFeedback] = useState<'all' | 'positive' | 'negative'>('all');
    const [showGoldOnly, setShowGoldOnly] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Load settings from Supabase on mount
    useEffect(() => {
        const load = async () => {
            try {
                // 1. Try Supabase
                const { data } = await supabase
                    .from('store_settings')
                    .select('value')
                    .eq('key', 'budtender_config')
                    .maybeSingle();

                if (data?.value) setSettings({ ...BUDTENDER_DEFAULTS, ...data.value });
            } catch (err) {
                console.error('[AdminBudTenderTab] load error:', err);
            }
        };
        load();
    }, []);

    // Load stats + interactions when switching to stats tab
    useEffect(() => {
        if (activeTab === 'stats') {
            loadStats();
            loadInteractions();
        }
    }, [activeTab]);

    // Reload interactions when filters change
    useEffect(() => {
        if (activeTab === 'stats') loadInteractions();
    }, [filterFeedback, showGoldOnly]);

    const loadStats = async () => {
        setIsLoadingStats(true);
        try {
            const since = new Date();
            since.setDate(since.getDate() - 30); // Last 30 days
            const sinceISO = since.toISOString();

            const [
                { data: interactions },
                { data: paidOrders }
            ] = await Promise.all([
                supabase
                    .from('budtender_interactions')
                    .select('*')
                    .gte('created_at', sinceISO),
                supabase
                    .from('orders')
                    .select('user_id')
                    .eq('payment_status', 'paid')
                    .gte('created_at', sinceISO)
            ]);

            if (!interactions) return;

            // 1. Interaction types distribution
            const typeMap = new Map<string, number>();
            const questionsMap = new Map<string, number>();
            let pos = 0;
            let neg = 0;
            let quizCount = 0;
            let voiceCount = 0;
            let textCount = 0;

            interactions.forEach(i => {
                const type = i.interaction_type || 'unknown';
                typeMap.set(type, (typeMap.get(type) ?? 0) + 1);

                if (type === 'question' && i.quiz_answers?.question) {
                    const q = (i.quiz_answers.question as string).trim();
                    if (q.length > 5) {
                        questionsMap.set(q, (questionsMap.get(q) ?? 0) + 1);
                    }
                }

                if (type === 'feedback') {
                    if (i.feedback === 'positive') pos++;
                    if (i.feedback === 'negative') neg++;
                }

                if (type === 'chat_session' || type === 'recommendation' || type === 'voice_session') {
                    quizCount++;
                    if (type === 'voice_session') voiceCount++;
                    else textCount++;
                }
            });

            // 2. Conversion calculation
            const usersWithQuiz = new Set(interactions
                .filter(i => i.interaction_type === 'chat_session' || i.interaction_type === 'recommendation' || i.interaction_type === 'voice_session')
                .map(i => i.user_id)
            );
            const usersWithOrder = new Set(paidOrders?.map(o => o.user_id));
            const buyersCount = Array.from(usersWithQuiz).filter(uid => usersWithOrder.has(uid)).length;

            setStats({
                interactionTypes: Array.from(typeMap.entries()).map(([name, value]) => ({ name, value })),
                topQuestions: Array.from(questionsMap.entries())
                    .map(([question, count]) => ({ question, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5),
                satisfaction: {
                    positive: pos,
                    negative: neg,
                    score: pos + neg > 0 ? Math.round((pos / (pos + neg)) * 100) : 0
                },
                conversion: {
                    rate: quizCount > 0 ? Math.round((buyersCount / quizCount) * 100) : 0,
                    buyersCount,
                    quizCount,
                    voiceCount,
                    textCount
                }
            });
        } catch (err) {
            console.error('[AdminBudTenderTab] loadStats error:', err);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const loadInteractions = async () => {
        setIsLoadingInteractions(true);
        try {
            let query = supabase
                .from('budtender_interactions')
                .select('id, user_message, ai_response, feedback, feedback_reason, is_gold_standard, admin_note, created_at')
                .not('user_message', 'is', null)
                .order('created_at', { ascending: false })
                .limit(5);
            if (filterFeedback !== 'all') query = query.eq('feedback', filterFeedback);
            if (showGoldOnly) query = query.eq('is_gold_standard', true);
            const { data } = await query;
            setInteractions((data as InteractionRow[]) ?? []);
        } catch (err) {
            console.error('[AdminBudTenderTab] loadInteractions error:', err);
        } finally {
            setIsLoadingInteractions(false);
        }
    };

    const toggleGoldStandard = async (row: InteractionRow) => {
        const next = !row.is_gold_standard;
        await supabase.from('budtender_interactions').update({ is_gold_standard: next }).eq('id', row.id);
        setInteractions((prev) => prev.map((r) => r.id === row.id ? { ...r, is_gold_standard: next } : r));
    };

    const saveAdminNote = async (id: string, note: string) => {
        await supabase.from('budtender_interactions').update({ admin_note: note }).eq('id', id);
    };

    const exportGoldStandard = async () => {
        const { data } = await supabase
            .from('budtender_interactions')
            .select('user_message, ai_response, feedback, feedback_reason, created_at')
            .eq('is_gold_standard', true)
            .order('created_at', { ascending: false });
        if (!data || data.length === 0) return;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budtender-training-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const update = (patch: Partial<BudTenderSettings>) => {
        setSettings((prev) => ({ ...prev, ...patch }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Sync the entire configuration to Supabase
            // We use multiple keys: visibility flags and full config
            await Promise.all([
                supabase.from('store_settings').upsert([
                    { key: 'budtender_enabled', value: globalSettings.budtender_voice_enabled, updated_at: new Date().toISOString() },
                    { key: 'budtender_config', value: settings, updated_at: new Date().toISOString() }
                ], { onConflict: 'key' })
            ]);

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[AdminBudTenderTab] save error:', err);
            addToast({ type: 'error', message: 'Erreur lors de la sauvegarde en base de données.' });
        } finally {
            setIsSaving(false);
        }
    };

    const subTabs = [
        { key: 'general', label: 'Général', icon: Gamepad2 },
        { key: 'ai', label: 'IA & OpenRouter', icon: Brain },
        { key: 'memory', label: 'Mémoire', icon: Clock },
        { key: 'quiz', label: 'Quiz & UX', icon: MessageSquare },
        { key: 'stats', label: 'Analytique', icon: Zap },
        { key: 'help', label: 'Aide', icon: Info },
    ] as const;

    return (
        <div className="max-w-12xl mx-auto space-y-12 pb-24">
            {/* ── Sub-Navigation & Global Controls Row ── */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-2 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] shadow-2xl">
                {/* Tabs */}
                <div className="flex flex-wrap items-center gap-2 p-1 bg-black/40 border border-white/5 rounded-3xl">
                    {subTabs.map(({ key, label, icon: Icon }) => {
                        const isActive = activeTab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`relative flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black transition-all duration-500 overflow-hidden ${isActive ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabPill"
                                        className="absolute inset-0 bg-emerald-500 shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <Icon className={`relative z-10 w-4 h-4 ${isActive ? 'text-black' : ''}`} />
                                <span className="relative z-10 tracking-widest uppercase">{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Global Actions */}
                <div className="flex items-center gap-4 bg-black/20 p-2 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 px-6 border-r border-white/10">
                        <Toggle enabled={settings.enabled} onChange={(v) => update({ enabled: v })} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] min-w-[100px] ${settings.enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {settings.enabled ? 'Système Actif' : 'Désactivé'}
                        </span>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="group relative flex items-center gap-3 bg-white text-black font-black text-[10px] px-8 py-3.5 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <span className="relative z-10 flex items-center gap-2 group-hover:text-black transition-colors duration-300 tracking-widest uppercase">
                            {saved ? (
                                <>
                                    <CheckCircle className="w-4 h-4" /> SUCCESS
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> SAUVEGARDER
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                >
                    {/* ── GÉNÉRAL ── */}
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Section icon={Zap} title="Canaux d'Activation" description="Déterminez sur quels points de contact l'IA BudTender intervient.">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-6 bg-zinc-950/40 rounded-3xl border border-white/5 hover:border-emerald-500/20 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                                                <Volume2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Interface Vocale</p>
                                                <p className="text-[11px] text-zinc-500">Mode conversationnel (Gemini Live)</p>
                                            </div>
                                        </div>
                                        <Toggle
                                            enabled={globalSettings.budtender_voice_enabled}
                                            onChange={(v) => updateSettingsInStore({ budtender_voice_enabled: v })}
                                        />
                                    </div>
                                </div>
                            </Section>


                            <Section icon={Volume2} title="Identité Vocale" description="Choisissez la tessiture et le ton pour la synthèse vocale." badge="Voice AI">
                                <div className="space-y-3">
                                    <label className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                        Profil de voix
                                    </label>
                                    <select
                                        value={globalSettings.budtender_voice_name || 'Kore'}
                                        onChange={(e) => updateSettingsInStore({ budtender_voice_name: e.target.value })}
                                        className={INPUT}
                                    >
                                        {FRENCH_VOICES.map((voice) => (
                                            <option key={voice.value} value={voice.value} className="bg-zinc-950 py-2">
                                                {voice.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <Info className="w-4 h-4 text-zinc-500" />
                                        <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                                            Le profil sélectionné définit la personnalité perçue par vos clients lors des appels.
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between p-5 bg-zinc-950/40 rounded-2xl border border-white/5 mt-2">
                                        <div>
                                            <p className="text-sm font-bold text-white">Fermeture automatique par l'IA</p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                Autorise l'IA à terminer la session vocale avec <code className="text-emerald-400/80">close_session()</code>.<br />
                                                Désactivez pour que seul le client puisse raccrocher.
                                            </p>
                                        </div>
                                        <Toggle
                                            enabled={settings.voice_close_session_enabled ?? true}
                                            onChange={(v) => update({ voice_close_session_enabled: v })}
                                        />
                                    </div>
                                </div>
                            </Section>

                            <Section icon={Sliders} title="Widget UX" description="Personnalisez l'interaction visuelle du bouton.">
                                <SliderField
                                    label="Délai d'attention (Nudge)"
                                    value={settings.pulse_delay}
                                    min={0}
                                    max={60}
                                    step={1}
                                    unit="sec"
                                    onChange={(v) => update({ pulse_delay: v })}
                                    hint="Temps d'attente avant que le bouton n'émette une pulsation visuelle pour attirer le client."
                                />
                            </Section>

                            <Section icon={Target} title="Accueil Personnalisé" description="Définissez le premier contact avec vos visiteurs.">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                                Nom de l'Assistant
                                            </label>
                                            <input
                                                type="text"
                                                value={globalSettings.budtender_name || ''}
                                                onChange={(e) => updateSettingsInStore({ budtender_name: e.target.value })}
                                                placeholder="Ex: BudTender, Luna..."
                                                className={INPUT}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                            Message de bienvenue
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={settings.welcome_message}
                                            onChange={(e) => update({ welcome_message: e.target.value })}
                                            className={INPUT + ' resize-none !px-6 !py-5 leading-relaxed'}
                                            placeholder="Bonjour ! Je suis l'IA BudTender..."
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-2 text-emerald-400 font-bold italic">
                                        <Zap className="w-3 h-3" />
                                        Mode dynamique : les utilisateurs connectés reçoivent un message personnalisé basé sur leur prénom.
                                    </div>
                                </div>
                            </Section>
                        </div>
                    )}


                    {/* ── IA & OPENROUTER ── */}
                    {activeTab === 'ai' && (
                        <div className="space-y-8">
                            <Section icon={Brain} title="Moteur Cognitif" description="Configurez le modèle de langage qui anime votre assistant IA." badge="OpenRouter">
                                <div className="flex items-center justify-between p-6 bg-zinc-950/40 rounded-3xl border border-white/5 mb-8">
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase tracking-wider">Activer Intelligence Cloud</p>
                                        <p className="text-[11px] text-zinc-500">Génère des réponses fluides à partir de vos données produits.</p>
                                    </div>
                                    <Toggle enabled={settings.ai_enabled} onChange={(v) => update({ ai_enabled: v })} />
                                </div>

                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${!settings.ai_enabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                                                Architecture du Modèle
                                            </label>
                                            <input
                                                type="text"
                                                value={settings.ai_model}
                                                onChange={(e) => update({ ai_model: e.target.value })}
                                                className={INPUT}
                                                placeholder="Ex: mistralai/mistral-small"
                                            />
                                            <p className="text-[10px] text-zinc-500 font-medium italic">
                                                Supporte Gemini, Claude, Llama et GPT via OpenRouter.
                                            </p>
                                        </div>

                                        <SliderField
                                            label="Créativité (Température)"
                                            value={settings.ai_temperature}
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            unit=""
                                            onChange={(v) => update({ ai_temperature: v })}
                                            hint="Bas : expert & factuel. Haut : créatif & inspirant."
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        <SliderField
                                            label="Amplitude des Réponses"
                                            value={settings.ai_max_tokens}
                                            min={100}
                                            max={2000}
                                            step={50}
                                            unit="tokens"
                                            onChange={(v) => update({ ai_max_tokens: v })}
                                            hint="Limite la longueur pour des réponses percutantes ou détaillées."
                                        />


                                    </div>
                                </div>
                            </Section>

                            <Section icon={FileText} title="Directives Systèmes" description="Personnalisez le comportement sans toucher au code principal.">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                                                Prompt Quiz & Diagnostique
                                            </label>
                                            <span className={`text-[10px] font-mono ${(settings.custom_quiz_prompt ?? '').length > 550 ? 'text-red-400' : 'text-zinc-600'}`}>
                                                {(settings.custom_quiz_prompt ?? '').length}/600
                                            </span>
                                        </div>
                                        <textarea
                                            value={settings.custom_quiz_prompt ?? ''}
                                            onChange={(e) => update({ custom_quiz_prompt: e.target.value })}
                                            rows={8}
                                            maxLength={600}
                                            placeholder="Ex: Privilégie les simulateurs immersifs..."
                                            className={INPUT + ' resize-none font-mono text-[12px] !leading-7 !px-6 !py-5 bg-zinc-950/80'}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">
                                                Instructions Globales (Base Prompt)
                                            </label>
                                            <p className="text-[10px] text-zinc-600 mt-0.5">Priorité absolue. Injecté dans toutes les interactions (Chat & Vocal).</p>
                                        </div>
                                    </div>
                                    <textarea
                                        value={globalSettings.budtender_base_prompt || ''}
                                        onChange={(e) => updateSettingsInStore({ budtender_base_prompt: e.target.value })}
                                        rows={4}
                                        placeholder="Ex: Tu es un expert en machines de loisirs. Ne propose jamais de machines non certifiées..."
                                        className={INPUT + ' resize-none font-mono text-[12px] bg-zinc-950/80'}
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => update({
                                            custom_quiz_prompt: BUDTENDER_DEFAULTS.custom_quiz_prompt,
                                        })}
                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-500 hover:text-white border border-white/5 transition-all"
                                    >
                                        <Clock className="w-3 h-4" /> Restaurer défauts
                                    </button>
                                    <button
                                        onClick={() => update({ custom_quiz_prompt: '' })}
                                        className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-500 hover:text-red-400 border border-white/5 transition-all"
                                    >
                                        <Trash2 className="w-3 h-4" /> Vider
                                    </button>
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* ── MÉMOIRE ── */}
                    {activeTab === 'memory' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Section icon={Clock} title="Mémoire Cognitive" description="Permet à l'IA de se souvenir des préférences et de l'historique client." badge="Database Sync">
                                <div className="flex items-center justify-between p-6 bg-zinc-950/40 rounded-3xl border border-white/5">
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase tracking-wider">Activer Persistance</p>
                                        <p className="text-[11px] text-zinc-500">Active les salutations personnalisées et les rappels.</p>
                                    </div>
                                    <Toggle enabled={settings.memory_enabled} onChange={(v) => update({ memory_enabled: v })} />
                                </div>
                                <div className="flex items-start gap-4 p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                                    <Brain className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        La mémoire utilise les données de commandes réelles pour suggérer des produits adaptés aux cycles d'utilisation du client.
                                    </p>
                                </div>
                            </Section>

                            <Section icon={Zap} title="Seuils de Réapprovisionnement" description="Ajustez les cycles de consommation estimés par catégorie.">
                                <div className={`space-y-6 ${!settings.memory_enabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                                    <SliderField
                                        label="Bornes d'Arcade"
                                        value={settings.threshold_arcade}
                                        min={7}
                                        max={365}
                                        step={1}
                                        unit="jours"
                                        onChange={(v) => update({ threshold_arcade: v })}
                                        hint="Seuil recommandé pour une vérification de routine."
                                    />
                                    <SliderField
                                        label="Flippers & Pinball"
                                        value={settings.threshold_flippers}
                                        min={7}
                                        max={365}
                                        step={1}
                                        unit="jours"
                                        onChange={(v) => update({ threshold_flippers: v })}
                                        hint="Maintenance préventive des éléments mécaniques."
                                    />
                                    <SliderField
                                        label="Autres (Simulateurs…)"
                                        value={settings.threshold_others}
                                        min={7}
                                        max={365}
                                        step={1}
                                        unit="jours"
                                        onChange={(v) => update({ threshold_others: v })}
                                    />
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* ── QUIZ & UX ── */}
                    {activeTab === 'quiz' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Section icon={MessageSquare} title="Dynamique d'Échange" description="Réglez la cadence des bulles de texte.">
                                    <div className="grid grid-cols-3 gap-4">
                                        {(['slow', 'normal', 'fast'] as const).map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => update({ typing_speed: speed })}
                                                className={`group relative py-5 px-4 rounded-[1.5rem] border text-xs font-black transition-all ${settings.typing_speed === speed
                                                    ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(57,255,20,0.2)]'
                                                    : 'bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-xl">
                                                        {speed === 'slow' && '🐢'}
                                                        {speed === 'normal' && '⚖️'}
                                                        {speed === 'fast' && '⚡'}
                                                    </span>
                                                    <span className="uppercase tracking-[0.2em]">{speed === 'slow' ? 'Lent' : speed === 'normal' ? 'Normal' : 'Rapide'}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </Section>

                                <Section icon={Brain} title="Algorithme du Quiz" description="Choisissez la logique de parcours client.">
                                    <div className="grid grid-cols-2 gap-4">
                                        {(['static', 'dynamic'] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={() => update({ quiz_mode: mode })}
                                                className={`group relative py-5 px-6 rounded-[1.5rem] border text-xs font-black transition-all text-left ${settings.quiz_mode === mode
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_25px_rgba(57,255,20,0.1)]'
                                                    : 'bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="uppercase tracking-[0.2em]">{mode === 'static' ? 'Statique' : 'Dynamique AI'}</span>
                                                    <span className="text-[10px] lowercase font-normal opacity-60">
                                                        {mode === 'static' ? 'Parcours balisé' : 'IA Génératrice'}
                                                    </span>
                                                </div>
                                                <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${settings.quiz_mode === mode ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-800'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </Section>
                            </div>

                            <Section icon={Sliders} title="Directives du Diagnostique" description="Configurez les étapes clés du questionnaire." badge="Visual Editor">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {settings.quiz_steps.map((step, sIdx) => (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="group relative bg-zinc-950/80 border border-white/5 rounded-[2rem] p-6 space-y-4 hover:border-emerald-500/30 transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px]">
                                                    {sIdx + 1}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const newSteps = settings.quiz_steps.filter((_, i) => i !== sIdx);
                                                        update({ quiz_steps: newSteps });
                                                    }}
                                                    className="p-2 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <textarea
                                                    value={step.question}
                                                    onChange={(e) => {
                                                        const newSteps = [...settings.quiz_steps];
                                                        newSteps[sIdx].question = e.target.value;
                                                        update({ quiz_steps: newSteps });
                                                    }}
                                                    rows={2}
                                                    className="w-full bg-transparent border-none text-white font-bold text-sm p-0 focus:ring-0 placeholder-zinc-700 focus:placeholder-zinc-500 resize-none"
                                                    placeholder="Question..."
                                                />

                                                <div className="space-y-2">
                                                    {step.options.map((opt, oIdx) => (
                                                        <div key={oIdx} className="flex gap-2 items-center bg-zinc-900/50 rounded-xl p-2 border border-white/5 group/opt transition-colors hover:border-white/10">
                                                            <input
                                                                type="text"
                                                                value={opt.emoji}
                                                                onChange={(e) => {
                                                                    const newSteps = [...settings.quiz_steps];
                                                                    newSteps[sIdx].options[oIdx].emoji = e.target.value;
                                                                    update({ quiz_steps: newSteps });
                                                                }}
                                                                className="w-8 h-8 bg-zinc-950 border-zinc-800 rounded-lg text-center text-sm p-1 placeholder-zinc-700"
                                                                placeholder="💬"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={opt.label}
                                                                onChange={(e) => {
                                                                    const newSteps = [...settings.quiz_steps];
                                                                    newSteps[sIdx].options[oIdx].label = e.target.value;
                                                                    update({ quiz_steps: newSteps });
                                                                }}
                                                                className="flex-1 bg-transparent border-none text-[11px] text-zinc-400 p-0 focus:ring-0 placeholder-zinc-800 font-medium"
                                                                placeholder="Option..."
                                                            />
                                                            {step.options.length > 2 && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newSteps = [...settings.quiz_steps];
                                                                        newSteps[sIdx].options = newSteps[sIdx].options.filter((_, i) => i !== oIdx);
                                                                        update({ quiz_steps: newSteps });
                                                                    }}
                                                                    className="p-1.5 text-zinc-800 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-all"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    <button
                                                        onClick={() => {
                                                            const newSteps = [...settings.quiz_steps];
                                                            newSteps[sIdx].options.push({ label: '', value: `opt_${Date.now()}`, emoji: '❓' });
                                                            update({ quiz_steps: newSteps });
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-800 rounded-xl p-2.5 text-zinc-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-all text-[10px] font-black uppercase tracking-widest mt-2"
                                                    >
                                                        <Plus className="w-3 h-3" /> ajouter
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}

                                    <button
                                        onClick={() => {
                                            const newSteps = [...settings.quiz_steps];
                                            const newId = `q_${Date.now()}`;
                                            newSteps.push({
                                                id: newId,
                                                question: 'Nouvelle question ?',
                                                options: [
                                                    { label: 'Option 1', value: 'opt1', emoji: '✨' },
                                                    { label: 'Option 2', value: 'opt2', emoji: '🌟' }
                                                ]
                                            });
                                            update({ quiz_steps: newSteps });
                                        }}
                                        className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-zinc-900 hover:border-emerald-500/30 hover:bg-emerald-500/5 rounded-[2rem] p-8 text-zinc-700 hover:text-emerald-400 transition-all min-h-[400px]"
                                    >
                                        <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center group-hover:border-emerald-500/30">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.2em]">Ajouter une étape</span>
                                    </button>
                                </div>
                            </Section>
                        </div>
                    )}


                    {/* ── ANALYTIQUE ── */}
                    {activeTab === 'stats' && (
                        <div className="space-y-8">
                            {/* KPI Rows */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="relative bg-zinc-950/80 border border-white/5 p-8 rounded-[2.5rem] overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl group-hover:opacity-20 transition-opacity">
                                        <div className="w-24 h-24 bg-emerald-500 rounded-full" />
                                    </div>
                                    <div className="relative flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 glow-green" />
                                        </div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Conversion</span>
                                    </div>
                                    <div className="relative flex items-end gap-3">
                                        <span className="text-5xl font-serif font-black text-white">{stats.conversion.rate}%</span>
                                        <span className="text-xs text-zinc-600 mb-2 font-medium tracking-tight">post-conseil</span>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="relative bg-zinc-950/80 border border-white/5 p-8 rounded-[2.5rem] overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl group-hover:opacity-20 transition-opacity">
                                        <div className="w-24 h-24 bg-blue-500 rounded-full" />
                                    </div>
                                    <div className="relative flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Sessions</span>
                                    </div>
                                    <div className="relative flex items-end gap-3">
                                        <span className="text-5xl font-serif font-black text-white">{stats.conversion.quizCount}</span>
                                        <span className="text-xs text-zinc-600 mb-2 font-medium tracking-tight">conseils générés</span>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="relative bg-zinc-950/80 border border-white/5 p-8 rounded-[2.5rem] overflow-hidden group"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl group-hover:opacity-20 transition-opacity">
                                        <div className="w-24 h-24 bg-amber-500 rounded-full" />
                                    </div>
                                    <div className="relative flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                            <ThumbsUp className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Satisfaction</span>
                                    </div>
                                    <div className="relative flex items-end gap-3">
                                        <span className="text-5xl font-serif font-black text-white">{stats.satisfaction.score}%</span>
                                        <span className="text-xs text-zinc-600 mb-2 font-medium tracking-tight">score NPS IA</span>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className="relative bg-zinc-950/80 border border-white/5 p-8 rounded-[2.5rem] overflow-hidden group md:col-span-3 lg:col-span-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-8">
                                            <div>
                                                <div className="text-[10px] font-black tracking-widest uppercase text-blue-400 mb-2 flex items-center gap-2">
                                                    <MessageSquare className="w-3 h-3" />
                                                    Texte
                                                </div>
                                                <div className="text-4xl font-serif font-black text-white">{stats.conversion.textCount}</div>
                                            </div>
                                            <div className="w-px h-12 bg-white/10" />
                                            <div>
                                                <div className="text-[10px] font-black tracking-widest uppercase text-emerald-400 mb-2 flex items-center gap-2">
                                                    <Volume2 className="w-3 h-3" />
                                                    Vocal
                                                </div>
                                                <div className="text-4xl font-serif font-black text-white">{stats.conversion.voiceCount}</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Main Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Section icon={FileText} title="Top Questions Clients" description="Interrogations les plus fréquentes.">
                                    {isLoadingStats ? (
                                        <div className="h-64 flex items-center justify-center"><Clock className="w-8 h-8 animate-spin text-zinc-800" /></div>
                                    ) : stats.topQuestions.length > 0 ? (
                                        <div className="space-y-4">
                                            {stats.topQuestions.map((q, i) => (
                                                <div key={i} className="flex items-center justify-between p-5 bg-zinc-950/40 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-all">
                                                    <span className="text-sm text-zinc-300 font-medium italic">"{q.question}"</span>
                                                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-xl uppercase tracking-widest">{q.count} fois</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-64 flex flex-col items-center justify-center text-zinc-600 italic text-sm border-2 border-dashed border-zinc-900 rounded-[2rem]">
                                            Données insuffisantes sur les 30 derniers jours.
                                        </div>
                                    )}
                                </Section>

                                <Section icon={Zap} title="Usages par Canal" description="Breakdown des interactions (écrit vs vocal).">
                                    {isLoadingStats ? (
                                        <div className="h-64 flex items-center justify-center"><Clock className="w-8 h-8 animate-spin text-zinc-800" /></div>
                                    ) : (
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.interactionTypes}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                                                    <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                                    <Tooltip
                                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '16px', fontSize: '12px' }}
                                                    />
                                                    <Bar dataKey="value" name="Interactions" radius={[8, 8, 0, 0]}>
                                                        {stats.interactionTypes.map((_entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#39ff14' : '#3b82f6'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </Section>
                            </div>

                            {/* Satisfaction Detail */}
                            <Section icon={ThumbsUp} title="Feedback de Recommandation" description="Comment les clients perçoivent les conseils générés">
                                <div className="flex items-center gap-10">
                                    <div className="h-40 w-40">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Positif', value: stats.satisfaction.positive },
                                                        { name: 'Négatif', value: stats.satisfaction.negative }
                                                    ]}
                                                    innerRadius={50}
                                                    outerRadius={70}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#39ff14" />
                                                    <Cell fill="#ef4444" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                            <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                                <ThumbsUp className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase">Positif</span>
                                            </div>
                                            <div className="text-2xl font-black text-white">{stats.satisfaction.positive}</div>
                                        </div>
                                        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                                            <div className="flex items-center gap-2 text-red-500 mb-1">
                                                <ThumbsDown className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase">Négatif</span>
                                            </div>
                                            <div className="text-2xl font-black text-white">{stats.satisfaction.negative}</div>
                                        </div>
                                    </div>
                                </div>
                            </Section>

                            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-8 border-b border-white/5">
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-emerald-400" />
                                            Flux d'Interactions
                                        </h3>
                                        <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-black">Historique temps réel & Fine-tuning</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {(['all', 'positive', 'negative'] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setFilterFeedback(f)}
                                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterFeedback === f ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
                                            >
                                                {f === 'all' ? 'Toutes' : f === 'positive' ? '👍 Positives' : '👎 Négatives'}
                                            </button>
                                        ))}
                                        <div className="w-px h-6 bg-white/5 mx-2" />
                                        <button
                                            onClick={exportGoldStandard}
                                            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-black hover:scale-105 transition-all active:scale-95"
                                        >
                                            <Download className="w-4 h-4" /> Export Training
                                        </button>
                                    </div>
                                </div>

                                {isLoadingInteractions ? (
                                    <div className="flex items-center justify-center py-24">
                                        <div className="w-10 h-10 border-2 border-white/5 border-t-emerald-500 rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {interactions.map((row) => (
                                            <div key={row.id} className="hover:bg-white/[0.01] transition-colors group/row">
                                                <div
                                                    className="flex items-center gap-6 px-8 py-6 cursor-pointer"
                                                    onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                                                >
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleGoldStandard(row); }}
                                                        className={`transition-all hover:scale-125 ${row.is_gold_standard ? 'text-amber-400 glow-amber' : 'text-zinc-800 group-hover/row:text-zinc-600'}`}
                                                    >
                                                        <Star className={`w-5 h-5 ${row.is_gold_standard ? 'fill-amber-400' : ''}`} />
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            {row.feedback && (
                                                                <span className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-black uppercase tracking-tighter ${row.feedback === 'positive' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                                    {row.feedback === 'positive' ? 'Positive' : 'Négative'}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                                                {new Date(row.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-zinc-400 truncate pr-8 leading-relaxed">
                                                            {row.user_message ?? '—'}
                                                        </p>
                                                    </div>

                                                    <div className={`p-2 rounded-xl bg-white/5 group-hover/row:bg-white/10 transition-colors ${expandedRow === row.id ? 'rotate-180' : ''}`}>
                                                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {expandedRow === row.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-8 pb-8 space-y-6 pt-2">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Intention Client</span>
                                                                        </div>
                                                                        <div className="text-sm text-zinc-200 bg-zinc-950/50 border border-white/5 rounded-2xl p-6 leading-relaxed shadow-inner">
                                                                            {row.user_message}
                                                                        </div>
                                                                    </div>
                                                                    {row.ai_response && (
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                                {row.ai_response}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Annotation & Correction Expert</label>
                                                                    <textarea
                                                                        defaultValue={row.admin_note ?? ''}
                                                                        onBlur={(e) => saveAdminNote(row.id, e.target.value)}
                                                                        rows={3}
                                                                        placeholder="Rédigez ici la réponse parfaite ou une note de correction..."
                                                                        className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl px-6 py-5 text-sm text-zinc-300 placeholder:text-zinc-800 focus:outline-none focus:border-emerald-500/30 transition-all resize-none shadow-inner"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── AIDE ── */}
                    {activeTab === 'help' && (
                        <div className="space-y-8">
                            <Section icon={Info} title="Guide de l'Assistant Vocal Admin" description="Apprenez à piloter votre boutique à la voix avec Manon.">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-emerald-400" /> Pilotage & Stats
                                        </h4>
                                        <ul className="space-y-4">
                                            <li className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] text-emerald-400 font-bold flex-shrink-0">1</div>
                                                <p className="text-xs text-zinc-400"><span className="text-white font-bold">"CA du jour"</span> — Donne le chiffre d'affaires et le nombre de commandes.</p>
                                            </li>
                                            <li className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] text-emerald-400 font-bold flex-shrink-0">2</div>
                                                <p className="text-xs text-zinc-400"><span className="text-white font-bold">"Bilan de la semaine"</span> — Résumé complet des 7 derniers jours.</p>
                                            </li>
                                            <li className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] text-emerald-400 font-bold flex-shrink-0">3</div>
                                                <p className="text-xs text-zinc-400"><span className="text-white font-bold">"Ruptures de stock"</span> — Liste les produits épuisés ou critiques.</p>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <Package className="w-4 h-4 text-blue-400" /> Gestion Commandes & Clients
                                        </h4>
                                        <ul className="space-y-4">
                                            <li className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-400/10 flex items-center justify-center text-[10px] text-blue-400 font-bold flex-shrink-0">4</div>
                                                <p className="text-xs text-zinc-400"><span className="text-white font-bold">"Commandes en attente"</span> — Affiche les commandes à traiter.</p>
                                            </li>
                                            <li className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-400/10 flex items-center justify-center text-[10px] text-blue-400 font-bold flex-shrink-0">5</div>
                                                <p className="text-xs text-zinc-400"><span className="text-white font-bold">"Ajoute 100 points à Martin"</span> — Modifie le solde fidélité en direct.</p>
                                            </li>
                                            <li className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-400/10 flex items-center justify-center text-[10px] text-blue-400 font-bold flex-shrink-0">6</div>
                                                <p className="text-xs text-zinc-400"><span className="text-white font-bold">"Expédie la commande 1a2b"</span> — Change le statut d'une commande.</p>
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-zinc-950/50 border border-white/5 rounded-3xl">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Navigation Rapide</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['"Ouvre le stock"', '"Emmène-moi aux commandes"', '"Va sur le dashboard"', '"Paramètres design"'].map(cmd => (
                                            <span key={cmd} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[10px] text-zinc-400 font-mono italic">
                                                {cmd}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Section>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <Section icon={Zap} title="Conseils d'utilisation" description="Optimisez vos interactions vocales.">
                                        <div className="space-y-4">
                                            <p className="text-xs text-zinc-400 leading-relaxed italic">
                                                "Dites simplement <span className="text-emerald-400">Aide-moi</span> ou <span className="text-emerald-400">Que peux-tu faire ?</span> à tout moment lors d'une session vocale pour que Manon vous rappelle ses capacités."
                                            </p>
                                            <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                                                <Info className="w-4 h-4 text-amber-500" />
                                                <p className="text-[10px] text-amber-500/80 font-medium">Pour plus de précision, n'hésitez pas à spécifier des prénoms ou des fragments d'ID de commande.</p>
                                            </div>
                                        </div>
                                    </Section>
                                </div>
                                <div className="flex flex-col justify-center p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem]">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                                        <Mic className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-2">Parlez naturellement</h4>
                                    <p className="text-xs text-zinc-500 leading-relaxed">Pas besoin de commandes rigides. L'IA comprend le contexte et vos intentions métiers.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* ── Save success toast ── */}
            <AnimatePresence>
                {saved && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white text-black font-black text-xs px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/20 border border-emerald-500/50"
                    >
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-black" />
                        </div>
                        <span className="tracking-widest uppercase">Configuration synchronisée avec succès</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
