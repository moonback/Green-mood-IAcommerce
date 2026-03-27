import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  Zap, 
  DollarSign, 
  BarChart2, 
  PieChart, 
  Clock,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AIPerformanceStats {
  totalSessions: number;
  conversionRate: number;
  aiDrivenRevenue: number;
  avgSessionDuration: number;
  topProducts: { name: string; category: string; count: number; revenue: number }[];
  dailyInteractions: { date: string; count: number }[];
}

export default function AdminAIPerformanceTab({ isLightTheme }: { isLightTheme: boolean }) {
  const [stats, setStats] = useState<AIPerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Fetch Interactions
        const { data: interactions } = await supabase
          .from('budtender_interactions')
          .select('*')
          .gte('created_at', thirtyDaysAgo);

        // 2. Fetch Orders with overlap
        const { data: aiOrders } = await supabase
          .from('orders')
          .select('id, total, user_id, created_at, order_items(product_name, unit_price)')
          .gte('created_at', thirtyDaysAgo)
          .eq('payment_status', 'paid');

        const interactionMap = new Map<string, any[]>();
        (interactions || []).forEach(i => {
          if (i.user_id) {
            const list = interactionMap.get(i.user_id) || [];
            list.push(i);
            interactionMap.set(i.user_id, list);
          }
        });

        let aiDrivenRevenue = 0;
        let convertedSessions = 0;
        const productStats: Record<string, { name: string; category: string; count: number; revenue: number }> = {};

        (aiOrders || []).forEach(order => {
          const userInteractions = interactionMap.get(order.user_id);
          if (userInteractions) {
            // Check if interaction happened within 6 hours before order
            const orderTime = new Date(order.created_at).getTime();
            const hasRecentAI = userInteractions.some(i => {
              const iTime = new Date(i.created_at).getTime();
              return iTime < orderTime && orderTime - iTime < 6 * 60 * 60 * 1000;
            });

            if (hasRecentAI) {
              aiDrivenRevenue += Number(order.total);
              convertedSessions += 1;
              
              (order.order_items || []).forEach((item: any) => {
                if (!productStats[item.product_name]) {
                  productStats[item.product_name] = { 
                    name: item.product_name, 
                    category: 'AI Recommended', 
                    count: 0, 
                    revenue: 0 
                  };
                }
                productStats[item.product_name].count += 1;
                productStats[item.product_name].revenue += Number(item.unit_price);
              });
            }
          }
        });

        const totalSessions = interactions?.length || 0;
        const conversionRate = totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0;
        const avgSessionDuration = interactions?.length 
          ? (interactions.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0) / interactions.length)
          : 0;

        // Daily chart data
        const daily: Record<string, number> = {};
        (interactions || []).forEach(i => {
          const d = new Date(i.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          daily[d] = (daily[d] || 0) + 1;
        });

        setStats({
          totalSessions,
          conversionRate,
          aiDrivenRevenue,
          avgSessionDuration,
          topProducts: Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
          dailyInteractions: Object.entries(daily).map(([date, count]) => ({ date, count })).reverse().slice(0, 7).reverse()
        });
      } catch (err) {
        console.error('Error fetching AI stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const cardClass = `p-6 rounded-2xl border ${isLightTheme ? 'bg-white/80 border-slate-200' : 'bg-slate-900/50 border-white/10'} backdrop-blur-xl`;
  const textClass = isLightTheme ? 'text-slate-900' : 'text-white';
  const subTextClass = isLightTheme ? 'text-slate-500' : 'text-slate-400';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${textClass}`}>
            <Sparkles className="w-6 h-6 text-emerald-400" />
            Performance de l'IA Omnicanale
          </h2>
          <p className={subTextClass}>Suivi en temps réel de l'impact des sessions vocales sur vos revenus.</p>
        </div>
        <div className={`${cardClass} py-2 px-4 flex items-center gap-3`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`text-sm font-medium ${textClass}`}>IA en direct</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Chiffre d\'Affaires IA', value: `${stats?.aiDrivenRevenue.toFixed(2)}€`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Taux de Conversion IA', value: `${stats?.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Sessions Totales', value: stats?.totalSessions, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Temps Moyen Session', value: `${Math.round(stats?.avgSessionDuration || 0)}s`, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cardClass}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${subTextClass}`}>{item.label}</p>
                <h3 className={`text-2xl font-bold mt-1 ${textClass}`}>{item.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${item.bg}`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-bold ${textClass}`}>Volume d'Interactions (7 jours)</h3>
            <BarChart2 className={`w-5 h-5 ${subTextClass}`} />
          </div>
          <div className="flex items-end justify-between h-48 gap-2">
            {(stats?.dailyInteractions || []).map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-emerald-500/20 rounded-t-lg relative group transition-all hover:bg-emerald-500/40"
                  style={{ height: `${(day.count / (Math.max(...stats?.dailyInteractions.map(d => d.count) || [10]) || 1)) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs py-1 px-2 rounded">
                    {day.count}
                  </div>
                </div>
                <span className={`text-[10px] font-medium ${subTextClass}`}>{day.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-bold ${textClass}`}>Top Produits IA</h3>
            <PieChart className={`w-5 h-5 ${subTextClass}`} />
          </div>
          <div className="space-y-4">
            {(stats?.topProducts || []).map((product, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold truncate max-w-[120px] ${textClass}`}>{product.name}</p>
                    <p className={`text-[10px] ${subTextClass}`}>{product.count} ventes IA</p>
                  </div>
                </div>
                <span className={`text-sm font-bold text-emerald-500`}>+{Math.round(product.revenue)}€</span>
              </div>
            ))}
            {(stats?.topProducts || []).length === 0 && (
              <div className="py-8 text-center">
                <p className={subTextClass}>Aucune donnée de vente pour le moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
