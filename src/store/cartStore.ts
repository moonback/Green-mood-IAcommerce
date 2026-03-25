import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, DeliveryType, Product } from '../lib/types';
import { trackEvent } from '../lib/analytics';

import { useSettingsStore } from './settingsStore';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  deliveryType: DeliveryType;
  // actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setDeliveryType: (type: DeliveryType) => void;
  // computed helpers
  itemCount: () => number;
  subtotal: () => number;
  deliveryFee: () => number;
  total: () => number;
  pointsDiscount: (points: number, rate: number) => number;
  usePoints: boolean;
  setUsePoints: (use: boolean) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      deliveryType: 'click_collect',
      usePoints: false,

      addItem: (product, quantity = 1) => {
        const isOrderable = product.is_available !== false && (product.stock_quantity ?? 0) > 0;
        if (!isOrderable) return;

        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          const nextQty = (existing?.quantity ?? 0) + quantity;
          const safeQty = Math.min(nextQty, Math.max(1, product.stock_quantity ?? 1));

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: safeQty }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity: Math.min(quantity, product.stock_quantity ?? quantity) }] };
        });
        trackEvent('cart_add', window.location.pathname, {
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: product.price,
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId
              ? { ...i, quantity: Math.min(quantity, Math.max(1, i.product.stock_quantity ?? quantity)) }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
      openSidebar: () => set({ isOpen: true }),
      closeSidebar: () => set({ isOpen: false }),

      setDeliveryType: (type) => set({ deliveryType: type }),

      setUsePoints: (use) => set({ usePoints: use }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      deliveryFee: () => {
        if (get().deliveryType === 'click_collect') return 0;
        const { settings } = useSettingsStore.getState();
        return get().subtotal() >= settings.delivery_free_threshold ? 0 : settings.delivery_fee;
      },

      total: () => get().subtotal() + get().deliveryFee(),

      pointsDiscount: (points, rate) => {
        if (!get().usePoints) return 0;
        return Math.floor(points / 100) * rate;
      },
    }),
    {
      name: 'greenMood-cart',
      partialize: (state) => ({ 
        items: state.items, 
        deliveryType: state.deliveryType,
        usePoints: state.usePoints
      }),
    }
  )
);


