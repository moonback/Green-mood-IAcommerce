import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

const { useRecentlyViewedStore } = await import('../recentlyViewedStore');

const makeProduct = (id: string) => ({
  id,
  slug: `slug-${id}`,
  name: `Product ${id}`,
  price: 19.9,
  image_url: null,
  is_available: true,
  stock_quantity: 5,
  is_bundle: false,
  is_featured: false,
});

describe('recentlyViewedStore', () => {
  beforeEach(() => {
    act(() => useRecentlyViewedStore.setState({ items: [] }));
  });

  it('adds viewed products in reverse chronological order', () => {
    act(() => {
      useRecentlyViewedStore.getState().trackProductView(makeProduct('1'));
      useRecentlyViewedStore.getState().trackProductView(makeProduct('2'));
    });

    expect(useRecentlyViewedStore.getState().items.map((p) => p.id)).toEqual(['2', '1']);
  });

  it('moves an already viewed product to the top without duplicating', () => {
    act(() => {
      useRecentlyViewedStore.getState().trackProductView(makeProduct('1'));
      useRecentlyViewedStore.getState().trackProductView(makeProduct('2'));
      useRecentlyViewedStore.getState().trackProductView(makeProduct('1'));
    });

    const items = useRecentlyViewedStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('1');
  });

  it('returns related history excluding current product and honoring limit', () => {
    act(() => {
      ['1', '2', '3', '4'].forEach((id) => useRecentlyViewedStore.getState().trackProductView(makeProduct(id)));
    });

    const related = useRecentlyViewedStore.getState().getRelatedHistory('4', 2);
    expect(related.map((p) => p.id)).toEqual(['3', '2']);
  });

  it('keeps only the latest 8 viewed products', () => {
    act(() => {
      Array.from({ length: 10 }, (_, i) => `${i + 1}`).forEach((id) => {
        useRecentlyViewedStore.getState().trackProductView(makeProduct(id));
      });
    });

    const ids = useRecentlyViewedStore.getState().items.map((p) => p.id);
    expect(ids).toHaveLength(8);
    expect(ids[0]).toBe('10');
    expect(ids[7]).toBe('3');
  });
});
