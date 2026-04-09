import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    MoreVertical,
    Maximize2,
    Minimize2,
    Clock,
    CheckCircle2,
    Package,
    XCircle,
    User,
    Mail,
    Phone,
    RefreshCw,
    Pause,
    Play,
    Calendar,
    ChevronRight,
    ChevronLeft,
    LayoutDashboard,
    ShoppingBag,
    BarChart3,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Subscription, Product, Profile } from '../../lib/types';
import { useToastStore } from '../../store/toastStore';

interface SubWithRelations extends Subscription {
    product?: Product;
    profile?: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>;
}

type ViewType = 'day' | 'month';

interface KanbanColumn {
    id: string;
    title: string;
    icon: any;
    color: string;
    bgColor: string;
    date?: Date;
}

interface AdminSubscriptionKanbanTabProps {
    isFullScreen: boolean;
    onToggleFullScreen: () => void;
    onBack?: () => void;
}

export default function AdminSubscriptionKanbanTab({ isFullScreen, onToggleFullScreen, onBack }: AdminSubscriptionKanbanTabProps) {
    const { addToast } = useToastStore();
    const [viewType, setViewType] = useState<ViewType>('day');
    const [startDate, setStartDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [subscriptions, setSubscriptions] = useState<SubWithRelations[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [selectedSub, setSelectedSub] = useState<SubWithRelations | null>(null);

    const days = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            arr.push(d);
        }
        return arr;
    }, [startDate]);

    const months = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(startDate);
            d.setDate(1);
            d.setMonth(d.getMonth() + i);
            arr.push(d);
        }
        return arr;
    }, [startDate]);

    const kanbanColumns = useMemo<KanbanColumn[]>(() => {
        const base: KanbanColumn[] = [
            { id: 'overdue', title: 'En retard', icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-400/10' }
        ];

        if (viewType === 'day') {
            return [
                ...base,
                ...days.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    const isTomorrow = d.toDateString() === new Date(new Date().setDate(new Date().getDate() + 1)).toDateString();
                    
                    return {
                        id: `day_${i}`,
                        title: isToday ? 'Aujourd\'hui' : isTomorrow ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }),
                        icon: isToday || isTomorrow ? Clock : Calendar,
                        color: isToday ? 'text-emerald-400' : isTomorrow ? 'text-blue-400' : 'text-zinc-400',
                        bgColor: isToday ? 'bg-emerald-400/10' : isTomorrow ? 'bg-blue-400/10' : 'bg-white/5',
                        date: d
                    };
                }),
                { id: 'later', title: 'Plus tard', icon: Package, color: 'text-zinc-500', bgColor: 'bg-white/5' },
                { id: 'paused', title: 'En pause', icon: Pause, color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
            ];
        } else {
            return [
                ...base,
                ...months.map((m, i) => ({
                    id: `month_${i}`,
                    title: m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                    icon: Calendar,
                    color: i === 0 ? 'text-emerald-400' : 'text-zinc-400',
                    bgColor: i === 0 ? 'bg-emerald-400/10' : 'bg-white/5',
                    date: m
                })),
                { id: 'later', title: 'Futur', icon: Package, color: 'text-zinc-500', bgColor: 'bg-white/5' },
                { id: 'paused', title: 'En pause', icon: Pause, color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
            ];
        }
    }, [viewType, days, months]);

    const loadSubscriptions = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*, product:products(*), profile:profiles(id, full_name, email, phone)')
                .order('next_delivery_date', { ascending: true });

            if (error) throw error;
            setSubscriptions((data as SubWithRelations[]) || []);
        } catch (err) {
            console.error('Error fetching subscriptions:', err);
            addToast({ type: 'error', message: 'Erreur lors de la récupération des abonnements.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSubscriptions();
    }, []);

    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(s => {
            const userName = (s.profile?.full_name || '').toLowerCase();
            const productName = (s.product?.name || '').toLowerCase();
            const query = searchQuery.toLowerCase();
            return userName.includes(query) || productName.includes(query) || s.id.includes(query);
        });
    }, [subscriptions, searchQuery]);

    const stats = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const subsDueTomorrow = subscriptions.filter(s => s.status === 'active' && new Date(s.next_delivery_date).toDateString() === tomorrow.toDateString());

        return {
            total: subscriptions.length,
            active: subscriptions.filter(s => s.status === 'active').length,
            paused: subscriptions.filter(s => s.status === 'paused').length,
            dueToday: subscriptions.filter(s => s.status === 'active' && new Date(s.next_delivery_date).toDateString() === now.toDateString()).length,
            dueTomorrow: subsDueTomorrow.length,
            revenueTomorrow: subsDueTomorrow.reduce((acc, s) => acc + (Number(s.product?.price || 0) * s.quantity), 0),
            productsTomorrow: subsDueTomorrow.reduce((acc: Record<string, number>, s) => {
                const name = s.product?.name || 'Inconnu';
                acc[name] = (acc[name] || 0) + s.quantity;
                return acc;
            }, {} as Record<string, number>)
        };
    }, [subscriptions]);

    const handleUpdateStatus = async (subId: string, newColId: string) => {
        const col = kanbanColumns.find(c => c.id === newColId);
        if (!col) return;

        try {
            const updates: any = {};
            if (col.id === 'paused') {
                updates.status = 'paused';
            } else if (col.date) {
                updates.next_delivery_date = col.date.toISOString().split('T')[0];
                updates.status = 'active';
            } else {
                return; // Can't move to overdue or later manually for now without date
            }

            const { error } = await supabase
                .from('subscriptions')
                .update(updates)
                .eq('id', subId);

            if (error) throw error;
            addToast({ type: 'success', message: col.id === 'paused' ? 'Mis en pause' : `Mis à jour au ${col.date!.toLocaleDateString()}` });
            loadSubscriptions();
        } catch (err) {
            console.error('Error updating subscription:', err);
            addToast({ type: 'error', message: 'Erreur lors de la mise à jour.' });
        }
    };

    const getColumnSubscriptions = (colId: string) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (colId === 'overdue') {
            return filteredSubscriptions.filter(s => s.status === 'active' && new Date(s.next_delivery_date) < now);
        }
        if (colId === 'later') {
            const lastReference = viewType === 'day' ? days[6] : months[5];
            const filterDate = new Date(lastReference);
            if (viewType === 'month') {
                filterDate.setMonth(filterDate.getMonth() + 1);
                filterDate.setDate(1);
            } else {
                filterDate.setDate(filterDate.getDate() + 1);
            }
            return filteredSubscriptions.filter(s => s.status === 'active' && new Date(s.next_delivery_date) >= filterDate);
        }
        if (colId === 'paused') {
            return filteredSubscriptions.filter(s => s.status === 'paused');
        }
        
        const col = kanbanColumns.find(c => c.id === colId);
        if (col && col.date) {
            if (viewType === 'day') {
                return filteredSubscriptions.filter(s => s.status === 'active' && new Date(s.next_delivery_date).toDateString() === col.date!.toDateString());
            } else {
                return filteredSubscriptions.filter(s => {
                    const d = new Date(s.next_delivery_date);
                    return s.status === 'active' && d.getMonth() === col.date!.getMonth() && d.getFullYear() === col.date!.getFullYear();
                });
            }
        }

        return [];
    };

    const handleTriggerDelivery = async (sub: SubWithRelations) => {
        if (!sub.product) return;
        
        try {
            const productPrice = Number(sub.product.price);
            const totalAmount = productPrice * sub.quantity;

            // 1. Create order
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    user_id: sub.user_id,
                    delivery_type: 'delivery',
                    subtotal: totalAmount,
                    delivery_fee: 0,
                    total: totalAmount,
                    loyalty_points_earned: Math.floor(totalAmount),
                    loyalty_points_redeemed: 0,
                    payment_status: 'paid',
                    status: 'processing',
                    notes: `Commande automatique — abonnement ${sub.frequency}`,
                })
                .select()
                .single();

            if (error || !order) throw new Error('Erreur création commande');

            // 2. Create order item
            await supabase.from('order_items').insert({
                order_id: order.id,
                product_id: sub.product_id,
                product_name: sub.product.name,
                unit_price: productPrice,
                quantity: sub.quantity,
                total_price: totalAmount,
            });

            // 3. Link to subscription
            await supabase.from('subscription_orders').insert({
                subscription_id: sub.id,
                order_id: order.id,
            });

            // 4. Advance next_delivery_date
            const next = new Date(sub.next_delivery_date);
            if (sub.frequency === 'weekly') next.setDate(next.getDate() + 7);
            else if (sub.frequency === 'biweekly') next.setDate(next.getDate() + 14);
            else next.setMonth(next.getMonth() + 1);
            const next_delivery_date = next.toISOString().split('T')[0];

            await supabase
                .from('subscriptions')
                .update({ next_delivery_date })
                .eq('id', sub.id);

            addToast({ type: 'success', message: 'Livraison confirmée et commande générée !' });
            loadSubscriptions();
        } catch (err) {
            addToast({ type: 'error', message: 'Erreur lors de la validation.' });
            console.error(err);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-black/40 rounded-3xl border border-white/5 backdrop-blur-xl transition-all duration-500 overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100] rounded-none border-none' : 'min-h-[700px]'}`}>
            {/* Header */}
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
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <RefreshCw className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-white tracking-tight">Gestion des Abonnements</h2>
                                <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                                    <button
                                        onClick={() => setViewType('day')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewType === 'day' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        Jour
                                    </button>
                                    <button
                                        onClick={() => setViewType('month')}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewType === 'month' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        Mois
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <p className="text-sm text-zinc-400">Suivi Kanban des récurrences clients</p>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Départ:</label>
                                    <input
                                        type="date"
                                        value={startDate.toISOString().split('T')[0]}
                                        onChange={(e) => setStartDate(new Date(e.target.value))}
                                        className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500 transition-all hover:bg-black/40 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher client ou produit..."
                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all backdrop-blur-md"
                        />
                    </div>
                    <button
                        onClick={onToggleFullScreen}
                        className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-xl"
                        title={isFullScreen ? "Réduire" : "Plein écran"}
                    >
                        {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={loadSubscriptions}
                        className="p-3 rounded-2xl bg-zinc-900/50 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center gap-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Aperçu:</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500">Total</span>
                        <span className="text-sm font-bold text-white">{stats.total}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500">Aujourd'hui</span>
                        <span className="text-sm font-bold text-emerald-500">{stats.dueToday}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    
                    {/* Tomorrow Preview Widget */}
                    <div className="relative group/preview">
                        <div className="flex flex-col cursor-help">
                            <span className="text-xs text-zinc-500">Prévision Demain</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-blue-400">{stats.dueTomorrow} livraisons</span>
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold">{stats.revenueTomorrow.toFixed(2)} €</span>
                            </div>
                        </div>
                        
                        {/* Hover Preview Content */}
                        <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl opacity-0 translate-y-2 invisible group-hover/preview:opacity-100 group-hover/preview:translate-y-0 group-hover/preview:visible transition-all z-[150] backdrop-blur-xl">
                            <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-blue-400" />
                                Préparation Demain
                            </h5>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {Object.entries(stats.productsTomorrow).length > 0 ? (
                                    Object.entries(stats.productsTomorrow).map(([name, qty]) => (
                                        <div key={name} className="flex justify-between items-center text-[10px]">
                                            <span className="text-zinc-400 truncate flex-1 pr-2">{name}</span>
                                            <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">x{qty}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-zinc-500 italic">Rien à préparer</p>
                                )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500">Revenu est.</span>
                                <span className="text-white font-bold">{stats.revenueTomorrow.toFixed(2)} €</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Kanban columns */}
            <div className="flex-1 overflow-x-auto p-4 flex gap-4 min-h-0 custom-scrollbar">
                {kanbanColumns.map((col) => {
                    const colSubs = getColumnSubscriptions(col.id);
                    return (
                        <div
                            key={col.id}
                            className="flex-shrink-0 w-[300px] flex flex-col bg-zinc-900/30 rounded-3xl border border-white/5"
                        >
                            {/* Column Header */}
                            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-zinc-900/20 rounded-t-3xl">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${col.bgColor}`}>
                                        <col.icon className={`w-4 h-4 ${col.color}`} />
                                    </div>
                                    <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wider">{col.title}</h3>
                                    <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                        {colSubs.length}
                                    </span>
                                </div>
                            </div>

                            {/* Cards Area */}
                            <div
                                className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const id = e.dataTransfer.getData('subId');
                                    if (id) handleUpdateStatus(id, col.id);
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {colSubs.map((sub) => (
                                        <SubscriptionCard
                                            key={sub.id}
                                            subscription={sub}
                                            onDragStart={() => setDraggingId(sub.id)}
                                            onDragEnd={() => setDraggingId(null)}
                                            onClick={() => setSelectedSub(sub)}
                                            isDragging={draggingId === sub.id}
                                            onValidate={handleTriggerDelivery}
                                        />
                                    ))}
                                </AnimatePresence>
                                {colSubs.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-10 text-center">
                                        <Package className="w-12 h-12 mb-2 mx-auto" />
                                        <p className="text-xs">Aucun abonnement</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sidepanel Detail */}
            <AnimatePresence>
                {selectedSub && (
                    <SubscriptionDetailSidepanel
                        subscription={selectedSub}
                        onClose={() => setSelectedSub(null)}
                        onUpdateStatus={handleUpdateStatus}
                        onRefresh={loadSubscriptions}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(16, 185, 129, 0.3);
                }
            `}</style>
        </div>
    );
}

function SubscriptionCard({ subscription, onDragStart, onDragEnd, onClick, isDragging, onValidate }: { subscription: SubWithRelations; onDragStart: () => void; onDragEnd: () => void; onClick: () => void; isDragging: boolean; onValidate: (sub: SubWithRelations) => void }) {
    const nextDate = new Date(subscription.next_delivery_date);
    const isOverdue = nextDate < new Date() && subscription.status === 'active';
    const [isValidating, setIsValidating] = useState(false);

    const handleValidate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsValidating(true);
        await onValidate(subscription);
        setIsValidating(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -2 }}
            draggable
            onDragStart={(e: any) => {
                e.dataTransfer.setData('subId', subscription.id);
                onDragStart();
            }}
            onDragEnd={onDragEnd}
            onClick={onClick}
            className={`group bg-zinc-900/80 border border-white/5 p-4 rounded-3xl hover:border-emerald-500/30 transition-all cursor-grab active:cursor-grabbing shadow-xl relative ${isDragging ? 'opacity-40 grayscale' : ''}`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    {subscription.product?.image_url ? (
                        <img src={subscription.product.image_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-zinc-600" />
                        </div>
                    )}
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">
                        #{subscription.id.slice(0, 8)}
                    </span>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    subscription.frequency === 'weekly' ? 'bg-blue-500/10 text-blue-400' :
                    subscription.frequency === 'biweekly' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-pink-500/10 text-pink-400'
                }`}>
                    {subscription.frequency === 'weekly' ? 'Hebdo' :
                     subscription.frequency === 'biweekly' ? 'Bi-mensuel' : 'Mensuel'}
                </div>
            </div>

            <div className="mb-3">
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {subscription.profile?.full_name || 'Client Inconnu'}
                </h4>
                <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">{subscription.product?.name} (x{subscription.quantity})</p>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total</span>
                    <p className="text-sm font-black text-white">{(Number(subscription.product?.price || 0) * subscription.quantity).toFixed(2)} €</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isOverdue ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-bold">
                        {nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                </div>
            </div>

            <button
                onClick={handleValidate}
                disabled={isValidating}
                className="w-full bg-emerald-500 text-black text-xs font-black py-2.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
                {isValidating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Valider la livraison
            </button>
        </motion.div>
    );
}

function SubscriptionDetailSidepanel({ subscription, onClose, onUpdateStatus, onRefresh }: { subscription: SubWithRelations; onClose: () => void; onUpdateStatus: (id: string, s: string) => void; onRefresh: () => void }) {
    const { addToast } = useToastStore();
    const [isTriggering, setIsTriggering] = useState(false);

    const handleTriggerDelivery = async () => {
        if (!subscription.product) return;
        setIsTriggering(true);

        try {
            const productPrice = Number(subscription.product.price);
            const totalAmount = productPrice * subscription.quantity;

            // 1. Create order
            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    user_id: subscription.user_id,
                    delivery_type: 'delivery',
                    subtotal: totalAmount,
                    delivery_fee: 0,
                    total: totalAmount,
                    loyalty_points_earned: Math.floor(totalAmount),
                    loyalty_points_redeemed: 0,
                    payment_status: 'paid',
                    status: 'processing',
                    notes: `Commande automatique — abonnement ${subscription.frequency}`,
                })
                .select()
                .single();

            if (error || !order) throw new Error('Erreur création commande');

            // 2. Create order item
            await supabase.from('order_items').insert({
                order_id: order.id,
                product_id: subscription.product_id,
                product_name: subscription.product.name,
                unit_price: productPrice,
                quantity: subscription.quantity,
                total_price: totalAmount,
            });

            // 3. Link to subscription
            await supabase.from('subscription_orders').insert({
                subscription_id: subscription.id,
                order_id: order.id,
            });

            // 4. Advance next_delivery_date
            const next = new Date(subscription.next_delivery_date);
            if (subscription.frequency === 'weekly') next.setDate(next.getDate() + 7);
            else if (subscription.frequency === 'biweekly') next.setDate(next.getDate() + 14);
            else next.setMonth(next.getMonth() + 1);
            const next_delivery_date = next.toISOString().split('T')[0];

            await supabase
                .from('subscriptions')
                .update({ next_delivery_date })
                .eq('id', subscription.id);

            addToast({ type: 'success', message: 'Livraison déclenchée et commande créée !' });
            onRefresh();
            onClose();
        } catch (err) {
            addToast({ type: 'error', message: 'Erreur lors du déclenchement.' });
            console.error(err);
        } finally {
            setIsTriggering(null);
        }
    };

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
                                #{subscription.id.slice(0, 8)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                subscription.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 
                                subscription.status === 'paused' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                                {subscription.status.toUpperCase()}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white">Détails de l'Abonnement</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* User */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Client</h4>
                        </div>
                        <div className="bg-white/5 rounded-3xl p-5 border border-white/5">
                            <h5 className="font-bold text-white text-lg">{subscription.profile?.full_name || 'Anonyme'}</h5>
                            <div className="space-y-3 mt-4">
                                {subscription.profile?.email && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <Mail className="w-4 h-4 text-emerald-500/50" />
                                        <span>{subscription.profile.email}</span>
                                    </div>
                                )}
                                {subscription.profile?.phone && (
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <Phone className="w-4 h-4 text-emerald-500/50" />
                                        <span>{subscription.profile.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Product */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <ShoppingBag className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Produit abonné</h4>
                        </div>
                        <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex gap-4">
                            {subscription.product?.image_url && (
                                <img src={subscription.product.image_url} className="w-20 h-20 rounded-2xl object-cover shrink-0" alt="" />
                            )}
                            <div>
                                <h5 className="font-bold text-white">{subscription.product?.name}</h5>
                                <p className="text-sm text-emerald-500 font-bold mt-1">{subscription.product?.price} € / unité</p>
                                <p className="text-xs text-zinc-500 mt-2">Quantité: {subscription.quantity}</p>
                            </div>
                        </div>
                    </section>

                    {/* Schedule */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Calendrier</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Fréquence</span>
                                <p className="text-white font-bold mt-1 capitalize">{subscription.frequency}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Prochaine</span>
                                <p className="text-emerald-500 font-bold mt-1">
                                    {new Date(subscription.next_delivery_date).toLocaleDateString('fr-FR')}
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer actions */}
                <div className="p-6 border-t border-white/10 bg-zinc-950 flex flex-col gap-3">
                    <button
                        onClick={handleTriggerDelivery}
                        disabled={isTriggering || subscription.status !== 'active'}
                        className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isTriggering ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                        Déclencher la livraison maintenant
                    </button>
                    <div className="flex gap-3">
                        {subscription.status === 'active' ? (
                            <button
                                onClick={() => onUpdateStatus(subscription.id, 'paused')}
                                className="flex-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold py-3 rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Pause className="w-4 h-4" /> Pause
                            </button>
                        ) : subscription.status === 'paused' ? (
                            <button
                                onClick={() => onUpdateStatus(subscription.id, 'active')}
                                className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold py-3 rounded-xl hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" /> Reprendre
                            </button>
                        ) : null}
                        {subscription.status !== 'cancelled' && (
                            <button
                                onClick={() => onUpdateStatus(subscription.id, 'cancelled')}
                                className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 font-bold py-3 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" /> Annuler
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
}
