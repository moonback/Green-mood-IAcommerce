import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, Category, Order, StockMovement, Profile } from '../lib/types';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import AdminVoicePanel from '../components/admin/AdminVoicePanel';

// Layout Components
import AdminLayout from '../components/admin/layout/AdminLayout';
import BackgroundTaskIndicator from '../components/admin/layout/BackgroundTaskIndicator';
import { Tab } from '../components/admin/layout/AdminSidebar';

// Tab Components
import AdminDashboardTab, { DashboardStats } from '../components/admin/AdminDashboardTab';
import AdminProductsTab from '../components/admin/AdminProductsTab';
import AdminCategoriesTab from '../components/admin/AdminCategoriesTab';
import AdminOrdersTab from '../components/admin/AdminOrdersTab';
import AdminStockTab from '../components/admin/AdminStockTab';
import AdminCustomersTab from '../components/admin/AdminCustomersTab';
import AdminSettingsTab from '../components/admin/AdminSettingsTab';
import AdminAnalyticsTab from '../components/admin/AdminAnalyticsTab';
import AdminReferralsTab from '../components/admin/AdminReferralsTab';
import AdminSubscriptionsTab from '../components/admin/AdminSubscriptionsTab';
import AdminReviewsTab from '../components/admin/AdminReviewsTab';
import AdminPromoCodesTab from '../components/admin/AdminPromoCodesTab';
import AdminRecommendationsTab from '../components/admin/AdminRecommendationsTab';
import AdminBudTenderTab from '../components/admin/AdminBudTenderTab';
import AdminPOSTab from '../components/admin/AdminPOSTab';
import AdminMarketingTab from '../components/admin/AdminMarketingTab';
import AdminDisplayTab from '../components/admin/AdminDisplayTab';
import AdminAccountingTab from '../components/admin/AdminAccountingTab';
import AdminSessionsTab from '../components/admin/AdminSessionsTab';
import AdminKnowledgeTab from '../components/admin/AdminKnowledgeTab';
import AdminKanbanTab from '../components/admin/AdminKanbanTab';
import AdminBirthdaysTab from '../components/admin/AdminBirthdaysTab';
import AdminLoyaltyTab from '../components/admin/AdminLoyaltyTab';
import AdminCannabisConditionsTab from '../components/admin/AdminCannabisConditionsTab';
import AdminAdsTab from '../components/admin/AdminAdsTab';
import AdminBlogTab from '../components/admin/AdminBlogTab';
import AdminAIModelsTab from '../components/admin/AdminAIModelsTab';
import AdminAIPerformanceTab from '../components/admin/AdminAIPerformanceTab';

export default function Admin() {
  const [tab, setTab] = useState<Tab>('dashboard');

  // Global Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isKanbanFullScreen, setIsKanbanFullScreen] = useState(true);

  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const { fetchSettings, settings } = useSettingsStore();
  const { signOut, profile } = useAuthStore();

  useEffect(() => {
    if (tab === 'kanban') {
      setIsKanbanFullScreen(true);
    }
  }, [tab]);

  const loadDashboard = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const [
      { data: allOrders },
      { data: todayOrders },
      { data: pendingOrders },
      { data: lowStock },
      { data: outOfStock },
      { data: profileCount },
      { data: recentOrders },
      { data: monthOrders },
    ] = await Promise.all([
      supabase.from('orders').select('total').eq('payment_status', 'paid'),
      supabase.from('orders').select('id').gte('created_at', startOfToday),
      supabase.from('orders').select('id').in('status', ['pending', 'paid', 'processing']),
      supabase.from('products').select('id').gt('stock_quantity', 0).lte('stock_quantity', 5),
      supabase.from('products').select('id').eq('stock_quantity', 0),
      supabase.from('profiles').select('id'),
      supabase.from('orders').select('*, order_items(*), profile:profiles(*, addresses(*)), address:addresses(*)').order('created_at', { ascending: false }).limit(8),
      supabase.from('orders').select('total').eq('payment_status', 'paid').gte('created_at', startOfMonth),
    ]);
    setStats({
      totalRevenue: (allOrders ?? []).reduce((s, o) => s + Number(o.total), 0),
      revenueThisMonth: (monthOrders ?? []).reduce((s, o) => s + Number(o.total), 0),
      ordersTotal: allOrders?.length ?? 0,
      ordersToday: todayOrders?.length ?? 0,
      ordersPending: pendingOrders?.length ?? 0,
      productsLowStock: lowStock?.length ?? 0,
      productsOutOfStock: outOfStock?.length ?? 0,
      totalCustomers: profileCount?.length ?? 0,
      recentOrders: (recentOrders as Order[]) ?? [],
    });
  };

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*, embedding, category:categories(*)')
      .order('name');
    setProducts((data as Product[]) ?? []);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      // Direct query to categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (catError) {
        console.error('Core categories fetch error:', catError);
        return;
      }

      // Fetch all products just once to count them locally (or use existing ones if they exist)
      // Actually, since we're in loadCategories, we might not have products yet.
      // Let's just fetch the count-map from products table in one go.
      const { data: prodData } = await supabase
        .from('products')
        .select('category_id');
      
      const countMap: Record<string, number> = {};
      (prodData || []).forEach(p => {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        }
      });
      
      const categoriesWithCounts = (catData as Category[] || []).map(cat => ({
        ...cat,
        products: [{ count: countMap[cat.id] || 0 }]
      }));
      
      setCategories(categoriesWithCounts);
    } catch (err) {
      console.error('Unexpected error in loadCategories:', err);
    }
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*), profile:profiles(*, addresses(*)), address:addresses(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders((data as Order[]) ?? []);
  };

  const loadStock = async () => {
    const [{ data: prods }, { data: movs }] = await Promise.all([
      supabase.from('products').select('id, name, stock_quantity, is_available').order('name'),
      supabase
        .from('stock_movements')
        .select('*, product:products(name)')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    setProducts((prods as Product[]) ?? []);
    setMovements((movs as StockMovement[]) ?? []);
  };

  const loadCustomers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setCustomers((data as Profile[]) ?? []);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    switch (tab) {
      case 'dashboard':
        await loadDashboard();
        break;
      case 'products':
        await Promise.all([loadProducts(), loadCategories()]);
        break;
      case 'categories':
        await loadCategories();
        break;
      case 'orders':
      case 'kanban':
        await loadOrders();
        break;
      case 'stock':
        await loadStock();
        break;
      case 'customers':
        await loadCustomers();
        break;
      case 'marketing':
        await Promise.all([loadCustomers(), loadProducts()]);
        break;
      case 'display':
        await loadProducts();
        break;
    }
    setIsLoading(false);
  }, [tab]);

  useEffect(() => {
    loadData();
    fetchSettings();
    // Pre-fetch categories on mount for all tabs
    loadCategories();
  }, [loadData, fetchSettings, loadCategories]);

  return (
    <AdminLayout
      currentTab={tab}
      onTabChange={setTab}
      onSignOut={signOut}
      showLayout={tab !== 'pos' && !(tab === 'kanban' && isKanbanFullScreen)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={tab.startsWith('settings_') ? 'settings-group' : tab}
          initial={tab === 'pos' ? undefined : { opacity: 0, y: 10 }}
          animate={tab === 'pos' ? undefined : { opacity: 1, y: 0 }}
          exit={tab === 'pos' ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={tab === 'pos' ? 'h-full' : ''}
        >
          {tab === 'dashboard' && stats && (
            <AdminDashboardTab
              stats={stats}
              onViewOrders={() => setTab('orders')}
              onViewStock={() => setTab('stock')}
              onUpdateOrderStatus={async (orderId, newStatus) => {
                await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
                await loadDashboard();
              }}
            />
          )}
          {tab === 'products' && (
            <AdminProductsTab
              products={products}
              categories={categories}
              onRefresh={loadProducts}
            />
          )}
          {tab === 'categories' && (
            <AdminCategoriesTab categories={categories} onRefresh={loadCategories} />
          )}
          {tab === 'orders' && (
            <AdminOrdersTab
              orders={orders}
              onRefresh={loadOrders}
              storeName={settings.store_name}
              storeAddress={settings.store_address}
            />
          )}
          {tab === 'stock' && (
            <AdminStockTab products={products} movements={movements} onRefresh={loadStock} />
          )}
          {tab === 'customers' && (
            <AdminCustomersTab customers={customers} onRefresh={loadCustomers} />
          )}
          {tab === 'referrals' && <AdminReferralsTab />}
          {tab === 'subscriptions' && <AdminSubscriptionsTab />}
          {tab === 'reviews' && <AdminReviewsTab />}
          {tab === 'analytics' && <AdminAnalyticsTab />}
          {tab === 'accounting' && <AdminAccountingTab />}
          {tab === 'promo_codes' && <AdminPromoCodesTab />}
          {tab === 'recommendations' && <AdminRecommendationsTab />}
          {tab === 'budtender' && <AdminBudTenderTab />}
          {tab === 'pos' && <AdminPOSTab onExit={() => setTab('dashboard')} />}
          {tab === 'marketing' && (
            <AdminMarketingTab
              customers={customers}
              products={products}
              onRefresh={() => {
                loadCustomers();
                loadProducts();
              }}
            />
          )}
          {tab === 'kanban' && (
            <AdminKanbanTab 
              orders={orders} 
              onRefresh={loadOrders} 
              isFullScreen={isKanbanFullScreen}
              onToggleFullScreen={() => setIsKanbanFullScreen(!isKanbanFullScreen)}
              onBack={() => setTab('dashboard')}
            />
          )}
          {tab === 'display' && <AdminDisplayTab products={products} />}
          {tab === 'sessions' && <AdminSessionsTab />}
          {tab.startsWith('settings_') && (
            <AdminSettingsTab 
              activeTab={tab.replace('settings_', '') as any} 
              onTabChange={setTab}
            />
          )}
          {tab === 'knowledge' && <AdminKnowledgeTab />}
          {tab === 'birthdays' && <AdminBirthdaysTab />}
          {tab === 'loyalty' && <AdminLoyaltyTab />}
          {tab === 'cannabis_conditions' && <AdminCannabisConditionsTab />}
          {tab === 'ads' && <AdminAdsTab />}
          {tab === 'blog' && <AdminBlogTab />}
          {tab === 'ai_models' && <AdminAIModelsTab />}
          {tab === 'ai_performance' && <AdminAIPerformanceTab isLightTheme={false} />}
        </motion.div>
      </AnimatePresence>

      <BackgroundTaskIndicator />

      {/* Admin voice AI — floating mic button (hidden during POS and when panel is open) */}
      {!isVoiceOpen && tab !== 'pos' && (
        <button
          type="button"
          onClick={() => setIsVoiceOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-neon text-black flex items-center justify-center shadow-lg shadow-green-neon/25 hover:scale-105 active:scale-95 transition-transform glow-box-green"
          title="Ouvrir l'assistante vocale admin (Manon)"
        >
          <Mic className="w-6 h-6" />
        </button>
      )}

      {isVoiceOpen && (
        <AdminVoicePanel
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
          onNavigate={(t) => setTab(t as Tab)}
          adminName={profile?.full_name ?? 'Admin'}
          storeName={settings.store_name || 'NeuroCart'}
        />
      )}
    </AdminLayout>
  );
}
