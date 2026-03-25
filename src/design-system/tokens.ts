/**
 * Design System Tokens — NeuroCart
 *
 * Single source of truth for all design decisions.
 * All values mirror the CSS custom properties injected by ThemeProvider.
 * Import this file in components to keep magic-number–free code.
 */

// ─── Spacing ────────────────────────────────────────────────────────────────
export const space = {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
} as const;

// ─── Border radius ──────────────────────────────────────────────────────────
export const radius = {
    sm: '0.5rem',     // 8px  — inputs, small tags
    md: 'var(--theme-radius-button, 0.75rem)',    // 12px — buttons
    lg: '0.875rem',       // 14px — cards inner
    xl: 'var(--theme-radius-card, 1.25rem)',    // 20px — cards
    '2xl': '1.5rem',  // 24px — modals
    '3xl': '2rem',    // 32px — hero sections
    full: '9999px',   // pills, badges
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
export const fontSize = {
    '2xs': '0.625rem',  // 10px — micro labels
    xs: '0.75rem',   // 12px — captions
    sm: '0.875rem',  // 14px — secondary text
    base: '1rem',      // 16px — body
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
} as const;

export const fontWeight = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: 'var(--theme-button-weight, 900)',
} as const;

// ─── Animation durations ────────────────────────────────────────────────────
export const duration = {
    fast: '150ms',
    base: '250ms',
    slow: '400ms',
    slower: '600ms',
} as const;

export const easing = {
    /** Default smooth ease */
    default: 'cubic-bezier(0.16, 1, 0.3, 1)',
    /** Spring-like bounce */
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    /** Gentle ease in-out */
    gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─── Shadows ────────────────────────────────────────────────────────────────
export const shadow = {
    sm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    md: '0 4px 16px rgba(0,0,0,0.08)',
    lg: '0 8px 32px rgba(0,0,0,0.12)',
    xl: '0 16px 64px rgba(0,0,0,0.15)',
    neon: '0 0 20px rgba(var(--theme-neon-rgb,16,185,129),0.25)',
    neonSm: '0 0 10px rgba(var(--theme-neon-rgb,16,185,129),0.15)',
    card: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)',
} as const;

// ─── z-index scale ──────────────────────────────────────────────────────────
export const zIndex = {
    base: 0,
    raised: 10,
    dropdown: 50,
    sticky: 60,
    overlay: 70,
    modal: 80,
    toast: 90,
    cursor: 100,
} as const;

// ─── Breakpoints ────────────────────────────────────────────────────────────
export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

// ─── Grid columns (product grids) ───────────────────────────────────────────
export const productGrid = {
    /** Mobile: 2 cols, tablet: 3 cols, desktop: 4 cols */
    default: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
    /** Dense: 2 cols, tablet: 4 cols, desktop: 5 cols */
    dense: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5',
    /** Minimal: 1 col, tablet: 2 cols, desktop: 3 cols */
    wide: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
} as const;

// ─── Semantic colour tokens (map to CSS variables) ───────────────────────────
export const color = {
    /** Primary brand colour — matches --theme-neon */
    brand: 'var(--theme-neon, #a36cbe)',
    brandDark: 'var(--theme-primary, #059669)',
    /** Background — matches --theme-dark */
    bg: 'var(--theme-dark, #f8fafc)',
    bgElevated: 'var(--theme-surface, #ffffff)',
    bgCard: 'var(--theme-surface, #ffffff)',
    /** Text */
    textPrimary: '#18181b',
    textSecondary: 'var(--theme-neutral, #64748b)',
    textMuted: 'var(--theme-neutral, #94a3b8)',
    /** Borders */
    border: 'var(--theme-border, rgba(0,0,0,0.08))',
    borderHover: 'var(--theme-border, rgba(0,0,0,0.15))',
    /** Semantic */
    success: '#a36cbe',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
} as const;

// ─── Component size variants ────────────────────────────────────────────────
export const buttonSize = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-7 py-3.5 text-base rounded-xl',
    xl: 'px-9 py-4 text-lg rounded-2xl',
    icon: 'p-2.5 rounded-xl',
} as const;

export const buttonVariant = {
    primary: 'bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-weight-button hover:brightness-110 active:scale-95 shadow-[var(--shadow-glow)]',
    secondary: 'bg-[color:var(--color-surface)] text-[color:var(--color-text)] font-bold border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-elevated)] hover:border-[color:var(--color-border-strong)] active:scale-95 shadow-sm',
    ghost: 'bg-transparent text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-elevated)] active:scale-95',
    danger: 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20 active:scale-95',
    outline: 'bg-transparent text-[color:var(--color-primary)] border border-[color:var(--color-primary)]/40 hover:bg-[color:var(--color-primary)]/10 active:scale-95',
} as const;
