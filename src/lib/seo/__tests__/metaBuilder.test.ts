import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { store_name: 'Eco CBD', store_logo_url: null },
    }),
  },
}));

import { buildSEO, buildProductSEO, withSiteUrl, SEO_SITE } from '../metaBuilder';
import { makeProduct } from '../../../test/utils';

describe('withSiteUrl', () => {
  it('returns absolute URLs unchanged', () => {
    expect(withSiteUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
  });

  it('prepends site URL to relative paths', () => {
    expect(withSiteUrl('/catalogue')).toBe(`${SEO_SITE.url}/catalogue`);
  });

  it('adds leading slash when missing', () => {
    expect(withSiteUrl('catalogue')).toBe(`${SEO_SITE.url}/catalogue`);
  });
});

describe('buildSEO', () => {
  it('returns required fields', () => {
    const seo = buildSEO({ title: 'Test', description: 'Desc' });
    expect(seo.title).toBe('Test');
    expect(seo.description).toBe('Desc');
    expect(seo.canonical).toBeTruthy();
  });

  it('defaults canonical to site root', () => {
    const seo = buildSEO({ title: 'T', description: 'D' });
    expect(seo.canonical).toBe(withSiteUrl('/'));
  });

  it('uses provided canonical path', () => {
    const seo = buildSEO({ title: 'T', description: 'D', canonical: '/boutique' });
    expect(seo.canonical).toBe(withSiteUrl('/boutique'));
  });

  it('defaults robots to index,follow', () => {
    const seo = buildSEO({ title: 'T', description: 'D' });
    expect(seo.robots).toContain('index');
    expect(seo.robots).toContain('follow');
  });

  it('normalises keywords array', () => {
    const seo = buildSEO({ title: 'T', description: 'D', keywords: ['cbd', 'france'] });
    expect(seo.keywords).toEqual(['cbd', 'france']);
  });

  it('wraps single string keyword in array', () => {
    const seo = buildSEO({ title: 'T', description: 'D', keywords: 'cbd' });
    expect(seo.keywords).toEqual(['cbd']);
  });

  it('builds og block with defaults', () => {
    const seo = buildSEO({ title: 'Page Title', description: 'Page Desc' });
    expect(seo.og.title).toBe('Page Title');
    expect(seo.og.description).toBe('Page Desc');
    expect(seo.og.type).toBe('website');
  });

  it('builds twitter block', () => {
    const seo = buildSEO({ title: 'T', description: 'D' });
    expect(seo.twitter.card).toBe('summary_large_image');
    expect(seo.twitter.title).toBe('T');
  });

  it('uses aiSummary from description when not provided', () => {
    const seo = buildSEO({ title: 'T', description: 'My Desc' });
    expect(seo.aiSummary).toBe('My Desc');
  });

  it('uses custom aiSummary when provided', () => {
    const seo = buildSEO({ title: 'T', description: 'D', aiSummary: 'Custom summary' });
    expect(seo.aiSummary).toBe('Custom summary');
  });
});

describe('buildProductSEO', () => {
  it('includes product name in title', () => {
    const product = makeProduct({ name: 'Amnesia Haze', slug: 'amnesia-haze' });
    const seo = buildProductSEO(product);
    expect(seo.title).toContain('Amnesia Haze');
  });

  it('sets og.type to product', () => {
    const product = makeProduct();
    const seo = buildProductSEO(product);
    expect(seo.og.type).toBe('product');
  });

  it('builds canonical with product slug', () => {
    const product = makeProduct({ slug: 'huile-cbd-10' });
    const seo = buildProductSEO(product);
    expect(seo.canonical).toContain('huile-cbd-10');
  });

  it('includes cbd keyword', () => {
    const product = makeProduct();
    const seo = buildProductSEO(product);
    expect((seo.keywords as string[]).some(k => k.toLowerCase().includes('cbd'))).toBe(true);
  });

  it('uses product description when available', () => {
    const product = makeProduct({ description: 'Excellent produit CBD' });
    const seo = buildProductSEO(product);
    expect(seo.description).toBe('Excellent produit CBD');
  });

  it('generates a fallback description when product has no description', () => {
    const product = makeProduct({ description: undefined as any });
    const seo = buildProductSEO(product);
    expect(seo.description).toContain(product.name);
  });
});
