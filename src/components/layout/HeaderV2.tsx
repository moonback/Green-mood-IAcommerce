/**
 * HeaderV2 — Premium dark e-commerce header with glassmorphic design.
 *
 * Features:
 * - Glassmorphic design with scroll-aware compact mode
 * - Full-width search bar in the center row
 * - AI advisor shortcuts with animated indicators
 * - Polished mobile drawer with smooth spring animations
 * - Hierarchical category navigation
 */

import React, { memo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  User,
  ChevronDown,
  Menu,
  X,
  Package,
  Settings,
  MessageSquare,
  Mic,
  Sparkles,
  LogOut,
  ExternalLink,
  Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudtenderStore } from '../../store/budtenderStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { supabase } from '../../lib/supabase';
import { SearchBar } from './SearchBar';
import TopBanner from './TopBanner';
import { useTheme } from '../ThemeProvider';

// Types
interface NavCategory {
  id: string;
  label: string;
  slug: string;
  depth: number;
  children: NavCategory[];
}

interface HeaderV2Props {
  setIsSearchOpen: (open: boolean) => void;
  setIsLoyaltyModalOpen: (open: boolean) => void;
}

// CartBadge component (extracted for reusability)
const CartBadge: React.FC<{ count: number }> = memo(({ count }) => {
  if (count === 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 1.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="absolute -top-1.5 -right-1.5 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-[var(--shadow-glow)] border-2 border-[color:var(--color-bg)]"
      aria-label={`${count} ${count > 1 ? 'articles' : 'article'}`}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
});

// MobileNavItem component (extracted for reusability)
const MobileNavItem: React.FC<{
  item: NavCategory;
  location: { pathname: string; search: string };
  expandedMobileCats: Set<string>;
  setExpandedMobileCats: React.Dispatch<React.SetStateAction<Set<string>>>;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = memo(({ item, location, expandedMobileCats, setExpandedMobileCats, setMobileMenuOpen }) => {
  const href = item.slug ? `/catalogue?category=${item.slug}` : '/catalogue';
  const isActive = location.pathname === '/catalogue' && new URLSearchParams(location.search).get('category') === item.slug;
  const hasChildren = item.children.length > 0;
  const isExpanded = expandedMobileCats.has(item.id);
  const indent = item.depth * 12;

  return (
    <li key={item.id || item.slug} style={{ paddingLeft: `${indent}px` }}>
      <div className="flex items-center gap-1">
        {hasChildren && (
          <button
            onClick={() =>
              setExpandedMobileCats((prev) => {
                const next = new Set(prev);
                isExpanded ? next.delete(item.id) : next.add(item.id);
                return next;
              })
            }
            className="p-1 text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] transition-colors flex-shrink-0"
            aria-label={isExpanded ? 'Réduire' : 'Développer'}
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
          </button>
        )}
        <Link
          to={href}
          onClick={() => setMobileMenuOpen(false)}
          className={`flex-1 flex items-center justify-between py-2.5 px-3 text-sm rounded-xl transition-all ${isActive
            ? 'bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] font-bold'
            : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)]'
            }`}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.label}
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-primary)]" />}
        </Link>
      </div>
      {hasChildren && isExpanded && (
        <ul className="mt-0.5 space-y-0.5 border-l border-[color:var(--color-border)] ml-4 pl-2">
          {item.children.map((child) => (
            <MobileNavItem
              key={child.id}
              item={child}
              location={location}
              expandedMobileCats={expandedMobileCats}
              setExpandedMobileCats={setExpandedMobileCats}
              setMobileMenuOpen={setMobileMenuOpen}
            />
          ))}
        </ul>
      )}
    </li>
  );
});

// Main HeaderV2 component
const HeaderV2: React.FC<HeaderV2Props> = ({ setIsSearchOpen, setIsLoyaltyModalOpen }) => {
  const { resolvedTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [categories, setCategories] = useState<NavCategory[]>([
    { id: '', label: 'Tout le catalogue', slug: '', depth: 0, children: [] },
  ]);
  const [expandedMobileCats, setExpandedMobileCats] = useState<Set<string>>(new Set());
  const location = useLocation();

  // Store selectors (optimized with useCallback)
  const itemCount = useCartStore(useCallback((s) => s.itemCount(), []));
  const favoritesCount = useWishlistStore(useCallback((s) => s.items.length, []));
  const openCart = useCartStore(useCallback((s) => s.openSidebar, []));
  const { user, profile, signOut } = useAuthStore();
  const settings = useSettingsStore(useCallback((s) => s.settings, []));
  const { isVoiceOpen, toggleVoice } = useBudtenderStore();

  // Logo URL based on theme
  const logoUrl = resolvedTheme === 'dark' ? settings.store_logo_dark_url || settings.store_logo_url || '/logo.png' : settings.store_logo_url || '/logo.png';

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const [{ data: catData }, { data: prodData }] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, slug, parent_id, depth, sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('products')
          .select('category_id')
          .eq('is_active', true)
          .eq('is_available', true)
          .gt('stock_quantity', 0),
      ]);

      if (!catData || !prodData) return;

      const activeIds = new Set(prodData.map((p) => p.category_id).filter(Boolean));

      const hasProducts = (catId: string): boolean => {
        if (activeIds.has(catId)) return true;
        const children = catData.filter((c) => c.parent_id === catId);
        return children.some((c) => hasProducts(c.id));
      };

      const filteredCats = catData.filter((c) => hasProducts(c.id));

      // Build nav tree
      const nodeMap = new Map<string, NavCategory>(
        filteredCats.map((c) => [
          c.id,
          { id: c.id, label: c.name, slug: c.slug, depth: c.depth ?? 0, children: [] },
        ]),
      );
      const roots: NavCategory[] = [];

      filteredCats.forEach((c) => {
        const node = nodeMap.get(c.id)!;
        if (!c.parent_id || !nodeMap.has(c.parent_id)) {
          roots.push(node);
        } else {
          nodeMap.get(c.parent_id)!.children.push(node);
        }
      });

      setCategories([
        { id: '', label: 'Tout le catalogue', slug: '', depth: 0, children: [] },
        ...roots,
        { id: 'nouveautes', label: 'Nouveautés', slug: 'nouveautes', depth: 0, children: [] },
        { id: 'promotions', label: 'Promotions', slug: 'promotions', depth: 0, children: [] },
      ]);
    };

    fetchCategories();
  }, []);

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <>
      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-[200] bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] px-4 py-2 rounded-xl font-bold text-sm"
      >
        Aller au contenu principal
      </a>

      <TopBanner
        isVisible={bannerVisible}
        onClose={() => setBannerVisible(false)}
        enabled={settings.banner_enabled}
        text={settings.banner_text}
        tickerMessages={settings.ticker_messages}
      />

      <header className={`sticky top-0 z-[60] w-full transition-all duration-300 ${isScrolled ? 'shadow-[0_8px_32px_rgba(0,0,0,0.8)]' : ''}`}>
        {/* Row 1: Logo + Search + Actions */}
        <div className={`border-b border-[color:var(--color-border)] bg-[color:var(--color-card)]/90 backdrop-blur-2xl transition-all duration-300 ${isScrolled ? 'py-2' : 'py-3'}`}>
          <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:gap-5">
              {/* Logo */}
              <Link
                to="/"
                aria-label={`${settings.store_name} — Accueil`}
                className={`relative shrink-0 flex items-center group z-[70] transition-all duration-300 ${isScrolled ? 'h-12 w-32' : 'h-16 w-52'}`}
              >
                <img
                  src={logoUrl}
                  alt={settings.store_name}
                  className={`absolute left-0 object-contain transition-all duration-500 ${isScrolled ? 'h-32 -translate-y-2' : 'h-56 -translate-y-4'
                    } group-hover:scale-105 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]`}
                />
              </Link>

              {/* Search bar */}
              <div className="flex-1 hidden md:flex min-w-0">
                <SearchBar
                  categories={categories
                    .slice(1)
                    .filter((n) => n.slug && n.slug !== 'nouveautes' && n.slug !== 'promotions')
                    .map((n) => ({ slug: n.slug, name: n.label }))}
                  placeholder={`Rechercher sur ${settings.store_name || 'NeuroCart'}…`}
                />
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                {/* AI Shortcuts */}
                {user && (
                  <div className="hidden lg:flex items-center gap-1 border-r border-[color:var(--color-border)] pr-3 mr-1">
                    {settings.budtender_chat_enabled !== false && (
                      <Link
                        to="/assistant"
                        className={`relative flex flex-col items-center px-2.5 py-1.5 rounded-xl transition-all group overflow-hidden ${location.pathname === '/assistant'
                          ? 'bg-[color:var(--color-primary)]/15 shadow-[var(--shadow-glow)]'
                          : 'hover:bg-[color:var(--color-bg-elevated)]'
                          }`}
                        aria-label="Conseiller Chat IA"
                      >
                        {location.pathname === '/assistant' && (
                          <span className="absolute inset-0 rounded-xl border border-[color:var(--color-primary)]/30" />
                        )}
                        <MessageSquare
                          className={`w-4 h-4 transition-all duration-300 ${location.pathname === '/assistant'
                            ? 'text-[color:var(--color-primary)] scale-110'
                            : 'text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-primary)] group-hover:scale-110'
                            }`}
                        />
                        <span
                          className={`text-[10px] font-bold uppercase tracking-tight mt-0.5 leading-none ${location.pathname === '/assistant'
                            ? 'text-[color:var(--color-primary)]'
                            : 'text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-text)]'
                            }`}
                        >
                          Chat IA
                        </span>
                      </Link>
                    )}
                    {settings.budtender_voice_enabled !== false && (
                      <button
                        onClick={toggleVoice}
                        className={`relative flex flex-col items-center px-2.5 py-1.5 rounded-xl transition-all group overflow-hidden ${isVoiceOpen
                          ? 'bg-[color:var(--color-secondary)]/10 shadow-[0_0_20px_rgba(56,189,248,0.12)]'
                          : 'hover:bg-[color:var(--color-bg-elevated)]'
                          }`}
                        aria-label="Conseiller Vocal IA"
                      >
                        {isVoiceOpen && <span className="absolute inset-0 rounded-xl border border-[color:var(--color-secondary)]/30" />}
                        <Mic
                          className={`w-4 h-4 transition-all duration-300 ${isVoiceOpen
                            ? 'text-[color:var(--color-secondary)] scale-110'
                            : 'text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-secondary)] group-hover:scale-110'
                            }`}
                        />
                        <span
                          className={`text-[10px] font-bold uppercase tracking-tight mt-0.5 leading-none ${isVoiceOpen
                            ? 'text-[color:var(--color-secondary)]'
                            : 'text-[color:var(--color-text-subtle)] group-hover:text-[color:var(--color-text-muted)]'
                            }`}
                        >
                          Voice
                        </span>
                        {isVoiceOpen && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[color:var(--color-secondary)] animate-pulse" />}
                      </button>
                    )}
                  </div>
                )}

                {/* Admin */}
                {profile?.is_admin && (
                  <Link
                    to="/admin"
                    className="hidden lg:flex flex-col items-start px-3 py-1.5 rounded-xl hover:bg-[color:var(--color-bg-elevated)] transition-colors group border border-transparent hover:border-[color:var(--color-border)]"
                    aria-label="Administration"
                  >
                    <span className="text-[10px] text-[color:var(--color-primary)] font-bold uppercase tracking-widest leading-tight">
                      Admin
                    </span>
                    <div className="flex items-center gap-1 text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors leading-tight">
                      <span className="text-[11px] font-bold">Dashboard</span>
                      <Settings className="w-3 h-3" />
                    </div>
                  </Link>
                )}

                {/* Account */}
                {user ? (
                  <Link
                    to="/compte"
                    className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-[color:var(--color-bg-elevated)] transition-all group border border-transparent hover:border-[color:var(--color-border)]"
                    aria-label="Mon compte"
                  >
                    <div className="w-7 h-7 rounded-full bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/30 flex items-center justify-center flex-shrink-0 group-hover:bg-[color:var(--color-primary)]/25 transition-colors">
                      <span className="text-[11px] font-black text-[color:var(--color-primary)] leading-none">
                        {(profile?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-[10px] text-[color:var(--color-text-subtle)] font-medium leading-tight">
                        Bonjour{firstName ? `, ${firstName}` : ''}
                      </span>
                      <span className="text-[11px] font-bold text-[color:var(--color-text)] group-hover:text-[color:var(--color-primary)] transition-colors flex items-center gap-0.5 leading-tight">
                        Mon Compte <ChevronDown className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </Link>
                ) : (
                  <Link
                    to="/connexion"
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[color:var(--color-bg-elevated)] transition-all border border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)]"
                  >
                    <User className="w-4 h-4 text-[color:var(--color-text-muted)]" />
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-[10px] text-[color:var(--color-text-subtle)] leading-tight">Bienvenue</span>
                      <span className="text-[11px] font-bold text-[color:var(--color-text)] leading-tight">Connexion</span>
                    </div>
                  </Link>
                )}

                {/* Favorites */}
                <Link
                  to="/compte/favoris"
                  aria-label={`Favoris — ${favoritesCount} article${favoritesCount !== 1 ? 's' : ''}`}
                  className="hidden sm:flex relative items-center gap-2 px-3 py-2 rounded-xl hover:bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-all group border border-transparent hover:border-[color:var(--color-border)]"
                >
                  <div className="relative">
                    <Heart className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    <CartBadge count={favoritesCount} />
                  </div>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-[10px] text-[color:var(--color-text-subtle)] font-medium leading-tight">
                      {favoritesCount > 0 ? `${favoritesCount} article${favoritesCount !== 1 ? 's' : ''}` : 'Vide'}
                    </span>
                    <span className="text-[11px] font-bold leading-tight">Favoris</span>
                  </div>
                </Link>

                {/* Cart */}
                <button
                  onClick={openCart}
                  aria-label={`Panier — ${itemCount} article${itemCount !== 1 ? 's' : ''}`}
                  className="relative flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] transition-all group border border-transparent hover:border-[color:var(--color-border)]"
                >
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    <CartBadge count={itemCount} />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-[10px] text-[color:var(--color-text-subtle)] font-medium leading-tight">
                      {itemCount > 0 ? `${itemCount} article${itemCount !== 1 ? 's' : ''}` : 'Vide'}
                    </span>
                    <span className="text-[11px] font-bold leading-tight">Panier</span>
                  </div>
                </button>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="lg:hidden p-2.5 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] bg-[color:var(--color-bg-elevated)] rounded-xl border border-[color:var(--color-border)] transition-all hover:border-[color:var(--color-border-strong)] active:scale-95"
                  aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                  aria-expanded={mobileMenuOpen}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {mobileMenuOpen ? (
                      <motion.span
                        key="close"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <X className="w-5 h-5" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="menu"
                        initial={{ rotate: 90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Menu className="w-5 h-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </div>

            {/* Mobile search row */}
            <div className="md:hidden mt-2 pb-1">
              <SearchBar placeholder="Rechercher un produit…" className="w-full" />
            </div>
          </div>
        </div>

        {/* Row 2: Category nav (desktop) */}
        {location.pathname !== '/catalogue' && (
          <nav aria-label="Catégories" className="hidden lg:block border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/60 backdrop-blur-xl">
            <div className="max-w-screen-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <ul className="flex items-center overflow-x-auto scrollbar-none">
                {categories.map((item) => {
                  const href = item.slug ? `/catalogue?category=${item.slug}` : '/catalogue';
                  const isActive = new URLSearchParams(location.search).get('category') === item.slug;
                  return (
                    <li key={item.id || item.slug} className="shrink-0">
                      <Link
                        to={href}
                        className={`relative flex items-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all duration-150 group ${isActive ? 'text-[color:var(--color-primary)]' : 'text-[color:var(--color-text-subtle)] hover:text-[color:var(--color-text)]'
                          }`}
                      >
                        {item.label}
                        {isActive ? (
                          <motion.div
                            layoutId="category-underline"
                            className="absolute bottom-0 inset-x-2 h-[2px] bg-[color:var(--color-primary)] rounded-full shadow-[var(--shadow-glow)]"
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                          />
                        ) : (
                          <span className="absolute bottom-0 inset-x-4 h-[1px] bg-transparent group-hover:bg-[color:var(--color-border-strong)] transition-all duration-200 rounded-full" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        )}

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[55] bg-[color:var(--color-overlay)] backdrop-blur-sm lg:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                key="drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed top-0 right-0 bottom-0 z-[56] w-80 bg-[color:var(--color-surface)] border-l border-[color:var(--color-border)] flex flex-col lg:hidden overflow-y-auto"
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-card-muted)]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[color:var(--color-primary)]" />
                    <span className="text-sm font-black text-[color:var(--color-text)] uppercase tracking-wider">
                      {settings.store_name || 'Menu'}
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] rounded-xl bg-[color:var(--color-bg-elevated)] transition-all"
                    aria-label="Fermer le menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Account section */}
                <div className="p-5 border-b border-[color:var(--color-border)]">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-[color:var(--color-bg-elevated)] border border-[color:var(--color-border)]">
                        <div>
                          <p className="text-sm font-bold text-[color:var(--color-text)]">{firstName || 'Mon compte'}</p>
                          <p className="text-[10px] text-[color:var(--color-text-subtle)] font-medium">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        to="/compte"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] rounded-xl transition-all"
                      >
                        <User className="w-4 h-4" /> Mon compte
                      </Link>
                      <Link
                        to="/favoris"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] rounded-xl transition-all"
                      >
                        <Heart className="w-4 h-4" /> Mes favoris
                        {favoritesCount > 0 && (
                          <span className="ml-auto bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {favoritesCount}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/compte/commandes"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] rounded-xl transition-all"
                      >
                        <Package className="w-4 h-4" /> Mes commandes
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-[color:var(--color-text-subtle)] hover:text-red-400 hover:bg-red-400/5 w-full rounded-xl transition-all"
                      >
                        <LogOut className="w-4 h-4" /> Se déconnecter
                      </button>
                    </div>
                  ) : (
                    <Link
                      to="/connexion"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black text-sm rounded-xl hover:brightness-110 transition-all"
                    >
                      <User className="w-4 h-4" /> Connexion / Inscription
                    </Link>
                  )}

                  {/* Admin section */}
                  {profile?.is_admin && (
                    <div className="mt-3 p-3 rounded-2xl bg-[color:var(--color-primary)]/5 border border-[color:var(--color-primary)]/20">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-primary)] mb-2">Administration</p>
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-sm text-[color:var(--color-primary)] font-bold"
                      >
                        <Settings className="w-4 h-4" /> Accéder au Dashboard <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                      </Link>
                    </div>
                  )}

                  {/* AI Assistants */}
                  {user && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-subtle)] px-1">Assistants IA</p>
                      <div className="grid grid-cols-2 gap-2">
                        {settings.budtender_chat_enabled !== false && (
                          <Link
                            to="/assistant"
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border ${location.pathname === '/assistant'
                              ? 'bg-[color:var(--color-primary)]/15 border-[color:var(--color-primary)]/30 text-[color:var(--color-primary)]'
                              : 'bg-[color:var(--color-bg-elevated)] border-[color:var(--color-border)] text-[color:var(--color-text-muted)]'
                              }`}
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs font-bold">Chat IA</span>
                          </Link>
                        )}
                        {settings.budtender_voice_enabled !== false && (
                          <button
                            onClick={() => {
                              toggleVoice();
                              setMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border ${isVoiceOpen
                              ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                              : 'bg-[color:var(--color-bg-elevated)] border-[color:var(--color-border)] text-[color:var(--color-text-muted)]'
                              }`}
                          >
                            <Mic className="w-4 h-4" />
                            <span className="text-xs font-bold">Vocal IA</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Category navigation — hierarchical accordion */}
                <nav className="p-5 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--color-text-subtle)] mb-3">Catégories</p>
                  <ul className="space-y-0.5">
                    {categories.map((item) => (
                      <MobileNavItem
                        key={item.id || item.slug}
                        item={item}
                        location={location}
                        expandedMobileCats={expandedMobileCats}
                        setExpandedMobileCats={setExpandedMobileCats}
                        setMobileMenuOpen={setMobileMenuOpen}
                      />
                    ))}
                  </ul>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

export default memo(HeaderV2);