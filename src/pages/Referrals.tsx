import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
    Users,
    Copy,
    Check,
    Share2,
    Gift,
    ArrowLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    Coins,
    Shield,
    Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Referral } from '../lib/types';
import SEO from '../components/SEO';

export default function Referrals() {
    const { profile } = useAuthStore();
    const { settings } = useSettingsStore();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            loadReferrals();
        }
    }, [profile]);

    async function loadReferrals() {
        setIsLoading(true);
        const { data } = await supabase
            .from('referrals')
            .select('*, referee:profiles!referee_id(full_name, created_at)')
            .eq('referrer_id', profile?.id)
            .order('created_at', { ascending: false });

        if (data) setReferrals(data as Referral[]);
        setIsLoading(false);
    }

    const referralCode = profile?.referral_code || 'GRN-XXXXXX';
    const referralLink = `${window.location.origin}/connexion?ref=${referralCode}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const totalRewards = referrals.reduce((acc, curr) => acc + (curr.points_awarded || 0), 0);
    const completedCount = referrals.filter(r => r.status === 'completed').length;

    if (!settings.referral_program_enabled) {
        return (
            <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1 flex flex-col items-center justify-center px-4">
                <SEO title={`Parrainage — ${settings.store_name} Privilège`} description="Le programme de parrainage est temporairement désactivé." />
                <Link to="/compte" className="inline-flex items-center gap-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] text-xs font-bold uppercase tracking-wider mb-12">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Mon Espace
                </Link>
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                        <Gift className="w-7 h-7 text-purple-400" />
                    </div>
                    <h1 className="text-2xl font-bold">Programme Suspendu</h1>
                    <p className="text-sm text-[color:var(--color-text-muted)] leading-relaxed">Le programme de parrainage est temporairement désactivé. Revenez plus tard.</p>
                </div>
            </div>
        );
    }

    const welcomeBonus = settings.referral_welcome_bonus || 0;

    return (
        <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pt-1 pb-1">
            <SEO title={`Parrainage — ${settings.store_name} Privilège`} description={`Parrainez vos amis et gagnez des ${settings.loyalty_currency_name}.`} />

            <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <Link to="/compte" className="inline-flex items-center gap-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] text-xs font-bold uppercase tracking-wider transition-colors mb-4">
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Mon Espace
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-sm">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[color:var(--color-text)]">
                                    Parrainage
                                </h1>
                            </div>
                            <p className="text-sm text-[color:var(--color-text-muted)]">
                                Invitez vos amis · Recevez <span className="text-[color:var(--color-text)] font-bold">{settings.referral_reward_points} {settings.loyalty_currency_name}</span> par parrainage.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">

                    {/* ── Referral Link Card ────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-6 md:p-8 overflow-hidden shadow-sm"
                    >
                        <div className="absolute top-0 right-0 w-60 h-60 bg-purple-500/[0.02] blur-[100px] pointer-events-none" />

                        <div className="relative space-y-6">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">Votre lien unique</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-xl px-4 py-3 font-mono text-sm text-[color:var(--color-text-muted)] truncate flex items-center">
                                    {referralLink}
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[color:var(--color-card)] text-[color:var(--color-text)] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[color:var(--color-primary)] hover:text-[color:var(--color-text)] transition-all"
                                >
                                    {copied ? (
                                        <><Check className="w-4 h-4" /> Copié !</>
                                    ) : (
                                        <><Copy className="w-4 h-4" /> Copier le lien</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Stats Row ─────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-3 gap-3 md:gap-4"
                    >
                        <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-5 hover:border-[color:var(--color-primary)]/25 transition-all shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-[color:var(--color-bg)] flex items-center justify-center mb-3 border border-[color:var(--color-border)]">
                                <Users className="w-4 h-4 text-[color:var(--color-text-muted)]" />
                            </div>
                            <p className="text-2xl font-black text-[color:var(--color-text)]">{referrals.length}</p>
                            <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-wider mt-0.5">Invités</p>
                        </div>

                        <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-5 hover:border-[color:var(--color-primary)]/25 transition-all shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-[color:var(--color-primary)]/10 flex items-center justify-center mb-3 border border-[color:var(--color-primary)]/20">
                                <CheckCircle2 className="w-4 h-4 text-[color:var(--color-primary)]" />
                            </div>
                            <p className="text-2xl font-black text-[color:var(--color-primary)]">{completedCount}</p>
                            <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-wider mt-0.5">Réussis</p>
                        </div>

                        <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-5 hover:border-[color:var(--color-primary)]/25 transition-all shadow-sm">
                            <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center mb-3 border border-yellow-100">
                                <Coins className="w-4 h-4 text-yellow-600" />
                            </div>
                            <p className="text-2xl font-black text-[color:var(--color-text)]">{totalRewards}</p>
                            <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-wider mt-0.5">{settings.loyalty_currency_name} gagnés</p>
                        </div>
                    </motion.div>

                    {/* ── Activity List ─────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-text-muted)] flex items-center gap-2 mb-4">
                            <Users className="w-3.5 h-3.5" />
                            Activité
                        </h3>

                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-20 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl animate-pulse shadow-sm" />
                                ))}
                            </div>
                        ) : referrals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-[color:var(--color-card)]/80 border border-dashed border-[color:var(--color-border)] rounded-[2rem] shadow-sm">
                                <div className="w-16 h-16 rounded-full bg-[color:var(--color-bg)] flex items-center justify-center">
                                    <Share2 className="w-6 h-6 text-[color:var(--color-text-subtle)]" />
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-base font-black text-[color:var(--color-text)] uppercase">Pas encore de filleuls</p>
                                    <p className="text-xs text-[color:var(--color-text-muted)] uppercase tracking-widest">Partagez votre lien pour commencer !</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {referrals.map((r, i) => (
                                    <motion.div
                                        key={r.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + i * 0.08 }}
                                        className="flex items-center justify-between p-4 md:p-5 bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl hover:border-[color:var(--color-primary)]/25 transition-all group shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-[color:var(--color-bg)] flex items-center justify-center text-[color:var(--color-text-muted)] group-hover:bg-[color:var(--color-primary)]/10 group-hover:text-[color:var(--color-primary)] transition-all border border-[color:var(--color-border)]">
                                                <Users className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-[color:var(--color-text)]">{r.referee?.full_name || 'Ami invité'}</p>
                                                <p className="text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-wider mt-0.5">
                                                    Inscrit le {new Date(r.referee?.created_at || r.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            {r.status === 'completed' ? (
                                                <div className="space-y-1">
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--color-primary)] bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/20 px-2.5 py-1 rounded-lg">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Succès
                                                    </span>
                                                    <Link to="/compte/fidelite" className="text-xs font-black text-[color:var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors block" title={`Voir l'historique des ${settings.loyalty_currency_name}`}>+{r.points_awarded} {settings.loyalty_currency_name}</Link>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] bg-[color:var(--color-bg)] border border-[color:var(--color-border)] px-2.5 py-1 rounded-lg">
                                                    <Clock className="w-3 h-3" />
                                                    En attente
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* ── Rules ─────────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] rounded-2xl p-6 space-y-4 shadow-sm"
                    >
                        <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--color-text-muted)]">Règles du Programme</h4>
                        <ul className="space-y-2.5">
                            {[
                                `Le filleul doit être un nouvel utilisateur ${settings.store_name}.`,
                                welcomeBonus > 0 ? `Le filleul reçoit ${welcomeBonus} ${settings.loyalty_currency_name} dès son inscription.` : null,
                                "La récompense est créditée dès que la commande du filleul est réglée.",
                                "Pas de limite sur le nombre de parrainages.",
                                `Les ${settings.loyalty_currency_name} sont valables sur toute la boutique.`
                            ].filter(Boolean).map((rule, i) => (
                                <li key={i} className="flex gap-3 text-xs text-[color:var(--color-text-muted)] leading-relaxed">
                                    <ChevronRight className="w-3.5 h-3.5 text-[color:var(--color-primary)] shrink-0 mt-0.5" />
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="mt-12 flex items-center justify-center gap-2 text-[10px] font-mono text-[color:var(--color-text-muted)] uppercase tracking-widest">
                    <Shield className="w-3 h-3" />
                    <span>Programme ambassadeur {settings.store_name}</span>
                </div>
            </div>
        </div>
    );
}