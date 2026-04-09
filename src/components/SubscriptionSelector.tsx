import { motion } from 'motion/react';
import { RefreshCw, CalendarDays, Zap, Clock } from 'lucide-react';
import type { SubscriptionFrequency } from '../lib/types';

interface Props {
  selectedFrequency: SubscriptionFrequency | null;
  onFrequencyChange: (freq: SubscriptionFrequency | null) => void;
  isSubscribable: boolean;
}

const frequencies = [
  { id: 'weekly', label: 'Hebdo', desc: '-15%', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { id: 'biweekly', label: '15 jours', desc: '-10%', icon: <CalendarDays className="w-3.5 h-3.5" /> },
  { id: 'monthly', label: 'Mensuel', desc: '-5%', icon: <Clock className="w-3.5 h-3.5" /> },
] as const;

export default function SubscriptionSelector({ selectedFrequency, onFrequencyChange, isSubscribable }: Props) {
  if (!isSubscribable) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
          Plan de livraison
        </p>
        {selectedFrequency && (
          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
            Économie active
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Achat Unique */}
        <button
          onClick={() => onFrequencyChange(null)}
          className={`
            relative flex flex-col items-start gap-1 p-2.5 rounded-xl border transition-all duration-300
            ${!selectedFrequency 
              ? 'bg-[color:var(--color-primary)] border-[color:var(--color-primary)] shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.2)]' 
              : 'bg-[color:var(--color-card)]/40 border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/40 hover:bg-[color:var(--color-card)]/60'
            }
          `}
        >
          <div className={`p-1.5 rounded-lg ${!selectedFrequency ? 'bg-white/20' : 'bg-[color:var(--color-bg-elevated)]'} transition-colors`}>
            <Zap className={`w-3.5 h-3.5 ${!selectedFrequency ? 'text-white' : 'text-[color:var(--color-text-muted)]'}`} />
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-tight ${!selectedFrequency ? 'text-white' : 'text-[color:var(--color-text)]'}`}>Direct</p>
            <p className={`text-[9px] font-bold ${!selectedFrequency ? 'text-white/70' : 'text-[color:var(--color-text-muted)]'}`}>Unique</p>
          </div>
        </button>

        {/* Frequencies */}
        {frequencies.map((freq) => (
          <button
            key={freq.id}
            onClick={() => onFrequencyChange(freq.id as SubscriptionFrequency)}
            className={`
              relative flex flex-col items-start gap-1 p-2.5 rounded-xl border transition-all duration-300
              ${selectedFrequency === freq.id 
                ? 'bg-[color:var(--color-primary)] border-[color:var(--color-primary)] shadow-[0_0_20px_rgba(var(--theme-neon-rgb),0.2)]' 
                : 'bg-[color:var(--color-card)]/40 border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]/40 hover:bg-[color:var(--color-card)]/60'
              }
            `}
          >
            <div className={`p-1.5 rounded-lg ${selectedFrequency === freq.id ? 'bg-white/20' : 'bg-[color:var(--color-bg-elevated)]'} transition-colors`}>
              <span className={selectedFrequency === freq.id ? 'text-white' : 'text-[color:var(--color-primary)]'}>
                {freq.icon}
              </span>
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-tight ${selectedFrequency === freq.id ? 'text-white' : 'text-[color:var(--color-text)]'}`}>{freq.label}</p>
              <p className={`text-[9px] font-bold ${selectedFrequency === freq.id ? 'text-white/70' : 'text-emerald-400'}`}>{freq.desc}</p>
            </div>
            
            {selectedFrequency === freq.id && (
              <motion.div 
                layoutId="activeSub"
                className="absolute inset-0 rounded-xl ring-2 ring-[color:var(--color-primary)] ring-offset-2 ring-offset-[color:var(--color-bg)] pointer-events-none"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
