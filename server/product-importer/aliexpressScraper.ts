import { chromium } from '@playwright/test';
import type { ScrapedProduct } from '../../src/types/productImporter';

interface AliExpressData {
  title?: string;
  subject?: string;
  imagePathList?: string[];
  imageComponent?: { imagePathList?: string[] };
  productId?: string | number;
  skuComponent?: {
    productSKUPropertyList?: Array<{ skuPropertyName: string; skuPropertyValues: Array<{ propertyValueDisplayName: string }> }>;
    skuPriceList?: Array<{
      skuAttr?: string;
      offerSalePrice?: { value?: number };
      skuVal?: {
        skuAmount?: { value?: number };
        availQuantity?: number;
      };
    }>;
  };
  priceComponent?: {
    skuPriceList?: Array<{ skuVal?: { skuAmount?: { value?: number } } }>;
    discountPrice?: { minActivityAmount?: { value?: number }; maxActivityAmount?: { value?: number } };
    origPrice?: { minAmount?: { value?: number }; maxAmount?: { value?: number } };
  };
  descriptionModule?: { descriptionUrl?: string };
  sellerComponent?: { storeName?: string };
  breadcrumbs?: Array<{ title: string }>;
}

function parseEmbeddedJson(html: string): AliExpressData | null {
  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/,
    /window\.runParams\s*=\s*(\{[\s\S]*?\});/,
    /window\._dida_config_\._init_data_\s*=\s*(\{[\s\S]*?\});/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    try {
      const parsed = JSON.parse(match[1]);
      const nested = parsed?.data?.root?.fields?.mods ?? parsed?.data ?? parsed?.mods ?? parsed;
      if (nested && typeof nested === 'object') {
        return nested as AliExpressData;
      }
    } catch {
      // Try next pattern.
    }
  }

  return null;
}

function parseCurrencyFromDocument(html: string): string {
  const currencyMatch = html.match(/"currencyCode"\s*:\s*"([A-Z]{3})"/);
  return currencyMatch?.[1] ?? 'USD';
}

function cleanDescription(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export async function scrapeAliExpressProduct(url: string): Promise<ScrapedProduct> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      locale: 'en-US',
      extraHTTPHeaders: {
        'accept-language': 'en-US,en;q=0.9',
      },
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(window, 'chrome', { value: { runtime: {} } });
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(1200 + Math.round(Math.random() * 1500));
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);

    const html = await page.content();
    const embedded = parseEmbeddedJson(html);

    const titleFromOg = await page.locator('meta[property="og:title"]').first().getAttribute('content');
    const imageFromOg = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const descriptionFromOg = await page
      .locator('meta[property="og:description"]')
      .first()
      .getAttribute('content');

    const description =
      cleanDescription(descriptionFromOg ?? '') ||
      cleanDescription(
        await page
          .locator('#product-description, .product-description, .ae-attr-list')
          .first()
          .innerText()
          .catch(() => ''),
      );

    const images = [
      ...(embedded?.imageComponent?.imagePathList ?? []),
      ...(embedded?.imagePathList ?? []),
      ...(imageFromOg ? [imageFromOg] : []),
    ].filter(Boolean);

    const uniqueImages = Array.from(new Set(images));

    const priceCandidates = [
      embedded?.priceComponent?.discountPrice?.minActivityAmount?.value,
      embedded?.priceComponent?.discountPrice?.maxActivityAmount?.value,
      embedded?.priceComponent?.origPrice?.minAmount?.value,
      embedded?.priceComponent?.origPrice?.maxAmount?.value,
      ...(embedded?.priceComponent?.skuPriceList?.map((item) => item.skuVal?.skuAmount?.value) ?? []),
      ...(embedded?.skuComponent?.skuPriceList?.map((item) => item.offerSalePrice?.value ?? item.skuVal?.skuAmount?.value) ?? []),
    ]
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .sort((a, b) => a - b);

    const optionList =
      embedded?.skuComponent?.productSKUPropertyList?.map((option) => ({
        name: option.skuPropertyName,
        values: option.skuPropertyValues.map((value) => value.propertyValueDisplayName),
      })) ?? [];

    const variants =
      embedded?.skuComponent?.skuPriceList?.map((variant, index) => ({
        sku: variant.skuAttr ?? `variant-${index + 1}`,
        optionValues: { skuAttr: variant.skuAttr ?? `variant-${index + 1}` },
        price: variant.offerSalePrice?.value ?? variant.skuVal?.skuAmount?.value ?? null,
        stock: variant.skuVal?.availQuantity ?? null,
      })) ?? [];

    return {
      source: 'aliexpress',
      sourceUrl: url,
      externalId: String(embedded?.productId ?? ''),
      currency: parseCurrencyFromDocument(html),
      title: embedded?.title || embedded?.subject || titleFromOg || 'AliExpress Product',
      description,
      images: uniqueImages,
      price: {
        min: priceCandidates[0] ?? null,
        max: priceCandidates[priceCandidates.length - 1] ?? null,
      },
      variants: {
        options: optionList,
        items: variants,
      },
      metadata: {
        brand: embedded?.sellerComponent?.storeName,
        breadcrumbs: embedded?.breadcrumbs?.map((item) => item.title),
      },
    };
  } finally {
    await browser.close();
  }
}
