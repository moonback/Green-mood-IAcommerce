import { useContext, useEffect } from 'react';
import { SEOContext } from '../seo/SEOProvider';
import { buildSEO, SEOData, SEO_SITE } from '../lib/seo/metaBuilder';

interface SEOProps extends Partial<SEOData> {
  title: string;
  description: string;
  schema?: object | object[];
  canonical?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  product?: {
    price?: number;
    currency?: string;
    availability?: string;
    sku?: string;
    brand?: string;
  };
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el?.setAttribute(key, value));
}

function upsertLink(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el?.setAttribute(key, value));
}

export default function SEO(props: SEOProps) {
  const { defaultSchemas } = useContext(SEOContext);
  const seo = buildSEO(props);
  const schemas = [
    ...defaultSchemas,
    ...(Array.isArray(seo.schema) ? seo.schema : seo.schema ? [seo.schema] : []),
  ];

  useEffect(() => {
    document.title = seo.title;

    upsertMeta('meta[name="description"]', { name: 'description', content: seo.description });
    const keywords = Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords ?? '';
    const semanticKeywords = Array.isArray(seo.semanticKeywords) ? seo.semanticKeywords.join(', ') : seo.semanticKeywords ?? '';
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: keywords });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: seo.robots ?? '' });
    upsertMeta('meta[name="author"]', { name: 'author', content: seo.author ?? SEO_SITE.author });
    upsertMeta('meta[name="language"]', { name: 'language', content: seo.language ?? SEO_SITE.language });
    upsertMeta('meta[name="topic"]', { name: 'topic', content: seo.topic ?? 'CBD, bien-être, cannabidiol' });
    upsertMeta('meta[name="semantic-keywords"]', { name: 'semantic-keywords', content: semanticKeywords });

    upsertMeta('meta[name="ai-content-type"]', { name: 'ai-content-type', content: props.product ? 'product' : props.article ? 'article' : 'webpage' });
    upsertMeta('meta[name="ai-summary"]', { name: 'ai-summary', content: seo.aiSummary ?? seo.description });
    upsertMeta('meta[name="ai-entity"]', { name: 'ai-entity', content: seo.aiEntity ?? 'CBD' });

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.og.title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seo.og.description });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: seo.og.image });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: seo.og.type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: seo.og.url });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: SEO_SITE.locale });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: seo.twitter.card });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.twitter.title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.twitter.description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.twitter.image });

    upsertMeta('meta[name="geo.region"]', { name: 'geo.region', content: SEO_SITE.geo.region });
    upsertMeta('meta[name="geo.placename"]', { name: 'geo.placename', content: SEO_SITE.geo.placename });
    upsertMeta('meta[name="geo.position"]', { name: 'geo.position', content: SEO_SITE.geo.position });
    upsertMeta('meta[name="ICBM"]', { name: 'ICBM', content: SEO_SITE.geo.icbm });

    if (props.article?.publishedTime) upsertMeta('meta[property="article:published_time"]', { property: 'article:published_time', content: props.article.publishedTime });
    if (props.article?.modifiedTime) upsertMeta('meta[property="article:modified_time"]', { property: 'article:modified_time', content: props.article.modifiedTime });
    if (props.article?.section) upsertMeta('meta[property="article:section"]', { property: 'article:section', content: props.article.section });

    if (props.product?.price != null) upsertMeta('meta[property="product:price:amount"]', { property: 'product:price:amount', content: String(props.product.price) });
    if (props.product?.currency) upsertMeta('meta[property="product:price:currency"]', { property: 'product:price:currency', content: props.product.currency });
    if (props.product?.availability) upsertMeta('meta[property="product:availability"]', { property: 'product:availability', content: props.product.availability });
    if (props.product?.sku) upsertMeta('meta[property="product:retailer_item_id"]', { property: 'product:retailer_item_id', content: props.product.sku });

    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: seo.canonical });

    document.documentElement.lang = seo.language ?? 'fr';

    const previous = Array.from(document.head.querySelectorAll('script[data-seo-schema="true"]'));
    previous.forEach((node) => node.remove());
    schemas.forEach((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-schema', 'true');
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      Array.from(document.head.querySelectorAll('script[data-seo-schema="true"]')).forEach((node) => node.remove());
    };
  }, [props.article, props.product, schemas, seo]);

  return null;
}
