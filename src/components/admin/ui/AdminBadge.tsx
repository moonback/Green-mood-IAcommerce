import React from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface AdminBadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'bg-slate-800/90 border-slate-700 text-slate-300',
  success: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300',
  warning: 'bg-amber-500/10 border-amber-400/30 text-amber-300',
  danger: 'bg-rose-500/10 border-rose-400/30 text-rose-300',
  info: 'bg-green-neon/10 border-green-neon/30 text-green-neon',
};

export default function AdminBadge({ tone = 'neutral', children, className = '' }: AdminBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneStyles[tone]} ${className}`}>
      {children}
    </span>
  );
}
