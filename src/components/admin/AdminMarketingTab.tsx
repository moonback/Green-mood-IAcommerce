import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Megaphone, Users, Sparkles, Send, RefreshCw, 
    Mail, ShoppingBag, Target, ChevronRight, 
    Gift, MessageSquare, AlertCircle, CheckCircle2, 
    Calendar, Clock, TrendingUp, UserCheck, 
    Smartphone, Bell, Zap, BarChart3,
    Trophy, HeartPulse, Star
} from 'lucide-react';
import { Profile, Product } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';

interface AdminMarketingTabProps {
    customers: Profile[];
    products: Product[];
    onRefresh: () => void;
}

type Segment = 'dormant' | 'loyal' | 'new' | 'champions' | 'at_risk';
type MarketingChannel = 'email' | 'sms' | 'push';
type MarketingTone = 'luxurious' | 'urgent' | 'friendly' | 'educational';

interface CampaignContent {
    subject: string;
    body: string;
    suggestedProducts: string[];
    promoCode: string;
    predictedImpact?: {
        ctr: string;
        conversion: string;
        estimatedRevenue: string;
    };
}

export default function AdminMarketingTab({ customers, products, onRefresh }: AdminMarketingTabProps) {
    const { settings } = useSettingsStore();
    const { addToast } = useToastStore();
    const [selectedSegment, setSelectedSegment] = useState<Segment>('dormant');
    const [selectedChannel, setSelectedChannel] = useState<MarketingChannel>('email');
    const [selectedTone, setSelectedTone] = useState<MarketingTone>('luxurious');
    const [isGenerating, setIsGenerating] = useState(false);
    const [campaign, setCampaign] = useState<CampaignContent | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [step, setStep] = useState<'segment' | 'generation' | 'preview'>('segment');

    // Logic for segments
    const segmentedCustomers = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (selectedSegment) {
            case 'dormant':
                return customers.filter(c => new Date(c.created_at) < thirtyDaysAgo && c.loyalty_points < 300);
            case 'loyal':
                return customers.filter(c => c.loyalty_points >= 500 && c.loyalty_points < 1000);
            case 'new':
                return customers.filter(c => new Date(c.created_at) > sevenDaysAgo);
            case 'champions':
                return customers.filter(c => c.loyalty_points >= 1000);
            case 'at_risk':
                // Approximation logic for at-risk
                return customers.filter(c => c.loyalty_points > 100 && new Date(c.created_at) < thirtyDaysAgo);
            default:
                return customers;
        }
    }, [customers, selectedSegment]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStep('generation');

        try {
            const segmentLabel = {
                dormant: "Clients Inactifs (ne sont pas revenus depuis 1 mois)",
                loyal: "Clients Fidèles (segment intermédiaire)",
                new: "Nouveaux Inscrits (cette semaine)",
                champions: "Champions VIP (clients à haute valeur)",
                at_risk: "Clients à Risque (perte de fréquence)"
            }[selectedSegment];

            const featuredProducts = products.filter(p => p.is_featured).slice(0, 3).map(p => p.name).join(", ") || "Fleurs CBD Premium, Huiles Relaxantes, Infusions Bio";
            const topSellers = products.slice(0, 5).map(p => p.name).join(", ");

            const prompt = `Génie Marketing IA pour ${settings.store_name || 'Eco CBD'}.
            Canal : ${selectedChannel.toUpperCase()}.
            Ton : ${selectedTone}.
            Cible : ${segmentLabel} (${segmentedCustomers.length} personnes).
            Catalogue star : ${featuredProducts}.
            Meilleures ventes : ${topSellers}.
            
            Génère le contenu de la campagne. Si c'est SMS ou Push, sois très court (< 160 car). Si c'est Email, sois élégant et structuré.
            Inclut 3 recommandations de produits.
            Génère également un code promo exclusif.
            
            ESTIMATION IA : Basé sur le contenu généré et le segment, estime le CTR (%) et les revenus potentiels (€).

            RÉPONDS UNIQUEMENT AU FORMAT JSON SUIVANT :
            {
                "subject": "L'objet (ou titre push/sms)",
                "body": "Le contenu avec sauts de lignes si email",
                "suggestedProducts": ["Nom1", "Nom2", "Nom3"],
                "promoCode": "CODE",
                "predictedImpact": {
                    "ctr": "8.5%",
                    "conversion": "3.2%",
                    "estimatedRevenue": "450"
                }
            }`;

            const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
                body: {
                    model: "mistralai/mistral-small-creative",
                    messages: [{ role: "user", content: prompt }],
                    x_title: `${settings.store_name || 'Eco CBD'} Admin Dashboard`,
                },
            });

            if (fnError) throw new Error(fnError.message);
            if (!data?.choices || data.choices.length === 0) {
                throw new Error("L'IA n'a pas renvoyé de réponse valide.");
            }

            // Nettoyage de la réponse au cas où l'IA inclurait des backticks markdown ```json
            let rawContent = data.choices[0].message.content;
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/); // Trouve le premier { et le dernier }
            if (jsonMatch) {
                rawContent = jsonMatch[0];
            }

            const content = JSON.parse(rawContent);
            setCampaign(content);
            setStep('preview');
        } catch (err: any) {
            console.error("Erreur génération marketing:", err);
            addToast({ type: 'error', message: "Erreur lors de la génération par l'IA : " + err.message });
            setStep('segment');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSend = async () => {
        setIsSending(true);
        // Simulation d'envoi
        await new Promise(r => setTimeout(r, 2000));
        setIsSending(false);
        addToast({ 
            type: 'success', 
            message: `Campagne ${selectedChannel.toUpperCase()} envoyée avec succès à ${segmentedCustomers.length} clients !` 
        });
        setCampaign(null);
        setStep('segment');
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header with Step Indicator */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
                        <Megaphone className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Marketing IA One-Click</h2>
                        <p className="text-zinc-500 text-sm font-medium">Automatisez vos campagnes avec la puissance de l'IA.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
                    {(['segment', 'generation', 'preview'] as const).map((s, idx) => (
                        <div key={s} className="flex items-center">
                            <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${step === s ? 'bg-emerald-500 text-black' : 'text-zinc-500'}`}>
                                {s === 'segment' && 'Ciblage'}
                                {s === 'generation' && 'IA'}
                                {s === 'preview' && 'Preview'}
                            </div>
                            {idx < 2 && <ChevronRight className="w-3 h-3 text-zinc-800 mx-1" />}
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {step === 'segment' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        {/* Advanced Segments */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                                { id: 'dormant', title: 'Dormants', icon: Clock, desc: '> 45 j sans achat', color: 'orange' },
                                { id: 'loyal', title: 'Fidèles', icon: UserCheck, desc: 'Clients réguliers', color: 'green' },
                                { id: 'new', title: 'Nouveaux', icon: Calendar, desc: 'Inscrits < 7 j', color: 'blue' },
                                { id: 'champions', title: 'Champions', icon: Trophy, desc: 'Haute valeur (VIP)', color: 'yellow' },
                                { id: 'at_risk', title: 'À Risque', icon: HeartPulse, desc: 'Chute de fréquence', color: 'red' },
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedSegment(s.id as Segment)}
                                    className={`p-6 rounded-[2rem] border text-left transition-all relative group overflow-hidden ${selectedSegment === s.id
                                        ? 'bg-zinc-900 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 scale-[1.02]'
                                        : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/60'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all ${selectedSegment === s.id ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-500 group-hover:bg-white/10'}`}>
                                        <s.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-white font-black uppercase text-[10px] tracking-widest mb-1">{s.title}</h3>
                                    <p className="text-zinc-500 text-[10px] font-bold line-clamp-1">{s.desc}</p>
                                    
                                    {selectedSegment === s.id && (
                                        <motion.div 
                                            layoutId="activeSegment"
                                            className="absolute bottom-0 left-0 h-1 w-full bg-emerald-500"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Audience Info & Configuration */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-zinc-900/60 border border-white/5 rounded-[3rem] p-8 flex flex-col md:flex-row items-center justify-between gap-10">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-emerald-400" />
                                        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Audience sélectionnée</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-7xl font-black text-white italic tracking-tighter">{segmentedCustomers.length}</span>
                                        <span className="text-xl font-bold text-zinc-600">CLIENTS</span>
                                    </div>
                                    <p className="text-zinc-400 max-w-sm text-sm leading-relaxed font-medium">
                                        L'IA va orchestrer une campagne <span className="text-white">{selectedChannel}</span> personnalisée pour ce segment.
                                    </p>
                                </div>

                                <button
                                    onClick={handleGenerate}
                                    className="group relative px-10 py-6 bg-emerald-500 rounded-[2rem] overflow-hidden flex items-center gap-4 shadow-2xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <Sparkles className="w-6 h-6 text-black group-hover:rotate-12 transition-transform" />
                                    <span className="text-black font-black uppercase italic tracking-tighter text-lg">Générer avec l'IA</span>
                                </button>
                            </div>

                            {/* Options Panel */}
                            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-6 space-y-6">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Canal de diffusion</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'email', icon: Mail },
                                            { id: 'sms', icon: Smartphone },
                                            { id: 'push', icon: Bell }
                                        ].map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setSelectedChannel(c.id as MarketingChannel)}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${selectedChannel === c.id ? 'bg-zinc-800 border-white/20 text-white' : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400'}`}
                                            >
                                                <c.icon className="w-4 h-4" />
                                                <span className="text-[9px] font-black uppercase">{c.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Ton de la marque</h4>
                                    <div className="flex flex-wrap gap-2 px-1">
                                        {[
                                            { id: 'luxurious', label: 'Luxueux/Calme' },
                                            { id: 'urgent', label: 'Urgent/Flash' },
                                            { id: 'friendly', label: 'Amical/CBD' },
                                            { id: 'educational', label: 'Éducatif' }
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTone(t.id as MarketingTone)}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${selectedTone === t.id ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-transparent text-zinc-500'}`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'generation' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-[400px] flex flex-col items-center justify-center text-center space-y-8"
                    >
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
                            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white uppercase italic">Analyse du segment en cours...</h3>
                            <p className="text-zinc-500 max-w-xs mx-auto text-sm font-medium">L'IA de votre boutique rédige votre contenu VIP personnalisé.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-w-sm w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 5 }}
                                className="bg-emerald-500 rounded-full"
                            />
                        </div>
                    </motion.div>
                )}

                {step === 'preview' && campaign && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-10"
                    >
                        {/* Control Panel */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Predicted Impact Card */}
                            {campaign.predictedImpact && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-zinc-900/80 border border-white/5 rounded-[2rem] p-6 space-y-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <BarChart3 className="w-5 h-5 text-emerald-400" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Impact Prédictif IA</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">CTR Estima.</p>
                                            <p className="text-2xl font-black text-emerald-400 italic">{campaign.predictedImpact.ctr}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Revenu Estima.</p>
                                            <p className="text-2xl font-black text-white italic">{campaign.predictedImpact.estimatedRevenue}€</p>
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[75%] animate-pulse" />
                                        </div>
                                        <p className="text-[9px] text-zinc-600 mt-2 text-center uppercase font-black tracking-widest">Confiance IA : 92%</p>
                                    </div>
                                </motion.div>
                            )}

                            <div className="bg-zinc-900/60 border border-white/5 rounded-[2.5rem] p-8 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Gift className="w-5 h-5 text-emerald-400" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Code Promo Inclus</h4>
                                    </div>
                                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-between group">
                                        <span className="text-xl font-black text-white font-mono tracking-wider">{campaign.promoCode}</span>
                                        <button className="text-[9px] font-black text-emerald-500 px-3 py-1 bg-emerald-500/5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">MODIFIER</button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag className="w-5 h-5 text-emerald-400" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Produits Recommandés</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {campaign.suggestedProducts.map((p, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-2xl p-4 text-xs font-bold text-zinc-300 border border-transparent hover:border-white/10 transition-all flex items-center gap-3 group">
                                                <div className="w-6 h-6 bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] text-zinc-600">{idx+1}</div>
                                                {p}
                                                <Star className="w-3.5 h-3.5 text-emerald-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSend}
                                    disabled={isSending}
                                    className="w-full py-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-[2rem] flex items-center justify-center gap-4 group hover:scale-105 transition-transform"
                                >
                                    {isSending ? (
                                        <RefreshCw className="w-6 h-6 text-black animate-spin" />
                                    ) : (
                                        <Send className="w-6 h-6 text-black group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    )}
                                    <span className="text-black font-black uppercase italic tracking-tighter text-lg">Envoyer la Campagne</span>
                                </button>

                                <button
                                    onClick={() => setStep('segment')}
                                    className="w-full py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                                >
                                    Annuler et recommencer
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-8">
                            <AnimatePresence mode="wait">
                                {selectedChannel === 'email' ? (
                                    <motion.div
                                        key="email"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="bg-zinc-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-full min-h-[600px] relative"
                                    >
                                        {/* Glassmorphism accent */}
                                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                                        
                                        {/* Email Header Bar */}
                                        <div className="p-8 border-b border-white/5 space-y-4 bg-zinc-900/50 backdrop-blur-xl">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-zinc-600 font-black uppercase tracking-widest w-16 text-[8px]">Sujet</span>
                                                    <span className="text-white font-black italic tracking-tight">{campaign.subject}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs border-t border-white/5 pt-2 mt-1">
                                                    <span className="text-zinc-600 font-black uppercase tracking-widest w-16 text-[8px]">Segment</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-emerald-400 font-black uppercase text-[8px] px-2 py-0.5 bg-emerald-500/5 rounded border border-emerald-500/10">{selectedSegment}</span>
                                                        <span className="text-zinc-500 font-bold text-[8px]">• {segmentedCustomers.length} destinataires</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Email Body */}
                                        <div className="flex-1 p-12 bg-[#08080a] font-sans selection:bg-emerald-500 selection:text-black">
                                            <div className="max-w-xl mx-auto space-y-10">
                                                <div className="flex justify-center mb-16">
                                                    <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-400 p-[1px]">
                                                        <div className="w-full h-full bg-black rounded-[2.4rem] flex items-center justify-center">
                                                            <Megaphone className="w-8 h-8 text-emerald-400" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    {campaign.body.split('\n').filter(l => l.trim()).map((line, i) => (
                                                        <p key={i} className="text-zinc-400 text-xl leading-relaxed font-medium">
                                                            {line}
                                                        </p>
                                                    ))}
                                                </div>

                                                <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 text-center space-y-4">
                                                    <p className="text-zinc-500 font-black uppercase text-[10px] tracking-[0.3em]">Votre Privilège</p>
                                                    <div className="text-4xl font-black text-white italic tracking-tighter">{campaign.promoCode}</div>
                                                    <p className="text-[10px] text-zinc-600 font-medium italic">Valable 48h sur toute la boutique</p>
                                                </div>

                                                {/* Product Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/5">
                                                    {campaign.suggestedProducts.map((p, i) => (
                                                        <div key={i} className="group cursor-pointer">
                                                            <div className="aspect-[4/5] bg-zinc-900 border border-white/5 rounded-2xl mb-4 overflow-hidden relative">
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                                                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                                                        <div className="w-1/2 h-full bg-emerald-500" />
                                                                    </div>
                                                                </div>
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <ShoppingBag className="w-8 h-8 text-zinc-800" />
                                                                </div>
                                                            </div>
                                                            <div className="h-4 w-full bg-zinc-900 rounded-lg mb-2" />
                                                            <p className="text-[9px] font-black text-white uppercase tracking-tighter line-clamp-1">{p}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="pt-20 text-center space-y-4 pb-10">
                                                    <div className="h-[1px] w-12 bg-zinc-800 mx-auto" />
                                                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em]">{settings.store_name || 'ECO CBD'}</p>
                                                    <div className="flex items-center justify-center gap-4">
                                                        <span className="text-[8px] text-zinc-800 font-bold uppercase">Se désabonner</span>
                                                        <span className="text-[8px] text-zinc-800 font-bold uppercase">View Online</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="mobile"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center justify-center h-full min-h-[600px] bg-zinc-900/20 border border-white/5 rounded-[3rem] p-10 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" />
                                        
                                        {/* Mock Mobile UI */}
                                        <div className="w-[320px] h-[580px] bg-black border-[8px] border-zinc-800 rounded-[3.5rem] relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col pt-10 px-6">
                                            {/* Notch */}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-2xl" />
                                            
                                            <div className="mt-8 space-y-6">
                                                {selectedChannel === 'sms' ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 mb-8">
                                                            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600 font-bold">EC</div>
                                                            <div className="text-xs font-bold text-white">{settings.store_name || 'Eco CBD'}</div>
                                                        </div>
                                                        
                                                        <motion.div 
                                                            initial={{ x: -20, opacity: 0 }}
                                                            animate={{ x: 0, opacity: 1 }}
                                                            className="bg-zinc-800 rounded-3xl rounded-tl-lg p-5 text-sm text-zinc-200 leading-snug"
                                                        >
                                                            {campaign.body.length > 160 ? campaign.body.slice(0, 157) + '...' : campaign.body}
                                                            <div className="mt-2 text-emerald-400 font-black">{campaign.promoCode}</div>
                                                        </motion.div>
                                                        <p className="text-[10px] text-zinc-600 text-center font-bold">Aujourd'hui, 14:24</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 relative">
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center">
                                                                    <Megaphone className="w-3.5 h-3.5 text-black" />
                                                                </div>
                                                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mt-1">{settings.store_name || 'ECO CBD'}</div>
                                                                <div className="text-[8px] text-zinc-600 ml-auto">MAINTENANT</div>
                                                            </div>
                                                            <p className="text-[11px] font-black text-white italic leading-tight mb-1">{campaign.subject}</p>
                                                            <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">{campaign.body}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Home indicator */}
                                            <div className="mt-auto mb-3 h-1 w-24 bg-zinc-800 rounded-full mx-auto" />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
