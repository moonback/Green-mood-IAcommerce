import { Product } from '../types';

import { useSettingsStore } from '../../store/settingsStore';

export const SEO_SITE = {
  get name() { return useSettingsStore.getState().settings.store_name || 'My Store'; },
  get url() { return useSettingsStore.getState().settings.store_url || window.location.origin; },
  locale: 'fr_FR',
  language: 'fr',
  get defaultImage() { return useSettingsStore.getState().settings.store_logo_url || '/logo.png'; },
  get twitterHandle() {
    const handle = useSettingsStore.getState().settings.social_twitter || '';
    if (!handle) return '';
    try {
      const url = new URL(handle);
      return `@${url.pathname.replace('/', '')}`;
    } catch {
      return handle.startsWith('@') ? handle : `@${handle}`;
    }
  },
  get tiktok() { return useSettingsStore.getState().settings.social_tiktok || '#'; },
  get author() { return useSettingsStore.getState().settings.store_name || 'My Store'; },
  get telephone() { return useSettingsStore.getState().settings.store_phone || ''; },
  get email() { return useSettingsStore.getState().settings.store_email || ''; },
  get instagram() { return useSettingsStore.getState().settings.social_instagram || '#'; },
  get facebook() { return useSettingsStore.getState().settings.social_facebook || '#'; },
  get address() {
    const s = useSettingsStore.getState().settings.store_address || '123 Boulevard du Divertissement, 75000 Paris';
    const parts = s.split(',');
    return {
      full: s,
      street: parts[0]?.trim() || 'Showroom Innovation High-Tech',
      city: parts[1]?.trim() || 'Paris',
      zip: s.match(/\d{5}/)?.[0] || '75000'
    };
  },
  geo: {
    region: 'FR-IDF',
    placename: 'Paris, France',
    position: '48.8566;2.3522',
    icbm: '48.8566, 2.3522',
  },
};

export interface SEOData {
  title: string;
  description: string;
  canonical: string;
  keywords?: string[] | string;
  robots?: string;
  author?: string;
  language?: string;
  topic?: string;
  semanticKeywords?: string[] | string;
  aiSummary?: string;
  aiEntity?: string;
  og: {
    title: string;
    description: string;
    image: string;
    type: 'website' | 'article' | 'product';
    url: string;
  };
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    image: string;
  };
  schema?: object | object[];
}

export function withSiteUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${SEO_SITE.url}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildSEO(data: Partial<SEOData> & Pick<SEOData, 'title' | 'description'>): SEOData {
  const storeName = SEO_SITE.name;
  const fixText = (text: string) => {
    if (!text) return text;
    return text.replace(/NeuroCart/gi, storeName);
  };

  const title = fixText(data.title);
  const description = fixText(data.description);
  const canonical = withSiteUrl(data.canonical ?? '/');
  const ogImage = data.og?.image ?? SEO_SITE.defaultImage;

  return {
    title,
    description,
    canonical,
    keywords: Array.isArray(data.keywords) ? data.keywords.map(fixText) : data.keywords ? [fixText(data.keywords)] : undefined,
    robots: data.robots ?? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    author: data.author ?? SEO_SITE.author,
    language: data.language ?? SEO_SITE.language,
    topic: fixText(data.topic || ''),
    semanticKeywords: Array.isArray(data.semanticKeywords) ? data.semanticKeywords.map(fixText) : data.semanticKeywords ? [fixText(data.semanticKeywords)] : undefined,
    aiSummary: fixText(data.aiSummary ?? data.description),
    aiEntity: fixText(data.aiEntity ?? `Smartphone, Smart Home, Gadgets Innovants, ${storeName}`),
    og: {
      title: fixText(data.og?.title ?? title),
      description: fixText(data.og?.description ?? description),
      image: withSiteUrl(ogImage),
      type: data.og?.type ?? 'website',
      url: canonical,
    },
    twitter: {
      card: data.twitter?.card ?? 'summary_large_image',
      title: fixText(data.twitter?.title ?? title),
      description: fixText(data.twitter?.description ?? description),
      image: withSiteUrl(data.twitter?.image ?? ogImage),
    },
    schema: data.schema ? JSON.parse(fixText(JSON.stringify(data.schema))) : undefined,
  };
}

export function buildProductSEO(product: Product): SEOData {
  const seoTitle = typeof product.attributes?.seo_title === 'string' && product.attributes.seo_title.trim().length > 0
    ? product.attributes.seo_title.trim()
    : '';
  const baseTitle = seoTitle || `${product.name} | ${SEO_SITE.name}`;
  const seoMetaDescription = typeof product.attributes?.seo_meta_description === 'string' && product.attributes.seo_meta_description.trim().length > 0
    ? product.attributes.seo_meta_description.trim()
    : '';
  const description = seoMetaDescription || product.description || `Découvrez ${product.name}, une innovation d'exception disponible sur ${SEO_SITE.name}.`;

  return buildSEO({
    title: baseTitle,
    description,
    canonical: `/catalogue/${product.slug}`,
    keywords: [
      'cbd',
      product.name,
      product.category?.name ?? 'produit cbd',
      'cbd france',
      SEO_SITE.name.toLowerCase(),
    ],
    topic: `Produit Innovation: ${product.name}`,
    semanticKeywords: [
      'cannabidiol premium',
      'produits cbd testés en laboratoire',
      'bien-être naturel',
      'dosage cbd',
    ],
    aiEntity: `Product:${product.name};Brand:${SEO_SITE.name};Category:${product.category?.name ?? 'Innovations High-Tech'}`,
    og: {
      title: baseTitle,
      description,
      image: product.image_url ?? SEO_SITE.defaultImage,
      type: 'product',
      url: withSiteUrl(`/catalogue/${product.slug}`),
    },
  });
}
