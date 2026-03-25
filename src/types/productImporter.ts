export type ProductSource = 'aliexpress';

export interface ScrapedVariantOption {
  name: string;
  values: string[];
}

export interface ScrapedVariant {
  sku?: string;
  optionValues: Record<string, string>;
  price?: number | null;
  stock?: number | null;
}

export interface ScrapedProduct {
  source: ProductSource;
  sourceUrl: string;
  externalId?: string;
  currency: string;
  title: string;
  description: string;
  images: string[];
  price: {
    min: number | null;
    max: number | null;
    originalMin?: number | null;
    originalMax?: number | null;
  };
  variants: {
    options: ScrapedVariantOption[];
    items: ScrapedVariant[];
  };
  metadata: {
    brand?: string;
    rating?: number;
    reviewCount?: number;
    soldCount?: number;
    breadcrumbs?: string[];
  };
}

export interface EnrichedProductData {
  title: string;
  description: string;
  shortDescription: string;
  features: string[];
  technical_specs?: {
    group: string;
    items: {
      label: string;
      value: string;
    }[];
  }[];
  suggestedCategory?: string;
  suggestedTags: string[];
}

export interface ProductImportMapping {
  categoryId: string;
  stockQuantity: number;
  customPrice?: number | null;
  featured?: boolean;
  active?: boolean;
  slug?: string;
}

export interface NormalizedProductDraft {
  category_id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock_quantity: number;
  is_available: boolean;
  is_featured: boolean;
  is_active: boolean;
  attributes: {
    source: ProductSource;
    source_url: string;
    source_external_id?: string;
    currency: string;
    images: string[];
    variant_options: ScrapedVariantOption[];
    variant_items: ScrapedVariant[];
    brand?: string;
    raw_metadata?: Record<string, unknown>;
  };
}

export interface ScrapeProductRequest {
  source: ProductSource;
  url: string;
}

export interface ImportProductRequest {
  source: ProductSource;
  product: ScrapedProduct;
  mapping: ProductImportMapping;
}
