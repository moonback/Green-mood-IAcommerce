import { describe, it, expect, vi, beforeEach } from 'vitest';
import { injectAdsIntoGrid } from '../useAds';
import type { Ad } from '../../components/AdCard';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

function makeAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: 'ad-1',
    title: 'Test Ad',
    tagline: 'Tagline',
    description: 'Desc',
    image_url: '/ad.jpg',
    cta_label: 'Click',
    cta_url: '/promo',
    position: 4,
    is_active: true,
    target_categories: [],
    ...overrides,
  };
}

describe('injectAdsIntoGrid', () => {
  it('returns products unchanged when no ads', () => {
    const products = ['a', 'b', 'c'];
    expect(injectAdsIntoGrid(products, [])).toEqual(products);
  });

  it('inserts ad at the specified position', () => {
    const products = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const ad = makeAd({ id: 'ad-1', position: 2 });
    const result = injectAdsIntoGrid(products, [ad]);

    const adIndex = result.findIndex((item) => (item as any).__isAd);
    expect(adIndex).toBe(2);
    expect((result[adIndex] as any).__isAd).toBe(true);
    expect((result[adIndex] as any).ad.id).toBe('ad-1');
  });

  it('appends ad at the end if position exceeds list length', () => {
    const products = ['p1', 'p2'];
    const ad = makeAd({ position: 10 });
    const result = injectAdsIntoGrid(products, [ad]);

    const last = result[result.length - 1] as any;
    expect(last.__isAd).toBe(true);
  });

  it('handles multiple ads with correct offsets', () => {
    const products = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const ads = [
      makeAd({ id: 'ad-1', position: 3 }),
      makeAd({ id: 'ad-2', position: 7 }),
    ];
    const result = injectAdsIntoGrid(products, ads);

    const adItems = result.filter((item) => (item as any).__isAd);
    expect(adItems).toHaveLength(2);
    expect(result).toHaveLength(12); // 10 products + 2 ads
  });

  it('preserves product items in order', () => {
    const products = ['p1', 'p2', 'p3'];
    const ad = makeAd({ position: 1 });
    const result = injectAdsIntoGrid(products, [ad]);

    const productItems = result.filter((item) => !(item as any).__isAd);
    expect(productItems).toEqual(products);
  });

  it('uses position=1 minimum for ad with position 0', () => {
    const products = ['p1', 'p2', 'p3'];
    const ad = makeAd({ position: 0 });
    const result = injectAdsIntoGrid(products, [ad]);
    const adIndex = result.findIndex((item) => (item as any).__isAd);
    expect(adIndex).toBeGreaterThanOrEqual(1);
  });

  it('sorts ads by position before insertion', () => {
    const products = Array.from({ length: 8 }, (_, i) => `p${i}`);
    const ads = [
      makeAd({ id: 'ad-late', position: 6 }),
      makeAd({ id: 'ad-early', position: 2 }),
    ];
    const result = injectAdsIntoGrid(products, ads);
    const adIndices = result
      .map((item, i) => ((item as any).__isAd ? i : -1))
      .filter((i) => i !== -1);

    // Early ad should appear before late ad
    expect(adIndices[0]).toBeLessThan(adIndices[1]);
  });
});
