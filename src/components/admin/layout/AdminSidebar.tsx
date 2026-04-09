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
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
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
  | 'ai_models'
  | 'subscriptions_kanban';

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
      { key: 'kanban', label: 'Suivi Commandes', icon: Columns },
      { key: 'subscriptions_kanban', label: 'Suivi Abonnements', icon: Columns },
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
  const [openCategories, setOpenCategories] = useState<string[]>(['overview', 'sales', 'clients']);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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

  // Find which category owns the active tab (for the accent strip)
  const activeCatColor = useMemo(() => {
    for (const cat of sidebarCategories) {
      if (cat.items.some((i) => i.key === currentTab)) return cat.color;
    }
    return '#10b981';
  }, [currentTab]);

  return (
    <>
      <aside
        className={`hidden md:flex h-screen sticky top-0 z-30 flex-col transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)] ${
          isSidebarOpen ? 'w-[272px]' : 'w-[72px]'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(8,15,28,0.97) 0%, rgba(6,12,24,0.99) 100%)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* ───── Logo / Brand ───── */}
        <div className="relative flex items-center justify-center px-4 py-5 shrink-0">
          {/* Subtle glow behind logo */}
          <div
            className="absolute inset-0 opacity-30 blur-3xl pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center, ${activeCatColor}22, transparent 70%)` }}
          />

          {isSidebarOpen ? (
            <div className="relative w-full h-14 rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] flex items-center justify-center">
              {settings.store_logo_dark_url || settings.store_logo_url ? (
                <img
                  src={settings.store_logo_dark_url || settings.store_logo_url}
                  alt="Logo"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold text-white/80 tracking-tight">
                    {settings.store_name || 'Green Mood'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02] flex items-center justify-center">
              {settings.store_logo_dark_url || settings.store_logo_url ? (
                <img
                  src={settings.store_logo_dark_url || settings.store_logo_url}
                  alt="Logo"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Leaf className="w-4 h-4 text-emerald-400" />
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* ───── Navigation ───── */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 sidebar-scroll">
          {filteredCategories.map((cat, catIdx) => (
            <div key={cat.key} className={catIdx > 0 ? 'mt-1' : ''}>
              {/* Category Header */}
              {isSidebarOpen ? (
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div
                    className="w-1 h-3.5 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: cat.color,
                      opacity: openCategories.includes(cat.key) ? 1 : 0.3,
                    }}
                  />
                  <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 group-hover:text-white/50 transition-colors">
                    {cat.label}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 text-white/20 transition-transform duration-300 ${
                      openCategories.includes(cat.key) ? '' : '-rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <div className="flex justify-center py-2">
                  <div className="w-5 h-px rounded-full" style={{ backgroundColor: cat.color, opacity: 0.3 }} />
                </div>
              )}

              {/* Category Items */}
              {isSidebarOpen ? (
                <AnimatePresence initial={false}>
                  {openCategories.includes(cat.key) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pb-1 pl-1">
                        {cat.items.map((item) => {
                          const isActive = currentTab === item.key;
                          return (
                            <button
                              key={item.key}
                              onClick={() => onTabChange(item.key)}
                              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                                isActive
                                  ? 'text-white'
                                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                              }`}
                            >
                              {/* Active indicator bar */}
                              {isActive && (
                                <motion.div
                                  layoutId="sidebar-active-indicator"
                                  className="absolute inset-0 rounded-xl"
                                  style={{
                                    background: `linear-gradient(135deg, ${cat.color}12, ${cat.color}06)`,
                                    boxShadow: `inset 0 0 0 1px ${cat.color}25, 0 0 20px ${cat.color}08`,
                                  }}
                                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                />
                              )}

                              {/* Left accent dot */}
                              <div className="relative z-10 flex items-center justify-center w-5 h-5">
                                {isActive && (
                                  <motion.div
                                    layoutId="sidebar-active-dot"
                                    className="absolute w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: cat.color, boxShadow: `0 0 8px ${cat.color}80` }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                  />
                                )}
                                <item.icon
                                  className={`relative z-10 h-[15px] w-[15px] transition-colors duration-200 ${
                                    isActive ? '' : 'text-white/25 group-hover:text-white/50'
                                  }`}
                                  style={isActive ? { color: cat.color } : undefined}
                                />
                              </div>

                              <span className="relative z-10 truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                /* Collapsed: icon-only with tooltip */
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive = currentTab === item.key;
                    return (
                      <div key={item.key} className="relative">
                        <button
                          onClick={() => onTabChange(item.key)}
                          onMouseEnter={() => setHoveredItem(item.key)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={`group relative flex w-full items-center justify-center rounded-xl py-2.5 transition-all duration-200 ${
                            isActive ? 'text-white' : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active-collapsed"
                              className="absolute inset-0 rounded-xl"
                              style={{
                                background: `linear-gradient(135deg, ${cat.color}15, ${cat.color}08)`,
                                boxShadow: `inset 0 0 0 1px ${cat.color}30`,
                              }}
                              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            />
                          )}
                          <item.icon
                            className="relative z-10 h-[17px] w-[17px]"
                            style={isActive ? { color: cat.color } : undefined}
                          />
                        </button>

                        {/* Tooltip */}
                        <AnimatePresence>
                          {hoveredItem === item.key && (
                            <motion.div
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
                            >
                              <div
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap"
                                style={{
                                  background: 'rgba(15,23,42,0.95)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                }}
                              >
                                {item.label}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* ───── Footer ───── */}
        <div className="shrink-0 border-t border-white/[0.04] p-3 space-y-2">
          {/* Collapse toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="group flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all duration-200"
          >
            {isSidebarOpen ? (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span className="text-xs font-medium">Réduire</span>
              </>
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>

          {/* Action buttons */}
          <div className={`grid gap-1.5 ${isSidebarOpen ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Link
              to="/"
              className={`group flex items-center justify-center gap-2 rounded-xl py-2.5 text-white/30 hover:text-emerald-400 hover:bg-emerald-400/[0.06] transition-all duration-200 border border-transparent hover:border-emerald-400/10 ${
                !isSidebarOpen ? 'px-1' : ''
              }`}
              title="Voir le site"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {isSidebarOpen && <span className="text-xs font-medium">Site</span>}
            </Link>
            <button
              onClick={onSignOut}
              title="Déconnexion"
              className={`group flex items-center justify-center gap-2 rounded-xl py-2.5 text-white/30 hover:text-rose-400 hover:bg-rose-400/[0.06] transition-all duration-200 border border-transparent hover:border-rose-400/10 ${
                !isSidebarOpen ? 'px-1' : ''
              }`}
            >
              <LogOut className="h-3.5 w-3.5" />
              {isSidebarOpen && <span className="text-xs font-medium">Sortir</span>}
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 10px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.12);
        }
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.06) transparent;
        }
      `}</style>
    </>
  );
}
