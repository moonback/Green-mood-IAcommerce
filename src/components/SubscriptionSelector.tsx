import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { RefreshCw, CalendarDays, Zap, Clock, ShieldCheck } from 'lucide-react';
import type { SubscriptionFrequency } from '../lib/types';

interface Props {
  selectedFrequency: SubscriptionFrequency | null;
  onFrequencyChange: (freq: SubscriptionFrequency | null) => void;
  isSubscribable: boolean;
}

const frequencies = [
  { 
    id: 'weekly', 
    label: 'Hebdo', 
    desc: '-15%', 
    fullDesc: 'Toutes les semaines',
    icon: <RefreshCw className="w-4 h-4" />,
    popular: true 
  },
  { 
    id: 'biweekly', 
    label: '15 jours', 
    desc: '-10%', 
    fullDesc: 'Toutes les 2 semaines',
    icon: <CalendarDays className="w-4 h-4" />,
    popular: false
  },
  { 
    id: 'monthly', 
    label: 'Mensuel', 
    desc: '-5%', 
    fullDesc: 'Tous les mois',
    icon: <Clock className="w-4 h-4" />,
    popular: false
  },
] as const;

export default function SubscriptionSelector({ selectedFrequency, onFrequencyChange, isSubscribable }: Props) {
  if (!isSubscribable) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Plan de livraison
          </p>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Sans engagement</span>
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          {selectedFrequency && (
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg border border-emerald-400/20 uppercase tracking-widest shadow-[0_0_15px_rgba(52,211,153,0.1)]"
            >
              Économie active
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <LayoutGroup>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Achat Unique */}
          <button
            onClick={() => onFrequencyChange(null)}
            className="group relative flex flex-col items-start gap-3 p-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 hover:bg-[color:var(--color-card)]/60 transition-all duration-300 overflow-hidden"
          >
            {!selectedFrequency && (
              <motion.div 
                layoutId="active-bg"
                className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/20 to-[color:var(--color-primary)]/5 glassmorphism-dark -z-10"
                initial={false}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            
            <div className={`p-2 rounded-xl transition-all duration-300 ${!selectedFrequency ? 'bg-[color:var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--theme-neon-rgb),0.3)]' : 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-primary)]'}`}>
              <Zap className="w-4 h-4" />
            </div>

            <div className="space-y-0.5">
              <p className={`text-[11px] font-black uppercase tracking-tight transition-colors ${!selectedFrequency ? 'text-white' : 'text-[color:var(--color-text)]'}`}>Direct</p>
              <p className={`text-[10px] font-bold transition-colors ${!selectedFrequency ? 'text-white/70' : 'text-[color:var(--color-text-muted)]'}`}>Unique</p>
            </div>

            {!selectedFrequency && (
              <motion.div 
                layoutId="active-border"
                className="absolute inset-0 rounded-2xl border-2 border-[color:var(--color-primary)] ring-4 ring-[color:var(--color-primary)]/10"
                initial={false}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>

          {/* Frequencies */}
          {frequencies.map((freq) => (
            <button
              key={freq.id}
              onClick={() => onFrequencyChange(freq.id as SubscriptionFrequency)}
              className="group relative flex flex-col items-start gap-3 p-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-card)]/40 hover:bg-[color:var(--color-card)]/60 transition-all duration-300 overflow-hidden"
            >
              {freq.popular && (
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-[color:var(--color-primary)] text-white text-[8px] font-black uppercase tracking-tighter rounded-bl-lg rounded-tr-xl">
                  Meilleur Offre
                </div>
              )}

              {selectedFrequency === freq.id && (
                <motion.div 
                  layoutId="active-bg"
                  className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/20 to-[color:var(--color-primary)]/5 glassmorphism-dark -z-10"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <div className={`p-2 rounded-xl transition-all duration-300 ${selectedFrequency === freq.id ? 'bg-[color:var(--color-primary)] text-white shadow-[0_0_15px_rgba(var(--theme-neon-rgb),0.3)]' : 'bg-[color:var(--color-bg-elevated)] text-[color:var(--color-primary)] group-hover:scale-110'}`}>
                {freq.icon}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <p className={`text-[11px] font-black uppercase tracking-tight transition-colors ${selectedFrequency === freq.id ? 'text-white' : 'text-[color:var(--color-text)]'}`}>{freq.label}</p>
                  <span className={`text-[10px] font-black ${selectedFrequency === freq.id ? 'text-white' : 'text-emerald-400'}`}>{freq.desc}</span>
                </div>
                <p className={`text-[10px] font-bold transition-colors ${selectedFrequency === freq.id ? 'text-white/70' : 'text-[color:var(--color-text-muted)] text-left'}`}>{freq.fullDesc}</p>
              </div>
              
              {selectedFrequency === freq.id && (
                <motion.div 
                  layoutId="active-border"
                  className="absolute inset-0 rounded-2xl border-2 border-[color:var(--color-primary)] ring-4 ring-[color:var(--color-primary)]/10"
                  initial={false}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </LayoutGroup>

      <p className="text-[9px] text-[color:var(--color-text-muted)] text-center italic opacity-60">
        Modifiable ou annulable à tout moment depuis votre espace client
      </p>
    </div>
  );
}

