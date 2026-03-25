import { useState, useEffect } from 'react';
import { 
    Award, 
    TrendingUp, 
    Settings, 
    History, 
    Plus, 
    X, 
    RefreshCw, 
    Save, 
    Check, 
    Coins, 
    Target, 
    Zap, 
    Crown, 
    Star, 
    Users,
    ChevronRight,
    Search,
    Clock,
    Filter,
    Truck,
    Percent,
    ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';
import { LoyaltyTransaction } from '../../lib/types';

const INPUT = 'w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all';
const LABEL = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 ml-1';

type TabType = 'overview' | 'config' | 'transactions' | 'referral';

export default function AdminLoyaltyTab() {
    const { settings, updateSettingsInStore } = useSettingsStore();
    const { addToast } = useToastStore();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [localSettings, setLocalSettings] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Pagination & Search for Transactions
    const [txSearchQuery, setTxSearchQuery] = useState('');
    const [txFilterType, setTxFilterType] = useState<string>('all');
    const [txPage, setTxPage] = useState(1);
    const TX_PER_PAGE = 20;

    // Stats for overview
    const [stats, setStats] = useState({
        totalPointsIssued: 0,
        totalPointsRedeemed: 0,
        activeLoyalUsers: 0,
        avgPointsPerUser: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    async function loadData() {
        setIsLoadingTransactions(true);
        try {
            const [
                { data: txs },
                { data: profiles }
            ] = await Promise.all([
                supabase.from('loyalty_transactions').select('*, order:orders(id, created_at, total)').order('created_at', { ascending: false }).limit(100),
                supabase.from('profiles').select('loyalty_points')
            ]);

            if (txs) setTransactions(txs as any[]);
            
            if (profiles) {
                const totalPoints = profiles.reduce((acc, p) => acc + (p.loyalty_points || 0), 0);
                const usersWithPoints = profiles.filter(p => (p.loyalty_points || 0) > 0).length;
                
                setStats({
                    totalPointsIssued: (txs || []).filter(t => t.type === 'earned' || t.type === 'referral' || t.type === 'adjusted').reduce((acc, t) => acc + t.points, 0),
                    totalPointsRedeemed: (txs || []).filter(t => t.type === 'redeemed').reduce((acc, t) => acc + Math.abs(t.points), 0),
                    activeLoyalUsers: usersWithPoints,
                    avgPointsPerUser: profiles.length > 0 ? totalPoints / profiles.length : 0
                });
            }
        } catch (err) {
            console.error('Error loading loyalty data:', err);
        } finally {
            setIsLoadingTransactions(false);
        }
    }

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const payload = Object.entries(localSettings).filter(([key]) => 
                ['loyalty_packs', 'loyalty_tiers', 'loyalty_earn_rate', 'loyalty_redeem_rate', 'loyalty_currency_name', 'referral_program_enabled', 'referral_reward_points', 'referral_welcome_bonus'].includes(key)
            ).map(([key, value]) => ({
                key,
                value,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('store_settings').upsert(payload, { onConflict: 'key' });
            if (error) throw error;

            updateSettingsInStore(localSettings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            addToast({ type: 'error', message: 'Erreur lors de la sauvegarde.' });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredTxs = transactions.filter(tx => {
        const matchesSearch = !txSearchQuery || (tx.note?.toLowerCase() || '').includes(txSearchQuery.toLowerCase()) || tx.id.toLowerCase().includes(txSearchQuery.toLowerCase());
        const matchesFilter = txFilterType === 'all' || tx.type === txFilterType;
        return matchesSearch && matchesFilter;
    });
    const txTotalPages = Math.ceil(filteredTxs.length / TX_PER_PAGE);
    const paginatedTxs = filteredTxs.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE);

    return (
        <div className="space-y-8">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-xl">
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4 group">
                        <div className="relative">
                            <Coins className="w-9 h-9 text-yellow-500 group-hover:rotate-12 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full scale-150 group-hover:scale-125 transition-transform" />
                        </div>
                        <div className="flex flex-col">
                            <span>Système de <span className="text-emerald-400">{localSettings.loyalty_currency_name}</span></span>
                            <span className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em] pl-1 h-3 block">Privilège Admin & Vision</span>
                        </div>
                    </h2>
                </div>

                <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    {[
                        { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
                        { id: 'config', label: 'Configuration', icon: Settings },
                        { id: 'referral', label: 'Parrainage', icon: Users },
                        { id: 'transactions', label: 'Transactions', icon: History },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(57,255,20,0.2)]' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: `${localSettings.loyalty_currency_name} en circulation`, value: stats.totalPointsIssued.toLocaleString(), icon: Coins, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                                { label: `${localSettings.loyalty_currency_name} utilisés`, value: stats.totalPointsRedeemed.toLocaleString(), icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                { label: 'Clients fidélisés', value: stats.activeLoyalUsers.toLocaleString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                                { label: 'Moyenne / Client', value: stats.avgPointsPerUser.toFixed(0), icon: Target, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                            ].map((s, idx) => (
                                <div key={idx} className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2rem] relative overflow-hidden group hover:border-white/10 transition-all duration-500">
                                    <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-125 group-hover:rotate-12">
                                        <s.icon className={`w-24 h-24 ${s.color}`} />
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center mb-6`}>
                                        <s.icon className={`w-6 h-6 ${s.color}`} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 truncate">{s.label}</p>
                                    <div className="flex items-end gap-2">
                                        <h3 className="text-4xl font-black text-white italic tracking-tighter">{s.value}</h3>
                                        <span className="text-[10px] text-zinc-600 font-black uppercase mb-1">{localSettings.loyalty_currency_name || 'pts'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Recent Transactions Preview */}
                        <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Activité Récente</h3>
                                <button 
                                    onClick={() => setActiveTab('transactions')}
                                    className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white transition-colors"
                                >
                                    Tout voir
                                </button>
                            </div>

                            <div className="space-y-4">
                                {transactions.slice(0, 5).map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl hover:border-white/10 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                                tx.type === 'earned' ? 'bg-green-500/10 text-green-500' :
                                                tx.type === 'redeemed' ? 'bg-red-500/10 text-red-500' :
                                                tx.type === 'referral' ? 'bg-purple-500/10 text-purple-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                                {tx.type === 'earned' ? <Plus className="w-5 h-5" /> :
                                                 tx.type === 'redeemed' ? <Zap className="w-5 h-5" /> :
                                                 tx.type === 'referral' ? <Users className="w-5 h-5" /> :
                                                 <RefreshCw className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white capitalize">{tx.type} — {tx.note}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
                                                    {new Date(tx.created_at).toLocaleDateString()} • ID: {tx.id.slice(0, 8)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black italic ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                {tx.points >= 0 ? '+' : ''}{tx.points}
                                            </p>
                                            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter">{localSettings.loyalty_currency_name}</p>
                                        </div>
                                    </div>
                                ))}
                                {transactions.length === 0 && !isLoadingTransactions && (
                                    <p className="text-center py-10 text-zinc-600 italic">Aucune transaction trouvée.</p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'config' && (
                    <motion.div
                        key="config"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Earn Rate & Save */}
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">
                            <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 space-y-8">
                                <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                                    <Target className="w-6 h-6 text-emerald-400" />
                                    Règle de Gains
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className={LABEL}>Nom de la monnaie de fidélité</label>
                                        <input
                                            type="text"
                                            value={localSettings.loyalty_currency_name}
                                            onChange={(e) => setLocalSettings({ ...localSettings, loyalty_currency_name: e.target.value || 'CARATS' })}
                                            className={INPUT}
                                            placeholder="ex: CARATS, POINTS, GEMS…"
                                        />
                                        <p className="mt-3 text-[10px] text-zinc-500 leading-relaxed italic">
                                            Ce nom s'affichera partout dans la boutique et le POS.
                                        </p>
                                    </div>

                                    <div>
                                        <label className={LABEL}>Taux de conversion ({localSettings.loyalty_currency_name} / €)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={localSettings.loyalty_earn_rate}
                                                onChange={(e) => setLocalSettings({ ...localSettings, loyalty_earn_rate: parseInt(e.target.value) || 1 })}
                                                className={`${INPUT} text-xl font-black pr-24`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs uppercase">
                                                {localSettings.loyalty_currency_name} / 1€
                                            </div>
                                        </div>
                                        <p className="mt-3 text-[10px] text-zinc-500 leading-relaxed italic">
                                            Points gagnés par euro dépensé.
                                        </p>
                                    </div>

                                    <div>
                                        <label className={LABEL}>Valeur de rachat (Cash / 100 {localSettings.loyalty_currency_name})</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={localSettings.loyalty_redeem_rate}
                                                onChange={(e) => setLocalSettings({ ...localSettings, loyalty_redeem_rate: parseInt(e.target.value) || 1 })}
                                                className={`${INPUT} text-xl font-black pr-20`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs">
                                                € / 100 PTS
                                            </div>
                                        </div>
                                        <p className="mt-3 text-[10px] text-zinc-500 leading-relaxed italic">
                                            Réduction offerte pour 100 {localSettings.loyalty_currency_name} utilisés.
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={isSaving}
                                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                                            saveSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-black hover:scale-105'
                                        }`}
                                    >
                                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                         saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        {isSaving ? 'Enregistrement...' : saveSuccess ? 'Confirmé' : 'Sauvegarder'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                                        <Award className="w-6 h-6 text-yellow-500" />
                                        Niveaux de Rang
                                    </h3>
                                    <button 
                                        onClick={() => {
                                            const tiers = localSettings.loyalty_tiers || [];
                                            const newTier = {
                                                id: `tier-${Date.now()}`,
                                                name: 'Nouveau Rang',
                                                min_points: tiers.length > 0 ? Math.max(...tiers.map(t => t.min_points)) + 500 : 0,
                                                multiplier: 1,
                                                free_shipping_threshold: null,
                                                vip_discount: 0,
                                                benefits: []
                                            };
                                            setLocalSettings({ ...localSettings, loyalty_tiers: [...tiers, newTier] });
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Ajouter
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(localSettings.loyalty_tiers || []).map((tier, idx) => (
                                        <div key={tier.id} className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-[2rem] space-y-6 group relative hover:border-white/10 transition-all">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                                        <Award className="w-5 h-5 text-emerald-400" />
                                                    </div>
                                                    <input
                                                        value={tier.name}
                                                        onChange={(e) => {
                                                            const newTiers = [...localSettings.loyalty_tiers];
                                                            newTiers[idx].name = e.target.value;
                                                            setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                        }}
                                                        className="bg-transparent border-none text-xl font-black text-white p-0 focus:outline-none focus:ring-0 w-32"
                                                    />
                                                </div>
                                                {idx > 0 && (
                                                    <button 
                                                        onClick={() => {
                                                            const newTiers = localSettings.loyalty_tiers.filter((_, i) => i !== idx);
                                                            setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                        }}
                                                        className="p-1 px-1.5 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className={LABEL}>Seuil (Points)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={tier.min_points}
                                                            onChange={(e) => {
                                                                const newTiers = [...localSettings.loyalty_tiers];
                                                                newTiers[idx].min_points = parseInt(e.target.value) || 0;
                                                                setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                            }}
                                                            className={`${INPUT} pl-10`}
                                                        />
                                                        <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className={LABEL}>Mult. Points</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={tier.multiplier}
                                                            onChange={(e) => {
                                                                const newTiers = [...localSettings.loyalty_tiers];
                                                                newTiers[idx].multiplier = parseFloat(e.target.value) || 1;
                                                                setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                            }}
                                                            className={`${INPUT} pl-10`}
                                                        />
                                                        <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className={LABEL}>Livraison Offerte (€)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            placeholder="Jamais"
                                                            value={tier.free_shipping_threshold || ''}
                                                            onChange={(e) => {
                                                                const newTiers = [...localSettings.loyalty_tiers];
                                                                newTiers[idx].free_shipping_threshold = e.target.value ? parseInt(e.target.value) : null;
                                                                setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                            }}
                                                            className={`${INPUT} pl-10`}
                                                        />
                                                        <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className={LABEL}>Remise VIP (%)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            step="1"
                                                            value={(tier.vip_discount || 0) * 100}
                                                            onChange={(e) => {
                                                                const newTiers = [...localSettings.loyalty_tiers];
                                                                newTiers[idx].vip_discount = (parseInt(e.target.value) || 0) / 100;
                                                                setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                            }}
                                                            className={`${INPUT} pl-10`}
                                                        />
                                                        <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className={LABEL}>Avantages (Liste)</label>
                                                <div className="space-y-2">
                                                    {(tier.benefits || []).map((benefit: string, bIdx: number) => (
                                                        <div key={bIdx} className="flex gap-2">
                                                            <input
                                                                value={benefit}
                                                                onChange={(e) => {
                                                                    const newTiers = [...localSettings.loyalty_tiers];
                                                                    newTiers[idx].benefits[bIdx] = e.target.value;
                                                                    setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                                }}
                                                                className="flex-1 bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/20"
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    const newTiers = [...localSettings.loyalty_tiers];
                                                                    newTiers[idx].benefits = newTiers[idx].benefits.filter((_: any, i: number) => i !== bIdx);
                                                                    setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                                }}
                                                                className="p-2 text-zinc-600 hover:text-red-400"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const newTiers = [...localSettings.loyalty_tiers];
                                                            newTiers[idx].benefits = [...(newTiers[idx].benefits || []), 'Nouvel avantage'];
                                                            setLocalSettings({ ...localSettings, loyalty_tiers: newTiers });
                                                        }}
                                                        className="w-full py-2 border border-dashed border-white/10 rounded-xl text-[10px] text-zinc-600 hover:text-zinc-400 hover:border-white/20 transition-all uppercase font-black"
                                                    >
                                                        + Ajouter un avantage
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Packs Management */}
                        <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                                    <Coins className="w-6 h-6 text-blue-400" />
                                    Packs d'Achat Direct
                                </h3>
                                <button 
                                    onClick={() => {
                                        const packs = localSettings.loyalty_packs || [];
                                        const newPack = {
                                            id: `pack-${Date.now()}`,
                                            name: 'Nouveau Pack',
                                            points: 100,
                                            price: 10,
                                            desc: 'Description du pack',
                                            icon_type: 'award' as const
                                        };
                                        setLocalSettings({ ...localSettings, loyalty_packs: [...packs, newPack] });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-400/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 hover:text-black transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Ajouter
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {(localSettings.loyalty_packs || []).map((pack, idx) => (
                                    <div key={pack.id} className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-3xl space-y-6 group hover:border-blue-400/30 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
                                                    {pack.icon_type === 'award' && <Award className="w-5 h-5 text-blue-400" />}
                                                    {pack.icon_type === 'star' && <Star className="w-5 h-5 text-zinc-300" />}
                                                    {pack.icon_type === 'crown' && <Crown className="w-5 h-5 text-yellow-400" />}
                                                </div>
                                                <input
                                                    value={pack.name}
                                                    onChange={(e) => {
                                                        const newPacks = [...localSettings.loyalty_packs];
                                                        newPacks[idx].name = e.target.value;
                                                        setLocalSettings({ ...localSettings, loyalty_packs: newPacks });
                                                    }}
                                                    className="bg-transparent border-none text-base font-black text-white p-0 focus:outline-none focus:ring-0 w-28"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const newPacks = localSettings.loyalty_packs.filter((_, i) => i !== idx);
                                                    setLocalSettings({ ...localSettings, loyalty_packs: newPacks });
                                                }}
                                                className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={LABEL}>Points</label>
                                                <input
                                                    type="number"
                                                    value={pack.points}
                                                    onChange={(e) => {
                                                        const newPacks = [...localSettings.loyalty_packs];
                                                        newPacks[idx].points = parseInt(e.target.value) || 0;
                                                        setLocalSettings({ ...localSettings, loyalty_packs: newPacks });
                                                    }}
                                                    className={INPUT}
                                                />
                                            </div>
                                            <div>
                                                <label className={LABEL}>Prix (€)</label>
                                                <input
                                                    type="number"
                                                    value={pack.price}
                                                    onChange={(e) => {
                                                        const newPacks = [...localSettings.loyalty_packs];
                                                        newPacks[idx].price = parseFloat(e.target.value) || 0;
                                                        setLocalSettings({ ...localSettings, loyalty_packs: newPacks });
                                                    }}
                                                    className={INPUT}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={LABEL}>Icône</label>
                                            <div className="flex gap-2">
                                                {['award', 'star', 'crown'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            const newPacks = [...localSettings.loyalty_packs];
                                                            newPacks[idx].icon_type = type as any;
                                                            setLocalSettings({ ...localSettings, loyalty_packs: newPacks });
                                                        }}
                                                        className={`flex-1 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${
                                                            pack.icon_type === type 
                                                                ? 'bg-blue-400/20 border-blue-400 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                                                : 'border-white/5 text-zinc-600 hover:border-white/20'
                                                        }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'referral' && (
                    <motion.div
                        key="referral"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-white italic uppercase tracking-tight flex items-center gap-3">
                                    <Users className="w-6 h-6 text-purple-400" />
                                    Gestion du Parrainage
                                </h3>
                                <button
                                    onClick={() => setLocalSettings({ ...localSettings, referral_program_enabled: !localSettings.referral_program_enabled })}
                                    className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${localSettings.referral_program_enabled
                                        ? 'bg-emerald-500 text-black'
                                        : 'bg-zinc-800 text-zinc-500'
                                        }`}
                                >
                                    {localSettings.referral_program_enabled ? 'Activé' : 'Désactivé'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className={LABEL}>Bonus Parrain ({localSettings.loyalty_currency_name})</label>
                                    <input
                                        type="number"
                                        value={localSettings.referral_reward_points}
                                        onChange={(e) => setLocalSettings({ ...localSettings, referral_reward_points: parseInt(e.target.value) || 0 })}
                                        className={INPUT}
                                    />
                                    <p className="text-[10px] text-zinc-500 italic">Points offerts au parrain dès la première commande du filleul.</p>
                                </div>
                                <div className="space-y-4">
                                    <label className={LABEL}>Bonus Bienvenue Filleul ({localSettings.loyalty_currency_name})</label>
                                    <input
                                        type="number"
                                        value={localSettings.referral_welcome_bonus}
                                        onChange={(e) => setLocalSettings({ ...localSettings, referral_welcome_bonus: parseInt(e.target.value) || 0 })}
                                        className={INPUT}
                                    />
                                    <p className="text-[10px] text-zinc-500 italic">Points offerts au filleul dès son inscription via le lien.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                                    saveSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-black hover:scale-105'
                                }`}
                            >
                                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                 saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Enregistrement...' : saveSuccess ? 'Confirmé' : 'Sauvegarder'}
                            </button>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'transactions' && (
                    <motion.div
                        key="transactions"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden"
                    >
                        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row gap-6 items-center justify-between">
                            <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Historique des Flux</h3>
                            
                            <div className="flex gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                    <input 
                                        placeholder="Saisir note ou ID..."
                                        value={txSearchQuery}
                                        onChange={(e) => { setTxSearchQuery(e.target.value); setTxPage(1); }}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <select 
                                    value={txFilterType}
                                    onChange={(e) => { setTxFilterType(e.target.value); setTxPage(1); }}
                                    className="p-2.5 bg-black/40 border border-white/5 rounded-xl text-xs text-zinc-500 hover:text-white transition-all outline-none"
                                >
                                    <option value="all">Tous types</option>
                                    <option value="earned">Gagné (Earned)</option>
                                    <option value="redeemed">Utilisé (Redeemed)</option>
                                    <option value="adjusted">Ajusté (Adjusted)</option>
                                    <option value="referral">Parrainage (Referral)</option>
                                </select>
                                <button 
                                    onClick={loadData}
                                    className={`p-2.5 bg-black/40 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all ${isLoadingTransactions ? 'animate-spin' : ''}`}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20">
                                    <tr className="border-b border-white/5">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Type</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Note / Détails</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Montant</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Solde après</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {paginatedTxs.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-white">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-zinc-600 font-mono uppercase mt-1">{new Date(tx.created_at).toLocaleTimeString()}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] ${
                                                    tx.type === 'earned' ? 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                                                    tx.type === 'redeemed' ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                                                    tx.type === 'referral' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]' :
                                                    'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                                }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-bold text-zinc-300 max-w-[300px] truncate">{tx.note || '—'}</p>
                                                <p className="text-[9px] font-mono text-zinc-600 uppercase mt-1">ID: {tx.id.slice(0, 16)}...</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-black italic tracking-tighter ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                        {tx.points >= 0 ? '+' : ''}{tx.points}
                                                    </span>
                                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${tx.points >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                                        <Coins className={`w-3 h-3 ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-500'}`} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-xs font-black text-white px-3 py-1 bg-white/[0.03] rounded-lg border border-white/[0.05]">{tx.balance_after} {localSettings.loyalty_currency_name || 'pts'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredTxs.length === 0 && (
                                <div className="p-8 text-center text-zinc-500 text-xs uppercase tracking-widest font-bold">
                                    Aucune transaction trouvée.
                                </div>
                            )}
                        </div>

                        {txTotalPages > 1 && (
                            <div className="p-6 border-t border-white/5 flex items-center justify-between">
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                                    Page {txPage} sur {txTotalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setTxPage(p => Math.max(1, p - 1))}
                                        disabled={txPage === 1}
                                        className="px-4 py-2 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
                                    >
                                        Précédent
                                    </button>
                                    <button 
                                        onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))}
                                        disabled={txPage === txTotalPages}
                                        className="px-4 py-2 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
                                    >
                                        Suivant
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
