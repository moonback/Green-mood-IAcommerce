import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-[color:var(--color-primary)] flex-shrink-0" />,
  error: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />,
};

const BG = {
  success: 'border-[color:var(--color-primary)]/40 bg-emerald-950/95',
  error: 'border-red-400/40 bg-red-950/95',
  info: 'border-blue-400/40 bg-blue-950/95',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div
      aria-live="off"
      aria-atomic="true"
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-[9999] flex flex-col gap-3 pointer-events-none md:bottom-6 md:right-6"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl max-w-sm ${BG[toast.type]}`}
          >
            {ICONS[toast.type]}
            <p className="text-sm font-medium text-[color:var(--color-text)] flex-1">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  removeToast(toast.id);
                }}
                className="text-xs font-black uppercase tracking-wider text-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] transition-colors"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)] transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
