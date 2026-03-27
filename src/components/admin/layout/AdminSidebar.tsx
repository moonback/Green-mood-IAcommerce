import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Tag,
  Package,
  BarChart3,
  Cpu,
  Users,
  RefreshCw,
  Award,
  LineChart,
  Coins,
  TrendingUp,
  Leaf,
  ShoppingCart,
  LogOut,
  ChevronRight,
  Home,
  Megaphone,
  Calculator,
  BookOpen,
  ChevronDown,
  Columns,
  Tv2,
  UserCheck,
  Star,
  Cake,
  Store,
  Palette,
  Truck,
  Plus,
  Stethoscope,
  Newspaper,
  FileText,
} from 'lucide-react';
import { useSettingsStore } from '../../../store/settingsStore';

export type Tab =
  | 'dashboard'
  | 'kanban'
  | 'products'
  | 'categories'
  | 'orders'
  | 'stock'
  | 'customers'
  | 'settings_store'
  | 'settings_design'
  | 'settings_delivery'
  | 'settings_ai'
  | 'settings_features'
  | 'settings_content'
  | 'settings_referral'
  | 'subscriptions'
  | 'reviews'
  | 'analytics'
  | 'accounting'
  | 'promo_codes'
  | 'recommendations'
  | 'budtender'
  | 'referrals'
  | 'pos'
  | 'marketing'
  | 'display'
  | 'birthdays'
  | 'sessions'
  | 'knowledge'
  | 'cannabis_conditions'
  | 'loyalty'
  | 'ads'
  | 'blog'
  | 'ai_performance'
  | 'ai_models';

export interface NavItem {
  key: Tab;
  label: string;
  icon: React.ElementType;
}

interface AdminSidebarProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onSignOut: () => void;
}

export const sidebarCategories = [
  {
    key: 'overview',
    label: 'Vue générale',
    color: '#10b981',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'kanban', label: 'Kanban', icon: Columns },
      { key: 'analytics', label: 'Analytique', icon: LineChart },
      { key: 'accounting', label: 'Comptabilité', icon: Calculator },
    ],
  },
  {
    key: 'catalog',
    label: 'Catalogue',
    color: '#38bdf8',
    items: [
      { key: 'products', label: 'Produits', icon: ShoppingBag },
      { key: 'categories', label: 'Catégories', icon: Tag },
      { key: 'stock', label: 'Stock', icon: BarChart3 },
    ],
  },
  {
    key: 'sales',
    label: 'Ventes',
    color: '#f59e0b',
    items: [
      { key: 'orders', label: 'Commandes', icon: Package },
      { key: 'pos', label: 'Caisse (POS)', icon: ShoppingCart },
      { key: 'promo_codes', label: 'Codes promo', icon: Coins },
      { key: 'ads', label: 'Annonces', icon: Newspaper },
      { key: 'blog', label: 'Blog SEO', icon: FileText },
    ],
  },
  {
    key: 'clients',
    label: 'Clients',
    color: '#a78bfa',
    items: [
      { key: 'customers', label: 'Clients', icon: Users },
      { key: 'loyalty', label: 'Fidélité', icon: Coins },
      { key: 'birthdays', label: 'Anniversaires', icon: Cake },
      { key: 'referrals', label: 'Parrainages', icon: Award },
      { key: 'subscriptions', label: 'Abonnements', icon: RefreshCw },
      { key: 'reviews', label: 'Avis', icon: Star },
    ],
  },
  {
    key: 'ai',
    label: 'IA',
    color: '#10b981',
    items: [
      { key: 'budtender', label: 'BudTender IA', icon: Leaf },
      { key: 'recommendations', label: 'Recommandations', icon: TrendingUp },
      { key: 'marketing', label: 'Marketing IA', icon: Megaphone },
      { key: 'ai_performance', label: 'Performance IA', icon: LineChart },
      { key: 'knowledge', label: 'Connaissances IA', icon: BookOpen },
      { key: 'cannabis_conditions', label: 'Machines & infos', icon: Stethoscope },
      { key: 'ai_models', label: 'Modèles IA', icon: Cpu },
    ],
  },
  {
    key: 'settings',
    label: 'Configuration',
    color: '#10b981',
    items: [
      { key: 'settings_store', label: 'Boutique', icon: Store },
      { key: 'settings_design', label: 'Design', icon: Palette },
      { key: 'settings_delivery', label: 'Expédition', icon: Truck },
      { key: 'settings_features', label: 'Modules', icon: Plus },
      { key: 'settings_content', label: 'Contenu', icon: FileText },
    ],
  },
  {
    key: 'tools',
    label: 'Système',
    color: '#64748b',
    items: [
      { key: 'display', label: 'Afficheur TV', icon: Tv2 },
      { key: 'sessions', label: 'Sessions', icon: UserCheck },
    ],
  },
] as const;

export default function AdminSidebar({
  currentTab,
  onTabChange,
  isSidebarOpen,
  setIsSidebarOpen,
  onSignOut,
}: AdminSidebarProps) {
  const { settings } = useSettingsStore();
  const [openCategories, setOpenCategories] = useState<string[]>(['overview', 'sales']);

  const filteredCategories = useMemo(
    () =>
      sidebarCategories.map((cat) => {
        if (cat.key !== 'clients') return cat;
        return {
          ...cat,
          items: cat.items.filter((item) => {
            if (!settings.loyalty_program_enabled && ['loyalty', 'birthdays', 'referrals'].includes(item.key)) {
              return false;
            }
            return true;
          }),
        };
      }),
    [settings.loyalty_program_enabled]
  );

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const Item = ({ item }: { item: any }) => {
    const isActive = currentTab === item.key;
    return (
      <button
        onClick={() => onTabChange(item.key)}
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${isActive
          ? 'bg-green-neon/12 text-green-neon shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]'
          : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
          }`}
      >
        <item.icon className={`h-4 w-4 ${isActive ? 'text-green-neon' : 'text-slate-500 group-hover:text-slate-300'}`} />
        {isSidebarOpen && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      className={`hidden md:flex h-screen sticky top-0 z-30 flex-col border-r border-slate-800/80 bg-[#0b1220]/95 backdrop-blur-xl transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-20'
        }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
        {isSidebarOpen ? (
          <div className="flex items-center gap-3">
            <div className="h-auto w-60 overflow-hidden rounded-xl border border-green-neon/30 bg-slate-900/70">
              {settings.store_logo_dark_url || settings.store_logo_url ? (
                <img src={settings.store_logo_dark_url || settings.store_logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-green-neon">
                  <Leaf className="h-5 w-5" />
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="mx-auto h-10 w-10 overflow-hidden rounded-xl border border-green-neon/30 bg-slate-900/70">
            {settings.store_logo_dark_url || settings.store_logo_url ? (
              <img src={settings.store_logo_dark_url || settings.store_logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-green-neon">
                <Leaf className="h-5 w-5" />
              </div>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {filteredCategories.map((cat) => (
          <div key={cat.key} className="mb-2">
            {isSidebarOpen ? (
              <>
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs uppercase tracking-[0.16em] text-slate-500 hover:bg-slate-800/50"
                >
                  <span className="flex-1">{cat.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openCategories.includes(cat.key) ? '' : '-rotate-90'}`} />
                </button>
                <AnimatePresence initial={false}>
                  {openCategories.includes(cat.key) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-1 overflow-hidden px-1"
                    >
                      {cat.items.map((item) => (
                        <Item key={item.key} item={item} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="space-y-1 border-t border-slate-800/70 pt-2 first:border-t-0 first:pt-0">
                {cat.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onTabChange(item.key)}
                    title={item.label}
                    className={`group flex w-full items-center justify-center rounded-xl py-2.5 transition-all ${currentTab === item.key ? 'bg-green-neon/12 text-green-neon' : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                      }`}
                  >
                    <item.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-slate-800/80 p-3">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 p-2.5 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/"
            title="Voir le site"
            className={`flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 text-slate-300 transition hover:border-green-neon/50 hover:text-green-neon ${!isSidebarOpen ? 'px-1' : ''
              }`}
          >
            <Home className="h-4 w-4" />
            {isSidebarOpen && <span className="text-xs">Site</span>}
          </Link>
          <button
            onClick={onSignOut}
            title="Déconnexion"
            className={`flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300 ${!isSidebarOpen ? 'px-1' : ''
              }`}
          >
            <LogOut className="h-4 w-4" />
            {isSidebarOpen && <span className="text-xs">Sortir</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
