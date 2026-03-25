import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-green-neon text-slate-950 hover:bg-[#0fd978] active:bg-[#0dbd68] shadow-[0_8px_24px_rgba(16,185,129,0.25)]',
  secondary:
    'bg-slate-800/90 text-slate-100 border border-slate-700 hover:border-slate-500 hover:bg-slate-800',
  ghost:
    'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent hover:border-slate-700',
  danger:
    'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:text-rose-200',
};

export default function AdminButton({
  variant = 'secondary',
  className = '',
  leftIcon,
  children,
  ...props
}: AdminButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/50 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
    >
      {leftIcon}
      {children}
    </button>
  );
}
