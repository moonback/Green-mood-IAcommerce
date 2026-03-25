import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    MoreVertical,
    Maximize2,
    Minimize2,
    Clock,
    CheckCircle2,
    Package,
    Truck,
    XCircle,
    ShoppingBag,
    Store,
    LayoutDashboard,
    ChevronLeft,
    Calendar,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    History,
    ChevronRight,
    ArrowRight,
    Filter,
    BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order, OrderItem } from '../../lib/types';

const KANBAN_COLUMNS = [
    { id: 'pending', title: 'Attente', icon: Clock, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
    { id: 'paid', title: 'Payé', icon: CheckCircle2, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
    { id: 'processing', title: 'Prép.', icon: Package, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
    { id: 'ready', title: 'Prêt', icon: Store, color: 'text-green-400', bgColor: 'bg-green-400/10' },
    { id: 'shipped', title: 'Livr.', icon: Truck, color: 'text-sky-400', bgColor: 'bg-sky-400/10' },
    { id: 'delivered', title: 'Livré', icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
];

interface AdminKanbanTabProps {
    orders: Order[];
    onRefresh: () => void;
    isFullScreen: boolean;
    onToggleFullScreen: () => void;
    onBack?: () => void;
}

export default function AdminKanbanTab({ orders, onRefresh, isFullScreen, onToggleFullScreen, onBack }: AdminKanbanTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [deliveryFilter, setDeliveryFilter] = useState<string | null>(null);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.profile?.full_name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDelivery = !deliveryFilter || o.delivery_type === deliveryFilter;
            return matchesSearch && matchesDelivery;
        });
    }, [orders, searchQuery, deliveryFilter]);

    const stats = useMemo(() => {
        const now = new Date();
        const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
        return {
            totalToday: todayOrders.length,
            revenueToday: todayOrders.filter(o => o.payment_status === 'paid').reduce((acc, o) => acc + Number(o.total), 0),
            pendingCount: orders.filter(o => o.status === 'pending').length,
            processingCount: orders.filter(o => o.status === 'processing').length,
        };
    }, [orders]);

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            onRefresh();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const getColumnOrders = (status: string) => {
        return filteredOrders.filter(o => o.status === status);
    };

    return (
        <div className={`flex flex-col h-full bg-black/40 rounded-3xl border border-white/5 backdrop-blur-xl transition-all duration-500 overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100] rounded-none border-none' : 'min-h-[700px]'}`}>
            {/* Header Area */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between gap-6 flex-wrap shrink-0">
                <div className="flex items-center gap-6">
                    {isFullScreen && onBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all font-bold text-sm group"
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Retour
                        </button>
                    )}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-primary to-emerald-600 flex items-center justify-center shadow-lg shadow-green-primary/20">
                            <LayoutDashboard className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Tableau de Bord Kanban</h2>
                            <p className="text-sm text-zinc-400">Gérez le flux de vos commandes en temps réel</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher une commande ou un client..."
                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-primary transition-all backdrop-blur-md"
                        />
                    </div>
                    <button
                        onClick={onToggleFullScreen}
                        className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-xl"
                        title={isFullScreen ? "Réduire" : "Plein écran"}
                    >
                        {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                    {isFullScreen && (
                        <button
                            onClick={onRefresh}
                            className="px-5 py-3 rounded-2xl bg-green-primary text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-green-primary/20"
                        >
                            Actualiser
                        </button>
                    )}
                </div>
            </div>

            {/* Filters & Quick Stats Bar */}
            <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-green-primary" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Aujourd'hui:</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-500">Commandes</span>
                            <span className="text-sm font-bold text-white">{stats.totalToday}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-500">Chiffre d'Affaires</span>
                            <span className="text-sm font-bold text-green-primary">{stats.revenueToday.toFixed(2)} €</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-xs text-zinc-500">En Attente</span>
                            <span className="text-sm font-bold text-yellow-400">{stats.pendingCount}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setDeliveryFilter(null)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!deliveryFilter ? 'bg-green-primary text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Tout
                        </button>
                        <button
                            onClick={() => setDeliveryFilter('click_collect')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${deliveryFilter === 'click_collect' ? 'bg-purple-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Retrait
                        </button>
                        <button
                            onClick={() => setDeliveryFilter('delivery')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${deliveryFilter === 'delivery' ? 'bg-sky-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            Livraison
                        </button>
                    </div>
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="flex-1 overflow-x-auto p-4 flex gap-3 min-h-0 custom-scrollbar">
                {KANBAN_COLUMNS.map((col) => {
                    const colOrders = getColumnOrders(col.id);
                    return (
                        <div
                            key={col.id}
                            className="flex-shrink-0 w-[240px] flex flex-col bg-zinc-900/30 rounded-3xl border border-white/5"
                        >
                            {/* Column Header */}
                            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-zinc-900/20 rounded-t-3xl">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${col.bgColor}`}>
                                        <col.icon className={`w-4 h-4 ${col.color}`} />
                                    </div>
                                    <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wider">{col.title}</h3>
                                    <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        {colOrders.length}
                                    </span>
                                </div>
                                <button className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Cards Area */}
                            <div
                                className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const id = e.dataTransfer.getData('orderId');
                                    if (id) handleUpdateStatus(id, col.id);
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {colOrders.map((order) => (
                                        <KanbanCard
                                            key={order.id}
                                            order={order}
                                            onDragStart={() => setDraggingId(order.id)}
                                            onDragEnd={() => setDraggingId(null)}
                                            onClick={() => setSelectedOrder(order)}
                                            isDragging={draggingId === order.id}
                                        />
                                    ))}
                                </AnimatePresence>
                                {colOrders.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                        <Package className="w-12 h-12 mb-2" />
                                        <p className="text-xs">Aucune commande</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="flex-shrink-0 w-10" /> {/* Larger Spacer at the end */}
            </div>

            {/* Order Detail Sidepanel */}
            <AnimatePresence>
                {selectedOrder && (
                    <OrderDetailSidepanel
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        onUpdateStatus={handleUpdateStatus}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                    border: 2px solid rgba(0, 0, 0, 0.3);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(57, 255, 20, 0.3);
                }
            `}</style>
        </div>
    );
}

function KanbanCard({ order, onDragStart, onDragEnd, onClick, isDragging }: { order: Order; onDragStart: () => void; onDragEnd: () => void; onClick: () => void; isDragging: boolean }) {
    const items = order.order_items as OrderItem[] | undefined;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -2 }}
            draggable
            onDragStart={(e: any) => {
                e.dataTransfer.setData('orderId', order.id);
                onDragStart();
            }}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className={`group bg-zinc-900 border border-white/5 p-3 rounded-xl hover:border-green-primary/30 transition-all cursor-grab active:cursor-grabbing shadow-lg relative ${isDragging ? 'opacity-40 grayscale' : ''}`}
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                    #{order.id.slice(0, 8)}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/5 ${order.delivery_type === 'click_collect' ? 'text-purple-400' :
                    order.delivery_type === 'in_store' ? 'text-orange-400' : 'text-sky-400'
                    }`}>
                    {order.delivery_type === 'click_collect' ? 'Retrait' :
                        order.delivery_type === 'in_store' ? 'Boutique' : 'Livraison'}
                </span>
            </div>

            <div className="mb-2">
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {order.profile?.full_name ?? 'Client Inconnu'}
                </h4>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className="text-[9px] text-zinc-500 font-medium">
                        {Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000)} min
                    </span>
                </div>
                {order.payment_status === 'paid' && (
                    <div className="mt-1.5">
                        <span className="text-[8px] bg-green-primary/20 text-green-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest">Payé</span>
                    </div>
                )}
            </div>

            <div className="space-y-0.5 mb-3">
                {(items ?? []).slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] text-zinc-400">
                        <span className="line-clamp-1 flex-1">{item.product_name}</span>
                        <span className="ml-2 px-1 rounded bg-white/5 ring-1 ring-white/10">×{item.quantity}</span>
                    </div>
                ))}
                {(items?.length ?? 0) > 2 && (
                    <p className="text-[10px] text-green-primary/60 italic">+{items!.length - 2} autres produits...</p>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="text-sm font-black text-white">
                    {order.total.toFixed(2)} €
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                        <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-white" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function OrderDetailSidepanel({ order, onClose, onUpdateStatus }: { order: Order; onClose: () => void; onUpdateStatus: (id: string, s: string) => void }) {
    const items = order.order_items as OrderItem[] | undefined;
    const profile = order.profile;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 shadow-2xl z-[120] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-zinc-900 to-zinc-950 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                #{order.id.slice(0, 8)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                {order.status.toUpperCase()}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white">Détails de la Commande</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Customer Info */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-4 h-4 text-green-primary" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Client</h4>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-lg font-bold text-white">
                                    {(profile?.full_name ?? 'C')[0]}
                                </div>
                                <div>
                                    <h5 className="font-bold text-white">{profile?.full_name ?? 'Client Anonyme'}</h5>
                                    <p className="text-xs text-zinc-500">ID: {profile?.id.slice(0, 8)}...</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {profile?.email && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <Mail className="w-4 h-4" />
                                        <span>{profile.email}</span>
                                    </div>
                                )}
                                {profile?.phone && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <Phone className="w-4 h-4" />
                                        <span>{profile.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Delivery Address */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-4 h-4 text-green-primary" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Livraison</h4>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <p className="text-sm text-white font-medium mb-1">
                                {order.delivery_type === 'delivery' ? 'Expédition à domicile' : 
                                 order.delivery_type === 'click_collect' ? 'Retrait en magasin' : 'Achat direct'}
                            </p>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                {order.address ? (
                                    <>
                                        {order.address.street}<br />
                                        {order.address.postal_code} {order.address.city}, {order.address.country}
                                    </>
                                ) : 'Pas d\'adresse spécifiée'}
                            </p>
                        </div>
                    </section>

                    {/* Order Notes */}
                    {order.notes && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <History className="w-4 h-4 text-orange-400" />
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Note Client</h4>
                            </div>
                            <div className="bg-orange-500/5 rounded-2xl p-4 border border-orange-500/10 italic text-sm text-zinc-300">
                                "{order.notes}"
                            </div>
                        </section>
                    )}

                    {/* Order Items */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingBag className="w-4 h-4 text-green-primary" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Articles ({items?.length ?? 0})</h4>
                        </div>
                        <div className="space-y-3">
                            {items?.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                                            <Package className="w-5 h-5 text-zinc-600 group-hover:text-green-primary transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{item.product_name}</p>
                                            <p className="text-[10px] text-zinc-500">Quantité: {item.quantity}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">{item.unit_price.toFixed(2)} €</p>
                                        <p className="text-[10px] text-zinc-500">Total: {item.total_price.toFixed(2)} €</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Payment Summary */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard className="w-4 h-4 text-green-primary" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Résumé</h4>
                        </div>
                        <div className="bg-gradient-to-br from-zinc-900 to-black rounded-2xl p-6 border border-white/10 shadow-xl">
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Sous-total</span>
                                    <span className="text-zinc-100">{order.total.toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500">Frais de livraison</span>
                                    <span className="text-zinc-100">0.00 €</span>
                                </div>
                                <div className="h-px bg-white/5 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-zinc-100">Total</span>
                                    <span className="text-2xl font-black text-green-primary">{order.total.toFixed(2)} €</span>
                                </div>
                            </div>
                            
                            <div className={`p-3 rounded-xl flex items-center gap-3 ${order.payment_status === 'paid' ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                                {order.payment_status === 'paid' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Clock className="w-5 h-5 text-yellow-400" />}
                                <div>
                                    <p className={`text-xs font-bold ${order.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {order.payment_status === 'paid' ? 'Paiement confirmé' : 'Paiement en attente'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-white/10 bg-zinc-950 flex gap-3">
                    {order.status !== 'ready' && order.status !== 'shipped' && order.status !== 'delivered' && (
                        <button
                            onClick={() => onUpdateStatus(order.id, 'ready')}
                            className="flex-1 bg-green-primary text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-primary/20 flex items-center justify-center gap-2"
                        >
                            <Package className="w-5 h-5" />
                            Marquer comme Prêt
                        </button>
                    )}
                    {order.status === 'ready' && (
                        <button
                            onClick={() => onUpdateStatus(order.id, order.delivery_type === 'delivery' ? 'shipped' : 'delivered')}
                            className="flex-1 bg-sky-500 text-white font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                        >
                            <Truck className="w-5 h-5" />
                            {order.delivery_type === 'delivery' ? 'Expédier' : 'Remettre au client'}
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="p-4 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all"
                        title="Imprimer le ticket"
                    >
                        <Maximize2 className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>
        </>
    );
}
