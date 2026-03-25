import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { makeProduct } from '../../test/utils';

// Mock supabase before importing stores that depend on it
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Mock settingsStore to control delivery settings
vi.mock('../settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: {
        delivery_fee: 5.90,
        delivery_free_threshold: 50.00,
      },
    }),
  },
}));

// Import AFTER mocks are set up
const { useCartStore } = await import('../cartStore');

describe('cartStore', () => {
  beforeEach(() => {
    // Reset the store state between tests
    act(() => {
      useCartStore.setState({ items: [], isOpen: false, deliveryType: 'click_collect' });
    });
  });

  // ─── addItem ────────────────────────────────────────────────────────────────

  describe('addItem', () => {
    it('adds a new product to the cart', () => {
      const product = makeProduct();
      act(() => useCartStore.getState().addItem(product));
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe('prod-1');
      expect(items[0].quantity).toBe(1);
    });

    it('increments quantity if product already in cart', () => {
      const product = makeProduct();
      act(() => {
        useCartStore.getState().addItem(product);
        useCartStore.getState().addItem(product, 2);
      });
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it('adds multiple distinct products', () => {
      const p1 = makeProduct({ id: 'prod-1', name: 'Product A' });
      const p2 = makeProduct({ id: 'prod-2', name: 'Product B' });
      act(() => {
        useCartStore.getState().addItem(p1);
        useCartStore.getState().addItem(p2);
      });
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it('uses quantity=1 by default', () => {
      act(() => useCartStore.getState().addItem(makeProduct()));
      expect(useCartStore.getState().items[0].quantity).toBe(1);
    });
  });

  // ─── removeItem ─────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('removes an item by product id', () => {
      const product = makeProduct();
      act(() => {
        useCartStore.getState().addItem(product);
        useCartStore.getState().removeItem('prod-1');
      });
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('does not affect other cart items', () => {
      const p1 = makeProduct({ id: 'prod-1' });
      const p2 = makeProduct({ id: 'prod-2' });
      act(() => {
        useCartStore.getState().addItem(p1);
        useCartStore.getState().addItem(p2);
        useCartStore.getState().removeItem('prod-1');
      });
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].product.id).toBe('prod-2');
    });
  });

  // ─── updateQuantity ─────────────────────────────────────────────────────────

  describe('updateQuantity', () => {
    it('updates the quantity of a product', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct());
        useCartStore.getState().updateQuantity('prod-1', 5);
      });
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('removes the item when quantity is set to 0', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct());
        useCartStore.getState().updateQuantity('prod-1', 0);
      });
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes the item when quantity is negative', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct());
        useCartStore.getState().updateQuantity('prod-1', -1);
      });
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ─── clearCart ──────────────────────────────────────────────────────────────

  describe('clearCart', () => {
    it('removes all items', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct({ id: 'prod-1' }));
        useCartStore.getState().addItem(makeProduct({ id: 'prod-2' }));
        useCartStore.getState().clearCart();
      });
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  // ─── Sidebar ────────────────────────────────────────────────────────────────

  describe('sidebar', () => {
    it('toggleSidebar flips isOpen', () => {
      act(() => useCartStore.getState().toggleSidebar());
      expect(useCartStore.getState().isOpen).toBe(true);
      act(() => useCartStore.getState().toggleSidebar());
      expect(useCartStore.getState().isOpen).toBe(false);
    });

    it('openSidebar sets isOpen to true', () => {
      act(() => useCartStore.getState().openSidebar());
      expect(useCartStore.getState().isOpen).toBe(true);
    });

    it('closeSidebar sets isOpen to false', () => {
      act(() => {
        useCartStore.getState().openSidebar();
        useCartStore.getState().closeSidebar();
      });
      expect(useCartStore.getState().isOpen).toBe(false);
    });
  });

  // ─── Computed helpers ───────────────────────────────────────────────────────

  describe('computed helpers', () => {
    it('itemCount returns sum of all quantities', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct({ id: 'prod-1', price: 10 }), 2);
        useCartStore.getState().addItem(makeProduct({ id: 'prod-2', price: 5 }), 3);
      });
      expect(useCartStore.getState().itemCount()).toBe(5);
    });

    it('subtotal returns sum of price * quantity', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct({ id: 'prod-1', price: 10 }), 2);
        useCartStore.getState().addItem(makeProduct({ id: 'prod-2', price: 5 }), 1);
      });
      expect(useCartStore.getState().subtotal()).toBeCloseTo(25);
    });

    it('deliveryFee is 0 for click_collect', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct({ price: 10 }));
        useCartStore.setState({ deliveryType: 'click_collect' });
      });
      expect(useCartStore.getState().deliveryFee()).toBe(0);
    });

    it('deliveryFee applies fee when subtotal < threshold', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct({ price: 10 }));
        useCartStore.setState({ deliveryType: 'delivery' });
      });
      // subtotal = 10, threshold = 50, fee = 5.90
      expect(useCartStore.getState().deliveryFee()).toBeCloseTo(5.90);
    });

    it('deliveryFee is 0 when subtotal >= threshold', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct({ price: 50 }));
        useCartStore.setState({ deliveryType: 'delivery' });
      });
      expect(useCartStore.getState().deliveryFee()).toBe(0);
    });

    it('total = subtotal + deliveryFee', () => {
      act(() => {
        useCartStore.getState().addItem(makeProduct({ price: 10 }));
        useCartStore.setState({ deliveryType: 'delivery' });
      });
      const expected = useCartStore.getState().subtotal() + useCartStore.getState().deliveryFee();
      expect(useCartStore.getState().total()).toBeCloseTo(expected);
    });
  });

  // ─── setDeliveryType ────────────────────────────────────────────────────────

  describe('setDeliveryType', () => {
    it('updates deliveryType', () => {
      act(() => useCartStore.getState().setDeliveryType('delivery'));
      expect(useCartStore.getState().deliveryType).toBe('delivery');
    });
  });
});
