import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSettingsStore } from '../store/settingsStore';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'neurocart-theme';
const DEFAULT_NEON = '#a36cbe';
const DEFAULT_DARK = '#020408';
const DEFAULT_PRIMARY = '#10B981';

const ThemeContext = createContext<ThemeContextValue | null>(null);
const HEX_COLOR_REGEX = /^#([\da-fA-F]{3}|[\da-fA-F]{6})$/;

function normalizeHex(hex: string, fallback: string) {
  return HEX_COLOR_REGEX.test(hex) ? hex : fallback;
}

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const normalized = cleanHex.length === 3
    ? cleanHex.split('').map((char) => char + char).join('')
    : cleanHex;

  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `${r}, ${g}, ${b}`;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
}

function applyThemeTokens(
  resolvedTheme: ResolvedTheme,
  colors: { neon: string; dark: string; primary: string },
) {
  const root = document.documentElement;
  const { neon, dark, primary } = colors;
  const baseDark = DEFAULT_DARK;

  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  root.style.setProperty('--theme-neon', neon);
  root.style.setProperty('--theme-neon-rgb', hexToRgb(neon));
  root.style.setProperty('--theme-dark', dark);
  root.style.setProperty('--theme-primary', primary);
  root.style.setProperty('--color-emerald-500', neon);
  root.style.setProperty('--color-emerald-600', primary);
  root.style.setProperty('--color-green-neon', neon);
  root.style.setProperty('--color-green-dark', dark);
  root.style.setProperty('--color-green-primary', primary);
  root.style.setProperty('--color-green-neon-rgb', hexToRgb(neon));

  const shared = {
    '--theme-radius-button': '14px',
    '--theme-radius-card': '20px',
    '--theme-button-weight': '900',
    '--font-heading': '"Inter", sans-serif',
  } as const;

  Object.entries(shared).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  const darkTheme = {
    '--color-bg': baseDark,
    '--color-bg-elevated': '#070b12',
    '--color-bg-muted': '#0f1724',
    '--color-surface': '#0b1018',
    '--color-surface-strong': '#111827',
    '--color-card': 'rgba(11, 16, 24, 0.88)',
    '--color-card-muted': 'rgba(15, 23, 42, 0.78)',
    '--color-text': '#f8fafc',
    '--color-text-muted': '#94a3b8',
    '--color-text-subtle': '#64748b',
    '--color-border': 'rgba(255, 255, 255, 0.1)',
    '--color-border-strong': 'rgba(255, 255, 255, 0.16)',
    '--color-primary': neon,
    '--color-primary-strong': primary,
    '--color-primary-contrast': '#02140a',
    '--color-secondary': '#38bdf8',
    '--color-accent': '#6edf11',
    '--color-overlay': 'rgba(2, 6, 23, 0.72)',
    '--shadow-glow': '0 0 24px rgba(var(--theme-neon-rgb), 0.25)',
    '--shadow-card': '0 24px 80px rgba(2, 6, 23, 0.5)',
  };

  const lightTheme = {
    '--color-bg': '#fcfdfc',
    '--color-bg-elevated': '#f5f7f5',
    '--color-bg-muted': '#edf0ed',
    '--color-surface': '#ffffff',
    '--color-surface-strong': '#ffffff',
    '--color-card': 'rgba(255, 255, 255, 0.85)',
    '--color-card-muted': 'rgba(248, 250, 248, 0.7)',
    '--color-text': '#0f1c16',
    '--color-text-muted': '#3d4d44',
    '--color-text-subtle': '#667d71',
    '--color-border': 'rgba(15, 28, 22, 0.06)',
    '--color-border-strong': 'rgba(15, 28, 22, 0.12)',
    '--color-primary': primary,
    '--color-primary-strong': '#064e3b',
    '--color-primary-contrast': '#ffffff',
    '--color-secondary': '#14532d',
    '--color-accent': primary,
    '--color-overlay': 'rgba(255, 255, 255, 0.9)',
    '--shadow-glow': '0 8px 30px rgba(var(--theme-neon-rgb), 0.12)',
    '--shadow-card': '0 20px 50px rgba(15, 28, 22, 0.08), 0 4px 12px rgba(15, 28, 22, 0.03)',
  };

  const tokens = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.style.setProperty('--theme-surface', tokens['--color-surface']);
  root.style.setProperty('--theme-border', tokens['--color-border']);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useSettingsStore((state) => state.settings);
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light');

    setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const brandColors = useMemo(
    () => ({
      neon: normalizeHex(settings.theme_color_neon, DEFAULT_NEON),
      dark: normalizeHex(settings.theme_color_dark, DEFAULT_DARK),
      primary: normalizeHex(settings.theme_color_primary, DEFAULT_PRIMARY),
    }),
    [settings.theme_color_dark, settings.theme_color_neon, settings.theme_color_primary],
  );

  useEffect(() => {
    applyThemeTokens(resolvedTheme, brandColors);

    if (settings.font_heading) document.documentElement.style.setProperty('--font-heading', settings.font_heading);
    if (settings.font_heading_size_h1) document.documentElement.style.setProperty('--font-size-h1', `${settings.font_heading_size_h1}px`);
    if (settings.font_heading_size_h2) document.documentElement.style.setProperty('--font-size-h2', `${settings.font_heading_size_h2}px`);
    if (settings.font_heading_size_h3) document.documentElement.style.setProperty('--font-size-h3', `${settings.font_heading_size_h3}px`);
    if (settings.font_heading_size_h4) document.documentElement.style.setProperty('--font-size-h4', `${settings.font_heading_size_h4}px`);
    if (settings.font_heading_size_h5) document.documentElement.style.setProperty('--font-size-h5', `${settings.font_heading_size_h5}px`);
    if (settings.font_heading_size_h6) document.documentElement.style.setProperty('--font-size-h6', `${settings.font_heading_size_h6}px`);
  }, [
    brandColors,
    resolvedTheme,
    settings.font_heading,
    settings.font_heading_size_h1,
    settings.font_heading_size_h2,
    settings.font_heading_size_h3,
    settings.font_heading_size_h4,
    settings.font_heading_size_h5,
    settings.font_heading_size_h6,
  ]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
