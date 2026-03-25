import express from 'express';
import { createClient } from '@supabase/supabase-js';
import type { ImportProductRequest, ScrapeProductRequest } from '../../src/types/productImporter';
import { scrapeAliExpressProduct } from './aliexpressScraper';
import { mapScrapedProductToDraft } from './normalizeProduct';
import { enrichProductWithAI } from './aiEnricher';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceRole
    ? createClient(supabaseUrl, supabaseServiceRole, { auth: { persistSession: false } })
    : null;

const ALLOWED_IMAGE_HOSTS = ['alicdn.com', 'aliexpress.com', 'aliexpress-media.com'];

const isAllowedImageHost = (hostname: string) =>
  ALLOWED_IMAGE_HOSTS.some((allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`));

router.post('/scrape-product', async (req, res) => {
  const body = req.body as ScrapeProductRequest;

  if (!body?.url || !body?.source) {
    return res.status(400).json({ message: 'source et url sont requis.' });
  }

  if (body.source !== 'aliexpress') {
    return res.status(400).json({ message: `Source non supportée: ${body.source}.` });
  }

  try {
    const product = await scrapeAliExpressProduct(body.url);
    const enriched = await enrichProductWithAI(product);
    return res.json({ product, enriched });
  } catch (error) {
    console.error('[product-importer] scrape failed:', error);
    return res.status(500).json({ message: 'Scraping échoué.' });
  }
});

router.post('/import-product', async (req, res) => {
  const body = req.body as ImportProductRequest;

  if (!body?.product || !body?.mapping) {
    return res.status(400).json({ message: 'product et mapping sont requis.' });
  }

  const normalized = mapScrapedProductToDraft(body.product, body.mapping);

  if (!supabase) {
    return res.json({
      message: 'Backend sans clé service role, import direct requis côté client.',
      persisted: false,
      normalized,
    });
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      ...normalized,
      is_bundle: false,
      is_subscribable: false,
      sku: null,
      original_value: null,
      weight_grams: null,
    })
    .select('id, name, slug')
    .single();

  if (error) {
    console.error('[product-importer] insert failed:', error);
    return res.status(500).json({ message: "Import en base échoué.", normalized });
  }

  return res.status(201).json({ product: data, persisted: true, normalized });
});

router.get('/image-proxy', async (req, res) => {
  const imageUrl = String(req.query.url ?? '');
  if (!imageUrl) {
    return res.status(400).json({ message: 'url query param is required.' });
  }

  try {
    const parsedUrl = new URL(imageUrl);
    if (!isAllowedImageHost(parsedUrl.hostname)) {
      return res.status(400).json({ message: 'Image host not allowed.' });
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ message: 'Cannot fetch image.' });
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    const cacheControl = response.headers.get('cache-control') ?? 'public, max-age=3600';
    const arrayBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', cacheControl);
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('[product-importer] image-proxy failed:', error);
    return res.status(500).json({ message: 'Image proxy failed.' });
  }
});

export default router;
