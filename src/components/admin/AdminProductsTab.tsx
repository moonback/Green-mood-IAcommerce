import { useState, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ShoppingBag,
    Plus,
    Search,
    List,
    LayoutGrid,
    Brain,
    Edit3,
    ArrowUpDown,
    Trash2,
    X,
    Hash,
    Star,
    Eye,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Zap,
    Settings,
    ChevronDown,
    Upload,
    FileDown,
    FileText,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product, Category } from '../../lib/types';
import { buildCategoryTree, flattenTree, getCategoryAncestors } from '../../lib/categoryTree';
import CSVImporter from './CSVImporter';
import MassModifyModal from './MassModifyModal';
import AdminProductPreviewModal from './AdminProductPreviewModal';
import { generateEmbedding } from '../../lib/embeddings';
import { generateProductInfo } from '../../lib/productAI';
import { slugify } from '../../lib/utils';
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore';
import { useToastStore } from '../../store/toastStore';
import ProductImageUpload from './ProductImageUpload';

interface AdminProductsTabProps {
    products: Product[];
    categories: Category[];
    onRefresh: () => void;
}

const EMPTY_PRODUCT = {
    category_id: '',
    slug: '',
    name: '',
    sku: null as string | null,
    description: null as string | null,
    weight_grams: null as number | null,
    price: 0,
    original_value: null as number | null,
    image_url: null as string | null,
    stock_quantity: 0,
    is_available: true,
    is_featured: false,
    is_active: true,
    is_bundle: false,
    is_subscribable: false,
    attributes: {
        culture_method: 'Indoor' as string,
        effects: [] as string[],
        technical_specs: [] as any[],
        seo_title: '' as string,
        seo_meta_description: '' as string,
        note: '' as string,
        productSpecs: [] as any[],
        techFeatures: [] as string[],
        cbd_percentage: 0 as number,
        thc_max: 0.2 as number,
    },
};

const INPUT =
    'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-neon transition-colors';
const LABEL = 'block text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wider';

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1555617766-c94804975da3?q=80&w=2070&auto=format&fit=crop";

export default function AdminProductsTab({ products, categories, onRefresh }: AdminProductsTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [isSaving, setIsSaving] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [aiFilter, setAiFilter] = useState<'all' | 'complete' | 'incomplete' | 'no_vector'>('all');
    const [extraFilter, setExtraFilter] = useState<'all' | 'featured' | 'subscribable' | 'bundle'>('all');

    const { isSyncingAI, aiSyncProgress, startMassAIFill, isSyncingVectors, startVectorSync, isAutoCategorizing, startMassAutoCategorize } = useBackgroundTaskStore();
    const addToast = useToastStore(s => s.addToast);

    const ITEMS_PER_PAGE = 20;
    const [currentPage, setCurrentPage] = useState(1);

    // Category tree for the hierarchical category selector
    const categoryTree = useMemo(() => buildCategoryTree(categories, true), [categories]);

    // ── Product modal ──
    const [showProductModal, setShowProductModal] = useState(false);
    const [productForm, setProductForm] = useState<any>(EMPTY_PRODUCT);

    // Full ancestor path for the currently selected category (breadcrumb display)
    const selectedCategoryPath = useMemo(() => {
        if (!productForm.category_id) return null;
        return getCategoryAncestors(productForm.category_id, categories);
    }, [productForm.category_id, categories]);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [bundleItemsEditor, setBundleItemsEditor] = useState<{ product_id: string; quantity: number }[]>([]);

    // ── Mass Modification ──
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [showMassModifyModal, setShowMassModifyModal] = useState(false);

    // ── Preview ──
    const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

    // ── Stock adjustment ──
    const [stockAdjust, setStockAdjust] = useState<{ id: string; qty: string; note: string } | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState<string | null>(null); // Product ID or 'modal'

    const openProductModal = (product?: Product) => {
        if (product) {
            setEditingProductId(product.id);
            setProductForm({
                category_id: product.category_id,
                slug: product.slug,
                name: product.name,
                sku: product.sku ?? null,
                description: product.description,
                weight_grams: product.weight_grams,
                price: product.price,
                original_value: product.original_value ?? null,
                image_url: product.image_url,
                stock_quantity: product.stock_quantity,
                is_available: product.is_available,
                is_featured: product.is_featured,
                is_active: product.is_active,
                is_bundle: product.is_bundle ?? false,
                is_subscribable: product.is_subscribable ?? false,
                attributes: {
                    culture_method: 'Indoor',
                    effects: [],
                    technical_specs: [],
                    productSpecs: [],
                    techFeatures: [],
                    seo_title: '',
                    seo_meta_description: '',
                    note: '',
                    cbd_percentage: 0,
                    thc_max: 0.2,
                    ...product.attributes,
                },
            });
            if (product.is_bundle) {
                supabase
                    .from('bundle_items')
                    .select('product_id, quantity')
                    .eq('bundle_id', product.id)
                    .then(({ data }) => {
                        setBundleItemsEditor((data ?? []) as { product_id: string; quantity: number }[]);
                    });
            } else {
                setBundleItemsEditor([]);
            }
        } else {
            setProductForm({ ...EMPTY_PRODUCT, category_id: categories[0]?.id ?? '', cbd_percentage: 0, thc_max: 0.2 });
            setBundleItemsEditor([]);
        }
        setShowProductModal(true);
    };

    const handleSaveProduct = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const payload = { ...productForm, slug: productForm.slug || slugify(productForm.name) };
        let savedId = editingProductId;
        if (editingProductId) {
            const { error } = await supabase.from('products').update(payload).eq('id', editingProductId);
            if (error) {
                addToast({ type: 'error', message: `Erreur lors de la mise à jour: ${error.message}` });
                setIsSaving(false);
                return;
            }
            addToast({ type: 'success', message: 'Produit mis à jour avec succès' });
        } else {
            const { data: newProd, error } = await supabase.from('products').insert(payload).select('id').single();
            if (error) {
                addToast({ type: 'error', message: `Erreur lors de la création: ${error.message}` });
                setIsSaving(false);
                return;
            }
            if (newProd) savedId = newProd.id;
            addToast({ type: 'success', message: 'Nouveau produit créé avec succès' });
        }
        if (productForm.is_bundle && savedId) {
            await supabase.from('bundle_items').delete().eq('bundle_id', savedId);
            if (bundleItemsEditor.length > 0) {
                await supabase.from('bundle_items').insert(
                    bundleItemsEditor.filter((i) => i.product_id).map((i) => ({ bundle_id: savedId, ...i }))
                );
            }
            await supabase.rpc('sync_bundle_stock', { p_bundle_id: savedId });
        }
        setShowProductModal(false);
        onRefresh();
        setIsSaving(false);

        // ── Auto-generate embedding after save (non-blocking) ──────────────────
        // This ensures every product always has an up-to-date search vector
        // without requiring a manual sync step.
        if (savedId) {
            const textToEmbed = [
                payload.name,
                payload.description ?? '',
                payload.cbd_percentage ? `CBD: ${payload.cbd_percentage}%` : '',
                ...(Array.isArray(payload.attributes?.effects) ? payload.attributes.effects : []),
            ].filter(Boolean).join(' ').trim();

            if (textToEmbed) {
                generateEmbedding(textToEmbed)
                    .then((embedding) => {
                        if (embedding.length > 0) {
                            return supabase.from('products').update({ embedding }).eq('id', savedId!);
                        }
                    })
                    .then(() => onRefresh())
                    .catch((err) => {
                        console.warn('[Auto-embed] Échec de la génération vectorielle (non bloquant):', err);
                    });
            }
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Désactiver ce produit ? Il ne sera plus visible dans le catalogue.')) return;
        await supabase.from('products').update({ is_active: false }).eq('id', id);
        onRefresh();
    };

    const handleMassDelete = async () => {
        if (selectedProductIds.length === 0) return;
        if (!confirm(`ATTENTION: Voulez-vous supprimer DÉFINITIVEMENT les ${selectedProductIds.length} produit(s) sélectionné(s) de la base de données ?\n\nCette action est irréversible.`)) return;

        setIsSaving(true);
        try {
            const { error } = await supabase.from('products').delete().in('id', selectedProductIds);
            if (error) throw error;
            addToast({ message: `${selectedProductIds.length} produit(s) supprimé(s) avec succès.`, type: 'success' });
            setSelectedProductIds([]);
            onRefresh();
        } catch (error) {
            console.error('[AdminProducts] Erreur lors de la suppression massive:', error);
            addToast({ message: "Erreur lors de la suppression des produits.", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleStockAdjust = async () => {
        if (!stockAdjust) return;
        const qty = parseInt(stockAdjust.qty);
        if (isNaN(qty) || qty === 0) return;
        setIsSaving(true);
        const product = products.find((p) => p.id === stockAdjust.id);
        if (!product) { setIsSaving(false); return; }
        const newStock = Math.max(0, product.stock_quantity + qty);
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', stockAdjust.id);
        await supabase.from('stock_movements').insert({
            product_id: stockAdjust.id,
            quantity_change: qty,
            type: qty > 0 ? 'restock' : 'adjustment',
            note: stockAdjust.note || 'Ajustement manuel',
        });
        onRefresh();
        setStockAdjust(null);
        setIsSaving(false);
    };

    const handleAIFillInModal = async () => {
        if (!productForm.name) return;
        setIsGeneratingAI('modal');
        try {
            const cat = categories.find(c => c.id === productForm.category_id);
            const data = await generateProductInfo(productForm.name, cat?.name);
            if (data) {
                setProductForm(prev => ({
                    ...prev,
                    description: prev.description || data.description || null,
                    attributes: {
                        ...prev.attributes,
                        seo_title: prev.attributes?.seo_title || data.seo?.title || '',
                        seo_meta_description: prev.attributes?.seo_meta_description || data.seo?.meta_description || '',
                        culture_method: prev.attributes?.culture_method || (data.attributes as any)?.techFeatures?.[0] || 'Indoor',
                        effects: (prev.attributes?.effects?.length ?? 0) > 0 ? prev.attributes.effects : (data.attributes as any)?.techFeatures || [],
                        technical_specs: (prev.attributes?.technical_specs?.length ?? 0) > 0 ? prev.attributes.technical_specs : (data.attributes as any)?.productSpecs?.map((ps: any) => ({
                            group: ps.category,
                            items: [{ label: ps.name, value: ps.description }]
                        })) || [],
                        productSpecs: (prev.attributes?.productSpecs?.length ?? 0) > 0 ? prev.attributes.productSpecs : data.attributes?.productSpecs || [],
                        techFeatures: (prev.attributes?.techFeatures?.length ?? 0) > 0 ? prev.attributes.techFeatures : data.attributes?.techFeatures || [],
                        note: prev.attributes?.note || data.headline || '',
                        cbd_percentage: prev.attributes?.cbd_percentage || data.attributes?.cbd_percentage || 0,
                        thc_max: prev.attributes?.thc_max || data.attributes?.thc_max || 0.2,
                    },
                }));
            }
        } finally {
            setIsGeneratingAI(null);
        }
    };

    const handleSingleAIFillSync = async (product: Product) => {
        setIsGeneratingAI(product.id);
        try {
            const data = await generateProductInfo(product.name, (product.category as any)?.name);
            if (!data) return;

            const updates: any = {};
            if (!product.description && data.description) updates.description = data.description;

            const currentAttrs = product.attributes || {};
            const hasCulture = !!currentAttrs.culture_method;
            const hasEffects = currentAttrs.effects && currentAttrs.effects.length > 0;
            const hasSeoTitle = typeof currentAttrs.seo_title === 'string' && currentAttrs.seo_title.trim().length > 0;
            const hasSeoMeta = typeof currentAttrs.seo_meta_description === 'string' && currentAttrs.seo_meta_description.trim().length > 0;

            if (!hasCulture || !hasEffects || !hasSeoTitle || !hasSeoMeta) {
                updates.attributes = {
                    ...currentAttrs,
                    seo_title: hasSeoTitle ? currentAttrs.seo_title : data.seo?.title || '',
                    seo_meta_description: hasSeoMeta ? currentAttrs.seo_meta_description : data.seo?.meta_description || '',
                    culture_method: hasCulture ? currentAttrs.culture_method : (data.attributes as any)?.techFeatures?.[0] || 'Indoor',
                    effects: hasEffects ? currentAttrs.effects : (data.attributes as any)?.techFeatures || [],
                    technical_specs: currentAttrs.technical_specs || (data.attributes as any)?.productSpecs?.map((ps: any) => ({
                        group: ps.category,
                        items: [{ label: ps.name, value: ps.description }]
                    })) || [],
                    productSpecs: currentAttrs.productSpecs || data.attributes?.productSpecs || [],
                    techFeatures: currentAttrs.techFeatures || data.attributes?.techFeatures || [],
                };
            }

            if (!product.cbd_percentage && data.attributes?.cbd_percentage) updates.cbd_percentage = data.attributes.cbd_percentage;
            if (!product.thc_max && data.attributes?.thc_max) updates.thc_max = data.attributes.thc_max;
            if (data.attributes?.techFeatures) {
                updates.attributes = { ...updates.attributes, techFeatures: data.attributes.techFeatures };
            }

            if (Object.keys(updates).length > 0) {
                await supabase.from('products').update(updates).eq('id', product.id);
                onRefresh();
            }
        } finally {
            setIsGeneratingAI(null);
        }
    };

    const hasEmbedding = (embedding: Product['embedding']) => {
        if (Array.isArray(embedding)) return embedding.length > 0;
        if (typeof embedding === 'string') return embedding.trim().length > 0 && embedding.trim() !== '[]';
        return false;
    };

    const isAIComplete = (product: Product) => {
        return !!product.description &&
            !!product.attributes?.culture_method &&
            (product.attributes?.effects?.length ?? 0) > 0 &&
            hasEmbedding(product.embedding);
    };

    const productsWithoutVectors = products.filter((product) => !hasEmbedding(product.embedding));

    const handleSyncMissingVectors = () => {
        if (productsWithoutVectors.length === 0 || isSyncingVectors) return;
        startVectorSync(productsWithoutVectors, onRefresh);
        addToast({ message: "Sync vecteurs lancée en arrière-plan", type: "info" });
    };

    const productsNeedingEnrichment = products.filter(p =>
        !p.description ||
        !p.attributes?.culture_method ||
        !(typeof p.attributes?.seo_title === 'string' && p.attributes.seo_title.trim().length > 0) ||
        !(typeof p.attributes?.seo_meta_description === 'string' && p.attributes.seo_meta_description.trim().length > 0) ||
        (p.attributes?.effects?.length ?? 0) === 0
    );

    const handleMassAIFill = async () => {
        if (productsNeedingEnrichment.length === 0 || isSyncingAI) return;
        if (!confirm(`Voulez-vous enrichir ${productsNeedingEnrichment.length} produit(s) via l'IA ? Cette opération continuera en arrière-plan.`)) return;

        startMassAIFill(productsNeedingEnrichment, false, onRefresh);
        addToast({ message: "Enrichissement IA lancé en arrière-plan", type: "info" });
    };

    const handleForceMassAIFill = async () => {
        if (filteredProducts.length === 0 || isSyncingAI) return;
        if (!confirm(`ATTENTION: Voulez-vous FORCER la génération IA sur les ${filteredProducts.length} produits affichés ?\n\nCette opération continuera en arrière-plan.`)) return;

        startMassAIFill(filteredProducts, true, onRefresh);
        addToast({ message: "Régénération forcée lancée en arrière-plan", type: "info" });
    };

    const filteredProducts = products.filter(
        (p) => {
            const matchesSearch = !searchQuery ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategoryFilter === 'all' || p.category_id === selectedCategoryFilter;

            const matchesStock = stockFilter === 'all' ||
                (stockFilter === 'out' && p.stock_quantity === 0) ||
                (stockFilter === 'low' && p.stock_quantity > 0 && p.stock_quantity <= 5) ||
                (stockFilter === 'in_stock' && p.stock_quantity > 5);

            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && p.is_active) ||
                (statusFilter === 'inactive' && !p.is_active);

            const matchesAI = aiFilter === 'all' ||
                (aiFilter === 'complete' && isAIComplete(p)) ||
                (aiFilter === 'incomplete' && !isAIComplete(p)) ||
                (aiFilter === 'no_vector' && !hasEmbedding(p.embedding));

            const matchesExtra = extraFilter === 'all' ||
                (extraFilter === 'featured' && p.is_featured) ||
                (extraFilter === 'subscribable' && p.is_subscribable) ||
                (extraFilter === 'bundle' && p.is_bundle);

            return matchesSearch && matchesCategory && matchesStock && matchesStatus && matchesAI && matchesExtra;
        }
    );

    const handleMassAutoCategorize = async (all: boolean = false) => {
        let productsToCategorize = all
            ? products
            : products.filter(p => selectedProductIds.includes(p.id));

        if (productsToCategorize.length === 0 || isAutoCategorizing) return;

        const desc = all ? `TOUT le catalogue (${products.length} articles)` : `votre sélection (${productsToCategorize.length} articles)`;
        if (!confirm(`Voulez-vous assigner automatiquement des catégories à ${desc} via l'IA ?\nCette opération tourne en arrière-plan.`)) return;

        startMassAutoCategorize(productsToCategorize, categories, onRefresh);
        addToast({ message: "Catégorisation IA lancée en arrière-plan", type: "info" });
    };

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const toggleSelection = (id: string) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(filteredProducts.map(p => p.id));
        }
    };

    const allSelected = filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length;

    return (
        <div className="space-y-5">
            {/* Header: Search, Count & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 0 24px rgba(16,185,129,0.15)' }}>
                            <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Inventaire des Produits</h2>
                            <p className="text-xs text-white/30">Gérez votre catalogue et vos niveaux de stock</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-15">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5"
                            style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}>
                            {filteredProducts.length} Produits
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5"
                            style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.15)' }}
                            title={`${products.length - productsNeedingEnrichment.length} produits entièrement renseignés par l'IA`}>
                            <Sparkles className="w-3 h-3" />
                            {products.length - productsNeedingEnrichment.length} Enrichis
                        </span>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5"
                            style={{ background: 'rgba(168,85,247,0.08)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.15)' }}
                            title={`${products.length - productsWithoutVectors.length} produits prêts pour la recherche sémantique`}>
                            <Brain className="w-3 h-3" />
                            {products.length - productsWithoutVectors.length} Vectorisés
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="flex p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'text-emerald-400' : 'text-white/20 hover:text-white/50'}`}
                            style={viewMode === 'list' ? { background: 'rgba(16,185,129,0.1)', boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.2)' } : {}}
                            title="Vue Liste"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'text-emerald-400' : 'text-white/20 hover:text-white/50'}`}
                            style={viewMode === 'grid' ? { background: 'rgba(16,185,129,0.1)', boxShadow: 'inset 0 0 0 1px rgba(16,185,129,0.2)' } : {}}
                            title="Vue Grille"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    {selectedProductIds.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowMassModifyModal(true)}
                                className="flex items-center gap-2 bg-green-900/40 hover:bg-green-600/60 border border-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                            >
                                <Edit3 className="w-4 h-4" />
                                <span className="hidden sm:inline">Modif. massive ({selectedProductIds.length})</span>
                            </button>
                            <button
                                onClick={handleMassDelete}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-red-900/40 hover:bg-red-600/60 border border-red-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Supprimer ({selectedProductIds.length})</span>
                            </button>
                        </div>
                    )}

                    {/* Actions Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xl active:scale-95"
                        >
                            <Brain className={`w-4 h-4 ${isSyncingAI || isSyncingVectors || isAutoCategorizing ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
                            <span>Actions</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isActionsMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsActionsMenuOpen(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800 mb-1">
                                            Importation
                                        </div>

                                        <CSVImporter
                                            type="products"
                                            onComplete={() => {
                                                onRefresh();
                                                setIsActionsMenuOpen(false);
                                            }}
                                            exampleUrl="/examples/products_example.csv"
                                            variant="menu"
                                        />

                                        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800 my-1">
                                            Intelligence Artificielle
                                        </div>

                                        <button
                                            onClick={() => {
                                                handleMassAIFill();
                                                setIsActionsMenuOpen(false);
                                            }}
                                            disabled={isSyncingAI || productsNeedingEnrichment.length === 0}
                                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Sparkles className={`w-4 h-4 ${isSyncingAI ? 'text-emerald-400 animate-pulse' : ''}`} />
                                                <span>Enrichir SEO & descriptions</span>
                                            </div>
                                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-500 border border-zinc-700">
                                                {productsNeedingEnrichment.length}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                handleForceMassAIFill();
                                                setIsActionsMenuOpen(false);
                                            }}
                                            disabled={isSyncingAI || filteredProducts.length === 0}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-orange-400 hover:bg-orange-500/5 transition-all disabled:opacity-50"
                                        >
                                            <Zap className={`w-4 h-4 ${isSyncingAI ? 'text-orange-400 animate-pulse' : 'text-orange-500'}`} />
                                            <span>Régénérer TOUT</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                handleSyncMissingVectors();
                                                setIsActionsMenuOpen(false);
                                            }}
                                            disabled={isSyncingVectors || productsWithoutVectors.length === 0}
                                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Brain className={`w-4 h-4 ${isSyncingVectors ? 'text-emerald-400 animate-pulse' : ''}`} />
                                                <span>Synchroniser vecteurs</span>
                                            </div>
                                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-500 border border-zinc-700">
                                                {productsWithoutVectors.length}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                handleMassAutoCategorize(false);
                                                setIsActionsMenuOpen(false);
                                            }}
                                            disabled={isAutoCategorizing || selectedProductIds.length === 0 || categories.length === 0}
                                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <List className={`w-4 h-4 ${isAutoCategorizing ? 'text-emerald-400 animate-pulse' : ''}`} />
                                                <span>Catégoriser la sélection</span>
                                            </div>
                                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-500 border border-zinc-700">
                                                {selectedProductIds.length}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                handleMassAutoCategorize(true);
                                                setIsActionsMenuOpen(false);
                                            }}
                                            disabled={isAutoCategorizing || products.length === 0 || categories.length === 0}
                                            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <List className={`w-4 h-4 ${isAutoCategorizing ? 'text-emerald-400 animate-pulse' : 'text-emerald-500'}`} />
                                                <span>Catégoriser tout le catalogue</span>
                                            </div>
                                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-900/40 text-[10px] font-bold text-emerald-500 border border-emerald-500/30">
                                                {products.length}
                                            </span>
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={() => openProductModal()}
                        className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: '#10b981', color: '#000', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Nouveau produit</span>
                        <span className="sm:hidden">Ajouter</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Row 1: Search + Category */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Rechercher par nom, SKU…"
                            className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        />
                    </div>
                    <div className="relative min-w-[180px]">
                        <select
                            value={selectedCategoryFilter}
                            onChange={(e) => {
                                setSelectedCategoryFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all appearance-none cursor-pointer"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <option value="all">Toutes catégories</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                    </div>
                </div>

                {/* Row 2: Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Stock */}
                    <FilterGroup label="Stock">
                        {[
                            { key: 'all' as const, label: 'Tout' },
                            { key: 'in_stock' as const, label: 'En stock' },
                            { key: 'low' as const, label: 'Faible', color: '#f59e0b' },
                            { key: 'out' as const, label: 'Rupture', color: '#ef4444' },
                        ].map(f => (
                            <FilterPill key={f.key} active={stockFilter === f.key} color={f.color}
                                onClick={() => { setStockFilter(f.key); setCurrentPage(1); }}>{f.label}</FilterPill>
                        ))}
                    </FilterGroup>

                    <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

                    {/* Status */}
                    <FilterGroup label="Statut">
                        {[
                            { key: 'all' as const, label: 'Tout' },
                            { key: 'active' as const, label: 'Actif', color: '#10b981' },
                            { key: 'inactive' as const, label: 'Masqué' },
                        ].map(f => (
                            <FilterPill key={f.key} active={statusFilter === f.key} color={f.color}
                                onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}>{f.label}</FilterPill>
                        ))}
                    </FilterGroup>

                    <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

                    {/* AI */}
                    <FilterGroup label="IA">
                        {[
                            { key: 'all' as const, label: 'Tout' },
                            { key: 'complete' as const, label: 'Complète', color: '#10b981' },
                            { key: 'incomplete' as const, label: 'Partielle', color: '#f59e0b' },
                            { key: 'no_vector' as const, label: 'Sans vecteur', color: '#a855f7' },
                        ].map(f => (
                            <FilterPill key={f.key} active={aiFilter === f.key} color={f.color}
                                onClick={() => { setAiFilter(f.key); setCurrentPage(1); }}>{f.label}</FilterPill>
                        ))}
                    </FilterGroup>

                    <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

                    {/* Type */}
                    <FilterGroup label="Type">
                        {[
                            { key: 'all' as const, label: 'Tout' },
                            { key: 'featured' as const, label: '⭐ Vedette', color: '#eab308' },
                            { key: 'subscribable' as const, label: '🔁 Abo', color: '#a855f7' },
                            { key: 'bundle' as const, label: '📦 Pack' },
                        ].map(f => (
                            <FilterPill key={f.key} active={extraFilter === f.key} color={f.color}
                                onClick={() => { setExtraFilter(f.key); setCurrentPage(1); }}>{f.label}</FilterPill>
                        ))}
                    </FilterGroup>

                    {/* Active filters count + reset */}
                    {(stockFilter !== 'all' || statusFilter !== 'all' || aiFilter !== 'all' || extraFilter !== 'all') && (
                        <button
                            onClick={() => { setStockFilter('all'); setStatusFilter('all'); setAiFilter('all'); setExtraFilter('all'); setCurrentPage(1); }}
                            className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-red-500/[0.06]"
                            style={{ color: 'rgba(239,68,68,0.6)', border: '1px solid rgba(239,68,68,0.15)' }}
                        >
                            <X className="w-3 h-3" />
                            Réinitialiser
                        </button>
                    )}
                </div>
            </div>

            {/* Views */}
            {viewMode === 'list' ? (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-[10px] text-white/25 uppercase tracking-[0.15em] font-bold" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <th className="px-5 py-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={toggleAll}
                                            checked={allSelected}
                                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-400 focus:ring-emerald-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-5 py-4">Produit</th>
                                    <th className="px-5 py-4">Catégorie</th>
                                    <th className="px-5 py-4">Prix</th>
                                    <th className="px-5 py-4">Culture</th>
                                    <th className="px-5 py-4">Stock</th>
                                    <th className="px-5 py-4">Statut</th>
                                    <th className="px-5 py-4 text-center" title="Statut IA">IA</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                                {paginatedProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-5 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedProductIds.includes(product.id)}
                                                onChange={() => toggleSelection(product.id)}
                                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-400 focus:ring-emerald-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 ring-1 ring-zinc-700/50 group-hover:ring-emerald-500/50 transition-all">
                                                    <img
                                                        src={product.image_url || PLACEHOLDER_IMAGE}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">{product.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] text-zinc-500 font-mono">{product.sku || 'SANS-SKU'}</p>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${product.attributes?.seo_title && product.attributes?.seo_meta_description ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-zinc-700 text-zinc-500 bg-zinc-800'}`}>
                                                            SEO {product.attributes?.seo_title && product.attributes?.seo_meta_description ? 'OK' : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                                                {(product.category as Category | undefined)?.name ?? 'Divers'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-bold text-white text-sm">
                                            {product.price.toFixed(2)} €
                                        </td>
                                        <td className="px-5 py-4 text-sm font-medium text-zinc-400">
                                            {product.attributes?.culture_method ? (
                                                <span className="text-emerald-400/80 font-bold">{product.attributes.culture_method}</span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span
                                                    className={`font-bold text-sm ${product.stock_quantity === 0
                                                        ? 'text-red-400'
                                                        : product.stock_quantity <= 5
                                                            ? 'text-orange-400'
                                                            : 'text-white'
                                                        }`}
                                                >
                                                    {product.stock_quantity}
                                                </span>
                                                <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${product.stock_quantity === 0 ? 'bg-red-500' : product.stock_quantity <= 5 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                        style={{ width: `${Math.min(100, (product.stock_quantity / 50) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-1.5 flex-wrap">
                                                <span
                                                    className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-lg border ${product.is_active
                                                        ? 'text-green-400 bg-green-900/20 border-green-800/50'
                                                        : 'text-zinc-500 bg-zinc-900 border-zinc-800'
                                                        }`}
                                                >
                                                    {product.is_active ? 'Actif' : 'Masqué'}
                                                </span>
                                                {product.is_subscribable && (
                                                    <span className="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-lg border text-purple-400 bg-purple-900/20 border-purple-800/50 flex items-center gap-1">
                                                        <RefreshCw className="w-2.5 h-2.5" />
                                                        ABO
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-center gap-2">
                                                {isAIComplete(product) ? (
                                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20" title="Fiche technique complète (IA + Vecteur)">
                                                        <Sparkles className="w-4 h-4 text-green-500" />
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 items-center">
                                                        {(product.attributes?.technical_specs?.length ?? 0) > 0 && (
                                                            <span title="Spécifications présentes">
                                                                <Settings className="w-3 h-3 text-zinc-500" />
                                                            </span>
                                                        )}
                                                        {(product.attributes?.effects?.length ?? 0) > 0 && (
                                                            <span title="Effets présents">
                                                                <Zap className="w-3 h-3 text-zinc-500" />
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {product.embedding ? (
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20" title="Optimisé pour la recherche IA">
                                                        <Brain className="w-4 h-4 text-emerald-400" />
                                                    </div>
                                                ) : (
                                                    <Brain className="w-4 h-4 text-zinc-700 opacity-30" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setPreviewProduct(product)}
                                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                                                    title="Aperçu"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openProductModal(product)}
                                                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                                                    title="Modifier"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleSingleAIFillSync(product)}
                                                    disabled={isGeneratingAI === product.id}
                                                    className={`p-2 rounded-lg transition-all ${isGeneratingAI === product.id ? 'text-emerald-400 animate-pulse bg-white/5' : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800'}`}
                                                    title="Remplir via IA"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setStockAdjust({ id: product.id, qty: '', note: '' })}
                                                    className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-all"
                                                    title="Stock"
                                                >
                                                    <ArrowUpDown className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all"
                                                    title="Désactiver"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {paginatedProducts.map((product, index) => {
                        const aiComplete = isAIComplete(product);
                        const lowStock = product.stock_quantity <= 5;
                        const outOfStock = product.stock_quantity === 0;

                        return (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            whileHover={{ y: -3 }}
                            className="group relative rounded-2xl overflow-hidden flex flex-col"
                            style={{
                                background: 'rgba(255,255,255,0.015)',
                                border: '1px solid rgba(255,255,255,0.04)',
                                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.12)';
                                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 40px rgba(16,185,129,0.06)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.04)';
                                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                            }}
                        >
                            {/* ── Image Area ── */}
                            <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                {/* Checkbox */}
                                <div className="absolute top-3 left-3 z-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedProductIds.includes(product.id)}
                                        onChange={() => toggleSelection(product.id)}
                                        className="w-4 h-4 rounded border-white/10 bg-black/30 text-emerald-400 focus:ring-0 cursor-pointer backdrop-blur-md"
                                    />
                                </div>

                                {/* Product image */}
                                <img
                                    src={product.image_url || PLACEHOLDER_IMAGE}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                                />

                                {/* Top-right status indicators (subtle dots/pills) */}
                                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                    {!product.is_active && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md"
                                            style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            Masqué
                                        </span>
                                    )}
                                    {product.is_subscribable && (
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-md"
                                            style={{ background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.3)' }}
                                            title="Abonnement disponible">
                                            <RefreshCw className="w-2.5 h-2.5 text-purple-300" />
                                        </span>
                                    )}
                                    {product.is_featured && !product.is_bundle && (
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-md"
                                            style={{ background: 'rgba(234,179,8,0.25)', border: '1px solid rgba(234,179,8,0.3)' }}
                                            title="Produit vedette">
                                            <Star className="w-2.5 h-2.5 text-yellow-300 fill-yellow-300" />
                                        </span>
                                    )}
                                    {aiComplete && (
                                        <span className="w-5 h-5 rounded-full flex items-center justify-center backdrop-blur-md"
                                            style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.3)' }}
                                            title="IA complète">
                                            <Sparkles className="w-2.5 h-2.5 text-emerald-300" />
                                        </span>
                                    )}
                                </div>

                                {/* Bottom gradient with price */}
                                <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
                                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between">
                                        <span className="text-[17px] font-bold text-white tracking-tight">{product.price.toFixed(2)} €</span>
                                        {product.original_value && product.original_value > product.price && (
                                            <span className="text-[11px] text-white/25 line-through">{product.original_value.toFixed(2)} €</span>
                                        )}
                                    </div>
                                </div>

                                {/* Stock indicator bar at very bottom of image */}
                                <div className="absolute bottom-0 inset-x-0 h-[2px]"
                                    style={{ background: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', opacity: outOfStock ? 0.8 : 0.4 }} />
                            </div>

                            {/* ── Info Area ── */}
                            <div className="p-4 flex-1 flex flex-col gap-3">
                                {/* Name + category */}
                                <div>
                                    <h3 className="text-sm font-semibold text-white/80 group-hover:text-white transition-colors line-clamp-1 mb-1">
                                        {product.name}
                                    </h3>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] text-white/20 font-medium uppercase tracking-widest truncate">
                                            {(product.category as Category | undefined)?.name ?? 'Divers'}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            {product.attributes?.seo_title && product.attributes?.seo_meta_description && (
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                                                    style={{ background: 'rgba(16,185,129,0.08)', color: 'rgba(16,185,129,0.5)', border: '1px solid rgba(16,185,129,0.12)' }}>
                                                    SEO
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-white/15 uppercase tracking-widest font-medium">Stock</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold ${outOfStock ? 'text-red-400' : lowStock ? 'text-amber-400' : 'text-white/60'}`}>
                                                {product.stock_quantity}
                                            </span>
                                            {outOfStock && <span className="text-[8px] font-bold text-red-400/60 uppercase">Rupture</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] text-white/15 uppercase tracking-widest font-medium">Culture</span>
                                        <span className="text-xs font-semibold text-white/40 truncate max-w-[90px]">
                                            {product.attributes?.culture_method || '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions — visible on hover for cleaner look */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button
                                        onClick={() => setPreviewProduct(product)}
                                        className="p-2 rounded-lg text-white/15 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                                        title="Aperçu"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => openProductModal(product)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-white/30 text-[11px] font-semibold py-1.5 rounded-lg hover:bg-white/[0.04] hover:text-white/60 transition-all"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        Modifier
                                    </button>
                                    <button
                                        onClick={() => handleSingleAIFillSync(product)}
                                        disabled={isGeneratingAI === product.id}
                                        className={`p-2 rounded-lg transition-all ${isGeneratingAI === product.id ? 'text-emerald-400 animate-pulse' : 'text-white/15 hover:text-emerald-400/60 hover:bg-white/[0.04]'}`}
                                        title="IA"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setStockAdjust({ id: product.id, qty: '', note: '' })}
                                        className="p-2 rounded-lg text-white/15 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                                        title="Stock"
                                    >
                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="p-2 rounded-lg text-white/15 hover:text-red-400/60 hover:bg-red-500/[0.04] transition-all"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                        );
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2.5 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-white/25 font-medium text-sm px-4">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2.5 rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Stock adjustment inline */}
            <AnimatePresence>
                {stockAdjust && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-zinc-900 border border-green-primary/40 rounded-2xl p-5"
                    >
                        <p className="text-sm font-medium text-white mb-3">
                            Ajustement —{' '}
                            <span className="text-emerald-400">
                                {products.find((p) => p.id === stockAdjust.id)?.name}
                            </span>
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            <input
                                type="number"
                                placeholder="Ex: +10 or -5"
                                value={stockAdjust.qty}
                                onChange={(e) => setStockAdjust({ ...stockAdjust, qty: e.target.value })}
                                className="w-36 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-primary"
                            />
                            <input
                                type="text"
                                placeholder="Note..."
                                value={stockAdjust.note}
                                onChange={(e) => setStockAdjust({ ...stockAdjust, note: e.target.value })}
                                className="flex-1 min-w-40 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-primary"
                            />
                            <button
                                onClick={handleStockAdjust}
                                disabled={isSaving}
                                className="bg-emerald-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                            >
                                Confirmer
                            </button>
                            <button
                                onClick={() => setStockAdjust(null)}
                                className="text-zinc-400 hover:text-white px-3 text-sm transition-colors"
                            >
                                Annuler
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Product Modal */}
            <AnimatePresence>
                {showProductModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProductModal(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl z-50 flex flex-col"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
                                <h2 className="font-serif text-xl font-bold">
                                    {editingProductId ? 'Modifier le produit' : 'Nouveau produit'}
                                </h2>
                                <button onClick={() => setShowProductModal(false)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className={LABEL}>Nom du produit *</label>
                                            <button
                                                type="button"
                                                onClick={handleAIFillInModal}
                                                disabled={isGeneratingAI === 'modal' || !productForm.name}
                                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 px-2 py-1 rounded-lg transition-all border border-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-50"
                                            >
                                                <Sparkles className={`w-3 h-3 ${isGeneratingAI === 'modal' ? 'animate-pulse' : ''}`} />
                                                {isGeneratingAI === 'modal' ? 'Génération...' : 'Générer via IA'}
                                            </button>
                                        </div>
                                        <input
                                            required
                                            value={productForm.name}
                                            onChange={(e) =>
                                                setProductForm({ ...productForm, name: e.target.value, slug: slugify(e.target.value) })
                                            }
                                            className={INPUT}
                                        />
                                    </div>

                                    <div>
                                        <label className={LABEL}>Slug (URL)</label>
                                        <input
                                            value={productForm.slug}
                                            onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                                            className={INPUT}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className={LABEL}>Image du produit</label>
                                        <ProductImageUpload
                                            value={productForm.image_url}
                                            onChange={(url) => setProductForm({ ...productForm, image_url: url })}
                                        />
                                    </div>

                                    <div>
                                        <label className={LABEL}>Catégorie *</label>
                                        <select
                                            required
                                            value={productForm.category_id}
                                            onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                                            className={INPUT}
                                        >
                                            <option value="">Choisir une catégorie…</option>
                                            {categoryTree.map((root) => {
                                                const subtree = flattenTree([root]);
                                                if (subtree.length === 1) {
                                                    // Leaf root — plain option
                                                    return (
                                                        <option key={root.id} value={root.id} disabled={!root.is_active}>
                                                            {root.name}{!root.is_active ? ' (inactive)' : ''}
                                                        </option>
                                                    );
                                                }
                                                // Root with sub-levels → optgroup
                                                return (
                                                    <optgroup key={root.id} label={root.name}>
                                                        {subtree.map((c) => (
                                                            <option key={c.id} value={c.id} disabled={!c.is_active}>
                                                                {(c.depth ?? 0) === 0
                                                                    ? c.name
                                                                    : (c.depth ?? 0) === 1
                                                                        ? `  └ ${c.name}`
                                                                        : `     └ ${c.name}`}
                                                                {!c.is_active ? ' (inactive)' : ''}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                );
                                            })}
                                        </select>
                                        {/* Breadcrumb path of the selected category */}
                                        {selectedCategoryPath && selectedCategoryPath.length > 0 && (
                                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                                                {selectedCategoryPath.map((cat, i) => (
                                                    <span key={cat.id} className="flex items-center gap-1">
                                                        {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />}
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${i === 0
                                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                                : i === 1
                                                                    ? 'bg-blue-500/10 text-blue-400'
                                                                    : 'bg-purple-500/10 text-purple-400'
                                                            }`}>
                                                            {cat.name}
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2">
                                        <label className={LABEL}>Code-barres / SKU</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                value={productForm.sku ?? ''}
                                                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value || null })}
                                                className={`${INPUT} pl-10`}
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className={LABEL}>Description</label>
                                        <textarea
                                            rows={3}
                                            value={productForm.description ?? ''}
                                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value || null })}
                                            className={INPUT}
                                        />
                                    </div>

                                    <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">SEO Produit</p>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className={LABEL}>SEO Title</label>
                                                <span className="text-[10px] text-zinc-500">{(productForm.attributes?.seo_title ?? '').length}/60</span>
                                            </div>
                                            <input
                                                value={productForm.attributes?.seo_title ?? ''}
                                                onChange={(e) => setProductForm({
                                                    ...productForm,
                                                    attributes: { ...productForm.attributes, seo_title: e.target.value }
                                                })}
                                                className={INPUT}
                                                placeholder="Titre optimisé SEO (max conseillé : 60 caractères)"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className={LABEL}>Meta Description SEO</label>
                                                <span className="text-[10px] text-zinc-500">{(productForm.attributes?.seo_meta_description ?? '').length}/160</span>
                                            </div>
                                            <textarea
                                                rows={2}
                                                value={productForm.attributes?.seo_meta_description ?? ''}
                                                onChange={(e) => setProductForm({
                                                    ...productForm,
                                                    attributes: { ...productForm.attributes, seo_meta_description: e.target.value }
                                                })}
                                                className={INPUT}
                                                placeholder="Description meta optimisée SEO (max conseillé : 160 caractères)"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={LABEL}>Prix (€) *</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={productForm.price}
                                            onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                                            className={INPUT}
                                        />
                                    </div>

                                    <div>
                                        <label className={LABEL}>Stock initial</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={productForm.stock_quantity}
                                            onChange={(e) => setProductForm({ ...productForm, stock_quantity: parseInt(e.target.value) || 0 })}
                                            className={INPUT}
                                        />
                                    </div>

                                    <div className="col-span-2 grid grid-cols-2 gap-4 p-4 border border-zinc-800 bg-zinc-900/50 rounded-2xl">
                                        <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">Compositions & Culture</div>

                                        <div>
                                            <label className={LABEL}>% CBD</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                value={productForm.attributes?.cbd_percentage ?? 0}
                                                onChange={(e) => setProductForm({
                                                    ...productForm,
                                                    attributes: { ...productForm.attributes, cbd_percentage: parseFloat(e.target.value) || 0 }
                                                })}
                                                className={INPUT}
                                                placeholder="ex: 15.5"
                                            />
                                        </div>

                                        <div>
                                            <label className={LABEL}>% THC (Max)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="1"
                                                value={productForm.attributes?.thc_max ?? 0.2}
                                                onChange={(e) => setProductForm({
                                                    ...productForm,
                                                    attributes: { ...productForm.attributes, thc_max: parseFloat(e.target.value) || 0 }
                                                })}
                                                className={INPUT}
                                                placeholder="ex: 0.2"
                                            />
                                        </div>

                                        <div>
                                            <label className={LABEL}>Méthode de culture</label>
                                            <select
                                                value={productForm.attributes?.culture_method ?? 'Indoor'}
                                                onChange={(e) => setProductForm({
                                                    ...productForm,
                                                    attributes: { ...productForm.attributes, culture_method: e.target.value }
                                                })}
                                                className={INPUT}
                                            >
                                                <option value="Indoor">Indoor (Intérieur)</option>
                                                <option value="Outdoor">Outdoor (Extérieur)</option>
                                                <option value="Greenhouse">Greenhouse (Sous-serre)</option>
                                                <option value="Glasshouse">Glasshouse (Premium Serre)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className={LABEL}>Effets notables (virgules)</label>
                                            <input
                                                value={productForm.attributes?.effects?.join(', ') ?? ''}
                                                onChange={(e) => setProductForm({
                                                    ...productForm,
                                                    attributes: {
                                                        ...productForm.attributes,
                                                        effects: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                    }
                                                })}
                                                className={INPUT}
                                                placeholder="Relaxant, Créatif, Énergisant..."
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={LABEL}>Ancien Prix (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={productForm.original_value ?? ''}
                                            onChange={(e) => setProductForm({ ...productForm, original_value: e.target.value ? parseFloat(e.target.value) : null })}
                                            className={INPUT}
                                        />
                                    </div>

                                    <div>
                                        <label className={LABEL}>Poids du produit (g)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={productForm.weight_grams ?? ''}
                                            onChange={(e) => setProductForm({ ...productForm, weight_grams: e.target.value ? parseFloat(e.target.value) : null })}
                                            className={INPUT}
                                            placeholder="ex: 50.5 (en grammes)"
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-3">
                                        <label className={LABEL}>Note additionnelle (Optionnel)</label>
                                        <input
                                            value={productForm.attributes?.note ?? ''}
                                            onChange={(e) => setProductForm({
                                                ...productForm,
                                                attributes: {
                                                    ...productForm.attributes,
                                                    note: e.target.value
                                                }
                                            })}
                                            className={INPUT}
                                            placeholder="ex: Arôme intense de pin et agrumes..."
                                        />
                                    </div>

                                    {productForm.attributes?.technical_specs && productForm.attributes.technical_specs.length > 0 && (
                                        <div className="col-span-2 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Spécifications Structurées (Propulsé par IA)</label>
                                                <button
                                                    onClick={() => setProductForm({
                                                        ...productForm,
                                                        attributes: { ...productForm.attributes, technical_specs: [] }
                                                    })}
                                                    className="text-[9px] text-zinc-500 hover:text-red-400 font-bold uppercase transition-colors"
                                                >
                                                    Réinitialiser
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                {productForm.attributes.technical_specs.map((group: any, idx: number) => (
                                                    <div key={idx} className="space-y-1">
                                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-1">{group.group}</p>
                                                        <ul className="space-y-1">
                                                            {group.items.slice(0, 3).map((item: any, i: number) => (
                                                                <li key={i} className="text-[10px] text-zinc-500 truncate">
                                                                    <span className="font-bold text-zinc-300">{item.label}:</span> {item.value}
                                                                </li>
                                                            ))}
                                                            {group.items.length > 3 && <li className="text-[9px] text-zinc-600 italic">+{group.items.length - 3} autres...</li>}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-800">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Options & Visibilité</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 cursor-pointer hover:border-emerald-500 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={productForm.is_active}
                                                onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                                                className="w-5 h-5 accent-emerald-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">Actif</span>
                                                <span className="text-[10px] text-zinc-500 uppercase">Visible en ligne</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 cursor-pointer hover:border-emerald-500 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={productForm.is_featured}
                                                onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                                                className="w-5 h-5 accent-emerald-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">Produit Phare</span>
                                                <span className="text-[10px] text-zinc-500 uppercase">Top Ventes / Accueil</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 cursor-pointer hover:border-emerald-500 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={productForm.is_available}
                                                onChange={(e) => setProductForm({ ...productForm, is_available: e.target.checked })}
                                                className="w-5 h-5 accent-emerald-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">Disponible</span>
                                                <span className="text-[10px] text-zinc-500 uppercase">Achat activé</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 cursor-pointer hover:border-emerald-500 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={productForm.is_subscribable}
                                                onChange={(e) => setProductForm({ ...productForm, is_subscribable: e.target.checked })}
                                                className="w-5 h-5 accent-emerald-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">Abonnement</span>
                                                <span className="text-[10px] text-zinc-500 uppercase">Livraison récurrente</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 cursor-pointer hover:border-emerald-500 transition-colors col-span-2">
                                            <input
                                                type="checkbox"
                                                checked={productForm.is_bundle}
                                                onChange={(e) => setProductForm({ ...productForm, is_bundle: e.target.checked })}
                                                className="w-5 h-5 accent-emerald-500"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">Est un Pack (Bundle)</span>
                                                <span className="text-[10px] text-zinc-500 uppercase">Composé de plusieurs produits</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 bg-emerald-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        {isSaving ? 'Enregistrement…' : editingProductId ? 'Mettre à jour' : 'Créer le produit'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowProductModal(false)}
                                        className="px-6 text-zinc-400 hover:text-white font-medium"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <MassModifyModal
                isOpen={showMassModifyModal}
                onClose={() => setShowMassModifyModal(false)}
                selectedIds={selectedProductIds}
                categories={categories}
                onSuccess={() => {
                    setSelectedProductIds([]);
                    onRefresh();
                }}
            />

            <AdminProductPreviewModal
                product={previewProduct}
                isOpen={previewProduct !== null}
                onClose={() => setPreviewProduct(null)}
            />
        </div>
    );
}

/* ── Filter UI helpers ───────────────────────────────────────────────── */

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-white/15 uppercase tracking-widest mr-1 select-none">{label}</span>
            {children}
        </div>
    );
}

function FilterPill({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
    const accentColor = color || '#ffffff';
    return (
        <button
            onClick={onClick}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all duration-200"
            style={active ? {
                background: `${accentColor}12`,
                color: accentColor,
                border: `1px solid ${accentColor}30`,
                boxShadow: `0 0 8px ${accentColor}08`,
            } : {
                background: 'transparent',
                color: 'rgba(255,255,255,0.2)',
                border: '1px solid transparent',
            }}
        >
            {children}
        </button>
    );
}
