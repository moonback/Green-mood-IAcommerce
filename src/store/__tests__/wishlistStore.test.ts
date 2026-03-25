import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

const { useWishlistStore } = await import('../wishlistStore');

describe('wishlistStore', () => {
  beforeEach(() => {
    act(() => useWishlistStore.setState({ items: [] }));
  });

  describe('toggleItem', () => {
    it('adds a product id when not in wishlist', () => {
      act(() => useWishlistStore.getState().toggleItem('prod-1'));
      expect(useWishlistStore.getState().items).toContain('prod-1');
    });

    it('removes a product id when already in wishlist', () => {
      act(() => {
        useWishlistStore.getState().toggleItem('prod-1');
        useWishlistStore.getState().toggleItem('prod-1');
      });
      expect(useWishlistStore.getState().items).not.toContain('prod-1');
    });

    it('does not duplicate items', () => {
      act(() => {
        useWishlistStore.getState().toggleItem('prod-1');
        useWishlistStore.getState().toggleItem('prod-1');
        useWishlistStore.getState().toggleItem('prod-1');
      });
      // Toggled 3 times: add → remove → add
      expect(useWishlistStore.getState().items).toHaveLength(1);
    });

    it('can hold multiple different product ids', () => {
      act(() => {
        useWishlistStore.getState().toggleItem('prod-1');
        useWishlistStore.getState().toggleItem('prod-2');
        useWishlistStore.getState().toggleItem('prod-3');
      });
      expect(useWishlistStore.getState().items).toHaveLength(3);
    });
  });

  describe('hasItem', () => {
    it('returns true when product is in wishlist', () => {
      act(() => useWishlistStore.getState().toggleItem('prod-1'));
      expect(useWishlistStore.getState().hasItem('prod-1')).toBe(true);
    });

    it('returns false when product is not in wishlist', () => {
      expect(useWishlistStore.getState().hasItem('prod-99')).toBe(false);
    });

    it('returns false after item is removed', () => {
      act(() => {
        useWishlistStore.getState().toggleItem('prod-1');
        useWishlistStore.getState().toggleItem('prod-1');
      });
      expect(useWishlistStore.getState().hasItem('prod-1')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('removes all items from wishlist', () => {
      act(() => {
        useWishlistStore.getState().toggleItem('prod-1');
        useWishlistStore.getState().toggleItem('prod-2');
        useWishlistStore.getState().clearAll();
      });
      expect(useWishlistStore.getState().items).toHaveLength(0);
    });
  });
});
