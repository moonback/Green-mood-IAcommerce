import { motion } from 'motion/react';
import { X, Brain, Target, Zap, Waves, Wallet, Clock, User as UserIcon, Phone, MapPin, Package, ExternalLink, Sparkles, ChevronRight } from 'lucide-react';
import { UserAIPreferences, Profile, Address } from '../../../lib/types';

interface POSAIPreferencesModalProps {
    preferences: UserAIPreferences;
    customer: Profile;
    defaultAddress?: Address | null;
    orderCount?: number;
    onViewOrders?: () => void;
    onClose: () => void;
    isLightTheme?: boolean;
    products?: any[];
    onAddToCart?: (product: any) => void;
}

const PREF_LABELS: Record<string, string> = {
    // Goals
    'sleep': 'Sommeil & Relaxation',
    'stress': 'Stress & Anxiété',
    'pain': 'Douleurs & Récupération',
    'wellness': 'Bien-être général',
    // Experience
    'beginner': 'Débutant',
    'intermediate': 'Intermédiaire',
    'expert': 'Expert',
    // Intensity
    'low': 'Légère',
    'mid': 'Modérée',
    'high': 'Puissante',
    // Budget
    'budget_low': 'Moins de 20 €',
    'budget_mid': '20 € – 50 €',
    'budget_high': 'Plus de 50 €',
    // Format
    'oil': 'Huile sublinguale',
    'flower': 'Fleur ou résine',
    'infusion': 'Infusion',
    'bundle': 'Pack découverte',
    // Age
    'adult': '18 – 65 ans',
    'senior': 'Plus de 65 ans',
    // Terpenes
    'limonene': 'Citronné',
    'myrcene': 'Terreux',
    'linalool': 'Floral',
    'pinene': 'Boisé',
    'caryophyllene': 'Poivré',
};

const t = (value: string | null | undefined, context?: string) => {
    if (!value) return 'Non défini';
    if (context === 'budget' && PREF_LABELS[`budget_${value}`]) return PREF_LABELS[`budget_${value}`];
    return PREF_LABELS[value] || value;
};

export default function POSAIPreferencesModal({
    preferences,
    customer,
    defaultAddress,
    orderCount = 0,
    onViewOrders,
    onClose,
    isLightTheme,
    products,
    onAddToCart,
}: POSAIPreferencesModalProps) {
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] flex flex-col md:flex-row transition-all duration-500 border overflow-y-auto md:overflow-visible ${isLightTheme ? 'bg-white/80 border-emerald-100' : 'bg-[#0a0a0b]/90 border-zinc-800'
                    }`}
            >
                {/* ── Left Sidebar: Profile Summary ── */}
                <div className={`w-full md:w-80 p-6 sm:p-8 flex flex-col transition-all shrink-0 md:overflow-y-auto ${isLightTheme ? 'bg-emerald-50/50 border-b md:border-b-0 md:border-r border-emerald-100' : 'bg-gradient-to-b from-zinc-900/50 to-transparent border-b md:border-b-0 md:border-r border-zinc-800/50'
                    }`}>
                    <div className="flex flex-col items-center text-center">
                        <motion.div
                            initial={{ rotate: -20, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mb-4 sm:mb-6 overflow-hidden group transition-all ${isLightTheme ? 'bg-white shadow-xl shadow-emerald-200/50' : 'bg-zinc-950 shadow-2xl shadow-black'}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <UserIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`} />
                        </motion.div>

                        <h2 className={`text-xl sm:text-2xl font-black tracking-tight mb-2 ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>
                            {customer.full_name || 'Client'}
                        </h2>

                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 sm:mb-6 ${isLightTheme ? 'bg-emerald-100/50 text-emerald-700' : 'bg-green-500/10 text-green-400'}`}>
                            <Sparkles className="w-3 h-3" />
                            Client Premium
                        </div>

                        <div className="w-full space-y-3 sm:space-y-4 text-left">
                            {customer.phone && (
                                <div className="space-y-1">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-600'}`}>Contact</p>
                                    <div className={`flex items-center gap-2 p-3 rounded-xl sm:rounded-2xl transition-all ${isLightTheme ? 'bg-white border border-emerald-50' : 'bg-zinc-900/50 border border-zinc-800'}`}>
                                        <Phone className={`w-3.5 h-3.5 ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                        <span className={`text-xs font-mono font-bold ${isLightTheme ? 'text-emerald-950' : 'text-zinc-300'}`}>{customer.phone}</span>
                                    </div>
                                </div>
                            )}

                            {defaultAddress && (
                                <div className="space-y-1">
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-600'}`}>Adresse principale</p>
                                    <div className={`flex items-start gap-3 p-3 rounded-xl sm:rounded-2xl transition-all ${isLightTheme ? 'bg-white border border-emerald-50' : 'bg-zinc-900/50 border border-zinc-800'}`}>
                                        <MapPin className={`w-3.5 h-3.5 mt-0.5 ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                        <p className={`text-[10px] font-bold leading-relaxed ${isLightTheme ? 'text-emerald-950' : 'text-zinc-300'}`}>
                                            {defaultAddress.street}<br />
                                            {defaultAddress.postal_code} {defaultAddress.city}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-600'}`}>Loyauté</p>
                                <div className={`flex items-center justify-between p-3 rounded-xl sm:rounded-2xl transition-all ${isLightTheme ? 'bg-emerald-600 text-white' : 'bg-green-500 text-black'}`}>
                                    <div className="flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-tight">Total Commandes</span>
                                    </div>
                                    <span className="text-sm font-black tracking-tight">{orderCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-auto pt-4 md:pt-8 mb-4 md:mb-0">
                        <button
                            onClick={onViewOrders}
                            className={`w-full group flex items-center justify-between p-4 rounded-xl sm:rounded-2xl transition-all ${isLightTheme ? 'bg-white hover:bg-emerald-50 border border-emerald-100 shadow-sm' : 'bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800'}`}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Historique complet</span>
                            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isLightTheme ? 'text-emerald-400' : 'text-zinc-600'}`} />
                        </button>
                    </div>
                </div>

                {/* ── Main Area: AI Preferences ── */}
                <div className="flex-1 p-6 sm:p-8 flex flex-col relative overflow-hidden min-h-0 md:h-[90vh]">
                    <div className="flex items-center justify-between mb-8 sm:mb-10">
                        <div className="flex items-center gap-4">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-2xl transition-all ${isLightTheme ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-green-500 text-black shadow-green-500/20'}`}
                            >
                                <Brain className="w-5 h-5 sm:w-7 sm:h-7" />
                            </motion.div>
                            <div>
                                <p className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1 ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>Analyse Cognitive</p>
                                <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tight ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Préférences Client</h3>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all hover:scale-105 active:scale-95 ${isLightTheme ? 'bg-emerald-50 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0">
                        <IconCard icon={Target} label="Objectif" value={t(preferences.goal)} isLightTheme={isLightTheme} color="text-emerald-500" />
                        <IconCard icon={Zap} label="Expérience" value={t(preferences.experience_level)} isLightTheme={isLightTheme} color="text-amber-500" />
                        <IconCard icon={Waves} label="Intensité" value={t(preferences.intensity_preference)} isLightTheme={isLightTheme} color="text-blue-500" />
                        <IconCard icon={Wallet} label="Budget" value={t(preferences.budget_range, 'budget')} isLightTheme={isLightTheme} color="text-purple-500" />
                        <IconCard icon={Clock} label="Format" value={t(preferences.preferred_format)} isLightTheme={isLightTheme} color="text-indigo-500" />
                        <IconCard icon={UserIcon} label="Age" value={t(preferences.age_range)} isLightTheme={isLightTheme} color="text-zinc-500" />
                    </div>

                    {/* ── AI Sales Playbook (Omnicanal) ── */}
                    <div className={`mt-6 p-5 rounded-[2.5rem] border ${isLightTheme ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-green-500 text-black border-green-400'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <Brain className="w-5 h-5" />
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Stratégie de Vente IA</h4>
                        </div>
                        <div className="space-y-3">
                            <div className="flex gap-3 items-start">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isLightTheme ? 'bg-white' : 'bg-black'}`} />
                                <p className="text-xs font-bold leading-relaxed">
                                    {preferences.budget_range === 'low' 
                                        ? "Client sensible au prix : Proposez des formats 10g ou des Bundles pour un meilleur ratio prix/gramme."
                                        : "Incitez à la découverte : Ce client a le budget pour tester les nouveautés Premium."}
                                </p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isLightTheme ? 'bg-white' : 'bg-black'}`} />
                                <p className="text-xs font-bold leading-relaxed">
                                    {preferences.experience_level === 'beginner'
                                        ? "Profil Débutant : Rassurez sur le dosage et commencez par des produits doux (Infusions ou CBD < 10%)."
                                        : "Profil Expert : Proposez des résines puissantes ou des extractions à forte concentration."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── AI Recommended Products ── */}
                    {products && products.length > 0 && (
                        <div className="mt-8">
                            <div className="flex items-center gap-3 mb-4">
                                <Package className={`w-4 h-4 ${isLightTheme ? 'text-emerald-500' : 'text-green-400'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLightTheme ? 'text-emerald-950' : 'text-zinc-400'}`}>Recommandations Produits</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {products
                                    .filter(p => p.is_active && p.stock_quantity > 0)
                                    .slice(0, 3)
                                    .map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => onAddToCart?.(product)}
                                            className={`p-3 rounded-[1.5rem] border text-left group transition-all ${isLightTheme ? 'bg-white border-emerald-50 hover:border-emerald-200' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                        >
                                            <div className="flex gap-3 sm:flex-col sm:gap-2">
                                                <div className="w-10 h-10 sm:w-full sm:aspect-square bg-zinc-800 rounded-xl overflow-hidden shrink-0">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-600"><Package size={16} /></div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-[10px] font-bold line-clamp-1 mb-0.5 ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{product.name}</p>
                                                    <p className={`text-[9px] font-black ${isLightTheme ? 'text-emerald-600' : 'text-green-400'}`}>{product.price} €</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Terpenes Bar */}
                    {(preferences.terpene_preferences?.length || 0) > 0 && (
                        <div className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border transition-all ${isLightTheme ? 'bg-white border-emerald-100 shadow-sm shadow-emerald-100/50' : 'bg-zinc-950/50 border-zinc-800/50'}`}>
                            <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                <Sparkles className={`w-4 h-4 ${isLightTheme ? 'text-emerald-500' : 'text-green-400'}`} />
                                <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] ${isLightTheme ? 'text-emerald-950' : 'text-zinc-400'}`}>Terpènes Préférés</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {preferences.terpene_preferences?.map((terpene) => (
                                    <span
                                        key={terpene}
                                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-wide transition-all ${isLightTheme ? 'bg-emerald-100/50 text-emerald-700 hover:bg-emerald-100' : 'bg-zinc-900 text-green-400 hover:text-green-300 border border-zinc-800 hover:border-green-500/30'}`}
                                    >
                                        {t(terpene)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 sm:mt-8 flex items-center justify-between px-2 opacity-50">
                        <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] ${isLightTheme ? 'text-emerald-200' : 'text-zinc-600'}`}>
                            BudTender AI Analysis v2.0
                        </p>
                        <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] ${isLightTheme ? 'text-emerald-200' : 'text-zinc-600'}`}>
                            {preferences.updated_at ? new Date(preferences.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function IconCard({ icon: Icon, label, value, isLightTheme, color }: { icon: any, label: string, value: string, isLightTheme?: boolean, color: string }) {
    return (
        <div className={`group p-5 rounded-[2.5rem] border transition-all duration-300 ${isLightTheme
            ? 'bg-white border-emerald-50 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-200/20'
            : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-800/60'
            }`}>
            <div className="flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${isLightTheme ? 'bg-emerald-50 shadow-inner shadow-emerald-100/20' : 'bg-zinc-950/50 shadow-inner shadow-black/20'} group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                    <span className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isLightTheme ? 'text-emerald-600/40' : 'text-zinc-600'}`}>
                        {label}
                    </span>
                    <p className={`text-sm font-black truncate tracking-tight transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}

