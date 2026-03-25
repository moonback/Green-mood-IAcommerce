import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertTriangle, ArrowUpDown, RotateCcw, Plus, Package,
    TrendingDown, ShieldAlert, Search, X, ChevronUp, ChevronDown,
    ArrowUp, ArrowDown, History, Layers, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product, StockMovement } from '../../lib/types';

interface AdminStockTabProps {
    products: Product[];
    movements: StockMovement[];
    onRefresh: () => void;
}

type SortField = 'name' | 'stock';
type SortDir = 'asc' | 'desc';
type StockFilter = 'all' | 'critical' | 'out';

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
    sale:       { label: 'Vente',          color: 'text-blue-400 bg-blue-900/20 border-blue-800/60' },
    restock:    { label: 'Réappro',        color: 'text-green-400 bg-green-900/20 border-green-800/60' },
    return:     { label: 'Retour',         color: 'text-purple-400 bg-purple-900/20 border-purple-800/60' },
    adjustment: { label: 'Ajustement',     color: 'text-orange-400 bg-orange-900/20 border-orange-800/60' },
};

export default function AdminStockTab({ products, movements, onRefresh }: AdminStockTabProps) {
    const [stockAdjust, setStockAdjust] = useState<{ id: string; qty: string; note: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<StockFilter>('all');
    const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'stock', dir: 'asc' });
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const totalUnits = products.reduce((s, p) => s + p.stock_quantity, 0);
    const outCount   = products.filter(p => p.stock_quantity === 0).length;
    const critCount  = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length;
    const totalValue = products.reduce((s, p) => s + p.price * p.stock_quantity, 0);

    // ── Filtered + sorted list ─────────────────────────────────────────────
    const displayed = useMemo(() => {
        let list = products.filter(p => {
            if (filter === 'out')      return p.stock_quantity === 0;
            if (filter === 'critical') return p.stock_quantity > 0 && p.stock_quantity <= 5;
            return true;
        });
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
        }
        return [...list].sort((a, b) => {
            const mul = sort.dir === 'asc' ? 1 : -1;
            if (sort.field === 'name')  return mul * a.name.localeCompare(b.name);
            return mul * (a.stock_quantity - b.stock_quantity);
        });
    }, [products, filter, search, sort]);

    const totalPages = Math.ceil(displayed.length / PAGE_SIZE);
    const paginated = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const toggleSort = (field: SortField) => {
        setPage(1);
        setSort(s => s.field === field
            ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
            : { field, dir: 'asc' }
        );
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleResetAllStock = async () => {
        if (!confirm(`Mettre le stock de TOUS les ${products.length} produits à zéro ?`)) return;
        setIsBulkSaving(true);
        const active = products.filter(p => p.stock_quantity > 0);
        await supabase.from('products').update({ stock_quantity: 0 }).in('id', products.map(p => p.id));
        if (active.length > 0) {
            await supabase.from('stock_movements').insert(
                active.map(p => ({ product_id: p.id, quantity_change: -p.stock_quantity, type: 'adjustment', note: 'Remise à zéro globale' }))
            );
        }
        onRefresh();
        setIsBulkSaving(false);
    };

    const handleAddTenToAll = async () => {
        if (!confirm(`Ajouter 10 unités à TOUS les ${products.length} produits ?`)) return;
        setIsBulkSaving(true);
        for (const p of products) {
            await supabase.from('products').update({ stock_quantity: p.stock_quantity + 10 }).eq('id', p.id);
        }
        await supabase.from('stock_movements').insert(
            products.map(p => ({ product_id: p.id, quantity_change: 10, type: 'restock', note: 'Réapprovisionnement global +10' }))
        );
        onRefresh();
        setIsBulkSaving(false);
    };

    const handleStockAdjust = async () => {
        if (!stockAdjust) return;
        const qty = parseInt(stockAdjust.qty);
        if (isNaN(qty) || qty === 0) return;
        setIsSaving(true);
        const product = products.find(p => p.id === stockAdjust.id);
        if (!product) { setIsSaving(false); return; }
        const newStock = Math.max(0, product.stock_quantity + qty);
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', stockAdjust.id);
        await supabase.from('stock_movements').insert({
            product_id: stockAdjust.id,
            quantity_change: qty,
            type: qty > 0 ? 'restock' : 'adjustment',
            note: stockAdjust.note || 'Ajustement manuel',
        });
        onRefresh();
        setStockAdjust(null);
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">

            {/* ── KPI Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Produits total',
                        value: products.length,
                        icon: Package,
                        color: 'text-zinc-300',
                        bg: 'bg-zinc-800/60',
                        border: 'border-zinc-700/50',
                    },
                    {
                        label: 'Unités en stock',
                        value: totalUnits.toLocaleString('fr-FR'),
                        icon: Layers,
                        color: 'text-green-400',
                        bg: 'bg-green-900/10',
                        border: 'border-green-800/30',
                    },
                    {
                        label: 'Critiques (≤ 5)',
                        value: critCount,
                        icon: AlertTriangle,
                        color: 'text-orange-400',
                        bg: 'bg-orange-900/10',
                        border: 'border-orange-800/30',
                    },
                    {
                        label: 'Ruptures',
                        value: outCount,
                        icon: TrendingDown,
                        color: 'text-red-400',
                        bg: 'bg-red-900/10',
                        border: 'border-red-800/30',
                    },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-4`}>
                        <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
                            <p className={`text-2xl font-black ${color}`}>{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Valeur totale ────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-green-950/40 to-zinc-900/60 border border-green-800/20 rounded-2xl px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Valeur totale en stock</span>
                </div>
                <span className="text-xl font-black text-emerald-400">
                    {totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
            </div>

            {/* ── Ruptures urgentes ─────────────────────────────────────────── */}
            {outCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-950/20 border border-red-800/40 rounded-2xl p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                        </div>
                        <p className="text-red-400 font-black text-xs uppercase tracking-widest">
                            {outCount} produit{outCount > 1 ? 's' : ''} en rupture totale
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {products.filter(p => p.stock_quantity === 0).map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2">
                                <span className="text-sm text-zinc-300 truncate flex-1 mr-2">{p.name}</span>
                                <button
                                    onClick={() => setStockAdjust({ id: p.id, qty: '', note: 'Réapprovisionnement' })}
                                    className="text-[10px] font-black uppercase tracking-wider bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 px-2.5 py-1 rounded-lg transition-all flex-shrink-0"
                                >
                                    + Réappro
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── Stock critiques ───────────────────────────────────────────── */}
            {critCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-950/20 border border-orange-800/40 rounded-2xl p-5"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                        </div>
                        <p className="text-orange-400 font-black text-xs uppercase tracking-widest">
                            {critCount} produit{critCount > 1 ? 's' : ''} à réapprovisionner
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5)
                            .sort((a, b) => a.stock_quantity - b.stock_quantity)
                            .map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-orange-950/30 border border-orange-900/40 rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                        <span className={`text-xs font-black w-5 text-center ${p.stock_quantity <= 2 ? 'text-red-400' : 'text-orange-400'}`}>
                                            {p.stock_quantity}
                                        </span>
                                        <span className="text-sm text-zinc-300 truncate">{p.name}</span>
                                    </div>
                                    <button
                                        onClick={() => setStockAdjust({ id: p.id, qty: '', note: 'Réapprovisionnement' })}
                                        className="text-[10px] font-black uppercase tracking-wider bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/40 text-orange-400 px-2.5 py-1 rounded-lg transition-all flex-shrink-0"
                                    >
                                        + Réappro
                                    </button>
                                </div>
                            ))}
                    </div>
                </motion.div>
            )}

            {/* ── Ajustement inline ────────────────────────────────────────── */}
            <AnimatePresence>
                {stockAdjust && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: -8 }}
                        className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg shadow-emerald-500/5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-0.5">Ajustement de stock</p>
                                <p className="text-white font-bold">
                                    {products.find(p => p.id === stockAdjust.id)?.name}
                                    <span className="ml-2 text-xs font-normal text-zinc-500">
                                        (actuel : <span className="text-emerald-400 font-bold">{products.find(p => p.id === stockAdjust.id)?.stock_quantity}</span>)
                                    </span>
                                </p>
                            </div>
                            <button onClick={() => setStockAdjust(null)} className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <input
                                type="number"
                                placeholder="+20 ou -2"
                                value={stockAdjust.qty}
                                onChange={e => setStockAdjust({ ...stockAdjust, qty: e.target.value })}
                                className="w-36 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                autoFocus
                            />
                            <input
                                type="text"
                                placeholder="Raison (réappro, retour, casse…)"
                                value={stockAdjust.note}
                                onChange={e => setStockAdjust({ ...stockAdjust, note: e.target.value })}
                                className="flex-1 min-w-40 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                            <button
                                onClick={handleStockAdjust}
                                disabled={isSaving || !stockAdjust.qty}
                                className="bg-emerald-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95"
                            >
                                {isSaving ? 'Enregistrement…' : 'Confirmer'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Niveaux de stock ──────────────────────────────────────────── */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                {/* Header */}
                <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h2 className="font-serif font-bold text-white whitespace-nowrap">Niveaux de stock</h2>
                        <span className="text-[10px] font-black text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                            {displayed.length} / {products.length}
                        </span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Rechercher…"
                            className="bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors w-44"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-xl p-1 gap-0.5">
                        {(['all', 'critical', 'out'] as StockFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => { setFilter(f); setPage(1); }}
                                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all ${filter === f ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {f === 'all' ? 'Tous' : f === 'critical' ? 'Critiques' : 'Ruptures'}
                            </button>
                        ))}
                    </div>

                    {/* Bulk actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAddTenToAll}
                            disabled={isBulkSaving || products.length === 0}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all disabled:opacity-50 active:scale-95"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            +10 partout
                        </button>
                        <button
                            onClick={handleResetAllStock}
                            disabled={isBulkSaving || products.length === 0}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all disabled:opacity-50 active:scale-95"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Tout à zéro
                        </button>
                    </div>
                </div>

                {/* Column headers */}
                <div className="px-5 py-2.5 bg-zinc-800/30 border-b border-zinc-800/60 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left">
                        Produit
                        {sort.field === 'name'
                            ? sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </button>
                    <span className="hidden sm:block w-32">Jauge</span>
                    <button onClick={() => toggleSort('stock')} className="flex items-center gap-1 hover:text-zinc-300 transition-colors w-16 justify-end">
                        Stock
                        {sort.field === 'stock'
                            ? sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </button>
                    <span className="w-8" />
                </div>

                {/* Rows */}
                <div className="divide-y divide-zinc-800/60">
                    {displayed.length === 0 && (
                        <p className="text-zinc-500 text-center py-12 text-sm">Aucun produit trouvé.</p>
                    )}
                    {paginated.map(product => {
                        const pct = Math.min(100, (product.stock_quantity / 50) * 100);
                        const isOut = product.stock_quantity === 0;
                        const isCrit = product.stock_quantity > 0 && product.stock_quantity <= 5;
                        return (
                            <motion.div
                                key={product.id}
                                layout
                                className="px-5 py-3.5 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 hover:bg-zinc-800/30 transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {product.image_url && (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate group-hover:text-emerald-400 transition-colors">
                                            {product.name}
                                        </p>
                                        {product.sku && (
                                            <p className="text-[10px] text-zinc-600 font-mono">{product.sku}</p>
                                        )}
                                    </div>
                                    {isOut && (
                                        <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-400">
                                            Rupture
                                        </span>
                                    )}
                                    {isCrit && (
                                        <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400">
                                            Critique
                                        </span>
                                    )}
                                </div>

                                <div className="hidden sm:flex items-center gap-2 w-32">
                                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${isOut ? 'bg-red-500' : isCrit ? 'bg-orange-500' : 'bg-green-500'}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                        />
                                    </div>
                                </div>

                                <span className={`font-black text-sm w-16 text-right tabular-nums ${isOut ? 'text-red-400' : isCrit ? 'text-orange-400' : 'text-white'}`}>
                                    {product.stock_quantity}
                                </span>

                                <button
                                    onClick={() => setStockAdjust({ id: product.id, qty: '', note: '' })}
                                    className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-all"
                                    title="Ajuster le stock"
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                </button>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-5 py-3.5 border-t border-zinc-800 flex items-center justify-between gap-3">
                        <span className="text-xs text-zinc-500 font-medium">
                            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayed.length)} sur {displayed.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                                .reduce<(number | '…')[]>((acc, n, i, arr) => {
                                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                                    acc.push(n);
                                    return acc;
                                }, [])
                                .map((n, i) =>
                                    n === '…' ? (
                                        <span key={`ellipsis-${i}`} className="px-1 text-zinc-600 text-xs">…</span>
                                    ) : (
                                        <button
                                            key={n}
                                            onClick={() => setPage(n as number)}
                                            className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition-all border ${page === n ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
                                        >
                                            {n}
                                        </button>
                                    )
                                )}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Historique ────────────────────────────────────────────────── */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <History className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                        <h2 className="font-serif font-bold text-white">Historique des mouvements</h2>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{Math.min(movements.length, 10)} derniers sur {movements.length}</p>
                    </div>
                </div>

                {movements.length === 0 ? (
                    <div className="py-16 text-center">
                        <History className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500 text-sm">Aucun mouvement de stock enregistré.</p>
                    </div>
                ) : (
                    <div className="p-5 grid grid-cols-2 gap-3">
                        {movements.slice(0, 10).map(mv => {
                            const meta = MOVEMENT_LABELS[mv.type] ?? { label: mv.type, color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
                            const isPositive = mv.quantity_change > 0;
                            return (
                                <div key={mv.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 flex flex-col gap-2.5 hover:border-zinc-600 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm text-white font-medium leading-tight line-clamp-1">
                                            {(mv.product as { name?: string })?.name ?? '—'}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 font-black text-sm shrink-0 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                            {isPositive ? '+' : ''}{mv.quantity_change}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${meta.color}`}>
                                            {meta.label}
                                        </span>
                                        <div className="text-right">
                                            <p className="text-[10px] text-zinc-400 font-medium">
                                                {new Date(mv.created_at).toLocaleDateString('fr-FR')}
                                            </p>
                                            <p className="text-[10px] text-zinc-600">
                                                {new Date(mv.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    {mv.note && (
                                        <p className="text-[10px] text-zinc-500 italic truncate">{mv.note}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
