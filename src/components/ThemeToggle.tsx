import { Laptop, Moon, SunMedium } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const modes = [
  { value: 'light', label: 'Clair', icon: SunMedium },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Système', icon: Laptop },
] as const;

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'sidebar';
}

export default function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const compact = variant === 'compact';
  const sidebar = variant === 'sidebar';

  return (
    <div
      className={[
        'inline-flex items-center border border-[color:var(--color-border)] bg-[color:var(--color-card)]/90 backdrop-blur-xl',
        compact
          ? 'gap-0.5 rounded-xl p-0.5 shadow-sm'
          : sidebar
            ? 'w-full flex-col gap-2 rounded-[1.5rem] p-2 shadow-sm'
            : 'gap-1 rounded-2xl p-1 shadow-[var(--shadow-card)]',
      ].join(' ')}
      aria-label="Sélecteur de thème"
      role="group"
    >
      {modes.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={[
              'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200',
              compact
                ? 'px-2 py-2 text-[11px]'
                : sidebar
                  ? 'px-3.5 py-3 text-xs w-full'
                  : 'px-3 py-2 text-xs',
              active
                ? 'bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] shadow-[var(--shadow-glow)]'
                : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-elevated)] hover:text-[color:var(--color-text)]',
            ].join(' ')}
            aria-pressed={active}
            aria-label={value === 'system' ? `${label} (${resolvedTheme})` : label}
            title={value === 'system' ? `${label} (${resolvedTheme})` : label}
          >
            <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </button>
        );
      })}
    </div>
  );
}
