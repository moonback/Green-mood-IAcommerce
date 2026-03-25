import { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Filter,
    TrendingUp,
    Award,
    Clock,
    CheckCircle2,
    ExternalLink,
    ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Referral } from '../../lib/types';
import { useSettingsStore } from '../../store/settingsStore';

export default function AdminReferralsTab() {
    const { settings } = useSettingsStore();
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'joined' | 'completed'>('all');

    useEffect(() => {
        loadAllReferrals();
    }, []);

    async function loadAllReferrals() {
        setIsLoading(true);
        const { data } = await supabase
            .from('referrals')
            .select(`
        *,
        referrer:profiles!referrer_id(full_name, referral_code),
        referee:profiles!referee_id(full_name, created_at)
      `)
            .order('created_at', { ascending: false });

        if (data) setReferrals(data as any[]);
        setIsLoading(false);
    }

    const filteredReferrals = referrals.filter(r => {
        const matchesSearch =
            (r.referrer as any)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.referee as any)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.referrer as any)?.referral_code?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: referrals.length,
        completed: referrals.filter(r => r.status === 'completed').length,
        conversionRate: referrals.length > 0 ? (referrals.filter(r => r.status === 'completed').length / referrals.length) * 100 : 0,
        totalPoints: referrals.reduce((acc, r) => acc + (r.points_awarded || 0), 0)
    };

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Total Invitations</p>
                    <h3 className="text-2xl font-black text-white">{stats.total}</h3>
                    <p className="text-xs text-zinc-500 mt-1">Nombre total de parrainages</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Conversions (Achats)</p>
                    <h3 className="text-2xl font-black text-emerald-400">{stats.completed}</h3>
                    <p className="text-xs text-zinc-500 mt-1">Premières commandes effectuées</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Taux de Conversion</p>
                    <h3 className="text-2xl font-black text-white">{stats.conversionRate.toFixed(1)}%</h3>
                    <div className="w-full bg-zinc-800 h-1 rounded-full mt-3 overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${stats.conversionRate}%` }} />
                    </div>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Points Distribués</p>
                    <h3 className="text-2xl font-black text-purple-400">{stats.totalPoints.toLocaleString()}</h3>
                    <p className="text-xs text-zinc-500 mt-1">Total des {settings.loyalty_currency_name} offerts</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Rechercher parrain, code ou filleul..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                    />
                </div>
                <div className="flex gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 w-full md:w-auto">
                    {['all', 'joined', 'completed'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'
                                }`}
                        >
                            {s === 'all' ? 'Tous' : s === 'joined' ? 'Inscrits' : 'Convertis'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-zinc-800/50">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Parrain</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Filleul</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Statut</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Récompense</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/30">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-8 py-6"><div className="h-4 bg-zinc-800 rounded-full w-3/4"></div></td>
                                    </tr>
                                ))
                            ) : filteredReferrals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <p className="text-zinc-600 font-serif italic">Aucun parrainage trouvé.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredReferrals.map((r) => (
                                    <tr key={r.id} className="group hover:bg-white/[0.01] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-white">{(r.referrer as any)?.full_name || 'Inconnu'}</p>
                                                <p className="text-[10px] font-mono text-zinc-500 uppercase">Code: {(r.referrer as any)?.referral_code}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-white">{(r.referee as any)?.full_name || 'Filleul'}</p>
                                                <p className="text-[10px] font-mono text-zinc-500 uppercase">ID: {r.referee_id.slice(0, 8)}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {r.status === 'completed' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Converti
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-500/10 border border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                    <Clock className="w-3 h-3" />
                                                    Inscrit
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            {r.reward_issued ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white">{r.points_awarded}</span>
                                                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">{settings.loyalty_currency_name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-mono text-zinc-500 uppercase">
                                                {new Date(r.created_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
