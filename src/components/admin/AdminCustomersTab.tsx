import React, { useState } from 'react';
import { Search, Coins, ShieldOff, ShieldCheck, Send, CheckCircle2, Eye, MapPin, Package, X, Calendar, Mail, Phone, Award, Clock, Trash2, Plus, Zap, RefreshCw, Check, Truck, Store, ShoppingBag, TrendingUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/types';
import { useSettingsStore } from '../../store/settingsStore';
import { useToastStore } from '../../store/toastStore';

interface AdminCustomersTabProps {
    customers: Profile[];
    onRefresh: () => void;
}

export default function AdminCustomersTab({ customers, onRefresh }: AdminCustomersTabProps) {
    const { settings } = useSettingsStore();
    const { addToast } = useToastStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [sendingAccessId, setSendingAccessId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
    const [customerDetailData, setCustomerDetailData] = useState<{ orders: any[], addresses: any[], loyaltyTxs: any[] } | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);
    const [pointsToAdjust, setPointsToAdjust] = useState<number>(0);
    const [adjustmentNote, setAdjustmentNote] = useState<string>('');

    const handleSendAccess = async (email: string | null, id: string) => {
        if (!email) {
            addToast({ type: 'error', message: "Ce client n'a pas d'adresse email enregistrée." });
            return;
        }

        if (!confirm(`Envoyer un lien d'accès (réinitialisation de mot de passe) à ${email} ?`)) return;

        setSendingAccessId(id);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
            });

            if (error) throw error;

            setSuccessMessage(`Lien envoyé à ${email}`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            addToast({ type: 'error', message: "Erreur lors de l'envoi : " + err.message });
        } finally {
            setSendingAccessId(null);
        }
    };

    const handleDeleteCustomer = async (customer: Profile) => {
        if (!confirm(`Supprimer définitivement le client "${customer.full_name || customer.email}" ? Cette action est irréversible.`)) return;
        const { error } = await supabase.rpc('delete_customer_cascade', { p_user_id: customer.id });
        if (error) {
            addToast({ type: 'error', message: 'Erreur lors de la suppression : ' + error.message });
            return;
        }
        if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
        onRefresh();
    };

    const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
        if (!confirm(currentStatus ? 'Retirer les droits admin ?' : 'Donner les droits admin ?')) return;
        await supabase.from('profiles').update({ is_admin: !currentStatus }).eq('id', userId);
        onRefresh();
    };

    const handleAdjustPoints = async () => {
        if (!selectedCustomer || pointsToAdjust === 0) return;
        setIsAdjustingPoints(true);
        try {
            const newTotal = (selectedCustomer.loyalty_points || 0) + pointsToAdjust;
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ loyalty_points: newTotal })
                .eq('id', selectedCustomer.id);
            if (profileError) throw profileError;
            
            await supabase.from('loyalty_transactions').insert({
                user_id: selectedCustomer.id,
                type: 'adjusted',
                points: pointsToAdjust,
                balance_after: newTotal,
                note: adjustmentNote || 'Ajustement manuel par l\'administrateur'
            });

            setSelectedCustomer({ ...selectedCustomer, loyalty_points: newTotal });
            setPointsToAdjust(0);
            setAdjustmentNote('');
            
            // Refresh detailed history in sidebar
            await loadCustomerDetails(selectedCustomer);
            onRefresh();
        } catch (err) {
            console.error('Error adjusting points:', err);
            addToast({ type: 'error', message: "Erreur lors de l'ajustement des points." });
        } finally {
            setIsAdjustingPoints(false);
        }
    };

    const loadCustomerDetails = async (customer: Profile) => {
        setIsLoadingDetails(true);
        setSelectedCustomer(customer);
        try {
            const [{ data: orders }, { data: addresses }, { data: loyaltyTxs }] = await Promise.all([
                supabase.from('orders').select('*, order_items(*)').eq('user_id', customer.id).order('created_at', { ascending: false }),
                supabase.from('addresses').select('*').eq('user_id', customer.id),
                supabase.from('loyalty_transactions').select('*').eq('user_id', customer.id).order('created_at', { ascending: false })
            ]);
            setCustomerDetailData({ orders: orders || [], addresses: addresses || [], loyaltyTxs: loyaltyTxs || [] });
        } catch (err) {
            console.error("Error loading customer details:", err);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
        pending:    { label: 'En attente',     color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
        paid:       { label: 'Payé',           color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
        processing: { label: 'En préparation', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
        ready:      { label: 'Prêt',           color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20' },
        shipped:    { label: 'Expédié',        color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
        delivered:  { label: 'Livré',          color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
        cancelled:  { label: 'Annulé',         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
    };

    const DELIVERY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
        delivery:      { label: 'Livraison',      icon: <Truck className="w-3 h-3" /> },
        click_collect: { label: 'Click & Collect', icon: <ShoppingBag className="w-3 h-3" /> },
        in_store:      { label: 'En magasin',     icon: <Store className="w-3 h-3" /> },
    };

    const filteredCustomers = customers.filter(
        (c) =>
            !searchQuery ||
            (c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.phone?.includes(searchQuery) ||
                c.id.includes(searchQuery))
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un client…"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-primary"
                    />
                </div>
                <span className="text-sm text-zinc-500">
                    {filteredCustomers.length} client{filteredCustomers.length !== 1 ? 's' : ''}
                </span>
                {successMessage && (
                    <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-xl border border-green-500/20 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {successMessage}
                    </div>
                )}
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                                <th className="px-5 py-3">Client</th>
                                <th className="px-5 py-3">Contact</th>
                                <th className="px-5 py-3 text-center">Points</th>
                                <th className="px-5 py-3">Rôle</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-zinc-800/20 transition-colors group">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                                                {(customer.full_name ?? 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">
                                                    {customer.full_name ?? 'Utilisateur'}
                                                </p>
                                                <p className="text-[10px] text-zinc-500 font-medium">
                                                    Depuis le {new Date(customer.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="space-y-0.5">
                                            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                                                <Mail className="w-3 h-3 opacity-50" />
                                                {customer.email ?? "—"}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                                                <Phone className="w-3 h-3 opacity-50" />
                                                {customer.phone ?? '—'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="inline-flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/10 px-2.5 py-1 rounded-lg">
                                            <Coins className="w-3.5 h-3.5 text-yellow-500" />
                                            <span className="text-xs font-black text-yellow-500">{customer.loyalty_points}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span
                                            className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${customer.is_admin
                                                ? 'text-green-400 bg-green-900/30 border-green-800'
                                                : 'text-zinc-500 bg-zinc-800 border-zinc-700'
                                                }`}
                                        >
                                            {customer.is_admin ? 'Admin' : 'Client'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => loadCustomerDetails(customer)}
                                                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                                title="Voir détails"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleSendAccess(customer.email, customer.id)}
                                                disabled={sendingAccessId === customer.id || !customer.email}
                                                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30"
                                                title="Envoyer lien d'accès"
                                            >
                                                {sendingAccessId === customer.id ? (
                                                    <span className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                                ) : <Send className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleToggleAdmin(customer.id, customer.is_admin)}
                                                className={`p-2 rounded-lg border transition-colors ${customer.is_admin
                                                    ? 'text-red-400 border-red-800 hover:bg-red-900/20'
                                                    : 'text-green-400 border-green-800 hover:bg-green-900/20'
                                                    }`}
                                                title={customer.is_admin ? "Retirer Admin" : "Donner Admin"}
                                            >
                                                {customer.is_admin ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCustomer(customer)}
                                                className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Supprimer le client"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredCustomers.length === 0 && (
                    <p className="text-zinc-500 text-center py-10">Aucun client trouvé.</p>
                )}
            </div>

            {/* Sidebar Détails Client */}
            <AnimatePresence>
                {selectedCustomer && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedCustomer(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-950 border-l border-white/5 z-[101] shadow-2xl flex flex-col"
                        >
                            {/* Header Panel */}
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-black">
                                        {selectedCustomer.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                            {selectedCustomer.full_name || 'Sans nom'}
                                        </h2>
                                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-emerald-400" />
                                            Inscrit le {new Date(selectedCustomer.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-2 text-zinc-500 hover:text-white bg-white/5 border border-white/10 rounded-xl transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content Panel */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl group relative overflow-hidden">
                                        <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                            <Coins className="w-3.5 h-3.5 text-yellow-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Points</span>
                                        </div>
                                        <div className="flex items-end justify-between gap-3">
                                            <p className="text-2xl font-black text-white">{selectedCustomer.loyalty_points}</p>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                            <Package className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Commandes</span>
                                        </div>
                                        <p className="text-2xl font-black text-white">{customerDetailData?.orders.length || 0}</p>
                                    </div>
                                    <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                            <Award className="w-3.5 h-3.5 text-purple-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Referral</span>
                                        </div>
                                        <p className="text-xs font-bold text-white truncate">{selectedCustomer.referral_code || 'Aucun'}</p>
                                    </div>
                                </div>

                                {/* Contact Section */}
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">
                                        <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                        Informations de contact
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Email</p>
                                            <p className="text-sm font-bold text-white truncate">{selectedCustomer.email || 'Non renseigné'}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">Téléphone</p>
                                            <p className="text-sm font-bold text-white">{selectedCustomer.phone || 'Non renseigné'}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* Addresses Section */}
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">
                                        <div className="w-1 h-3 bg-blue-400 rounded-full" />
                                        Adresses enregistrées
                                    </h3>
                                    {isLoadingDetails ? (
                                        <div className="h-20 flex items-center justify-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-zinc-500 text-xs italic">
                                            Chargement des adresses...
                                        </div>
                                    ) : customerDetailData?.addresses.length === 0 ? (
                                        <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/10 text-zinc-500 text-xs text-center italic">
                                            Aucune adresse enregistrée
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {customerDetailData?.addresses.map((addr) => (
                                                <div key={addr.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-start gap-4">
                                                    <div className="p-2 bg-blue-400/10 rounded-xl">
                                                        <MapPin className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{addr.label || 'Adresse'}</p>
                                                        <p className="text-xs text-zinc-500 font-medium">{addr.street}, {addr.postal_code} {addr.city}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* Loyalty Transactions Section */}
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">
                                        Historique & Ajustement
                                    </h3>

                                    {/* Quick Adjustment Tool */}
                                    <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[2rem] space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Points Actuels</p>
                                            <span className="text-sm font-black text-emerald-400">{selectedCustomer.loyalty_points || 0} {settings.loyalty_currency_name}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="number" 
                                                placeholder="± Points"
                                                value={pointsToAdjust || ''}
                                                onChange={(e) => setPointsToAdjust(parseInt(e.target.value) || 0)}
                                                className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500/50"
                                            />
                                            <button 
                                                onClick={handleAdjustPoints}
                                                disabled={isAdjustingPoints || pointsToAdjust === 0}
                                                className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
                                            >
                                                {isAdjustingPoints ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Appliquer'}
                                            </button>
                                        </div>
                                        <input 
                                            placeholder="Note (ex: Remboursement, Geste...)"
                                            value={adjustmentNote}
                                            onChange={(e) => setAdjustmentNote(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[10px] text-zinc-400 outline-none focus:border-white/20"
                                        />
                                    </div>
                                    {isLoadingDetails ? (
                                        <div className="h-20 flex items-center justify-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-zinc-500 text-xs italic">
                                            Chargement...
                                        </div>
                                    ) : customerDetailData?.loyaltyTxs.length === 0 ? (
                                        <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/10 text-zinc-500 text-xs text-center italic">
                                            Aucune transaction
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {customerDetailData?.loyaltyTxs.slice(0, 5).map((tx) => (
                                                <div key={tx.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${
                                                            tx.type === 'earned' ? 'bg-green-500/10 text-green-500' :
                                                            tx.type === 'redeemed' ? 'bg-red-500/10 text-red-500' :
                                                            tx.type === 'referral' ? 'bg-purple-500/10 text-purple-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                        }`}>
                                                            {tx.type === 'earned' || (tx.type === 'adjusted' && tx.points >= 0) ? <Plus className="w-4 h-4" /> : 
                                                             tx.type === 'redeemed' || (tx.type === 'adjusted' && tx.points < 0) ? <Zap className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-white tracking-wide">{tx.note || tx.type}</p>
                                                            <p className="text-[10px] text-zinc-500 uppercase">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black ${tx.points >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                                            {tx.points >= 0 ? '+' : ''}{tx.points}
                                                        </p>
                                                        <p className="text-[9px] text-zinc-600 font-bold uppercase">Solde: {tx.balance_after}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* Recent Orders Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600 flex items-center gap-2">
                                            <div className="w-1 h-3 bg-purple-400 rounded-full" />
                                            Dernières Commandes
                                        </h3>
                                        {!isLoadingDetails && (customerDetailData?.orders.length ?? 0) > 0 && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold">
                                                    <TrendingUp className="w-3 h-3 text-purple-400" />
                                                    <span className="text-white font-black">
                                                        {customerDetailData!.orders.reduce((s, o) => s + o.total, 0).toFixed(2)}€
                                                    </span>
                                                    <span>total</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-600 font-bold">
                                                    {customerDetailData!.orders.length} commande{customerDetailData!.orders.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {isLoadingDetails ? (
                                        <div className="h-40 flex items-center justify-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-zinc-500 text-xs italic">
                                            Chargement de l'historique...
                                        </div>
                                    ) : customerDetailData?.orders.length === 0 ? (
                                        <div className="p-10 bg-white/5 rounded-2xl border border-dashed border-white/10 text-zinc-500 text-xs text-center italic">
                                            Aucune commande passée
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {customerDetailData?.orders.slice(0, 5).map((order) => {
                                                const st = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' };
                                                const dl = DELIVERY_CONFIG[order.delivery_type];
                                                return (
                                                    <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                                                        <div className="p-4 flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-purple-400/10 rounded-xl text-purple-400">
                                                                    <Package className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-black text-white uppercase tracking-tighter">#{order.id.slice(0, 8)}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] text-zinc-600 font-bold flex items-center gap-1">
                                                                            <Calendar className="w-2.5 h-2.5" />
                                                                            {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </span>
                                                                        {dl && (
                                                                            <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-1">
                                                                                {dl.icon}{dl.label}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end gap-1.5">
                                                                <p className="text-sm font-black text-white">{order.total.toFixed(2)}€</p>
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${st.color} ${st.bg} ${st.border}`}>
                                                                    {st.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {order.order_items?.length > 0 && (
                                                            <div className="px-4 pb-3 space-y-1 border-t border-white/5 pt-3">
                                                                {order.order_items.map((item: any, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center text-[10px]">
                                                                        <span className="text-zinc-400 font-medium">
                                                                            <span className="text-zinc-600 font-black mr-1">×{item.quantity}</span>
                                                                            {item.product_name}
                                                                        </span>
                                                                        <span className="text-zinc-500 font-bold">{(item.unit_price * item.quantity).toFixed(2)}€</span>
                                                                    </div>
                                                                ))}
                                                                {order.promo_code && (
                                                                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-white/5">
                                                                        <span className="text-green-400 font-bold">Promo: {order.promo_code}</span>
                                                                        <span className="text-green-400 font-bold">−{order.promo_discount.toFixed(2)}€</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {(customerDetailData?.orders.length ?? 0) > 5 && (
                                                <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-600 font-bold py-2">
                                                    <ChevronDown className="w-3 h-3" />
                                                    {customerDetailData!.orders.length - 5} commande{customerDetailData!.orders.length - 5 > 1 ? 's' : ''} supplémentaire{customerDetailData!.orders.length - 5 > 1 ? 's' : ''} non affichée{customerDetailData!.orders.length - 5 > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

