import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../lib/types';

const RECENTLY_VIEWED_LIMIT = 8;

export type RecentlyViewedProduct = Pick<
  Product,
  'id' | 'slug' | 'name' | 'price' | 'image_url' | 'is_available' | 'stock_quantity' | 'is_bundle' | 'is_featured'
>;

interface RecentlyViewedStore {
  items: RecentlyViewedProduct[];
  trackProductView: (product: RecentlyViewedProduct) => void;
  getRelatedHistory: (currentProductId: string, limit?: number) => RecentlyViewedProduct[];
  clearAll: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],

      trackProductView: (product) => {
        set((state) => {
          const withoutCurrent = state.items.filter((item) => item.id !== product.id);
          return { items: [product, ...withoutCurrent].slice(0, RECENTLY_VIEWED_LIMIT) };
        });
      },

      getRelatedHistory: (currentProductId, limit = 4) =>
        get()
          .items
          .filter((item) => item.id !== currentProductId)
          .slice(0, limit),

      clearAll: () => set({ items: [] }),
    }),
    { name: 'greenMood-recently-viewed' }
  )
);
