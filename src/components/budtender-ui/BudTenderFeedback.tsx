import { useState } from 'react';
import { motion } from 'motion/react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const NEGATIVE_REASONS = [
  { key: 'wrong_product', label: 'Produit inadapté' },
  { key: 'too_brief',     label: 'Trop court' },
  { key: 'irrelevant',    label: 'Hors sujet' },
  { key: 'tone',          label: 'Ton inapproprié' },
] as const;

type NegativeReason = (typeof NEGATIVE_REASONS)[number]['key'];

export interface BudTenderFeedbackProps {
  /** Callback fired when the user submits feedback */
  onFeedback: (type: 'positive' | 'negative', reason?: NegativeReason) => void;
  /** Whether the buttons should be disabled (e.g. already submitted) */
  disabled?: boolean;
}

/**
 * Thumbs up / thumbs down feedback buttons shown after recommendation cards.
 * Positive → immediate "Merci !" confirmation.
 * Negative → shows quick-reason chips (can be skipped with "Passer").
 */
export default function BudTenderFeedback({ onFeedback, disabled = false }: BudTenderFeedbackProps) {
  const [step, setStep] = useState<'idle' | 'reason' | 'done'>('idle');

  const handlePositive = () => {
    if (disabled || step !== 'idle') return;
    setStep('done');
    onFeedback('positive');
  };

  const handleNegative = () => {
    if (disabled || step !== 'idle') return;
    setStep('reason');
  };

  const submitReason = (reason?: NegativeReason) => {
    setStep('done');
    onFeedback('negative', reason);
  };

  if (step === 'done') {
    return (
      <div className="pt-2">
        <span className="text-xs font-bold text-emerald-400">Merci !</span>
      </div>
    );
  }

  if (step === 'reason') {
    return (
      <div className="pt-2 space-y-2">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          Pourquoi ?
        </p>
        <div className="flex flex-wrap gap-2">
          {NEGATIVE_REASONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => submitReason(key)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-400/10 border border-red-400/20 text-red-300 hover:bg-red-400/20 transition-all"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => submitReason(undefined)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-700/50 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 transition-all"
          >
            Passer
          </button>
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">
        Utile ?
      </span>
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={handlePositive}
        disabled={disabled}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Recommandation utile"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleNegative}
        disabled={disabled}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Recommandation pas utile"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </motion.button>
    </div>
  );
}
