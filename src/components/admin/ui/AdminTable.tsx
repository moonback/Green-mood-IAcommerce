import React from 'react';

interface AdminTableProps {
  children: React.ReactNode;
  className?: string;
}

export default function AdminTable({ children, className = '' }: AdminTableProps) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/40 ${className}`}>
      <table className="w-full min-w-[820px] text-left">{children}</table>
    </div>
  );
}
