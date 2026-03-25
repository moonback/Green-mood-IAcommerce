import { motion } from 'motion/react';
import { Megaphone, ExternalLink, Sparkles, Tag } from 'lucide-react';

export interface Ad {
  id: string;
  title: string;
  tagline: string;
  description: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  badge_text?: string;
  badge_color?: 'neon' | 'amber' | 'purple' | 'pink' | 'blue';
  target_categories?: string[];
  target_tags?: string[];
  is_active: boolean;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

interface AdCardProps {
  ad: Ad;
}

export default function AdCard({ ad }: AdCardProps) {
  const badgeStyle: Record<string, string> = {
    neon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_14px_rgba(57,255,20,0.2)]',
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/30 shadow-[0_0_14px_rgba(251,191,36,0.2)]',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_14px_rgba(168,85,247,0.2)]',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30 shadow-[0_0_14px_rgba(236,72,153,0.2)]',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_14px_rgba(59,130,246,0.2)]',
  };

  const colorKey = ad.badge_color ?? 'amber';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative bg-zinc-900/30 rounded-[2rem] border border-amber-400/20 overflow-hidden transition-all duration-500 shadow-xl hover:border-amber-400/40 hover:shadow-[0_0_30px_rgba(251,191,36,0.08)]"
    >
      {/* Sponsored glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Sponsored label */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-amber-400/15 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-400/20">
        <Megaphone className="w-2.5 h-2.5 text-amber-400" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Sponsorisé</span>
      </div>

      {/* Badge */}
      {ad.badge_text && (
        <div className={`absolute top-4 right-4 z-10 flex items-center gap-1.5 backdrop-blur-md px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${badgeStyle[colorKey]}`}>
          <Sparkles className="w-2.5 h-2.5" />
          {ad.badge_text}
        </div>
      )}

      {/* Image */}
      <a
        href={ad.cta_url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-square overflow-hidden bg-white/[0.02] group-hover:bg-white/[0.04] transition-colors duration-500"
      >
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt={ad.title}
            loading="lazy"
            className="w-full h-full object-cover p-0 transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 grayscale-[0.1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag className="w-16 h-16 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity duration-500" />
      </a>

      {/* Content */}
      <div className="p-5 md:p-6 space-y-4 relative z-10">
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 backdrop-blur-md">
              Annonce
            </span>
          </div>

          <p className="block font-serif font-bold text-lg md:text-xl text-white leading-tight line-clamp-1 group-hover:text-amber-400 transition-colors duration-300">
            {ad.title}
          </p>

          {ad.tagline && (
            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{ad.tagline}</p>
          )}
        </div>

        {/* CTA button */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-[11px] text-zinc-600 italic truncate max-w-[120px]">
            {ad.description}
          </span>
          <a
            href={ad.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 w-12 h-12 md:w-auto md:px-5 md:py-3 bg-amber-400 text-black rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.5)] active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5 md:mr-1" />
            <span className="hidden md:inline">{ad.cta_label || 'Voir'}</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
