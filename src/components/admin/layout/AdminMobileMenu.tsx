import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Menu, X, Leaf, Home } from 'lucide-react';
import { Tab, sidebarCategories } from './AdminSidebar';
import { useSettingsStore } from '../../../store/settingsStore';

interface AdminMobileMenuProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function AdminMobileMenu({
  currentTab,
  onTabChange,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: AdminMobileMenuProps) {
  const { settings } = useSettingsStore();

  const filteredCategories = sidebarCategories.map((cat) => {
    if (cat.key !== 'clients') return cat;
    return {
      ...cat,
      items: cat.items.filter((item) => {
        if (!settings.loyalty_program_enabled && (item.key === 'loyalty' || item.key === 'birthdays' || item.key === 'referrals')) {
          return false;
        }
        return true;
      }),
    };
  });

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[60] flex h-20 items-center justify-between border-b border-slate-800/80 bg-[#0b1220]/95 px-5 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-neon/30 bg-green-neon/10 text-green-neon">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Admin panel</p>
            <p className="text-sm font-semibold text-slate-100">{settings.store_name || 'Ecommerce'}</p>
          </div>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 transition hover:text-white"
          aria-label="Basculer le menu"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm md:hidden"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-[80] flex w-[86vw] max-w-sm flex-col border-r border-slate-800 bg-[#0a1220] pt-24 md:hidden"
            >
              <nav className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {filteredCategories.map((cat) => (
                  <section key={cat.key}>
                    <div className="mb-2 flex items-center gap-2 px-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{cat.label}</span>
                    </div>

                    <div className="space-y-1">
                      {cat.items.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => {
                            onTabChange(item.key as Tab);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                            currentTab === item.key
                              ? 'border border-green-neon/30 bg-green-neon/12 text-green-neon'
                              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </nav>

              <div className="border-t border-slate-800 p-4">
                <Link
                  to="/"
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-300 transition hover:border-green-neon/30 hover:text-green-neon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="h-4 w-4" />
                  Voir le site
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
