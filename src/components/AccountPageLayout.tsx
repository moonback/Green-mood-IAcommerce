/**
 * AccountPageLayout — Shared premium wrapper for all account sub-pages.
 * Provides: font injection, sidebar layout, consistent header.
 */
import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, type LucideIcon } from 'lucide-react';
import AccountSidebar from './AccountSidebar';
import SEO from './SEO';

interface AccountPageLayoutProps {
  children: ReactNode;
  /** SEO */
  seoTitle: string;
  seoDescription?: string;
  /** Header */
  icon: LucideIcon;
  /** Hex color for icon bg + accent bar, e.g. '#3b82f6'. Defaults to --color-primary */
  iconColor?: string;
  title: string;
  subtitle?: string;
  /** Optional editorial stat displayed on the right */
  stat?: string | number;
  statLabel?: string;
  /** Extra buttons/elements in the header row */
  headerActions?: ReactNode;
  /** Footer text. Defaults to a generic security message. Pass null to hide. */
  footerText?: string | null;
}

/* ── Inject fonts once per document ────────────────────────────────── */
function usePremiumFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-account-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.setAttribute('data-account-fonts', '1');
    link.href =
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500;700&display=swap';
    document.head.appendChild(link);
  }, []);
}

export default function AccountPageLayout({
  children,
  seoTitle,
  seoDescription,
  icon: Icon,
  iconColor,
  title,
  subtitle,
  stat,
  statLabel,
  headerActions,
  footerText,
}: AccountPageLayoutProps) {
  usePremiumFonts();

  const accent = iconColor || undefined;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)] pb-20">
      <SEO title={seoTitle} description={seoDescription} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <AccountSidebar />

          <div className="flex-1 space-y-8 min-w-0">

            {/* ── Page header ──────────────────────────────────────── */}
            <motion.header
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Breadcrumb */}
              <Link
                to="/compte"
                className="group inline-flex items-center gap-2 mb-5"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                <ArrowLeft
                  className="w-3 h-3 transition-all duration-300 group-hover:text-[color:var(--color-primary)] group-hover:-translate-x-0.5"
                />
                <span className="transition-colors duration-300 group-hover:text-[color:var(--color-primary)]">
                  Mon Espace
                </span>
              </Link>

              {/* Title row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Colored accent bar */}
                  <div
                    className="w-1 h-12 rounded-full shrink-0"
                    style={{
                      background: accent || 'var(--color-primary)',
                    }}
                  />

                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 hover:scale-110"
                    style={{
                      background: accent ? `${accent}15` : 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                      border: `1px solid ${accent ? `${accent}28` : 'color-mix(in srgb, var(--color-primary) 20%, transparent)'}`,
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: accent || 'var(--color-primary)' }}
                    />
                  </div>

                  {/* Text */}
                  <div>
                    <h1
                      className="leading-none text-[color:var(--color-text)]"
                      style={{
                        fontFamily: "'DM Serif Display', Georgia, serif",
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                      }}
                    >
                      {title}
                    </h1>
                    {subtitle && (
                      <p
                        className="mt-1.5 text-[color:var(--color-text-muted)]"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: '10px',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: stat + optional actions */}
                <div className="flex items-center gap-4 shrink-0">
                  {stat !== undefined && (
                    <div className="text-right">
                      {statLabel && (
                        <p
                          className="text-[color:var(--color-text-muted)] mb-0.5"
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: '9px',
                            letterSpacing: '0.26em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {statLabel}
                        </p>
                      )}
                      <p
                        className="text-[color:var(--color-text)] leading-none"
                        style={{
                          fontFamily: "'DM Serif Display', Georgia, serif",
                          fontSize: '2rem',
                        }}
                      >
                        {typeof stat === 'number'
                          ? stat.toString().padStart(2, '0')
                          : stat}
                      </p>
                    </div>
                  )}
                  {headerActions}
                </div>
              </div>
            </motion.header>

            {/* ── Page content ─────────────────────────────────────── */}
            {children}

            {/* ── Footer ───────────────────────────────────────────── */}
            {footerText !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center justify-center gap-2 pt-2"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Shield className="w-3 h-3 text-[color:var(--color-primary)]" />
                <span>{footerText ?? 'Données protégées & chiffrées'}</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
