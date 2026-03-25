import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Filter,
  Package,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { Order } from '../../lib/types';
import AdminSetupWizard, { WizardTriggerCard } from './AdminSetupWizard';
import AdminBadge from './ui/AdminBadge';
import AdminButton from './ui/AdminButton';
import AdminCard from './ui/AdminCard';
import AdminTable from './ui/AdminTable';

export interface DashboardStats {
  totalRevenue: number;
  revenueThisMonth: number;
  ordersTotal: number;
  ordersToday: number;
  ordersPending: number;
  productsLowStock: number;
  productsOutOfStock: number;
  totalCustomers: number;
  recentOrders: Order[];
}

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente', tone: 'warning' as const },
  { value: 'paid', label: 'Payée', tone: 'info' as const },
  { value: 'processing', label: 'En préparation', tone: 'info' as const },
  { value: 'ready', label: 'Prête', tone: 'success' as const },
  { value: 'shipped', label: 'Expédiée', tone: 'info' as const },
  { value: 'delivered', label: 'Livrée', tone: 'success' as const },
  { value: 'cancelled', label: 'Annulée', tone: 'danger' as const },
];

interface AdminDashboardTabProps {
  stats: DashboardStats;
  onViewOrders: () => void;
  onViewStock: () => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: Order['status']) => void;
  onViewOrderDetails?: (orderId: string) => void;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export default function AdminDashboardTab({
  stats,
  onViewOrders,
  onViewStock,
  onUpdateOrderStatus,
  onViewOrderDetails,
}: AdminDashboardTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [wizardOpen, setWizardOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return stats.recentOrders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      const orderDate = new Date(order.created_at);
      const matchesDate =
        dateFilter === 'all'
          ? true
          : dateFilter === 'today'
            ? orderDate >= today
            : dateFilter === 'week'
              ? orderDate >= weekAgo
              : orderDate >= monthAgo;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [stats.recentOrders, searchTerm, statusFilter, dateFilter]);

  const revenueSeries = useMemo(() => {
    const points = stats.recentOrders
      .slice()
      .reverse()
      .map((order) => ({
        day: new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        revenue: Number(order.total) || 0,
      }));

    if (points.length === 0) {
      return Array.from({ length: 7 }, (_, idx) => ({ day: `J-${6 - idx}`, revenue: 0 }));
    }

    return points;
  }, [stats.recentOrders]);

  const statusBreakdown = useMemo(() => {
    return ORDER_STATUS_OPTIONS.map((status) => ({
      ...status,
      count: stats.recentOrders.filter((order) => order.status === status.value).length,
    }));
  }, [stats.recentOrders]);

  const completionRate = stats.ordersTotal === 0 ? 0 : Math.round(((stats.ordersTotal - stats.ordersPending) / stats.ordersTotal) * 100);

  const getNextStatus = (status: Order['status']): Order['status'] => {
    switch (status) {
      case 'pending':
        return 'paid';
      case 'paid':
        return 'processing';
      case 'processing':
        return 'ready';
      case 'ready':
        return 'shipped';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <WizardTriggerCard onOpen={() => setWizardOpen(true)} />
      <AdminSetupWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          {
            title: "Chiffre d'affaires",
            value: formatCurrency(stats.totalRevenue),
            hint: `${formatCurrency(stats.revenueThisMonth)} ce mois`,
            icon: CircleDollarSign,
            trendUp: stats.revenueThisMonth >= 0,
          },
          {
            title: 'Commandes',
            value: stats.ordersTotal.toLocaleString('fr-FR'),
            hint: `${stats.ordersToday} aujourd'hui`,
            icon: ShoppingCart,
            trendUp: true,
          },
          {
            title: 'En attente',
            value: stats.ordersPending.toLocaleString('fr-FR'),
            hint: stats.ordersPending > 0 ? 'Actions nécessaires' : 'Aucun blocage',
            icon: Clock3,
            trendUp: false,
          },
          {
            title: 'Clients',
            value: stats.totalCustomers.toLocaleString('fr-FR'),
            hint: 'Base active',
            icon: Users,
            trendUp: true,
          },
        ].map((kpi) => (
          <AdminCard key={kpi.title} className="relative overflow-hidden border-slate-800/80">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-green-neon/10 blur-2xl" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">{kpi.title}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-100">{kpi.value}</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {kpi.trendUp ? <TrendingUp className="h-4 w-4 text-emerald-300" /> : <TrendingDown className="h-4 w-4 text-amber-300" />}
                  <span className="text-slate-300">{kpi.hint}</span>
                </div>
              </div>
              <div className="rounded-xl border border-green-neon/20 bg-green-neon/10 p-2.5 text-green-neon">
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </AdminCard>
        ))}
      </div>

      {(stats.productsOutOfStock > 0 || stats.productsLowStock > 0) && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {stats.productsOutOfStock > 0 && (
            <AdminCard className="border-rose-500/30 bg-rose-500/5" bodyClassName="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-rose-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {stats.productsOutOfStock} produit{stats.productsOutOfStock > 1 ? 's' : ''} en rupture
                  </span>
                </div>
                <AdminButton onClick={onViewStock} variant="danger" className="py-2">
                  Voir stock
                </AdminButton>
              </div>
            </AdminCard>
          )}

          {stats.productsLowStock > 0 && (
            <AdminCard className="border-amber-500/30 bg-amber-500/5" bodyClassName="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {stats.productsLowStock} produit{stats.productsLowStock > 1 ? 's' : ''} avec stock faible
                  </span>
                </div>
                <AdminButton onClick={onViewStock} variant="secondary" className="py-2">
                  Vérifier
                </AdminButton>
              </div>
            </AdminCard>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <AdminCard title="Revenu des commandes récentes" subtitle="Tendance de performance" className="xl:col-span-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    color: '#e2e8f0',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Santé opérationnelle" subtitle="Distribution des statuts" className="xl:col-span-2">
          <div className="space-y-3">
            <div className="rounded-xl border border-green-neon/20 bg-green-neon/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Taux de traitement</p>
              <p className="mt-2 text-3xl font-bold text-slate-100">{completionRate}%</p>
            </div>

            {statusBreakdown.map((status) => (
              <div key={status.value} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                <span className="text-sm text-slate-300">{status.label}</span>
                <AdminBadge tone={status.tone}>{status.count}</AdminBadge>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <AdminCard
        title="Commandes récentes"
        subtitle={`${filteredOrders.length} résultat${filteredOrders.length > 1 ? 's' : ''} affiché${filteredOrders.length > 1 ? 's' : ''}`}
        actions={
          <AdminButton variant="ghost" onClick={onViewOrders}>
            Tout voir
          </AdminButton>
        }
      >
        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <label className="relative lg:col-span-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher ID, client, email..."
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-10 pr-4 text-sm text-slate-100 outline-none transition-all focus:border-green-neon/60"
            />
          </label>

          <label className="relative lg:col-span-3">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Order['status'] | 'all')}
              className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/70 pl-10 pr-4 text-sm text-slate-100 outline-none transition-all focus:border-green-neon/60"
            >
              <option value="all">Tous les statuts</option>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <label className="relative lg:col-span-3">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'today' | 'week' | 'month' | 'all')}
              className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/70 pl-10 pr-4 text-sm text-slate-100 outline-none transition-all focus:border-green-neon/60"
            >
              <option value="all">Toutes dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>
          </label>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
            <Package className="mb-3 h-9 w-9 text-slate-600" />
            <p className="text-base font-medium text-slate-200">Aucune commande trouvée</p>
            <p className="mt-1 text-sm text-slate-400">Essayez de modifier les filtres ou créez votre première commande.</p>
          </div>
        ) : (
          <AdminTable>
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Commande</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const status = ORDER_STATUS_OPTIONS.find((item) => item.value === order.status);
                return (
                  <tr key={order.id} className="border-b border-slate-800/70 text-sm text-slate-200 transition-colors hover:bg-slate-800/40">
                    <td className="px-4 py-4 font-medium">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-4">
                      <p>{order.profile?.full_name ?? 'Client inconnu'}</p>
                      <p className="text-xs text-slate-400">{order.profile?.email ?? '—'}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-4 font-semibold text-slate-100">{formatCurrency(Number(order.total) || 0)}</td>
                    <td className="px-4 py-4">
                      <AdminBadge tone={status?.tone ?? 'neutral'}>{status?.label ?? order.status}</AdminBadge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <AdminButton variant="ghost" className="px-3 py-2" onClick={() => onViewOrderDetails?.(order.id)} leftIcon={<Eye className="h-4 w-4" />}>
                          Voir
                        </AdminButton>
                        <AdminButton
                          variant="secondary"
                          className="px-3 py-2"
                          onClick={() => onUpdateOrderStatus?.(order.id, getNextStatus(order.status))}
                          leftIcon={<CheckCircle2 className="h-4 w-4" />}
                        >
                          Éditer
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          className="px-3 py-2"
                          onClick={() => onUpdateOrderStatus?.(order.id, 'cancelled')}
                          leftIcon={<XCircle className="h-4 w-4" />}
                        >
                          Annuler
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        )}
      </AdminCard>

      <div className="hidden grid-cols-4 gap-4 lg:grid">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-3 animate-pulse rounded-full bg-slate-800/70" />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800/90 bg-slate-900/40 p-4 text-sm text-slate-400">
        <div className="flex items-center gap-2 text-slate-300">
          <ArrowUpRight className="h-4 w-4 text-green-neon" />
          Astuce: configurez des raccourcis par statut (préparation, expédition, annulation) pour réduire les actions répétitives.
        </div>
      </div>
    </div>
  );
}
