import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
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
    ChevronDown,
    ArrowRight,
    Filter,
    BarChart3,
    RefreshCw,
    ArrowUpDown,
    Printer,
    Eye,
    Timer,
    TrendingUp,
    Zap,
    AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order, OrderItem } from '../../lib/types';

const KANBAN_COLUMNS = [
    { id: 'pending', title: 'En attente', icon: Clock, color: '#eab308', bgColor: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.15)' },
    { id: 'paid', title: 'Payées', icon: CheckCircle2, color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.15)' },
    { id: 'processing', title: 'Préparation', icon: Package, color: '#a855f7', bgColor: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.15)' },
    { id: 'ready', title: 'Prêtes', icon: Store, color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.15)' },
    { id: 'shipped', title: 'Expédiées', icon: Truck, color: '#0ea5e9', bgColor: 'rgba(14,165,233,0.1)', borderColor: 'rgba(14,165,233,0.15)' },
    { id: 'delivered', title: 'Livrées', icon: CheckCircle2, color: '#10b981', bgColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.15)' },
];

type SortMode = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

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
    const [sortMode, setSortMode] = useState<SortMode>('newest');
    const [collapsedCols, setCollapsedCols] = useState<string[]>([]);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const filteredOrders = useMemo(() => {
        let result = orders.filter(o => {
            const matchesSearch = o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.profile?.full_name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDelivery = !deliveryFilter || o.delivery_type === deliveryFilter;
            return matchesSearch && matchesDelivery;
        });

        // Sort
        result.sort((a, b) => {
            switch (sortMode) {
                case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'amount_desc': return Number(b.total) - Number(a.total);
                case 'amount_asc': return Number(a.total) - Number(b.total);
                default: return 0;
            }
        });

        return result;
    }, [orders, searchQuery, deliveryFilter, sortMode]);

    const stats = useMemo(() => {
        const now = new Date();
        const today = new Date(now); today.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
        const paidToday = todayOrders.filter(o => o.payment_status === 'paid');

        // Average processing time (pending → delivered) for delivered orders
        const deliveredOrders = orders.filter(o => o.status === 'delivered');

        return {
            totalToday: todayOrders.length,
            revenueToday: paidToday.reduce((acc, o) => acc + Number(o.total), 0),
            pendingCount: orders.filter(o => o.status === 'pending').length,
            processingCount: orders.filter(o => o.status === 'processing').length,
            readyCount: orders.filter(o => o.status === 'ready').length,
            shippedCount: orders.filter(o => o.status === 'shipped').length,
            deliveredCount: deliveredOrders.length,
            totalOrders: orders.length,
            avgOrderValue: paidToday.length ? paidToday.reduce((a, o) => a + Number(o.total), 0) / paidToday.length : 0,
        };
    }, [orders]);

    const handleUpdateStatus = useCallback(async (orderId: string, newStatus: string) => {
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
    }, [onRefresh]);

    const getColumnOrders = useCallback((status: string) => {
        return filteredOrders.filter(o => o.status === status);
    }, [filteredOrders]);

    const toggleCollapse = (colId: string) => {
        setCollapsedCols(prev => prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]);
    };

    // Progress pipeline percentage
    const pipelineTotal = stats.totalOrders || 1;
    const pipelineData = KANBAN_COLUMNS.map(col => ({
        ...col,
        count: orders.filter(o => o.status === col.id).length,
        pct: Math.round((orders.filter(o => o.status === col.id).length / pipelineTotal) * 100),
    }));

    return (
        <div className={`flex flex-col h-full transition-all duration-500 overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100]' : 'min-h-[700px] rounded-3xl border border-white/[0.04]'}`}
            style={{ background: 'linear-gradient(180deg, rgba(8,12,20,0.97) 0%, rgba(5,8,16,0.99) 100%)' }}>

            {/* ═══ Header ═══ */}
            <div className="shrink-0 px-8 py-6 flex items-center justify-between gap-6 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-5">
                    {isFullScreen && onBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.04] transition-all text-sm group"
                            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Retour
                        </button>
                    )}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 0 24px rgba(16,185,129,0.15)' }}>
                            <LayoutDashboard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Suivi des Commandes</h2>
                            <p className="text-xs text-white/30">{stats.totalOrders} commandes · {stats.pendingCount} en attente</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher #id, client…"
                            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}
                        />
                    </div>
                    <button
                        onClick={onToggleFullScreen}
                        className="p-2.5 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                        title={isFullScreen ? "Réduire" : "Plein écran"}
                    >
                        {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onRefresh}
                        className="p-2.5 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                        title="Actualiser"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ═══ Stats + Pipeline + Filters ═══ */}
            <div className="shrink-0 px-8 py-5 flex flex-col gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Stats row */}
                <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Aujourd'hui</span>
                    </div>

                    <div className="flex items-center gap-5">
                        <StatPill label="Commandes" value={stats.totalToday} color="#10b981" />
                        <div className="w-px h-5 bg-white/[0.06]" />
                        <StatPill label="Chiffre" value={`${stats.revenueToday.toFixed(0)} €`} color="#10b981" />
                        <div className="w-px h-5 bg-white/[0.06]" />
                        <StatPill label="Panier moy." value={`${stats.avgOrderValue.toFixed(0)} €`} color="#3b82f6" />
                        <div className="w-px h-5 bg-white/[0.06]" />
                        <StatPill label="En attente" value={stats.pendingCount} color="#eab308" highlight={stats.pendingCount > 5} />
                        <div className="w-px h-5 bg-white/[0.06]" />
                        <StatPill label="Prépa." value={stats.processingCount} color="#a855f7" />
                    </div>

                    {/* Filters (right) */}
                    <div className="flex items-center gap-2 ml-auto">
                        {/* Sort */}
                        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button
                                onClick={() => setSortMode(prev => prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'amount_desc' : prev === 'amount_desc' ? 'amount_asc' : 'newest')}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-white/30 hover:text-white/60 transition-colors"
                            >
                                <ArrowUpDown className="w-3 h-3" />
                                {sortMode === 'newest' ? 'Récent' : sortMode === 'oldest' ? 'Ancien' : sortMode === 'amount_desc' ? '€ ↓' : '€ ↑'}
                            </button>
                        </div>

                        {/* Delivery type filter */}
                        <div className="flex items-center gap-0.5 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {[
                                { key: null, label: 'Tout', color: '#10b981' },
                                { key: 'click_collect', label: 'Retrait', color: '#a855f7' },
                                { key: 'delivery', label: 'Livraison', color: '#0ea5e9' },
                            ].map(f => (
                                <button
                                    key={f.key ?? 'all'}
                                    onClick={() => setDeliveryFilter(f.key)}
                                    className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all"
                                    style={{
                                        color: deliveryFilter === f.key ? '#fff' : 'rgba(255,255,255,0.3)',
                                        background: deliveryFilter === f.key ? `${f.color}20` : 'transparent',
                                        boxShadow: deliveryFilter === f.key ? `inset 0 0 0 1px ${f.color}40` : 'none',
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pipeline bar */}
                <div className="flex items-center gap-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {pipelineData.map(col => (
                        <motion.div
                            key={col.id}
                            className="h-full rounded-full"
                            style={{ backgroundColor: col.color, opacity: col.count > 0 ? 0.7 : 0.1 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(col.pct, col.count > 0 ? 2 : 0.5)}%` }}
                            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                        />
                    ))}
                </div>
            </div>

            {/* ═══ Kanban Columns ═══ */}
            <div className="flex-1 overflow-x-auto px-6 py-5 flex gap-4 min-h-0 kanban-scroll">
                {KANBAN_COLUMNS.map((col) => {
                    const colOrders = getColumnOrders(col.id);
                    const isCollapsed = collapsedCols.includes(col.id);
                    const isDragTarget = dragOverCol === col.id;

                    if (isCollapsed) {
                        return (
                            <div
                                key={col.id}
                                onClick={() => toggleCollapse(col.id)}
                                className="flex-shrink-0 w-14 flex flex-col items-center py-5 rounded-2xl cursor-pointer hover:bg-white/[0.03] transition-all"
                                style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const id = e.dataTransfer.getData('orderId');
                                    if (id) handleUpdateStatus(id, col.id);
                                    setDragOverCol(null);
                                }}
                            >
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: col.bgColor }}>
                                    <col.icon className="w-3.5 h-3.5" style={{ color: col.color }} />
                                </div>
                                <span className="text-[10px] font-bold text-white/30 [writing-mode:vertical-lr] rotate-180 tracking-wider">{col.title}</span>
                                <span className="mt-2 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                                    style={{ backgroundColor: col.bgColor, color: col.color }}>
                                    {colOrders.length}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={col.id}
                            className="flex-1 min-w-[240px] max-w-[400px] flex flex-col rounded-2xl transition-all duration-200"
                            style={{
                                background: isDragTarget ? `${col.bgColor}` : 'rgba(255,255,255,0.015)',
                                border: `1px solid ${isDragTarget ? col.borderColor : 'rgba(255,255,255,0.04)'}`,
                                boxShadow: isDragTarget ? `0 0 30px ${col.color}10` : 'none',
                            }}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: col.bgColor }}>
                                        <col.icon className="w-3.5 h-3.5" style={{ color: col.color }} />
                                    </div>
                                    <h3 className="font-semibold text-xs text-white/60 uppercase tracking-wider">{col.title}</h3>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: col.bgColor, color: col.color }}>
                                        {colOrders.length}
                                    </span>
                                </div>
                                <button
                                    onClick={() => toggleCollapse(col.id)}
                                    className="p-1 rounded-md text-white/15 hover:text-white/40 hover:bg-white/[0.04] transition-all"
                                    title="Réduire"
                                >
                                    <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                                </button>
                            </div>

                            {/* Cards Area */}
                            <div
                                className="flex-1 overflow-y-auto p-3 space-y-2.5 kanban-scroll"
                                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                                onDragLeave={() => setDragOverCol(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const id = e.dataTransfer.getData('orderId');
                                    if (id) handleUpdateStatus(id, col.id);
                                    setDragOverCol(null);
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {colOrders.map((order) => (
                                        <KanbanCard
                                            key={order.id}
                                            order={order}
                                            colColor={col.color}
                                            onDragStart={() => setDraggingId(order.id)}
                                            onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                                            onClick={() => setSelectedOrder(order)}
                                            isDragging={draggingId === order.id}
                                        />
                                    ))}
                                </AnimatePresence>
                                {colOrders.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center py-10">
                                        <Package className="w-8 h-8 text-white/[0.06] mb-2" />
                                        <p className="text-[10px] text-white/10">Aucune commande</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
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
                .kanban-scroll::-webkit-scrollbar { width: 4px; height: 6px; }
                .kanban-scroll::-webkit-scrollbar-track { background: transparent; }
                .kanban-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
                .kanban-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
                .kanban-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.06) transparent; }
            `}</style>
        </div>
    );
}

/* ─── Stat Pill ─── */
function StatPill({ label, value, color, highlight }: { label: string; value: string | number; color: string; highlight?: boolean }) {
    return (
        <div className="flex flex-col">
            <span className="text-[9px] text-white/25 uppercase tracking-widest font-medium">{label}</span>
            <span className={`text-sm font-bold ${highlight ? 'animate-pulse' : ''}`} style={{ color }}>
                {value}
            </span>
        </div>
    );
}

/* ─── Kanban Card ─── */
function KanbanCard({ order, colColor, onDragStart, onDragEnd, onClick, isDragging }: {
    order: Order; colColor: string; onDragStart: () => void; onDragEnd: () => void; onClick: () => void; isDragging: boolean;
}) {
    const items = order.order_items as OrderItem[] | undefined;
    const minutesAgo = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000);
    const isUrgent = order.status === 'pending' && minutesAgo > 30;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -1 }}
            draggable
            onDragStart={(e: any) => {
                e.dataTransfer.setData('orderId', order.id);
                onDragStart();
            }}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className={`group relative p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${isDragging ? 'opacity-30 scale-95' : ''}`}
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)'}`,
                boxShadow: isUrgent ? '0 0 20px rgba(239,68,68,0.05)' : 'none',
            }}
        >
            {/* Urgent badge */}
            {isUrgent && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center animate-pulse"
                    style={{ boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}>
                    <AlertTriangle className="w-3 h-3 text-white" />
                </div>
            )}

            {/* Top row: ID + delivery badge */}
            <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-mono text-white/25 tracking-tight">
                    #{order.id.slice(0, 8)}
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold" style={{
                    color: order.delivery_type === 'click_collect' ? '#a855f7' :
                        order.delivery_type === 'in_store' ? '#f59e0b' : '#0ea5e9',
                    background: order.delivery_type === 'click_collect' ? 'rgba(168,85,247,0.1)' :
                        order.delivery_type === 'in_store' ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.1)',
                }}>
                    {order.delivery_type === 'click_collect' ? 'Retrait' :
                        order.delivery_type === 'in_store' ? 'Boutique' : 'Livraison'}
                </span>
            </div>

            {/* Client name */}
            <h4 className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors truncate mb-2">
                {order.profile?.full_name ?? 'Client Inconnu'}
            </h4>

            {/* Time + payment */}
            <div className="flex items-center gap-3 mb-3.5">
                <span className="text-[11px] text-white/20 flex items-center gap-1.5">
                    <Timer className="w-3 h-3" />
                    {minutesAgo < 60 ? `${minutesAgo}m` : `${Math.floor(minutesAgo / 60)}h${minutesAgo % 60}m`}
                </span>
                {order.payment_status === 'paid' && (
                    <span className="text-[10px] font-bold text-emerald-400/70 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Payé
                    </span>
                )}
            </div>

            {/* Items preview */}
            <div className="space-y-1.5 mb-3.5">
                {(items ?? []).slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                        <span className="text-white/30 truncate flex-1 pr-3">{item.product_name}</span>
                        <span className="text-white/15 font-mono">×{item.quantity}</span>
                    </div>
                ))}
                {(items?.length ?? 0) > 2 && (
                    <p className="text-[11px] text-white/15 italic">+{items!.length - 2} autres…</p>
                )}
            </div>

            {/* Footer: total + arrow */}
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-[15px] font-bold text-white/80">{Number(order.total).toFixed(2)} €</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white/10 group-hover:text-white/30 transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Eye className="w-3.5 h-3.5" />
                </div>
            </div>
        </motion.div>
    );
}

/* ─── Order Detail Sidepanel ─── */
function OrderDetailSidepanel({ order, onClose, onUpdateStatus }: { order: Order; onClose: () => void; onUpdateStatus: (id: string, s: string) => void }) {
    const items = order.order_items as OrderItem[] | undefined;
    const profile = order.profile;
    const currentColIndex = KANBAN_COLUMNS.findIndex(c => c.id === order.status);
    const currentCol = KANBAN_COLUMNS[currentColIndex];
    const nextCol = KANBAN_COLUMNS[currentColIndex + 1];

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[110]"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md z-[120] flex flex-col overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg, rgba(8,12,20,0.99) 0%, rgba(4,6,14,1) 100%)',
                    borderLeft: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {/* Header */}
                <div className="p-6 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-mono text-white/25 px-2 py-0.5 rounded"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                #{order.id.slice(0, 8)}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                                style={{ backgroundColor: currentCol?.bgColor, color: currentCol?.color }}>
                                {currentCol?.title || order.status}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white">Détails de la commande</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <XCircle className="w-5 h-5" />
                    </button>
                </div>

                {/* ─ Status Pipeline ─ */}
                <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-1">
                        {KANBAN_COLUMNS.map((col, idx) => (
                            <div key={col.id} className="flex items-center flex-1">
                                <div className="flex-1 h-1 rounded-full transition-all"
                                    style={{
                                        backgroundColor: idx <= currentColIndex ? col.color : 'rgba(255,255,255,0.04)',
                                        opacity: idx <= currentColIndex ? 0.7 : 1,
                                    }} />
                                {idx < KANBAN_COLUMNS.length - 1 && <div className="w-1" />}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-1.5">
                        {KANBAN_COLUMNS.map((col, idx) => (
                            <span key={col.id} className="text-[8px] font-bold uppercase tracking-wider"
                                style={{ color: idx <= currentColIndex ? col.color : 'rgba(255,255,255,0.1)' }}>
                                {col.title}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 kanban-scroll">
                    {/* Customer */}
                    <Section icon={User} title="Client" color="#10b981">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white/60"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {(profile?.full_name ?? 'C')[0]}
                            </div>
                            <div>
                                <h5 className="font-semibold text-white/80 text-sm">{profile?.full_name ?? 'Anonyme'}</h5>
                                <p className="text-[10px] text-white/20">{profile?.id?.slice(0, 8)}…</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {profile?.email && <InfoRow icon={Mail} text={profile.email} />}
                            {profile?.phone && <InfoRow icon={Phone} text={profile.phone} />}
                        </div>
                    </Section>

                    {/* Delivery */}
                    <Section icon={MapPin} title="Livraison" color="#0ea5e9">
                        <p className="text-xs text-white/50 font-medium mb-1">
                            {order.delivery_type === 'delivery' ? 'Expédition à domicile' :
                                order.delivery_type === 'click_collect' ? 'Retrait en magasin' : 'Achat direct'}
                        </p>
                        <p className="text-xs text-white/30 leading-relaxed">
                            {order.address ? (
                                <>{order.address.street}<br />{order.address.postal_code} {order.address.city}, {order.address.country}</>
                            ) : 'Pas d\'adresse spécifiée'}
                        </p>
                    </Section>

                    {/* Notes */}
                    {order.notes && (
                        <Section icon={History} title="Note" color="#f59e0b">
                            <p className="text-xs text-white/40 italic leading-relaxed">"{order.notes}"</p>
                        </Section>
                    )}

                    {/* Items */}
                    <Section icon={ShoppingBag} title={`Articles (${items?.length ?? 0})`} color="#10b981">
                        <div className="space-y-2">
                            {items?.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                            style={{ background: 'rgba(255,255,255,0.03)' }}>
                                            <Package className="w-4 h-4 text-white/15" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-white/60">{item.product_name}</p>
                                            <p className="text-[10px] text-white/20">×{item.quantity}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-white/60">{item.total_price.toFixed(2)} €</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Payment Summary */}
                    <Section icon={CreditCard} title="Résumé" color="#10b981">
                        <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/25">Sous-total</span>
                                    <span className="text-white/50">{Number(order.total).toFixed(2)} €</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/25">Livraison</span>
                                    <span className="text-white/50">0.00 €</span>
                                </div>
                                <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm text-white/60">Total</span>
                                    <span className="text-xl font-black" style={{ color: '#10b981' }}>{Number(order.total).toFixed(2)} €</span>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg flex items-center gap-2.5" style={{
                                background: order.payment_status === 'paid' ? 'rgba(16,185,129,0.06)' : 'rgba(234,179,8,0.06)',
                                border: `1px solid ${order.payment_status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(234,179,8,0.15)'}`,
                            }}>
                                {order.payment_status === 'paid' ? <CheckCircle2 className="w-4 h-4 text-emerald-400/70" /> : <Clock className="w-4 h-4 text-yellow-400/70" />}
                                <span className="text-[11px] font-bold" style={{ color: order.payment_status === 'paid' ? '#10b981' : '#eab308' }}>
                                    {order.payment_status === 'paid' ? 'Paiement confirmé' : 'Paiement en attente'}
                                </span>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Actions Footer */}
                <div className="p-5 shrink-0 flex gap-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {nextCol && (
                        <button
                            onClick={() => onUpdateStatus(order.id, nextCol.id)}
                            className="flex-1 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            style={{
                                backgroundColor: nextCol.color,
                                color: '#000',
                                boxShadow: `0 0 24px ${nextCol.color}25`,
                            }}
                        >
                            <nextCol.icon className="w-4 h-4" />
                            {nextCol.title}
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => window.print()}
                        className="p-3.5 rounded-xl text-white/20 hover:text-white/40 hover:bg-white/[0.04] transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                        title="Imprimer"
                    >
                        <Printer className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </>
    );
}

/* ─── Section wrapper ─── */
function Section({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) {
    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <Icon className="w-3.5 h-3.5" style={{ color, opacity: 0.6 }} />
                <h4 className="text-[10px] font-bold text-white/25 uppercase tracking-[0.15em]">{title}</h4>
            </div>
            {children}
        </section>
    );
}

/* ─── Info Row ─── */
function InfoRow({ icon: Icon, text }: { icon: any; text: string }) {
    return (
        <div className="flex items-center gap-2.5 text-xs text-white/35">
            <Icon className="w-3.5 h-3.5 text-white/15" />
            <span>{text}</span>
        </div>
    );
}
