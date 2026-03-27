import { NavLink, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { Home, Search, ShoppingCart, Mic, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useBudtenderStore } from '../../store/budtenderStore';

type TabItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  showBadge?: boolean;
};

const baseTabs: TabItem[] = [
  { to: '/', label: 'Accueil', icon: Home, exact: true },
  { to: '/catalogue', label: 'Catalogue', icon: Search },
  { to: '/panier', label: 'Panier', icon: ShoppingCart, showBadge: true },
  { to: '/compte', label: 'Compte', icon: User },
];

export default function MobileTabBar() {
  const cartCount = useCartStore((s) => s.itemCount());
  const user = useAuthStore((s) => s.user);
  const { isVoiceOpen, toggleVoice } = useBudtenderStore();
  const location = useLocation();

  const tabs = useMemo(
    () =>
      baseTabs.map((tab) =>
        !user && tab.to === '/compte'
          ? { ...tab, to: '/connexion?redirect=%2Fcompte' }
          : tab
      ),
    [user]
  );

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {/* First two tabs (Accueil, Catalogue) */}
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.exact}
              aria-label={`Ouvrir ${tab.label}`}
              title={tab.label}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
              </div>
              <span className="leading-none">{tab.label}</span>
            </NavLink>
          );
        })}

        {/* Voice IA button (center) */}
        <button
          onClick={toggleVoice}
          aria-label="Ouvrir assistant vocal IA"
          title="Assistant Vocal IA"
          className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
            isVoiceOpen ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <Mic className={`h-4 w-4 ${isVoiceOpen ? 'animate-pulse' : ''}`} />
            {isVoiceOpen && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span className="leading-none">Vocal</span>
        </button>

        {/* Last two tabs (Panier, Compte) */}
        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.exact}
              aria-label={`Ouvrir ${tab.label}`}
              title={tab.label}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {tab.showBadge && cartCount > 0 && (
                  <motion.span
                    key={`cart-badge-${cartCount}`}
                    initial={{ scale: 0.6, y: 2 }}
                    animate={{ scale: [0.9, 1.15, 1], y: [2, 0, 0] }}
                    transition={{ duration: 0.28 }}
                    className="absolute -right-2 -top-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white"
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </motion.span>
                )}
              </div>
              <span className="leading-none">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
