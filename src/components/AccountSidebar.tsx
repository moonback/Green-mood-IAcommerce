import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  MapPin,
  Coins,
  Heart,
  Star,
  RefreshCw,
  Users,
  Settings,
  Gift,
  LayoutDashboard,
  LogOut,
  BrainCircuit,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import ThemeToggle from './ThemeToggle';

export default function AccountSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const { settings } = useSettingsStore();

  /* ── Font injection ── */
  useEffect(() => {
    if (document.querySelector('link[data-account-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('data-account-fonts', '1');
    link.href =
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;700&display=swap';
    document.head.appendChild(link);
  }, []);

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
    { icon: Package,         label: 'Mes Commandes',   to: '/compte/commandes' },
    { icon: Coins,           label: 'Fidélité',         to: '/compte/fidelite',             enabled: settings.loyalty_program_enabled },
    { icon: Gift,            label: 'Cadeau Anniv.',    to: '/compte/cadeau-anniversaire',   highlight: true, enabled: settings.loyalty_program_enabled },
    { icon: MapPin,          label: 'Adresses',         to: '/compte/adresses' },
    { icon: Heart,           label: 'Favoris',          to: '/compte/favoris' },
    { icon: Star,            label: 'Mes Avis',         to: '/compte/avis' },
    { icon: RefreshCw,       label: 'Abonnements',      to: '/compte/abonnements',           enabled: settings.subscriptions_enabled },
    { icon: Users,           label: 'Parrainage',       to: '/compte/parrainage',            enabled: settings.loyalty_program_enabled },
    { icon: Settings,        label: 'Paramètres',       to: '/compte/profil' },
    { icon: BrainCircuit,    label: 'Profil IA',        to: '/compte/profil?tab=ai' },
  ].filter((l) => l.enabled !== false);

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 sticky top-24 self-start gap-3">

      {/* ── Navigation panel ── */}
      <div
        className="rounded-[2rem] overflow-hidden"
        style={{
          background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[color:var(--color-border)]">
          <p
            className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-text-muted)]"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Navigation
          </p>
        </div>

        {/* Links */}
        <nav className="p-3 space-y-0.5">
          {links.map((link, i) => {
            const isActive = location.pathname === link.to ||
              (link.to.includes('?') && location.pathname + location.search === link.to);
            return (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={link.to}
                  className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 relative"
                  style={
                    isActive
                      ? {
                          background: 'color-mix(in srgb, var(--color-primary) 100%, transparent)',
                          color: 'var(--color-primary-contrast)',
                        }
                      : undefined
                  }
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 inset-y-2 w-0.5 rounded-r-full bg-white/40" />
                  )}

                  <link.icon
                    className={`h-4 w-4 shrink-0 transition-colors duration-300 ${
                      isActive
                        ? 'text-[color:var(--color-primary-contrast)]'
                        : link.highlight
                          ? 'text-[color:var(--color-primary)]'
                          : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary)]'
                    }`}
                  />

                  <span
                    className={`text-[11px] uppercase tracking-wider flex-1 transition-colors duration-300 ${
                      isActive
                        ? 'font-black text-[color:var(--color-primary-contrast)]'
                        : 'font-bold text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]'
                    }`}
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {link.label}
                  </span>

                  {link.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 bg-[color:var(--color-primary)] rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--theme-neon-rgb),0.8)]" />
                  )}

                  {!isActive && (
                    <ChevronRight
                      className="w-3 h-3 text-[color:var(--color-text-muted)] opacity-0 group-hover:opacity-60 -translate-x-1 group-hover:translate-x-0 transition-all duration-300"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Sign out + theme toggle */}
        <div className="px-3 pb-3 pt-1 border-t border-[color:var(--color-border)] mt-1 space-y-1">
          <button
            onClick={handleSignOut}
            className="w-full group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 text-[color:var(--color-text-muted)] group-hover:text-red-500 transition-colors duration-300" />
            <span
              className="text-[11px] uppercase tracking-wider font-bold text-[color:var(--color-text-muted)] group-hover:text-red-500 transition-colors duration-300"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Déconnexion
            </span>
          </button>
        </div>
      </div>

      {/* ── Theme toggle widget ── */}
      <div
        className="rounded-[1.75rem] p-4"
        style={{
          background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
        }}
      >
        <p
          className="text-[9px] uppercase tracking-[0.28em] text-[color:var(--color-text-muted)] mb-4"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          Apparence
        </p>
        <div className="flex justify-center">
          <ThemeToggle variant="default" />
        </div>
      </div>

      {/* ── Loyalty balance widget ── */}
      {settings.loyalty_program_enabled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-[1.75rem] p-5 relative overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
          }}
        >
          {/* Decorative glow */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, #eab30818, transparent 70%)',
              transform: 'translate(30%, -30%)',
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/12 border border-yellow-500/20 flex items-center justify-center">
                <Coins className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p
                  className="text-[9px] uppercase tracking-widest text-[color:var(--color-text-muted)] leading-none mb-1"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                >
                  Solde {settings.loyalty_currency_name}
                </p>
                <p
                  className="text-2xl font-black text-[color:var(--color-text)] leading-none"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  {profile?.loyalty_points || 0}
                </p>
              </div>
            </div>

            <Link
              to="/compte/fidelite"
              className="w-full py-2.5 rounded-xl text-[9px] uppercase tracking-widest text-center flex items-center justify-center gap-1.5 font-bold transition-all duration-300 hover:bg-[color:var(--color-primary)] hover:text-white hover:border-[color:var(--color-primary)]"
              style={{
                fontFamily: "'DM Mono', monospace",
                background: 'color-mix(in srgb, var(--color-bg) 100%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-border) 100%, transparent)',
                color: 'var(--color-text-muted)',
              }}
            >
              Voir mes avantages
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.div>
      )}
    </aside>
  );
}
