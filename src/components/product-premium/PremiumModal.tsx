import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function PremiumModal({ isOpen, onClose, title, children }: PremiumModalProps) {
  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[color:var(--color-overlay)] backdrop-blur-md"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-[40px] border border-[color:var(--color-border)] bg-[color:var(--color-bg)]/95 backdrop-blur-2xl shadow-2xl pointer-events-auto flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-8 py-6">
                <h2 className="text-xl font-black uppercase tracking-widest text-[color:var(--color-text)]">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-[color:var(--color-text-subtle)] hover:bg-[color:var(--color-bg-muted)] hover:text-[color:var(--color-text)] transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
