import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Receipt,
  DollarSign,
  Percent,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown,
  FileSpreadsheet,
  Filter,
  BarChart3,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Order } from '../../lib/types';
import { downloadInvoice } from '../../lib/invoiceGenerator';
import {
  exportCSV,
  exportSummaryCSV,
  exportXLSX,
  prepareMonthlySummary,
  type MonthlySummary,
} from '../../lib/accountingExport';

export default function AdminAccountingTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [exportType, setExportType] = useState<'csv' | 'xlsx'>('xlsx');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), profile:profiles(full_name, phone), address:addresses(*)')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setIsLoading(false);
  };

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const availableMonths = useMemo(() => {
    const months = new Map<string, string>();
    for (const order of orders) {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      months.set(key, `${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }
    return Array.from(months.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (selectedMonth === 'all') return orders;
    return orders.filter(o => {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [orders, selectedMonth]);

  const paidOrders = useMemo(() =>
    filteredOrders.filter(o => o.payment_status === 'paid' && o.status !== 'cancelled'),
    [filteredOrders]
  );

  const summaries = useMemo(() => prepareMonthlySummary(orders), [orders]);

  const currentSummary: MonthlySummary | null = useMemo(() => {
    if (selectedMonth === 'all' && summaries.length > 0) {
      // Aggregate all
      return summaries.reduce((acc, s) => ({
        month: 'Toutes périodes',
        total_orders: acc.total_orders + s.total_orders,
        total_ca_ht: acc.total_ca_ht + s.total_ca_ht,
        total_tva: acc.total_tva + s.total_tva,
        total_ca_ttc: acc.total_ca_ttc + s.total_ca_ttc,
        total_delivery_fees: acc.total_delivery_fees + s.total_delivery_fees,
        total_discounts: acc.total_discounts + s.total_discounts,
        total_net: acc.total_net + s.total_net,
        payment_cash: acc.payment_cash + s.payment_cash,
        payment_card: acc.payment_card + s.payment_card,
        payment_online: acc.payment_online + s.payment_online,
        payment_other: acc.payment_other + s.payment_other,
        avg_order_value: 0,
      }), {
        month: 'Toutes périodes',
        total_orders: 0,
        total_ca_ht: 0,
        total_tva: 0,
        total_ca_ttc: 0,
        total_delivery_fees: 0,
        total_discounts: 0,
        total_net: 0,
        payment_cash: 0,
        payment_card: 0,
        payment_online: 0,
        payment_other: 0,
        avg_order_value: 0,
      } as MonthlySummary);
    }
    return summaries.find(s => {
      const monthParts = selectedMonth.split('-');
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const expectedLabel = `${monthNames[parseInt(monthParts[1]) - 1]} ${monthParts[0]}`;
      return s.month === expectedLabel;
    }) ?? null;
  }, [summaries, selectedMonth]);

  if (currentSummary && currentSummary.total_orders > 0) {
    currentSummary.avg_order_value = Math.round((currentSummary.total_net / currentSummary.total_orders) * 100) / 100;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleExport = (type: 'detail_csv' | 'summary_csv' | 'xlsx') => {
    setShowExportMenu(false);
    const ordersToExport = selectedMonth === 'all' ? orders : filteredOrders;
    switch (type) {
      case 'detail_csv': exportCSV(ordersToExport); break;
      case 'summary_csv': exportSummaryCSV(ordersToExport); break;
      case 'xlsx': exportXLSX(ordersToExport); break;
    }
  };

  const handleDownloadInvoice = async (order: Order) => {
    setGeneratingInvoice(order.id);
    // Small delay for UI feedback
    await new Promise(r => setTimeout(r, 200));
    downloadInvoice(order);
    setGeneratingInvoice(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const fmt = (n: number) => n.toFixed(2).replace('.', ',') + ' €';

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-zinc-900 rounded-2xl border border-zinc-800 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Filters & Export Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl pl-10 pr-8 py-2.5 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">Toutes les périodes</option>
              {availableMonths.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-zinc-500 font-medium">
            {paidOrders.length} commande{paidOrders.length !== 1 ? 's' : ''} payée{paidOrders.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 bg-emerald-500 text-black font-bold text-sm uppercase tracking-wider px-5 py-2.5 rounded-xl hover:shadow-[0_0_20px_rgba(57,255,20,0.3)] active:scale-[0.98] transition-all"
          >
            <Download className="w-4 h-4" />
            Exporter
            <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50 min-w-56"
              >
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="font-semibold">Export XLSX complet</p>
                    <p className="text-[10px] text-zinc-500">3 onglets : détails, résumé, TVA</p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('detail_csv')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="font-semibold">Ventes détaillées (CSV)</p>
                    <p className="text-[10px] text-zinc-500">Toutes les commandes ligne par ligne</p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('summary_csv')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors text-left border-t border-zinc-800"
                >
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="font-semibold">Résumé mensuel (CSV)</p>
                    <p className="text-[10px] text-zinc-500">CA, TVA, remises par mois</p>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────────── */}
      {currentSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'CA Net TTC',
              value: fmt(currentSummary.total_net),
              icon: DollarSign,
              color: 'text-emerald-400',
              bg: 'from-emerald-500/10 to-emerald-500/5',
            },
            {
              label: 'CA HT',
              value: fmt(currentSummary.total_ca_ht),
              icon: TrendingUp,
              color: 'text-emerald-400',
              bg: 'from-emerald-500/10 to-emerald-500/5',
            },
            {
              label: 'TVA Collectée',
              value: fmt(currentSummary.total_tva),
              icon: Percent,
              color: 'text-blue-400',
              bg: 'from-blue-500/10 to-blue-500/5',
            },
            {
              label: 'Panier Moyen',
              value: fmt(currentSummary.avg_order_value),
              icon: Receipt,
              color: 'text-amber-400',
              bg: 'from-amber-500/10 to-amber-500/5',
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative overflow-hidden bg-zinc-900 rounded-2xl border border-zinc-800 p-5"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} opacity-50`} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <p className="text-xl md:text-2xl font-black text-white tracking-tight">{kpi.value}</p>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">{kpi.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── Payment Methods & Discounts ─────────────────────────────────── */}
      {currentSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Methods */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6"
          >
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Répartition Paiements
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Carte', icon: CreditCard, value: currentSummary.payment_card, color: 'bg-blue-500' },
                { label: 'En ligne', icon: DollarSign, value: currentSummary.payment_online, color: 'bg-purple-500' },
                { label: 'Espèces', icon: Banknote, value: currentSummary.payment_cash, color: 'bg-green-500' },
                { label: 'Mobile / Autre', icon: Smartphone, value: currentSummary.payment_other, color: 'bg-amber-500' },
              ].map(pm => {
                const total = currentSummary.total_net;
                const pct = total > 0 ? (pm.value / total * 100) : 0;
                return (
                  <div key={pm.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <pm.icon className="w-3.5 h-3.5" />
                        {pm.label}
                      </span>
                      <span className="font-semibold text-white">{fmt(pm.value)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className={`h-full rounded-full ${pm.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Financial Summary */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6"
          >
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-5 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Détail Financier
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Chiffre d\'affaires TTC', value: currentSummary.total_ca_ttc, type: 'normal' },
                { label: 'Chiffre d\'affaires HT', value: currentSummary.total_ca_ht, type: 'normal' },
                { label: 'TVA collectée (20%)', value: currentSummary.total_tva, type: 'highlight' },
                { label: 'Frais de livraison facturés', value: currentSummary.total_delivery_fees, type: 'normal' },
                { label: 'Remises accordées', value: currentSummary.total_discounts, type: 'discount' },
                { label: 'Total encaissé net', value: currentSummary.total_net, type: 'total' },
              ].map(row => (
                <div
                  key={row.label}
                  className={`flex justify-between items-center py-2 ${
                    row.type === 'total'
                      ? 'border-t border-emerald-500/30 pt-4'
                      : row.type === 'highlight'
                      ? 'text-blue-400'
                      : ''
                  }`}
                >
                  <span className={`text-sm ${row.type === 'total' ? 'font-bold text-white' : row.type === 'discount' ? 'text-orange-400' : 'text-zinc-400'}`}>
                    {row.label}
                  </span>
                  <span className={`font-semibold ${
                    row.type === 'total' ? 'text-emerald-400 text-lg font-black' :
                    row.type === 'discount' ? 'text-orange-400' :
                    row.type === 'highlight' ? 'text-blue-400' :
                    'text-white'
                  }`}>
                    {row.type === 'discount' ? `-${fmt(row.value)}` : fmt(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Monthly Summary Table ───────────────────────────────────────── */}
      {summaries.length > 0 && selectedMonth === 'all' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Historique Mensuel
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mois</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Commandes</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CA HT</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TVA</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Remises</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CA Net</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Panier Ø</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, i) => (
                  <tr key={s.month} className={`border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? 'bg-zinc-900/50' : ''}`}>
                    <td className="px-5 py-3 font-semibold text-white">{s.month}</td>
                    <td className="px-5 py-3 text-right text-zinc-400">{s.total_orders}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{fmt(s.total_ca_ht)}</td>
                    <td className="px-5 py-3 text-right text-blue-400">{fmt(s.total_tva)}</td>
                    <td className="px-5 py-3 text-right text-orange-400">{s.total_discounts > 0 ? `-${fmt(s.total_discounts)}` : '—'}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-400">{fmt(s.total_net)}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{fmt(s.avg_order_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ─── Orders with Invoice Download ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            Factures
          </h3>
          <span className="text-xs text-zinc-600">{filteredOrders.length} commandes</span>
        </div>

        <div className="divide-y divide-zinc-800/50">
          {filteredOrders.length === 0 && (
            <p className="text-center py-10 text-zinc-500 text-sm">Aucune commande pour cette période.</p>
          )}
          {filteredOrders.map(order => {
            const isPaid = order.payment_status === 'paid';
            const isCancelled = order.status === 'cancelled';
            const isGenerating = generatingInvoice === order.id;

            return (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCancelled ? 'bg-red-900/30 text-red-400' :
                    isPaid ? 'bg-emerald-500/10 text-emerald-400' :
                    'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      #{order.id.slice(0, 8).toUpperCase()}
                      <span className="text-zinc-500 font-normal ml-2">{order.profile?.full_name ?? 'Client'}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    isCancelled ? 'text-red-400 bg-red-900/20 border-red-800' :
                    isPaid ? 'text-green-400 bg-green-900/20 border-green-800' :
                    'text-yellow-400 bg-yellow-900/20 border-yellow-800'
                  }`}>
                    {isCancelled ? 'Annulé' : isPaid ? 'Payé' : 'En attente'}
                  </span>
                  <span className="font-bold text-white text-sm min-w-16 text-right">{Number(order.total).toFixed(2)} €</span>
                  <button
                    onClick={() => handleDownloadInvoice(order)}
                    disabled={isGenerating}
                    className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-all ${
                      isGenerating
                        ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-emerald-500 hover:text-black active:scale-[0.96]'
                    }`}
                  >
                    {isGenerating ? (
                      <div className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
