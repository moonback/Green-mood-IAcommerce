import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistStore {
  items: string[]; // product IDs
  toggleItem: (productId: string) => void;
  hasItem: (productId: string) => boolean;
  clearAll: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggleItem: (productId) => {
        set((state) => {
          if (state.items.includes(productId)) {
            return { items: state.items.filter((id) => id !== productId) };
          }
          return { items: [...state.items, productId] };
        });
      },

      hasItem: (productId) => get().items.includes(productId),

      clearAll: () => set({ items: [] }),
    }),
    { name: 'greenMood-wishlist' }
  )
);
