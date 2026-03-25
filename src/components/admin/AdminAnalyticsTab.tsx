import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { parseReferrerSource } from '../../lib/analytics';
import type {
  RevenueDataPoint, TopProduct, OrderStatusDistribution,
  CustomerAcquisitionPoint, FunnelStep, AbandonmentPoint,
  CustomerLTV, CohortRow, PageViewEntry, TrafficSource,
} from '../../lib/types';
import { MessageSquare, TrendingUp, ShoppingBag, Users, Target, Crown, BarChart2, Globe, Zap, AlertTriangle, Lightbulb } from 'lucide-react';

type AnalyticsRange = '7d' | '30d' | '90d';

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', paid: '#3b82f6', processing: '#a855f7',
  ready: '#22c55e', shipped: '#06b6d4', delivered: '#a36cbe', cancelled: '#ef4444',
};

const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#a36cbe', '#ef4444', '#f97316', '#ec4899'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', paid: 'Payé', processing: 'En préparation',
  ready: 'Prêt', shipped: 'En livraison', delivered: 'Livré', cancelled: 'Annulé',
};

const tooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: '#fff' },
  labelStyle: { color: '#a1a1aa' },
};

const CURRENCY = (v: number) => v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const fmtMonth = (ym: string) => {
  const [, m] = ym.split('-');
  return MONTHS_FR[parseInt(m, 10) - 1] ?? ym;
};

// ─── Shared card wrapper ──────────────────────────────────────────────────────
function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900 rounded-2xl border border-zinc-800 p-6 ${className}`}>
      <h2 className="font-serif font-semibold text-lg mb-6">{title}</h2>
      {children}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string; size?: number }>; label: string }) {
  return (
    <div className="flex items-center gap-3 pt-4">
      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
        <Icon className="text-emerald-400" size={16} />
      </div>
      <h2 className="text-base font-black uppercase tracking-widest text-zinc-400">{label}</h2>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

// ─── Cohort cell heat color ───────────────────────────────────────────────────
function cohortColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'bg-zinc-900 text-zinc-600';
  const pct = value / max;
  if (pct >= 0.8) return 'bg-emerald-500/30 text-emerald-300';
  if (pct >= 0.5) return 'bg-emerald-500/15 text-emerald-400';
  if (pct >= 0.2) return 'bg-zinc-800 text-zinc-300';
  return 'bg-zinc-900 text-zinc-500';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminAnalyticsTab() {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [isLoading, setIsLoading] = useState(true);

  // — Existing metrics —
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [statusDist, setStatusDist] = useState<OrderStatusDistribution[]>([]);
  const [acqData, setAcqData] = useState<CustomerAcquisitionPoint[]>([]);
  const [aovData, setAovData] = useState<{ date: string; aov: number }[]>([]);
  const [categoryPerf, setCategoryPerf] = useState<{ name: string; value: number }[]>([]);
  const [budtenderStats, setBudtenderStats] = useState<{ type: string; count: number }[]>([]);
  const [voiceStats, setVoiceStats] = useState({ totalDuration: 0, sessionCount: 0, timeline: [] as { date: string; duration: number }[] });
  const [topQuestions, setTopQuestions] = useState<{ question: string; count: number }[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({ positive: 0, negative: 0 });
  const [kpis, setKpis] = useState({ totalRevenue: 0, aov: 0, conversionRate: 0, totalOrders: 0 });

  // — New metrics —
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [abandonmentData, setAbandonmentData] = useState<AbandonmentPoint[]>([]);
  const [ltvData, setLtvData] = useState<CustomerLTV[]>([]);
  const [cohortData, setCohortData] = useState<CohortRow[]>([]);
  const [pageHeatmap, setPageHeatmap] = useState<PageViewEntry[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [cartConversionRate, setCartConversionRate] = useState(0);

  useEffect(() => { loadAnalytics(); }, [range]);

  async function loadAnalytics() {
    setIsLoading(true);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    // ── Parallel fetches ──────────────────────────────────────────────────────
    const [
      { data: paidOrders },
      { data: allOrders },
      { data: newProfiles },
      { data: interactions },
      { data: events },
      { data: allPaidOrdersRaw },
      { data: allProfilesRaw },
    ] = await Promise.all([
      supabase.from('orders').select('id, total, created_at, user_id').eq('payment_status', 'paid').gte('created_at', sinceISO).order('created_at'),
      supabase.from('orders').select('status, created_at').gte('created_at', sinceISO),
      supabase.from('profiles').select('created_at').gte('created_at', sinceISO),
      supabase.from('budtender_interactions').select('*').gte('created_at', sinceISO),
      // analytics_events — may not exist yet; handle gracefully
      supabase.from('analytics_events').select('event_type, session_id, page, referrer, utm_source, created_at').gte('created_at', sinceISO),
      // LTV & cohorts: need ALL-TIME paid orders (no date filter)
      supabase.from('orders').select('id, user_id, total, created_at').eq('payment_status', 'paid').not('user_id', 'is', null).order('created_at'),
      supabase.from('profiles').select('id, full_name, email, created_at'),
    ]);

    const days_ = days; // alias for loop scope

    // ── Revenue & AOV by day ──────────────────────────────────────────────────
    const revenueByDay = new Map<string, number>();
    const ordersByDay = new Map<string, number>();
    let totalRev = 0;
    (paidOrders ?? []).forEach((o: any) => {
      const day = (o.created_at as string).slice(0, 10);
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + Number(o.total));
      ordersByDay.set(day, (ordersByDay.get(day) ?? 0) + 1);
      totalRev += Number(o.total);
    });

    const revData: RevenueDataPoint[] = [];
    const aovs: { date: string; aov: number }[] = [];
    for (let i = days_ - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayRev = revenueByDay.get(key) ?? 0;
      const dayOrd = ordersByDay.get(key) ?? 0;
      revData.push({ date: key, revenue: dayRev });
      aovs.push({ date: key, aov: dayOrd > 0 ? dayRev / dayOrd : 0 });
    }
    setRevenueData(revData);
    setAovData(aovs);

    // ── Top products & Category performance ────────────────────────────────────
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, product_name, quantity, total_price, order_id, product:products(category:categories(name))')
      .in('order_id', (paidOrders ?? []).map((o: any) => o.id));

    const productMap = new Map<string, TopProduct>();
    const catMap = new Map<string, number>();
    (orderItems ?? []).forEach((item: any) => {
      const ex = productMap.get(item.product_id) ?? { product_id: item.product_id, product_name: item.product_name, total_quantity: 0, total_revenue: 0 };
      ex.total_quantity += item.quantity;
      ex.total_revenue += Number(item.total_price);
      productMap.set(item.product_id, ex);
      const cat = item.product?.category?.name || 'Inconnu';
      catMap.set(cat, (catMap.get(cat) ?? 0) + Number(item.total_price));
    });
    setTopProducts(Array.from(productMap.values()).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5));
    setCategoryPerf(Array.from(catMap.entries()).map(([name, value]) => ({ name, value })));

    // ── BudTender Stats ────────────────────────────────────────────────────────
    const interactionCounts = new Map<string, number>();
    const questionsMap = new Map<string, number>();
    let quizCount = 0; let posFeed = 0; let negFeed = 0;
    interactions?.forEach((i: any) => {
      interactionCounts.set(i.interaction_type, (interactionCounts.get(i.interaction_type) ?? 0) + 1);
      if (i.interaction_type === 'question' && i.quiz_answers?.question) {
        const q = (i.quiz_answers.question as string).trim();
        questionsMap.set(q, (questionsMap.get(q) ?? 0) + 1);
      }
      if (i.interaction_type === 'feedback') {
        if (i.feedback === 'positive') posFeed++;
        if (i.feedback === 'negative') negFeed++;
      }
      if (['chat_session', 'voice_session', 'recommendation'].includes(i.interaction_type)) quizCount++;
    });

    const voiceSessions = interactions?.filter((i: any) => i.interaction_type === 'voice_session') || [];
    const totalVoiceDur = voiceSessions.reduce((acc: number, i: any) => acc + (i.duration_seconds || 0), 0);
    const voiceByDay = new Map<string, number>();
    voiceSessions.forEach((s: any) => {
      const day = s.created_at.slice(0, 10);
      voiceByDay.set(day, (voiceByDay.get(day) ?? 0) + (s.duration_seconds || 0));
    });
    const voiceTimeline: { date: string; duration: number }[] = [];
    for (let i = days_ - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      voiceTimeline.push({ date: key, duration: voiceByDay.get(key) ?? 0 });
    }
    setVoiceStats({ totalDuration: totalVoiceDur, sessionCount: voiceSessions.length, timeline: voiceTimeline });
    setFeedbackStats({ positive: posFeed, negative: negFeed });
    setBudtenderStats(Array.from(interactionCounts.entries()).map(([type, count]) => ({ type, count })));
    setTopQuestions(Array.from(questionsMap.entries()).map(([question, count]) => ({ question, count })).sort((a, b) => b.count - a.count).slice(0, 5));

    const usersWithQuiz = new Set(interactions?.filter((i: any) => ['chat_session', 'voice_session', 'recommendation'].includes(i.interaction_type)).map((i: any) => i.user_id));
    const usersWithOrder = new Set(paidOrders?.map((o: any) => o.user_id));
    const buyersWhoDidQuiz = Array.from(usersWithQuiz).filter((uid) => usersWithOrder.has(uid)).length;
    const totalOrders = paidOrders?.length ?? 0;
    setKpis({ totalRevenue: totalRev, totalOrders, aov: totalOrders > 0 ? totalRev / totalOrders : 0, conversionRate: quizCount > 0 ? (buyersWhoDidQuiz / quizCount) * 100 : 0 });

    // ── Status distribution ────────────────────────────────────────────────────
    const statusMap = new Map<string, number>();
    (allOrders ?? []).forEach((o: any) => { statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1); });
    setStatusDist(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));

    // ── Acquisition ────────────────────────────────────────────────────────────
    const acqByDay = new Map<string, number>();
    (newProfiles ?? []).forEach((p: any) => {
      const day = p.created_at.slice(0, 10);
      acqByDay.set(day, (acqByDay.get(day) ?? 0) + 1);
    });
    const acqArr: CustomerAcquisitionPoint[] = [];
    for (let i = days_ - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      acqArr.push({ date: key, new_customers: acqByDay.get(key) ?? 0 });
    }
    setAcqData(acqArr);

    // ── NEW: Funnel de conversion ──────────────────────────────────────────────
    const cartSessions = new Set<string>();
    const checkoutSessions = new Set<string>();
    const purchaseSessions = new Set<string>();

    (events ?? []).forEach((e: any) => {
      if (e.event_type === 'cart_add') cartSessions.add(e.session_id);
      if (e.event_type === 'checkout_start') checkoutSessions.add(e.session_id);
      if (e.event_type === 'purchase') purchaseSessions.add(e.session_id);
    });

    const cartCount = cartSessions.size;
    const checkoutCount = checkoutSessions.size;
    const purchaseCount = purchaseSessions.size;

    setFunnelData([
      { step: 'Panier', sessions: cartCount, pct: 100 },
      { step: 'Checkout', sessions: checkoutCount, pct: cartCount > 0 ? (checkoutCount / cartCount) * 100 : 0 },
      { step: 'Achat', sessions: purchaseCount, pct: cartCount > 0 ? (purchaseCount / cartCount) * 100 : 0 },
    ]);

    const convRate = cartCount > 0 ? (purchaseCount / cartCount) * 100 : 0;
    setCartConversionRate(convRate);

    // ── NEW: Abandon de panier (par jour) ─────────────────────────────────────
    const cartByDay = new Map<string, Set<string>>();
    (events ?? []).filter((e: any) => e.event_type === 'cart_add').forEach((e: any) => {
      const day = (e.created_at as string).slice(0, 10);
      if (!cartByDay.has(day)) cartByDay.set(day, new Set());
      cartByDay.get(day)!.add(e.session_id);
    });

    const abandArr: AbandonmentPoint[] = [];
    for (let i = days_ - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const daySessions = cartByDay.get(key) ?? new Set<string>();
      const converted = [...daySessions].filter((sid) => purchaseSessions.has(sid)).length;
      abandArr.push({ date: key, converted, abandoned: daySessions.size - converted });
    }
    setAbandonmentData(abandArr);

    // ── NEW: Page heatmap ─────────────────────────────────────────────────────
    const pageCounts = new Map<string, number>();
    (events ?? []).filter((e: any) => e.event_type === 'page_view').forEach((e: any) => {
      if (!e.page) return;
      // Normalize product/guide detail pages
      const normalized = (e.page as string)
        .replace(/\/produit\/[^/]+/, '/produit/[slug]')
        .replace(/\/guides\/[^/]+/, '/guides/[slug]')
        .replace(/\?.*$/, '');
      pageCounts.set(normalized, (pageCounts.get(normalized) ?? 0) + 1);
    });
    setPageHeatmap(
      Array.from(pageCounts.entries())
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 12)
    );

    // ── NEW: Sources de trafic ────────────────────────────────────────────────
    const sourceCounts = new Map<string, number>();
    (events ?? []).filter((e: any) => e.event_type === 'page_view').forEach((e: any) => {
      const src = (e.utm_source as string | null) || parseReferrerSource(e.referrer as string | null);
      sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    });
    setTrafficSources(
      Array.from(sourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
    );

    // ── NEW: LTV par client (top 20) ──────────────────────────────────────────
    const ltvMap = new Map<string, { name: string; email: string; total: number; orders: number; first: string }>();
    const profileLookup = new Map<string, { name: string; email: string }>();
    (allProfilesRaw ?? []).forEach((p: any) => {
      profileLookup.set(p.id as string, { name: (p.full_name as string) || 'Anonyme', email: (p.email as string) || '' });
    });

    (allPaidOrdersRaw ?? []).forEach((o: any) => {
      const uid = o.user_id as string;
      const prof = profileLookup.get(uid) ?? { name: 'Anonyme', email: '' };
      const ex = ltvMap.get(uid) ?? { name: prof.name, email: prof.email, total: 0, orders: 0, first: o.created_at as string };
      ex.total += Number(o.total);
      ex.orders += 1;
      if ((o.created_at as string) < ex.first) ex.first = o.created_at as string;
      ltvMap.set(uid, ex);
    });

    setLtvData(
      Array.from(ltvMap.entries())
        .map(([user_id, d]) => ({
          user_id,
          name: d.name,
          email: d.email,
          total_revenue: d.total,
          order_count: d.orders,
          first_order_at: d.first,
          avg_order_value: d.orders > 0 ? d.total / d.orders : 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 20)
    );

    // ── NEW: Cohortes d'acquisition ────────────────────────────────────────────
    const profileCohort = new Map<string, string>(); // userId → "YYYY-MM"
    const cohortMembers = new Map<string, string[]>(); // "YYYY-MM" → userId[]
    (allProfilesRaw ?? []).forEach((p: any) => {
      const month = (p.created_at as string).slice(0, 7);
      profileCohort.set(p.id as string, month);
      if (!cohortMembers.has(month)) cohortMembers.set(month, []);
      cohortMembers.get(month)!.push(p.id as string);
    });

    const cohortRev = new Map<string, Record<number, number>>(); // "YYYY-MM" → { 0: rev, 1: rev, ... }
    (allPaidOrdersRaw ?? []).forEach((o: any) => {
      const uid = o.user_id as string;
      const signupMonth = profileCohort.get(uid);
      if (!signupMonth) return;
      const [sy, sm] = signupMonth.split('-').map(Number);
      const [oy, om] = (o.created_at as string).slice(0, 7).split('-').map(Number);
      const offset = (oy - sy) * 12 + (om - sm);
      if (offset < 0 || offset > 5) return;
      if (!cohortRev.has(signupMonth)) cohortRev.set(signupMonth, {});
      const r = cohortRev.get(signupMonth)!;
      r[offset] = (r[offset] ?? 0) + Number(o.total);
    });

    const now = new Date();
    const rows: CohortRow[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const rev = cohortRev.get(monthKey) ?? {};
      rows.push({
        cohort: monthKey,
        members: (cohortMembers.get(monthKey) ?? []).length,
        m0: rev[0] ?? 0, m1: rev[1] ?? 0, m2: rev[2] ?? 0,
        m3: rev[3] ?? 0, m4: rev[4] ?? 0, m5: rev[5] ?? 0,
      });
    }
    setCohortData(rows);

    setIsLoading(false);
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  const maxCohortValue = Math.max(...cohortData.flatMap((r) => [r.m0, r.m1, r.m2, r.m3, r.m4, r.m5]));

  const smartInsights = useMemo(() => {
    const insights: { type: 'success' | 'warning' | 'info'; message: string; icon: any }[] = [];
    
    // 1. Revenue
    if (kpis.totalRevenue > 0) {
      insights.push({ type: 'success', message: `Le CA s'élève à ${CURRENCY(kpis.totalRevenue)}. Concentrez-vous sur l'augmentation du panier moyen.`, icon: TrendingUp });
    }

    // 2. Conversion
    if (cartConversionRate >= 30) {
      insights.push({ type: 'success', message: `Excellent taux de conversion depuis le panier (${cartConversionRate.toFixed(1)}%). Le funnel est optimal.`, icon: Target });
    } else if (cartConversionRate > 0 && cartConversionRate < 20) {
      insights.push({ type: 'warning', message: `Attention, taux d'abandon au panier élevé (${(100 - cartConversionRate).toFixed(1)}%). Pensez à relancer les paniers abandonnés.`, icon: AlertTriangle });
    }

    // 3. Top Product
    if (topProducts.length > 0) {
      insights.push({ type: 'info', message: `Le best-seller est "${topProducts[0].product_name}" avec ${CURRENCY(topProducts[0].total_revenue)} générés. Pensez à le mettre en avant !`, icon: Zap });
    }

    // 4. Voice IA
    if (voiceStats.sessionCount > 0) {
      const avg = Math.round(voiceStats.totalDuration / voiceStats.sessionCount);
      insights.push({ type: 'info', message: `L'assistant vocal retient l'attention en moyenne ${avg}s par session, prouvant un engagement fort.`, icon: MessageSquare });
    }

    // 5. Satisfaction Recommandation
    const totalFeed = feedbackStats.positive + feedbackStats.negative;
    if (totalFeed > 0) {
      const pct = Math.round((feedbackStats.positive / totalFeed) * 100);
      if (pct >= 80) {
        insights.push({ type: 'success', message: `Vos clients adorent les recommandations IA (${pct}% de retours positifs).`, icon: Crown });
      } else if (pct < 50) {
        insights.push({ type: 'warning', message: `Les recommandations IA sont peu appréciées (${pct}% de satisfaction), surveillez les questions fréquentes pour cibler le contenu.`, icon: AlertTriangle });
      }
    }
    
    return insights;
  }, [kpis.totalRevenue, cartConversionRate, topProducts, voiceStats, feedbackStats]);

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">Tableau de Performance</h1>
          <p className="text-sm text-zinc-500 font-medium">Ventes, funnel de conversion & Insights IA.</p>
        </div>
        <div className="flex gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-start">
          {(Object.keys(RANGE_LABELS) as AnalyticsRange[]).map((r) => (
            <button
              key={r} onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${range === r ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'text-zinc-500 hover:text-white'}`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 animate-pulse h-32" />
          ))}
          <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 animate-pulse h-80" />
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 1 — KPIs PRINCIPAUX
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm hover:border-emerald-500/30 transition-all">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Revenus</p>
              <h3 className="text-2xl font-black text-white">{kpis.totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</h3>
              <p className="text-xs text-emerald-400 mt-1 font-bold">CA {range === '7d' ? 'hebdo' : range === '30d' ? 'mensuel' : 'trimestriel'}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm hover:border-blue-500/30 transition-all">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><ShoppingBag className="w-3 h-3" /> Panier Moyen</p>
              <h3 className="text-2xl font-black text-white">{kpis.aov.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</h3>
              <p className="text-xs text-zinc-500 mt-1">Sur {kpis.totalOrders} commandes</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm hover:border-purple-500/30 transition-all">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><Users className="w-3 h-3" /> Conversion Quiz</p>
              <h3 className="text-2xl font-black text-white">{kpis.conversionRate.toFixed(1)}%</h3>
              <p className="text-xs text-zinc-500 mt-1">Ventes après conseil IA</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl backdrop-blur-sm hover:border-amber-500/30 transition-all">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Interactions IA</p>
              <h3 className="text-2xl font-black text-white">{budtenderStats.reduce((s, d) => s + d.count, 0).toLocaleString()}</h3>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-purple-500 font-bold">Total points de contact</p>
                <p className="text-[10px] text-zinc-500">dont {voiceStats.sessionCount} vocaux</p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 1.5 — INSIGHTS IA
          ══════════════════════════════════════════════════════════════════════ */}
          {smartInsights.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-3xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Insights IA Actionnables</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {smartInsights.map((insight, idx) => (
                  <div key={idx} className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-4 flex items-start gap-3 hover:border-emerald-500/30 transition-all">
                    <div className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${
                      insight.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                      insight.type === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      <insight.icon className="w-4 h-4" />
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">{insight.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 2 — FUNNEL DE CONVERSION + ABANDON DE PANIER
          ══════════════════════════════════════════════════════════════════════ */}
          <SectionLabel icon={Target} label="Funnel de conversion & Abandon de panier" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel */}
            <ChartCard title="Funnel panier → achat">
              {funnelData.length === 0 || funnelData[0].sessions === 0 ? (
                <div className="h-48 flex items-center justify-center text-zinc-600 text-xs italic">Données insuffisantes — les événements s'accumuleront au fil des sessions.</div>
              ) : (
                <div className="space-y-5">
                  {/* Conversion rate badge */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Taux panier → achat</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-black ${cartConversionRate >= 30 ? 'bg-emerald-500/20 text-emerald-400' : cartConversionRate >= 10 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {cartConversionRate.toFixed(1)}%
                    </span>
                  </div>
                  {funnelData.map((step, idx) => (
                    <div key={step.step} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 text-[10px] font-black">{idx + 1}</span>
                          <span className="text-white uppercase tracking-widest">{step.step}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-400">{step.sessions.toLocaleString()} sessions</span>
                          <span className="text-emerald-400 w-12 text-right">{step.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${step.pct}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: idx * 0.1 }}
                          className={`h-full rounded-full ${idx === 0 ? 'bg-zinc-500' : idx === 1 ? 'bg-blue-500' : 'bg-emerald-500'}`}
                        />
                      </div>
                      {idx < funnelData.length - 1 && funnelData[idx].sessions > 0 && (
                        <p className="text-[10px] text-zinc-600 text-right">
                          Abandon : {(100 - (funnelData[idx + 1].sessions / funnelData[idx].sessions * 100)).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            {/* Abandon de panier par jour */}
            <ChartCard title="Abandon vs Conversion (par jour)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={abandonmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="#71717a" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} />
                  <Tooltip {...tooltipStyle} labelFormatter={formatDate} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 12 }} />
                  <Bar dataKey="converted" name="Convertis" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="abandoned" name="Abandonnés" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 3 — REVENUS + CATÉGORIES
          ══════════════════════════════════════════════════════════════════════ */}
          <SectionLabel icon={TrendingUp} label="Revenus & Performances" />

          {/* Voice analytics */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </motion.div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Consommation Gemini Live Vocal</h3>
              <p className="text-sm text-zinc-400 max-w-xl">Statistiques d'utilisation en temps réel de l'assistant vocal.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-zinc-950/50 border border-zinc-800/50 p-6 rounded-2xl text-center min-w-[140px]">
                <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Temps Total</p>
                <p className="text-2xl font-black text-white">{Math.floor(voiceStats.totalDuration / 60)}m {voiceStats.totalDuration % 60}s</p>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-800/50 p-6 rounded-2xl text-center min-w-[140px]">
                <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Moyenne / Session</p>
                <p className="text-2xl font-black text-emerald-400">{voiceStats.sessionCount > 0 ? Math.round(voiceStats.totalDuration / voiceStats.sessionCount) : 0}s</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6">
            <h3 className="text-sm font-black uppercase text-zinc-500 mb-6 px-2">Activité Vocale (secondes / jour)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={voiceStats.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" hide />
                <Tooltip {...tooltipStyle} labelFormatter={formatDate} formatter={(v: number) => [`${v}s`, 'Durée']} />
                <Bar dataKey="duration" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChartCard title="Progression des revenus">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={formatDate} interval={range === '7d' ? 0 : range === '30d' ? 4 : 10} axisLine={false} />
                    <YAxis stroke="#71717a" tick={{ fontSize: 10, fontWeight: 700 }} tickFormatter={(v: number) => `${v}€`} axisLine={false} />
                    <Tooltip {...tooltipStyle} labelFormatter={formatDate} formatter={(v: number) => [`${v.toFixed(2)} €`, 'Revenus']} />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: '#22c55e', stroke: '#000', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
            <ChartCard title="Revenus par Catégorie">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={categoryPerf} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5}>
                    {categoryPerf.map((_, index) => (<Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v.toFixed(2)} €`, 'CA']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                {categoryPerf.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] font-black uppercase text-zinc-500">{entry.name}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 4 — LTV PAR CLIENT
          ══════════════════════════════════════════════════════════════════════ */}
          <SectionLabel icon={Crown} label="Lifetime Value (LTV) clients" />

          <ChartCard title="Top clients — valeur totale générée">
            {ltvData.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-zinc-600 text-xs italic">Aucune commande payée enregistrée.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-3 pr-4">#</th>
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-3 pr-4">Client</th>
                      <th className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-3 pr-4">LTV</th>
                      <th className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-3 pr-4">Commandes</th>
                      <th className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-3 pr-4">Panier moy.</th>
                      <th className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-3">1ère commande</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {ltvData.map((c, idx) => (
                      <tr key={c.user_id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 pr-4">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-zinc-500/20 text-zinc-300' : idx === 2 ? 'bg-orange-700/20 text-orange-500' : 'bg-zinc-800 text-zinc-500'}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-bold text-white">{c.name}</p>
                          <p className="text-zinc-600 text-[10px]">{c.email}</p>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className="font-black text-emerald-400">{CURRENCY(c.total_revenue)}</span>
                        </td>
                        <td className="py-3 pr-4 text-right text-zinc-300 font-bold">{c.order_count}</td>
                        <td className="py-3 pr-4 text-right text-zinc-400">{CURRENCY(c.avg_order_value)}</td>
                        <td className="py-3 text-right text-zinc-600">
                          {new Date(c.first_order_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 5 — COHORTES D'ACQUISITION
          ══════════════════════════════════════════════════════════════════════ */}
          <SectionLabel icon={BarChart2} label="Cohortes d'acquisition (6 derniers mois)" />

          <ChartCard title="CA généré par cohorte (mois depuis l'inscription)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-3 pr-6 whitespace-nowrap">Cohorte</th>
                    <th className="text-center text-[10px] font-black uppercase text-zinc-500 pb-3 px-2">Clients</th>
                    {['M+0', 'M+1', 'M+2', 'M+3', 'M+4', 'M+5'].map((m) => (
                      <th key={m} className="text-center text-[10px] font-black uppercase text-zinc-500 pb-3 px-3 min-w-[80px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {cohortData.map((row) => (
                    <tr key={row.cohort} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 pr-6 font-black text-white whitespace-nowrap">{fmtMonth(row.cohort)} {row.cohort.slice(0, 4)}</td>
                      <td className="py-3 px-2 text-center text-zinc-400 font-bold">{row.members}</td>
                      {([row.m0, row.m1, row.m2, row.m3, row.m4, row.m5] as number[]).map((val, i) => (
                        <td key={i} className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded-lg text-[11px] font-black w-full text-center ${cohortColor(val, maxCohortValue)}`}>
                            {val > 0 ? CURRENCY(val) : '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-zinc-600 mt-4 font-bold uppercase tracking-widest">
                Les colonnes vertes indiquent les cohortes les plus rentables. M+0 = mois de l'inscription.
              </p>
            </div>
          </ChartCard>

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 6 — HEATMAP PAGES + SOURCES DE TRAFIC
          ══════════════════════════════════════════════════════════════════════ */}
          <SectionLabel icon={Globe} label="Trafic & Pages visitées" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Page heatmap */}
            <div className="lg:col-span-2">
              <ChartCard title="Pages les plus visitées">
                {pageHeatmap.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-zinc-600 text-xs italic">Les données s'accumuleront au fil des visites.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pageHeatmap} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" stroke="#71717a" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} />
                      <YAxis
                        type="category" dataKey="page"
                        stroke="#71717a" tick={{ fontSize: 10, fontWeight: 700 }}
                        width={160} axisLine={false}
                        tickFormatter={(v: string) => v.length > 24 ? v.slice(0, 22) + '…' : v}
                      />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'Vues']} />
                      <Bar dataKey="views" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Sources de trafic */}
            <ChartCard title="Sources de trafic">
              {trafficSources.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-zinc-600 text-xs italic">En attente de données.</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={trafficSources} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                        {trafficSources.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {trafficSources.map((s, i) => {
                      const total = trafficSources.reduce((sum, x) => sum + x.count, 0);
                      return (
                        <div key={s.source} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-zinc-300 font-bold capitalize">{s.source}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-500">{s.count}</span>
                            <span className="text-zinc-400 font-black w-10 text-right">{((s.count / total) * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </ChartCard>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 7 — Cortex IA
          ══════════════════════════════════════════════════════════════════════ */}
          <SectionLabel icon={MessageSquare} label="Insights Cortex IA" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard title="Insight SEO/FAQ">
              <div className="space-y-4 h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                {topQuestions.length > 0 ? topQuestions.map((q, i) => (
                  <div key={i} className="bg-zinc-800/30 border border-zinc-700/50 p-4 rounded-xl flex items-start gap-3 group hover:border-emerald-500/20 transition-all">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-black shrink-0">{q.count}</div>
                    <p className="text-xs text-white font-medium leading-relaxed italic">"{q.question}"</p>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">Aucune question enregistrée.</div>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Satisfaction Recommandations">
              <div className="h-[240px] flex flex-col justify-center gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/20 border border-zinc-800 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Positifs</p>
                    <p className="text-2xl font-black text-emerald-400">{feedbackStats.positive}</p>
                  </div>
                  <div className="bg-zinc-800/20 border border-zinc-800 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Négatifs</p>
                    <p className="text-2xl font-black text-red-400">{feedbackStats.negative}</p>
                  </div>
                </div>
                <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
                  {feedbackStats.positive + feedbackStats.negative > 0 ? (
                    <div className="absolute h-full bg-emerald-500" style={{ width: `${(feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative)) * 100}%` }} />
                  ) : (
                    <div className="absolute h-full w-full bg-zinc-700" />
                  )}
                </div>
                <p className="text-[10px] text-center text-zinc-500 uppercase font-bold tracking-tighter">
                  {feedbackStats.positive + feedbackStats.negative > 0
                    ? `${Math.round((feedbackStats.positive / (feedbackStats.positive + feedbackStats.negative)) * 100)}% de satisfaction`
                    : 'En attente de feedbacks'}
                </p>
              </div>
            </ChartCard>

            <ChartCard title="Interactions BudTender">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={budtenderStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="type" stroke="#71717a" tick={{ fontSize: 10, fontWeight: 700 }} width={100} axisLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              SECTION 8 — PRODUITS & STATUTS
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            <ChartCard title="Top Produits">
              <div className="space-y-4">
                {topProducts.map((p) => (
                  <div key={p.product_id} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white">{p.product_name}</span>
                      <span className="text-emerald-400">{p.total_revenue.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.total_revenue / (topProducts[0]?.total_revenue || 1)) * 100}%` }}
                        className="h-full bg-emerald-500/50"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">{p.total_quantity} vendus</p>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Statuts des Commandes">
              <div className="flex items-center justify-between h-full min-h-[160px]">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="count" nameKey="status" innerRadius={40} outerRadius={60}>
                      {statusDist.map((entry, index) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[45%] space-y-2">
                  {statusDist.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-zinc-400 font-bold uppercase">{STATUS_LABELS[s.status] || s.status}</span>
                      </div>
                      <span className="text-white font-black">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
