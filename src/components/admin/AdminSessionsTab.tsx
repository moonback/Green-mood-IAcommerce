import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Smartphone, LogOut, Search, Trash2, RefreshCw, AlertCircle, ShieldAlert, Clock, ChevronDown, Users, Activity, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Session {
    id: string;
    user_id: string;
    device_id: string;
    device_name: string | null;
    user_agent: string | null;
    last_seen: string;
    created_at: string;
}

interface UserGroup {
    user_id: string;
    full_name: string | null;
    email: string | null;
    sessions: Session[];
    lastSeen: string;
}

export default function AdminSessionsTab() {
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRevoking, setIsRevoking] = useState<string | null>(null); // tracks id of session/user being revoked
    const [isCleaning, setIsCleaning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const loadSessions = async () => {
        setIsLoading(true);
        try {
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('user_active_sessions')
                .select('*')
                .order('last_seen', { ascending: false });

            if (sessionsError) throw sessionsError;

            if (!sessionsData || sessionsData.length === 0) {
                setUserGroups([]);
                return;
            }

            const userIds = Array.from(new Set(sessionsData.map((s: Session) => s.user_id)));
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds);

            const profilesMap = (profilesData || []).reduce((acc: Record<string, { full_name: string | null; email: string | null }>, p: { id: string; full_name: string | null; email: string | null }) => {
                acc[p.id] = p;
                return acc;
            }, {});

            // Group sessions by user
            const groupsMap: Record<string, UserGroup> = {};
            for (const s of sessionsData as Session[]) {
                if (!groupsMap[s.user_id]) {
                    groupsMap[s.user_id] = {
                        user_id: s.user_id,
                        full_name: profilesMap[s.user_id]?.full_name ?? null,
                        email: profilesMap[s.user_id]?.email ?? null,
                        sessions: [],
                        lastSeen: s.last_seen,
                    };
                }
                groupsMap[s.user_id].sessions.push(s);
                // Keep the most recent last_seen
                if (new Date(s.last_seen) > new Date(groupsMap[s.user_id].lastSeen)) {
                    groupsMap[s.user_id].lastSeen = s.last_seen;
                }
            }

            setUserGroups(Object.values(groupsMap).sort((a, b) =>
                new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
            ));
        } catch (err) {
            console.error('Error loading admin sessions:', err);
            showMessage('error', 'Erreur lors du chargement des sessions.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const handleCleanOldSessions = async () => {
        const DAYS = 30;
        const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

        setIsCleaning(true);
        try {
            const { error, count } = await supabase
                .from('user_active_sessions')
                .delete({ count: 'exact' })
                .lt('last_seen', cutoff);

            if (error) throw error;

            showMessage('success', `${count ?? 0} session(s) de plus de ${DAYS} jours supprimée(s).`);
            await loadSessions();
        } catch (err) {
            console.error('Error cleaning old sessions:', err);
            showMessage('error', 'Erreur lors du nettoyage des sessions.');
        } finally {
            setIsCleaning(false);
        }
    };

    const handleDisconnectAll = async () => {
        if (!confirm('Déconnecter TOUS les utilisateurs de TOUS les appareils ?')) return;

        setIsRevoking('all');
        try {
            const { error } = await supabase
                .from('user_active_sessions')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');

            if (error) throw error;

            setUserGroups([]);
            showMessage('success', 'Toutes les sessions ont été supprimées.');
        } catch (err) {
            console.error('Error disconnecting all sessions:', err);
            showMessage('error', 'Erreur lors de la déconnexion globale.');
        } finally {
            setIsRevoking(null);
        }
    };

    const handleDisconnectUser = async (userId: string, fullName: string | null) => {
        if (!confirm(`Déconnecter tous les appareils de ${fullName || 'cet utilisateur'} ?`)) return;

        setIsRevoking(userId);
        try {
            const { error } = await supabase
                .from('user_active_sessions')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            setUserGroups(prev => prev.filter(g => g.user_id !== userId));
            showMessage('success', `Sessions de ${fullName || 'l\'utilisateur'} supprimées.`);
        } catch (err) {
            console.error('Error disconnecting user sessions:', err);
            showMessage('error', 'Erreur lors de la déconnexion.');
        } finally {
            setIsRevoking(null);
        }
    };

    const handleDisconnectSession = async (sessionId: string, userId: string) => {
        setIsRevoking(sessionId);
        try {
            const { error } = await supabase
                .from('user_active_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;

            setUserGroups(prev => prev
                .map(g => g.user_id === userId
                    ? { ...g, sessions: g.sessions.filter(s => s.id !== sessionId) }
                    : g
                )
                .filter(g => g.sessions.length > 0)
            );
            showMessage('success', 'Session supprimée.');
        } catch (err) {
            console.error('Error disconnecting session:', err);
            showMessage('error', 'Erreur lors de la suppression de la session.');
        } finally {
            setIsRevoking(null);
        }
    };

    const totalSessions = userGroups.reduce((sum, g) => sum + g.sessions.length, 0);

    const filteredGroups = userGroups.filter(g => {
        const q = searchQuery.toLowerCase();
        return (
            (g.full_name?.toLowerCase() || '').includes(q) ||
            (g.email?.toLowerCase() || '').includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-serif italic font-bold">Gestion des Sessions</h2>
                        <p className="text-xs text-zinc-500">Supervisez et gérez les appareils connectés sur toute la plateforme.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadSessions}
                        disabled={isLoading}
                        className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                        title="Rafraîchir"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleCleanOldSessions}
                        disabled={isCleaning || isRevoking !== null}
                        className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Supprimer les sessions inactives depuis plus de 30 jours"
                    >
                        <Sparkles className={`w-4 h-4 ${isCleaning ? 'animate-pulse' : ''}`} />
                        Nettoyer (+30j)
                    </button>
                    <button
                        onClick={handleDisconnectAll}
                        disabled={isRevoking !== null || userGroups.length === 0}
                        className="flex items-center gap-2 bg-red-600/10 border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                        Tout déconnecter
                    </button>
                </div>
            </div>

            {/* Stats */}
            {!isLoading && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{filteredGroups.length}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Utilisateurs actifs</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{totalSessions}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sessions totales</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par nom ou email..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-700 font-mono italic"
                />
            </div>

            {/* Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
                    >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-xs font-bold uppercase tracking-wider">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Session list */}
            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 h-20 animate-pulse" />
                    ))
                ) : filteredGroups.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                            <Monitor className="w-6 h-6 text-zinc-700" />
                        </div>
                        <p className="text-sm text-zinc-500 font-medium">Aucune session active trouvée.</p>
                    </div>
                ) : (
                    filteredGroups.map((group) => {
                        const isExpanded = expandedUser === group.user_id;
                        const isRevokingUser = isRevoking === group.user_id;

                        return (
                            <motion.div
                                key={group.user_id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all"
                            >
                                {/* User row */}
                                <div className="flex items-center gap-4 p-5">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-black text-orange-400 uppercase">
                                            {(group.full_name || group.email || '?')[0]}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-serif italic font-bold text-white uppercase tracking-tight truncate">
                                            {group.full_name || 'Utilisateur inconnu'}
                                        </p>
                                        <p className="text-[10px] font-mono text-zinc-500 truncate lowercase">{group.email || 'Pas d\'email'}</p>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        {/* Session count badge */}
                                        <span className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                            {group.sessions.length} appareil{group.sessions.length > 1 ? 's' : ''}
                                        </span>

                                        {/* Last seen */}
                                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-zinc-500">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(group.lastSeen).toLocaleString('fr-FR')}</span>
                                        </div>

                                        {/* Disconnect all for user */}
                                        <button
                                            onClick={() => handleDisconnectUser(group.user_id, group.full_name)}
                                            disabled={isRevokingUser}
                                            className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                            title="Déconnecter tous les appareils"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </button>

                                        {/* Expand toggle */}
                                        <button
                                            onClick={() => setExpandedUser(isExpanded ? null : group.user_id)}
                                            className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                                        >
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded session list */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-white/5 divide-y divide-white/5">
                                                {group.sessions.map((session) => {
                                                    const isMobile = /Android|iPhone|iPad|Mobile/i.test(session.user_agent || '');
                                                    const isRevokingSession = isRevoking === session.id;

                                                    return (
                                                        <div key={session.id} className="flex items-center gap-4 px-5 py-3 bg-zinc-950/30">
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isMobile ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                                                                {isMobile ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-zinc-300 truncate">
                                                                    {session.device_name || (isMobile ? 'Mobile' : 'Ordinateur')}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                                                                    <Clock className="w-2.5 h-2.5" />
                                                                    <span>{new Date(session.last_seen).toLocaleString('fr-FR')}</span>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => handleDisconnectSession(session.id, group.user_id)}
                                                                disabled={isRevokingSession}
                                                                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-30"
                                                                title="Révoquer cette session"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
