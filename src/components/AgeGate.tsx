import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

export default function AgeGate() {
  const { settings } = useSettingsStore();
  const [verified, setVerified] = useState(() =>
    sessionStorage.getItem('age_verified') === 'true'
  );

  if (!settings.age_gate_enabled || verified) return null;

  const handleAccept = () => {
    sessionStorage.setItem('age_verified', 'true');
    setVerified(true);
  };

  const handleDecline = () => {
    window.location.href = 'https://www.google.fr';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[color:var(--color-overlay)] backdrop-blur-md px-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-sm bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-3xl p-8 text-center shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-[color:var(--color-primary)]/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-[color:var(--color-primary)]" />
            </div>
          </div>

          <h2 className="text-xl font-black text-[color:var(--color-text)] mb-2">
            Vérification d'âge
          </h2>
          <p className="text-sm text-[color:var(--color-text-muted)] mb-8 leading-relaxed">
            Ce site est réservé aux personnes âgées de{' '}
            <span className="text-[color:var(--color-text)] font-bold">18 ans ou plus</span>.
            <br />
            Confirmez-vous avoir l'âge requis ?
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleAccept}
              className="w-full py-3 rounded-2xl bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] font-black text-sm hover:bg-[color:var(--color-surface)] transition-colors"
            >
              Oui, j'ai 18 ans ou plus
            </button>
            <button
              onClick={handleDecline}
              className="w-full py-3 rounded-2xl bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-muted)] font-semibold text-sm hover:bg-[color:var(--color-bg-elevated)] hover:text-[color:var(--color-text)] transition-colors"
            >
              Non, quitter le site
            </button>
          </div>

          <p className="mt-6 text-[10px] text-[color:var(--color-text-subtle)] leading-relaxed">
            En accédant à ce site, vous attestez être majeur(e) et acceptez nos{' '}
            conditions d'utilisation.
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
