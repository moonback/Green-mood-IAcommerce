import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  MapPin,
  Coins,
  User,
  Heart,
  Star,
  RefreshCw,
  Users,
  Settings,
  Gift,
  Cake,
  LayoutDashboard,
  LogOut,
  BrainCircuit
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import ThemeToggle from './ThemeToggle';

export default function AccountSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const { settings } = useSettingsStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const links = [
    { icon: LayoutDashboard, label: 'Tableau de bord', to: '/compte' },
    { icon: Package, label: 'Mes Commandes', to: '/compte/commandes' },
    { icon: Coins, label: 'Fidélité', to: '/compte/fidelite', enabled: settings.loyalty_program_enabled },
    { icon: Gift, label: 'Cadeau Anniversaire', to: '/compte/cadeau-anniversaire', highlight: true, enabled: settings.loyalty_program_enabled },
    { icon: MapPin, label: 'Adresses', to: '/compte/adresses' },
    { icon: Heart, label: 'Favoris', to: '/compte/favoris' },
    { icon: Star, label: 'Mes Avis', to: '/compte/avis' },
    { icon: RefreshCw, label: 'Abonnements', to: '/compte/abonnements', enabled: settings.subscriptions_enabled },
    { icon: Users, label: 'Parrainage', to: '/compte/parrainage', enabled: settings.loyalty_program_enabled },
    { icon: Settings, label: 'Paramètres', to: '/compte/profil' },
    { icon: BrainCircuit, label: 'Profil IA', to: '/compte/profil?tab=ai' },
  ].filter(l => l.enabled !== false);

  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 space-y-2">
      <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] shadow-sm rounded-[2.5rem] p-6 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--color-text-muted)] mb-6 px-4">
          Navigation Compte
        </p>

        <div className="mb-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg)]/80 p-4 flex flex-col items-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[color:var(--color-text-muted)] w-full text-left">
            Apparence
          </p>
          <div className="mt-4 w-full flex justify-center">
            <ThemeToggle variant="default" />
          </div>
        </div>

        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative ${isActive
                  ? 'bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-bold shadow-md shadow-[color:var(--color-primary)]/25'
                  : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text)]'
                }`}
            >
              <link.icon className={`h-4 w-4 ${isActive ? 'text-[color:var(--color-primary-contrast)]' : link.highlight ? 'text-[color:var(--color-primary)]' : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary)]'} transition-colors`} />
              <span className="text-[11px] uppercase tracking-wider font-black">
                {link.label}
              </span>
              {link.highlight && !isActive && (
                <span className="absolute right-3 w-1.5 h-1.5 bg-[color:var(--color-primary)] rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--theme-neon-rgb),0.8)]" />
              )}
            </Link>
          );
        })}

        <button
          onClick={handleSignOut}
          className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative text-[color:var(--color-text-muted)] hover:bg-red-500 hover:text-[color:var(--color-text)] mt-1"
        >
          <LogOut className="h-4 w-4 text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)] transition-colors" />
          <span className="text-[11px] uppercase tracking-wider font-black">
            Déconnexion
          </span>
        </button>
      </div>

      {settings.loyalty_program_enabled && (
        <div className="bg-[color:var(--color-card)]/80 border border-[color:var(--color-border)] shadow-sm rounded-[2.5rem] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--color-text-muted)] leading-none">Solde {settings.loyalty_currency_name}</p>
              <p className="text-xl font-black text-[color:var(--color-text)]">{profile?.loyalty_points || 0}</p>
            </div>
          </div>
          <Link
            to="/compte/fidelite"
            className="w-full py-3 bg-[color:var(--color-bg)] hover:bg-[color:var(--color-primary)]/10 border border-[color:var(--color-border)] rounded-xl text-[9px] font-black uppercase tracking-widest text-center block transition-all hover:text-[color:var(--color-primary)] text-[color:var(--color-text-muted)]"
          >
            Voir mes avantages
          </Link>
        </div>
      )}
    </aside>
  );
}
