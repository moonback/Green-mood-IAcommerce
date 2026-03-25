interface StockBadgeProps {
  stock: number;
}

export default function StockBadge({ stock }: StockBadgeProps) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-red-950/20 text-red-400 border border-red-900/40 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
        Archives Épuisées
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-950/20 text-orange-400 border border-orange-900/40 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
        Édition Limitée ({stock})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-green-950/20 text-emerald-400 border border-green-900/40 backdrop-blur-md shadow-[0_0_15px_rgba(57,255,20,0.1)]">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(57,255,20,0.5)]" />
      Disponibilité Totale
    </span>
  );
}

