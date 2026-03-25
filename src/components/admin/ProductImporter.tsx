import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Loader2, WandSparkles, X, Globe, List, CheckCircle2, AlertCircle, Sparkles, ChevronRight, Zap, Image as ImageIcon, Tag, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../lib/types';
import type {
  ProductImportMapping,
  ProductSource,
  ScrapedProduct,
  ScrapeProductRequest,
  EnrichedProductData,
} from '../../types/productImporter';
import { useToastStore } from '../../store/toastStore';

interface ProductImporterProps {
  categories: Category[];
  onImported: () => void;
}

const SOURCES: Array<{ label: string; value: ProductSource }> = [
  { label: 'AliExpress', value: 'aliexpress' },
];

const inputClassName =
  'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-300 backdrop-blur-md';

const buildProxyImageUrl = (imageUrl: string) =>
  `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

export default function ProductImporter({ categories, onImported }: ProductImporterProps) {
  const [source, setSource] = useState<ProductSource>('aliexpress');
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState<ScrapedProduct | null>(null);
  const [loadingScrape, setLoadingScrape] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [urlListInput, setUrlListInput] = useState('');
  const [urlQueue, setUrlQueue] = useState<string[]>([]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [lastImportRecap, setLastImportRecap] = useState<{
    name: string;
    price: number;
    categoryName: string;
    sourceUrl: string;
    imageUrl: string | null;
    mode: 'backend' | 'fallback';
  } | null>(null);
  const [enrichedData, setEnrichedData] = useState<EnrichedProductData | null>(null);
  const [useAI, setUseAI] = useState(true);
  const addToast = useToastStore((state) => state.addToast);

  const mapping = useMemo<ProductImportMapping>(
    () => ({
      categoryId: '',
      stockQuantity: 10,
      customPrice: null,
      featured: false,
      active: true,
    }),
    []
  );

  const [importMapping, setImportMapping] = useState<ProductImportMapping>(mapping);

  const resetForNewProduct = () => {
    setProduct(null);
    setLastImportRecap(null);
    setScrapeStatus(null);
    setUrl('');
    setImportMapping((prev) => ({
      ...prev,
      stockQuantity: 10,
      customPrice: null,
    }));
  };

  useEffect(() => {
    if (categories.length === 0) return;
    setImportMapping((prev) => (prev.categoryId ? prev : { ...prev, categoryId: categories[0].id }));
  }, [categories]);

  const handleScrape = async () => {
    if (!url.trim()) {
      addToast({ type: 'error', message: 'Veuillez coller une URL produit.' });
      return;
    }

    try {
      setLoadingScrape(true);
      setProduct(null);

      const payload: ScrapeProductRequest = { source, url: url.trim() };
      const response = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message ?? 'Scraping impossible pour cette URL.');
      }

      const data = (await response.json()) as { product: ScrapedProduct; enriched?: EnrichedProductData };
      setProduct(data.product);
      setEnrichedData(data.enriched || null);
      setUseAI(!!data.enriched);

      // Try to match suggested category if available
      if (data.enriched?.suggestedCategory) {
        const foundCategory = categories.find(c => 
          c.name.toLowerCase().includes(data.enriched!.suggestedCategory!.toLowerCase()) ||
          data.enriched!.suggestedCategory!.toLowerCase().includes(c.name.toLowerCase())
        );
        if (foundCategory) {
          setImportMapping(prev => ({ ...prev, categoryId: foundCategory.id }));
        }
      }

      setScrapeStatus(`Scraping terminé ✅ (${new Date().toLocaleTimeString('fr-FR')})`);
      addToast({ type: 'success', message: 'Produit scrapé avec succès.' });
    } catch (error) {
      console.error('[ProductImporter] scrape failed:', error);
      setScrapeStatus(null);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erreur lors du scraping.',
      });
    } finally {
      setLoadingScrape(false);
    }
  };

  const handleLoadUrlList = () => {
    const parsed = urlListInput
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (parsed.length === 0) {
      addToast({ type: 'error', message: 'Ajoutez au moins une URL valide.' });
      return;
    }

    setUrlQueue(parsed);
    setCurrentUrlIndex(0);
    setUrl(parsed[0]);
    addToast({ type: 'success', message: `${parsed.length} URL(s) chargée(s).` });
  };

  const handleSelectQueueUrl = (index: number) => {
    const nextUrl = urlQueue[index];
    if (!nextUrl) return;
    setCurrentUrlIndex(index);
    setUrl(nextUrl);
    setProduct(null);
    setScrapeStatus(null);
  };

  const handleImport = async () => {
    if (!product) return;
    if (!importMapping.categoryId) {
      addToast({ type: 'error', message: 'Renseignez une catégorie avant import.' });
      return;
    }

    try {
      setLoadingImport(true);
      const response = await fetch('/api/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          product: (useAI && enrichedData) ? {
            ...product,
            title: enrichedData.title,
            description: enrichedData.description,
            metadata: {
              ...product.metadata,
              raw_metadata: {
                ...product.metadata,
                enriched: enrichedData
              }
            }
          } : product,
          mapping: importMapping,
        }),
      });

      const body = await response.json().catch(() => null);
      if (response.ok && body?.persisted && body?.product) {
        addToast({ type: 'success', message: 'Produit importé depuis le backend.' });
        const selectedCategory = categories.find((category) => category.id === importMapping.categoryId);
        setLastImportRecap({
          name: product.title,
          price: importMapping.customPrice ?? product.price.min ?? 0,
          categoryName: selectedCategory?.name ?? 'Catégorie inconnue',
          sourceUrl: product.sourceUrl,
          imageUrl: product.images[0] ?? null,
          mode: 'backend',
        });
        onImported();
        setProduct(null);
        return;
      }

      const fallbackPayload = body?.normalized ?? {
          category_id: importMapping.categoryId,
          slug: `${product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          name: (useAI && enrichedData) ? enrichedData.title : product.title,
          description: (useAI && enrichedData) ? enrichedData.description : product.description,
          price: importMapping.customPrice ?? product.price.min ?? 0,
          image_url: product.images[0] ?? null,
          stock_quantity: importMapping.stockQuantity,
          is_available: true,
          is_featured: importMapping.featured ?? false,
          is_active: importMapping.active ?? true,
          attributes: {
            source: product.source,
            source_url: product.sourceUrl,
            source_external_id: product.externalId,
            currency: product.currency,
            images: product.images,
            variant_options: product.variants.options,
            variant_items: product.variants.items,
            raw_metadata: product.metadata,
          },
      };

      const { error } = await supabase.from('products').insert({
        ...fallbackPayload,
        is_bundle: false,
        is_subscribable: false,
        sku: null,
        original_value: null,
        weight_grams: null,
      });
      if (error) throw error;

      addToast({
        type: 'success',
        message: 'Produit importé via Supabase (mode client).',
      });
      const selectedCategory = categories.find((category) => category.id === importMapping.categoryId);
      setLastImportRecap({
        name: fallbackPayload.name,
        price: fallbackPayload.price,
        categoryName: selectedCategory?.name ?? 'Catégorie inconnue',
        sourceUrl: product.sourceUrl,
        imageUrl: fallbackPayload.image_url ?? null,
        mode: 'fallback',
      });
      onImported();
      setProduct(null);
    } catch (error) {
      console.error('[ProductImporter] import failed:', error);
      addToast({ type: 'error', message: 'Impossible d\'importer ce produit.' });
    } finally {
      setLoadingImport(false);
    }
  };

  return (
    <>
      <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="group relative rounded-2xl border border-white/10 bg-zinc-900/40 p-5 flex items-center justify-between gap-4 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Importeur AliExpress v2.0
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500 text-black font-black uppercase">Alpha IA</span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">Scraping avancé + Enrichissement IA (Grounding Internet)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="relative px-5 py-2.5 bg-white text-black hover:bg-emerald-400 hover:text-black transition-all duration-300 rounded-xl text-sm font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(52,211,153,0.3)]"
        >
          Lancer l'Importeur
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>

      {isClient && createPortal(
        <AnimatePresence mode="wait">
          {isModalOpen && (
            <motion.div 
              key="importer-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-2xl p-4 md:p-8 overflow-y-auto scrollbar-none"
            >
              <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="max-w-7xl mx-auto glassmorphism-dark rounded-[2.5rem] overflow-hidden border border-white/10 relative"
              >
                {/* Background Glows */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full" />

                <div className="p-6 md:p-10 space-y-8 relative">
                  {/* Header Section */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-8">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black">
                            <Download className="w-4 h-4" />
                          </div>
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-emerald-400">
                            <WandSparkles className="w-4 h-4" />
                          </div>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                          ALIEXPRESS <span className="text-emerald-500">SMART</span> IMPORTER
                        </h3>
                      </div>
                      <p className="text-zinc-400 text-sm font-medium ml-1">Automated Scraping & AI Content Generation</p>
                    </div>
                    <motion.button
                      whileHover={{ rotate: 90 }}
                      whileTap={{ scale: 0.8 }}
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="p-3 rounded-2xl bg-white/5 text-zinc-400 hover:text-white hover:bg-neutral-800/50 hover:border-white/10 border border-transparent transition-all"
                    >
                      <X className="w-6 h-6" />
                    </motion.button>
                  </div>

                  <div className="grid lg:grid-cols-12 gap-10">
                    {/* Left Column: Config & Queue */}
                    <div className="lg:col-span-4 space-y-8 border-r border-white/5 pr-0 lg:pr-10">
                      <section className="space-y-5">
                        <div className="flex items-center gap-2 text-white/50 mb-4">
                          <Globe className="w-4 h-4" />
                          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500">Scraping Engine</span>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-bold text-zinc-500 mb-2 block ml-1 uppercase tracking-tight">Source de données</label>
                            <div className="relative group">
                              <select
                                value={source}
                                onChange={(event) => setSource(event.target.value as ProductSource)}
                                className={`${inputClassName} appearance-none pr-10`}
                              >
                                {SOURCES.map((item) => (
                                  <option key={item.value} value={item.value} className="bg-zinc-900">{item.label}</option>
                                ))}
                              </select>
                              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 rotate-90 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-zinc-500 mb-2 block ml-1 uppercase tracking-tight">URL Produit Unique</label>
                            <div className="flex gap-2">
                              <input
                                value={url}
                                onChange={(event) => setUrl(event.target.value)}
                                placeholder="https://aliexpress.com/..."
                                className={inputClassName}
                              />
                              <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(52,211,153,0.3)' }}
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={handleScrape}
                                disabled={loadingScrape}
                                className="bg-emerald-500 text-black p-3.5 rounded-xl disabled:opacity-50 transition-all shadow-xl shadow-emerald-500/20"
                              >
                                {loadingScrape ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-white/50">
                            <List className="w-4 h-4" />
                            <span className="text-[10px] uppercase font-black tracking-widest">File d'attente</span>
                          </div>
                          {urlQueue.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase">
                              {currentUrlIndex + 1} / {urlQueue.length}
                            </span>
                          )}
                        </div>
                        
                        <textarea
                          value={urlListInput}
                          onChange={(event) => setUrlListInput(event.target.value)}
                          placeholder={'Collez plusieurs URLs ici...'}
                          rows={3}
                          className={`${inputClassName} resize-none text-[12px] bg-zinc-900/40`}
                        />
                        
                        <button
                          type="button"
                          onClick={handleLoadUrlList}
                          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[12px] font-bold border border-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          <List className="w-4 h-4" />
                          Charger la file d'attente
                        </button>

                        {urlQueue.length > 0 && (
                          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 scrollbar-none">
                            {urlQueue.map((item, index) => (
                              <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={`${item}-${index}`}
                                type="button"
                                onClick={() => handleSelectQueueUrl(index)}
                                className={`group w-full text-left p-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                                  index === currentUrlIndex
                                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_4px_12px_rgba(52,211,153,0.1)]'
                                    : 'border-white/5 bg-white/2 hover:border-white/20 hover:bg-white/5'
                                }`}
                              >
                                <div className="relative z-10 flex items-center gap-3">
                                  <span className={`text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-lg ${
                                    index === currentUrlIndex ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <span className="truncate text-[11px] text-zinc-400 group-hover:text-white transition-colors">{item}</span>
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>

                    {/* Right Column: Preview & Import */}
                    <div className="lg:col-span-8 space-y-8 min-h-[600px]">
                      {!product && !loadingScrape && !lastImportRecap && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                          <div className="p-8 rounded-[3rem] bg-white/5 border border-white/5">
                            <Globe className="w-20 h-20 text-zinc-500" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-white tracking-tight">Prêt à scraper</h4>
                            <p className="max-w-xs mx-auto text-sm text-zinc-500 mt-2">
                              Saisissez une URL pour commencer l'extraction des données et l'optimisation IA.
                            </p>
                          </div>
                        </div>
                      )}

                      {loadingScrape && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                          <div className="relative">
                            <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                            <WandSparkles className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-pulse" />
                          </div>
                          <div className="space-y-3">
                            <h4 className="text-2xl font-black text-white glow-green">Scraping en cours...</h4>
                            <p className="text-zinc-500 animate-pulse font-medium">L'IA prépare la description premium et analyse le produit</p>
                            <div className="flex justify-center gap-1.5 pt-4">
                              {[0, 1, 2].map(i => (
                                <motion.div 
                                  key={i}
                                  animate={{ opacity: [0.2, 1, 0.2] }}
                                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-500" 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <AnimatePresence mode="wait">
                        {product && !loadingScrape && (
                          <motion.div 
                            key="preview-content"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                          >
                            {scrapeStatus && (
                              <motion.div 
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3 text-emerald-400">
                                  <CheckCircle2 className="w-5 h-5" />
                                  <span className="text-sm font-bold tracking-tight">{scrapeStatus}</span>
                                </div>
                                <div className="flex -space-x-1.5">
                                  {product.images.slice(0, 3).map((img, i) => (
                                    <img key={i} src={buildProxyImageUrl(img)} className="w-7 h-7 rounded-full border-2 border-zinc-900 object-cover" alt="" />
                                  ))}
                                  <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[8px] font-black">+{product.images.length-3}</div>
                                </div>
                              </motion.div>
                            )}

                            <div className="grid md:grid-cols-2 gap-8 h-full">
                              {/* Original Content */}
                              <div className={`space-y-5 flex flex-col transition-all duration-500 ${useAI ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}>
                                <div className="flex items-center gap-2 text-zinc-500">
                                  <Globe className="w-4 h-4" />
                                  <span className="text-[10px] uppercase font-black tracking-widest">Contenu Original (Source)</span>
                                </div>
                                
                                <div className="bg-zinc-900/50 rounded-3xl p-6 border border-white/5 space-y-4 flex-1">
                                  <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-white line-clamp-2 leading-relaxed opacity-80">{product.title}</h4>
                                    <div className="h-px bg-white/5" />
                                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 group">
                                      <motion.img 
                                        initial={{ scale: 1.2, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        src={buildProxyImageUrl(product.images[0])} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                                        alt="" 
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                      
                                      {/* Scanning Effect */}
                                      <motion.div 
                                        animate={{ top: ['0%', '100%', '0%'] }}
                                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                        className="absolute left-0 right-0 h-[2px] bg-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10"
                                      />

                                      <div className="absolute inset-x-0 bottom-0 p-3 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Image Principale</p>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-black font-black uppercase">Source OK</span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                      {product.images.slice(1, 5).map((img, i) => (
                                        <motion.div 
                                          key={i}
                                          whileHover={{ scale: 1.1, zIndex: 10 }}
                                          className="aspect-square rounded-lg overflow-hidden border border-white/5"
                                        >
                                          <img src={buildProxyImageUrl(img)} className="w-full h-full object-cover" alt="" />
                                        </motion.div>
                                      ))}
                                    </div>

                                    <div className="space-y-2">
                                      <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Description brute</p>
                                      <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed italic">
                                        {product.description || 'Information non disponible...'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                                      <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest mb-1">Prix Extrait</p>
                                      <p className="text-lg font-black text-white">{product.price.min} <span className="text-[10px] text-zinc-400">{product.currency}</span></p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                                      <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest mb-1">Variantes</p>
                                      <p className="text-lg font-black text-white">{product.variants.items.length}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* AI Content */}
                              <div className="space-y-5 flex flex-col">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-emerald-500">
                                    <Sparkles className="w-4 h-4 fill-current" />
                                    <span className="text-[10px] uppercase font-black tracking-widest">Optimisation Intelligence Artificielle</span>
                                  </div>
                                  {enrichedData && (
                                    <motion.button
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => setUseAI(!useAI)}
                                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                        useAI ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-zinc-500 border border-white/10'
                                      }`}
                                    >
                                      {useAI ? 'Désactiver' : 'Activer'}
                                    </motion.button>
                                  )}
                                </div>

                                <div className={`relative flex-1 rounded-[2.5rem] p-8 border transition-all duration-700 overflow-hidden ${
                                  useAI 
                                    ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_20px_80px_rgba(52,211,153,0.15)] glow-box-green' 
                                    : 'bg-zinc-900/20 border-white/5 opacity-50 scale-95'
                                }`}>
                                  {useAI && (
                                    <>
                                      <motion.div 
                                        animate={{ 
                                          opacity: [0.1, 0.3, 0.1],
                                          scale: [1, 1.1, 1]
                                        }}
                                        transition={{ repeat: Infinity, duration: 3 }}
                                        className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-500/5 pointer-events-none" 
                                      />
                                      <div className="absolute top-0 right-0 p-6">
                                        <motion.div 
                                          animate={{ rotate: 360 }}
                                          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                                          className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center backdrop-blur-xl"
                                        >
                                          <WandSparkles className="w-5 h-5 text-emerald-400 fill-current" />
                                        </motion.div>
                                      </div>
                                    </>
                                  )}

                                  <AnimatePresence mode="wait">
                                    {!enrichedData ? (
                                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                        <Loader2 className="w-10 h-10 text-emerald-500/20 animate-spin" />
                                        <p className="text-xs text-zinc-500 font-medium">Génération des suggestions IA...</p>
                                      </div>
                                    ) : (
                                      <motion.div 
                                        initial={{ opacity: 0, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                                        className="space-y-6"
                                      >
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-1 rounded-full bg-emerald-500" />
                                            <p className="text-[10px] uppercase font-black text-emerald-500 tracking-widest">Titre Suggerée</p>
                                          </div>
                                          <h4 className="text-lg font-black text-white leading-tight tracking-tight">{enrichedData.title}</h4>
                                        </div>

                                        <div className="h-px bg-emerald-500/10" />

                                        <div className="space-y-4">
                                          <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-emerald-400" />
                                            <p className="text-[10px] uppercase font-black text-zinc-400 tracking-widest">Description Premium</p>
                                          </div>
                                          <p className="text-sm text-zinc-300 leading-relaxed font-medium line-clamp-6">
                                            {enrichedData.shortDescription}
                                          </p>
                                        </div>

                                        <div className="space-y-3">
                                          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Bénéfices clés</p>
                                          <div className="flex flex-wrap gap-2">
                                            {enrichedData.features.map((f, i) => (
                                              <span key={i} className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                                ✨ {f}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Optimisation SEO</p>
                                          <div className="flex flex-wrap gap-1.5">
                                            {enrichedData.suggestedTags.map((tag, i) => (
                                              <span key={i} className="px-2 py-1 rounded bg-zinc-800 text-[9px] text-zinc-400 border border-white/5">#{tag}</span>
                                            ))}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>

                            {/* Action Footer */}
                            <motion.div 
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="pt-6 border-t border-white/5 grid md:grid-cols-4 gap-6 items-end bg-black/20 p-8 rounded-[2rem] border border-white/10"
                            >
                              <div className="md:col-span-1">
                                <label className="text-xs font-black text-zinc-500 mb-3 block uppercase tracking-widest ml-1">Destination</label>
                                <div className="relative">
                                  <select
                                    value={importMapping.categoryId}
                                    onChange={(event) => setImportMapping((prev) => ({ ...prev, categoryId: event.target.value }))}
                                    className={`${inputClassName} bg-black/60`}
                                  >
                                    <option value="">Sélectionner</option>
                                    {categories.map((category) => (
                                      <option key={category.id} value={category.id} className="bg-zinc-900">{category.name}</option>
                                    ))}
                                  </select>
                                  {enrichedData?.suggestedCategory && (
                                    <p className="absolute -bottom-5 left-1 text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5" /> Recom: {enrichedData.suggestedCategory}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-xs font-black text-zinc-500 mb-3 block uppercase tracking-widest ml-1">Stock Initial</label>
                                <input
                                  type="number"
                                  value={importMapping.stockQuantity}
                                  onChange={(e) => setImportMapping(p => ({ ...p, stockQuantity: Number(e.target.value) }))}
                                  className={`${inputClassName} bg-black/60`}
                                />
                              </div>

                              <div>
                                <label className="text-xs font-black text-zinc-500 mb-3 block uppercase tracking-widest ml-1">Prix Final</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={importMapping.customPrice ?? ''}
                                    placeholder={String(product.price.min)}
                                    onChange={(e) => setImportMapping(p => ({ ...p, customPrice: e.target.value === '' ? null : Number(e.target.value) }))}
                                    className={`${inputClassName} bg-black/60 pr-12`}
                                  />
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-600">{product.currency}</span>
                                </div>
                              </div>

                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleImport}
                                disabled={loadingImport}
                                className="w-full h-[50px] bg-emerald-500 text-black rounded-xl text-sm font-black flex items-center justify-center gap-3 transition-all hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] disabled:opacity-50"
                              >
                                {loadingImport ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <>
                                    <Zap className="w-5 h-5 fill-current" />
                                    IMPORTER DANS LA BOUTIQUE
                                  </>
                                )}
                              </motion.button>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {lastImportRecap && !product && !loadingScrape && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="h-full flex flex-col items-center justify-center text-center space-y-8"
                        >
                          <div className="relative">
                            <CheckCircle2 className="w-32 h-32 text-emerald-500 glow-green" />
                            <motion.div 
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute -inset-4 border border-emerald-500/20 rounded-full" 
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <h3 className="text-3xl font-black text-white">Produit Importé !</h3>
                            <p className="text-zinc-400 max-w-md mx-auto">
                              Le produit <span className="text-emerald-400 font-bold">"{lastImportRecap.name}"</span> est maintenant disponible dans votre catalogue.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8">
                            <button
                              type="button"
                              onClick={resetForNewProduct}
                              className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all flex flex-col items-center gap-2"
                            >
                              <Download className="w-5 h-5" />
                              <span className="text-xs uppercase tracking-widest">Nouvel Import</span>
                            </button>
                            {urlQueue[currentUrlIndex + 1] && (
                              <button
                                type="button"
                                onClick={() => handleSelectQueueUrl(currentUrlIndex + 1)}
                                className="p-4 rounded-2xl bg-emerald-500 border border-emerald-400 text-black font-bold hover:bg-emerald-400 transition-all flex flex-col items-center gap-2 shadow-xl shadow-emerald-500/20"
                              >
                                <ChevronRight className="w-5 h-5" />
                                <span className="text-xs uppercase tracking-widest">Suivant ({urlQueue.length - currentUrlIndex - 1})</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
