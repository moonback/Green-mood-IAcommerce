import React from 'react';

interface AdminCardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export default function AdminCard({
  title,
  subtitle,
  actions,
  className = '',
  bodyClassName = '',
  children,
}: AdminCardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/95 to-slate-900/80 backdrop-blur-xl shadow-[0_12px_34px_rgba(2,8,23,0.35)] ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 px-6 py-5">
          <div>
            {title && <h2 className="text-base font-semibold text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
