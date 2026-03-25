import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      settings: { store_name: 'Eco CBD', store_logo_url: null },
    }),
  },
}));

import {
  organizationSchema,
  websiteSchema,
  localBusinessSchema,
  breadcrumbSchema,
  faqSchema,
  articleSchema,
  howToSchema,
  productSchema,
  productGroupSchema,
} from '../schemaBuilder';
import { makeProduct } from '../../../test/utils';

describe('organizationSchema', () => {
  it('has correct @type', () => {
    expect(organizationSchema()['@type']).toBe('Organization');
  });

  it('has a name', () => {
    expect(organizationSchema().name).toBeTruthy();
  });
});

describe('websiteSchema', () => {
  it('has @type WebSite', () => {
    expect(websiteSchema()['@type']).toBe('WebSite');
  });

  it('has a SearchAction potentialAction', () => {
    const schema = websiteSchema() as any;
    expect(schema.potentialAction['@type']).toBe('SearchAction');
  });
});

describe('localBusinessSchema', () => {
  it('has @type Store', () => {
    expect(localBusinessSchema()['@type']).toBe('Store');
  });

  it('has an address with addressCountry FR', () => {
    const schema = localBusinessSchema() as any;
    expect(schema.address.addressCountry).toBe('FR');
  });
});

describe('breadcrumbSchema', () => {
  it('returns a BreadcrumbList', () => {
    const schema = breadcrumbSchema([{ name: 'Accueil', path: '/' }]);
    expect(schema['@type']).toBe('BreadcrumbList');
  });

  it('maps items correctly with position', () => {
    const schema = breadcrumbSchema([
      { name: 'Accueil', path: '/' },
      { name: 'Catalogue', path: '/catalogue' },
    ]) as any;
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
    expect(schema.itemListElement[0].name).toBe('Accueil');
  });

  it('handles empty items array', () => {
    const schema = breadcrumbSchema([]) as any;
    expect(schema.itemListElement).toHaveLength(0);
  });
});

describe('faqSchema', () => {
  it('has @type FAQPage', () => {
    expect((faqSchema([]) as any)['@type']).toBe('FAQPage');
  });

  it('maps questions correctly', () => {
    const faqs = [
      { question: 'Q1?', answer: 'A1' },
      { question: 'Q2?', answer: 'A2' },
    ];
    const schema = faqSchema(faqs) as any;
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0]['@type']).toBe('Question');
    expect(schema.mainEntity[0].name).toBe('Q1?');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('A1');
  });
});

describe('articleSchema', () => {
  it('has @type Article', () => {
    const schema = articleSchema({
      title: 'Mon article',
      description: 'Desc',
      path: '/guides/cbd',
      datePublished: '2026-01-01',
    });
    expect(schema['@type']).toBe('Article');
  });

  it('uses datePublished as dateModified when not provided', () => {
    const schema = articleSchema({
      title: 'T', description: 'D', path: '/p', datePublished: '2026-01-01',
    }) as any;
    expect(schema.dateModified).toBe('2026-01-01');
  });

  it('uses provided dateModified', () => {
    const schema = articleSchema({
      title: 'T', description: 'D', path: '/p',
      datePublished: '2026-01-01', dateModified: '2026-02-01',
    }) as any;
    expect(schema.dateModified).toBe('2026-02-01');
  });
});

describe('howToSchema', () => {
  it('has @type HowTo', () => {
    const schema = howToSchema({ name: 'Guide', description: 'D', steps: ['Step 1', 'Step 2'] });
    expect(schema['@type']).toBe('HowTo');
  });

  it('maps steps correctly', () => {
    const schema = howToSchema({ name: 'N', description: 'D', steps: ['Step A', 'Step B'] }) as any;
    expect(schema.step).toHaveLength(2);
    expect(schema.step[0]['@type']).toBe('HowToStep');
    expect(schema.step[0].text).toBe('Step A');
  });
});

describe('productSchema', () => {
  it('has @type Product', () => {
    const schema = productSchema(makeProduct());
    expect(schema['@type']).toBe('Product');
  });

  it('sets InStock when product is available', () => {
    const schema = productSchema(makeProduct({ is_available: true })) as any;
    expect(schema.offers.availability).toContain('InStock');
  });

  it('sets OutOfStock when product is unavailable', () => {
    const schema = productSchema(makeProduct({ is_available: false })) as any;
    expect(schema.offers.availability).toContain('OutOfStock');
  });

  it('includes price in offers', () => {
    const schema = productSchema(makeProduct({ price: 24.99 })) as any;
    expect(schema.offers.price).toBe(24.99);
    expect(schema.offers.priceCurrency).toBe('EUR');
  });
});

describe('productGroupSchema', () => {
  it('has @type ProductGroup', () => {
    const schema = productGroupSchema([makeProduct()], 'Groupe Test');
    expect(schema['@type']).toBe('ProductGroup');
  });

  it('maps variants', () => {
    const products = [makeProduct({ name: 'P1' }), makeProduct({ name: 'P2' })];
    const schema = productGroupSchema(products, 'Groupe') as any;
    expect(schema.hasVariant).toHaveLength(2);
  });
});
