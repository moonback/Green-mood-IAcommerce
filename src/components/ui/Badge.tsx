import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'sales' | 'spec';

interface BadgeProps {
    variant?: BadgeVariant;
    children: ReactNode;
    pulse?: boolean;
    className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-white/[0.06] text-zinc-300 border border-white/[0.1]',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border border-red-500/20',
    info: 'bg-green-neon/10 text-green-neon border border-green-neon/20 glow-green',
    purple: 'bg-green-neon/15 text-green-neon border border-green-neon/30',
    sales: 'bg-green-neon/20 text-green-neon border border-green-neon/40 font-black glow-green',
    spec: 'bg-white/[0.04] text-zinc-400 border border-white/[0.08]',
};

/**
 * Compact label badge used for product tags, status indicators, etc.
 *
 * @example
 * <Badge variant="sales" pulse>⚡ Stock Limité</Badge>
 */
export function Badge({ variant = 'default', children, pulse = false, className = '' }: BadgeProps) {
    return (
        <span
            className={`
        inline-flex items-center gap-1
        text-[9px] font-bold uppercase tracking-widest
        px-2.5 py-1 rounded-full
        backdrop-blur-md
        ${variantStyles[variant]}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
        >
            {children}
        </span>
    );
}