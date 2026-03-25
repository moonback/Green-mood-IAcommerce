import type { NormalizedProductDraft, ProductImportMapping, ScrapedProduct } from '../../src/types/productImporter';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export function mapScrapedProductToDraft(
  scrapedProduct: ScrapedProduct,
  mapping: ProductImportMapping,
): NormalizedProductDraft {
  const computedPrice =
    mapping.customPrice != null && Number.isFinite(mapping.customPrice)
      ? mapping.customPrice
      : scrapedProduct.price.min ?? scrapedProduct.price.max ?? 0;

  return {
    category_id: mapping.categoryId,
    slug: mapping.slug?.trim() || `${slugify(scrapedProduct.title)}-${Date.now()}`,
    name: scrapedProduct.title,
    description: scrapedProduct.description,
    price: computedPrice,
    image_url: scrapedProduct.images[0] ?? null,
    stock_quantity: mapping.stockQuantity,
    is_available: mapping.stockQuantity > 0,
    is_featured: mapping.featured ?? false,
    is_active: mapping.active ?? true,
    attributes: {
      source: scrapedProduct.source,
      source_url: scrapedProduct.sourceUrl,
      source_external_id: scrapedProduct.externalId,
      currency: scrapedProduct.currency,
      images: scrapedProduct.images,
      brand: scrapedProduct.metadata.brand,
      variant_options: scrapedProduct.variants.options,
      variant_items: scrapedProduct.variants.items,
      raw_metadata: scrapedProduct.metadata as unknown as Record<string, unknown>,
    },
  };
}
