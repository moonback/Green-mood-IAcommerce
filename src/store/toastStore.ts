import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let counter = 0;
const timeoutByToastId = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++counter}`;
    const duration = toast.duration ?? 3000;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    const timeoutId = setTimeout(() => get().removeToast(id), duration);
    timeoutByToastId.set(id, timeoutId);
  },

  removeToast: (id) => {
    const timeoutId = timeoutByToastId.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutByToastId.delete(id);
    }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
