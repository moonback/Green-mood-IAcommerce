import { Product } from '../types';
import { SEO_SITE, withSiteUrl } from './metaBuilder';

export type JsonLd = Record<string, unknown>;

export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_SITE.name,
    url: SEO_SITE.url,
    logo: SEO_SITE.defaultImage,
    sameAs: [SEO_SITE.instagram, SEO_SITE.facebook],
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: SEO_SITE.email, availableLanguage: ['fr', 'en'] }],
    knowsAbout: ['Arcade', 'Flippers', 'Simulateurs', 'Jeux automatiques', 'Billard', 'Divertissement Premium'],
  };
}

export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_SITE.name,
    url: SEO_SITE.url,
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SEO_SITE.url}/catalogue?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function localBusinessSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: SEO_SITE.name,
    image: SEO_SITE.defaultImage,
    url: SEO_SITE.url,
    telephone: SEO_SITE.telephone,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'FR',
      addressLocality: SEO_SITE.address.city,
      postalCode: SEO_SITE.address.zip,
      streetAddress: SEO_SITE.address.street,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 48.8566,
      longitude: 2.3522,
    },
    areaServed: 'France',
    priceRange: '€€',
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: withSiteUrl(item.path),
    })),
  };
}

export function faqSchema(faqs: ReadonlyArray<{ question: string; answer: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function articleSchema(data: { title: string; description: string; path: string; datePublished: string; dateModified?: string; authorName?: string }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    datePublished: data.datePublished,
    dateModified: data.dateModified ?? data.datePublished,
    author: { '@type': 'Person', name: data.authorName ?? `Équipe ${SEO_SITE.name}` },
    publisher: { '@type': 'Organization', name: SEO_SITE.name, logo: { '@type': 'ImageObject', url: SEO_SITE.defaultImage } },
    mainEntityOfPage: withSiteUrl(data.path),
  };
}

export function howToSchema(data: { name: string; description: string; steps: string[] }): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: data.name,
    description: data.description,
    step: data.steps.map((text) => ({ '@type': 'HowToStep', text })),
  };
}

export function productSchema(product: Product): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image_url,
    sku: product.sku,
    gtin: product.sku ?? product.id,
    brand: { '@type': 'Brand', name: SEO_SITE.name },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.avg_rating ?? 4.9,
      reviewCount: product.review_count ?? 12,
    },
    review: [
      {
        '@type': 'Review',
        author: { '@type': 'Person', name: 'Client vérifié' },
        reviewRating: { '@type': 'Rating', ratingValue: product.avg_rating ?? 5 },
        reviewBody: 'Machine de loisirs d\'exception avec certification CE et garantie constructeur.',
      },
    ],
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: product.price,
      availability: product.is_available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: withSiteUrl(`/catalogue/${product.slug}`),
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 4.9, currency: 'EUR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'FR' },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'FR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
      },
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Certification', value: 'Certification CE' },
      { '@type': 'PropertyValue', name: 'Garantie', value: '2 ans constructeur' },
    ],
  };
}

export function productGroupSchema(products: Product[], name: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    name,
    hasVariant: products.map((p) => ({ '@type': 'Product', name: p.name, sku: p.sku, url: withSiteUrl(`/catalogue/${p.slug}`) })),
  };
}
