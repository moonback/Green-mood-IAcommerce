import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, Plus, Search, X, Loader2, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../lib/types';
import { generateEmbedding } from '../../lib/embeddings';
import { matchProductsRpc } from '../../lib/matchProductsRpc';

interface Recommendation {
    id: string;
    product_id: string;
    recommended_id: string;
    sort_order: number;
    recommended: Product;
}

export default function AdminRecommendationsTab() {
    const [products, setProducts] = useState<(Product & { recommendation_count?: number })[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchSource, setSearchSource] = useState('');
    const [searchAdd, setSearchAdd] = useState('');
    const [addingId, setAddingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<Product[]>([]);

    // Load products list once
    // Load products list with recommendation counts
    const loadProducts = async () => {
        const { data: productsData } = await supabase
            .from('products')
            .select('id, name, slug, image_url, price, category_id, is_bundle, is_active, is_available, is_featured, stock_quantity, weight_grams, original_value, created_at')
            .eq('is_active', true)
            .order('name');

        const { data: countsData } = await supabase
            .from('product_recommendations')
            .select('product_id');

        if (productsData) {
            const counts: Record<string, number> = {};
            countsData?.forEach(r => {
                counts[r.product_id] = (counts[r.product_id] || 0) + 1;
            });

            setProducts(productsData.map(p => ({
                ...p,
                recommendation_count: counts[p.id] || 0
            })) as any);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const loadRecommendations = async (product: Product) => {
        setSelectedProduct(product);
        setLoading(true);
        setAiSuggestions([]); // Clear previous suggestions
        const { data } = await supabase
            .from('product_recommendations')
            .select('*, recommended:products!recommended_id(id, name, slug, image_url, price, is_bundle, stock_quantity, is_available, is_active, is_featured, category_id, weight_grams, original_value, created_at)')
            .eq('product_id', product.id)
            .order('sort_order');
        setRecommendations((data ?? []) as unknown as Recommendation[]);
        setLoading(false);
    };

    const handleAiSuggest = async () => {
        if (!selectedProduct) return;
        setAiLoading(true);
        try {
            const queryText = `${selectedProduct.name} ${selectedProduct.description || ''}`;
            const embedding = await generateEmbedding(queryText);
            const { data, error } = await matchProductsRpc<Product>({
                embedding,
                matchThreshold: 0.3,
                matchCount: 8,
            });

            if (error) throw error;

            // Filter out current product and already recommended ones
            const existingIds = new Set(recommendations.map(r => r.recommended_id));
            const filtered = (data || []).filter(p => p.id !== selectedProduct.id && !existingIds.has(p.id));
            setAiSuggestions(filtered.slice(0, 5));
        } catch (err) {
            console.error('AI Suggest failed:', err);
        } finally {
            setAiLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!selectedProduct || !window.confirm('Supprimer TOUTES les recommandations pour ce produit ?')) return;
        setLoading(true);
        await supabase.from('product_recommendations').delete().eq('product_id', selectedProduct.id);
        setRecommendations([]);
        setLoading(false);
        loadProducts(); // Update counts in list
    };

    const handleAdd = async (recommended: Product) => {
        if (!selectedProduct) return;
        if (recommended.id === selectedProduct.id) return;
        setAddingId(recommended.id);
        const maxOrder = recommendations.length > 0
            ? Math.max(...recommendations.map((r) => r.sort_order)) + 1
            : 0;
        const { data, error } = await supabase
            .from('product_recommendations')
            .insert({ product_id: selectedProduct.id, recommended_id: recommended.id, sort_order: maxOrder })
            .select('*, recommended:products!recommended_id(id, name, slug, image_url, price, is_bundle, stock_quantity, is_available, is_active, is_featured, category_id, weight_grams, original_value, created_at)')
            .single();
        setAddingId(null);
        if (!error && data) {
            setRecommendations((prev) => [...prev, data as unknown as Recommendation]);
            setAiSuggestions(prev => prev.filter(p => p.id !== recommended.id));
            loadProducts(); // Update counts
        }
    };

    const handleRemove = async (rec: Recommendation) => {
        setRemovingId(rec.id);
        await supabase.from('product_recommendations').delete().eq('id', rec.id);
        setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
        setRemovingId(null);
        loadProducts(); // Update counts
    };

    const handleReorder = async (rec: Recommendation, direction: 'up' | 'down') => {
        const idx = recommendations.findIndex((r) => r.id === rec.id);
        const newRecs = [...recommendations];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= newRecs.length) return;
        [newRecs[idx], newRecs[swapIdx]] = [newRecs[swapIdx], newRecs[idx]];
        // Update sort_order
        const updates = newRecs.map((r, i) => ({ ...r, sort_order: i }));
        setRecommendations(updates);
        await Promise.all(
            updates.map((r) =>
                supabase.from('product_recommendations').update({ sort_order: r.sort_order }).eq('id', r.id)
            )
        );
    };

    const recommendedIds = new Set(recommendations.map((r) => r.recommended_id));

    const availableToAdd = products
        .filter(
            (p) =>
                p.id !== selectedProduct?.id &&
                !recommendedIds.has(p.id) &&
                (!searchAdd || p.name.toLowerCase().includes(searchAdd.toLowerCase()))
        )
        .slice(0, 12);

    const filteredSource = products.filter(
        (p) => !searchSource || p.name.toLowerCase().includes(searchSource.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="font-serif text-2xl font-bold">Cross-Selling</h2>
                <p className="text-zinc-400 text-sm mt-0.5">
                    Configurez les produits recommandés pour chaque fiche produit.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: product selector */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        1 · Choisir un produit source
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            value={searchSource}
                            onChange={(e) => setSearchSource(e.target.value)}
                            placeholder="Rechercher…"
                            className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                        />
                    </div>
                    <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                        {filteredSource.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => loadRecommendations(p)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all ${selectedProduct?.id === p.id
                                        ? 'bg-emerald-500/10 border border-emerald-500/25 text-white'
                                        : 'hover:bg-zinc-800/80 text-zinc-300 border border-transparent'
                                    }`}
                            >
                                <img
                                    src={p.image_url || '/images/presentation.png'}
                                    alt={p.name}
                                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/images/presentation.png';
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="line-clamp-1 block">{p.name}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {p.is_bundle && (
                                            <span className="text-[10px] bg-purple-700/40 text-purple-300 px-1.5 py-0 rounded-full">
                                                Pack
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-medium ${p.recommendation_count === 0 ? 'text-amber-500/80' : 'text-zinc-500'}`}>
                                            {p.recommendation_count === 0 ? 'Sans recommandations' : `${p.recommendation_count} rec.`}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: recommendations editor */}
                <div className="lg:col-span-3 space-y-5">
                    {!selectedProduct ? (
                        <div className="flex items-center justify-center h-48 text-zinc-600 border border-dashed border-zinc-800 rounded-2xl">
                            <div className="text-center">
                                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Sélectionnez un produit pour gérer ses recommandations</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Current recommendations */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                        2 · Recommandations pour{' '}
                                        <span className="text-white">{selectedProduct.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleClearAll}
                                            disabled={recommendations.length === 0 || loading}
                                            className="text-[10px] font-semibold text-red-400 hover:text-red-300 disabled:opacity-30 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Tout effacer
                                        </button>
                                        <button
                                            onClick={handleAiSuggest}
                                            disabled={aiLoading || loading}
                                            className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-30 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
                                        >
                                            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            Suggérer avec l'IA
                                        </button>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm py-4">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Chargement…
                                    </div>
                                ) : recommendations.length === 0 ? (
                                    <div className="text-sm text-zinc-600 border border-dashed border-zinc-800 rounded-xl py-6 text-center">
                                        Aucune recommandation explicite.
                                        <br />
                                        <span className="text-xs text-zinc-700">
                                            Le fallback "même catégorie" s'appliquera automatiquement.
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <AnimatePresence>
                                            <div className="space-y-2">
                                                {recommendations.map((rec, idx) => (
                                                    <motion.div
                                                        key={rec.id}
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5"
                                                    >
                                <img
                                    src={rec.recommended?.image_url || '/images/presentation.png'}
                                    alt={rec.recommended?.name}
                                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/images/presentation.png';
                                    }}
                                />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white line-clamp-1">
                                                                {rec.recommended?.name}
                                                            </p>
                                                            <p className="text-xs text-zinc-500">
                                                                {Number(rec.recommended?.price).toFixed(2)} €
                                                            </p>
                                                        </div>
                                                        {/* Reorder */}
                                                        <div className="flex flex-col gap-0.5">
                                                            <button
                                                                onClick={() => handleReorder(rec, 'up')}
                                                                disabled={idx === 0}
                                                                className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors"
                                                            >
                                                                <ArrowUpDown className="w-3 h-3 rotate-180" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReorder(rec, 'down')}
                                                                disabled={idx === recommendations.length - 1}
                                                                className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors"
                                                            >
                                                                <ArrowUpDown className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemove(rec)}
                                                            disabled={removingId === rec.id}
                                                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                        >
                                                            {removingId === rec.id
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                : <X className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </AnimatePresence>

                                        {/* AI Suggestions Preview */}
                                        <AnimatePresence>
                                            {aiSuggestions.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-4 pt-4 border-t border-zinc-800/50 overflow-hidden"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                                            <Sparkles className="w-3 h-3" />
                                                            Suggestions de l'IA
                                                        </div>
                                                        <button
                                                            onClick={() => setAiSuggestions([])}
                                                            className="text-zinc-500 hover:text-white"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {aiSuggestions.map((p) => (
                                                            <div
                                                                key={p.id}
                                                                className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 group transition-all hover:bg-emerald-500/10"
                                                            >
                                                                <img 
                                                                    src={p.image_url || '/images/presentation.png'} 
                                                                    alt={p.name} 
                                                                    className="w-8 h-8 rounded object-cover flex-shrink-0" 
                                                                    onError={(e) => {
                                                                        (e.currentTarget as HTMLImageElement).src = '/images/presentation.png';
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs text-zinc-200 line-clamp-1">{p.name}</p>
                                                                    <p className="text-[10px] text-zinc-500">{Number(p.price).toFixed(2)} €</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleAdd(p)}
                                                                    disabled={addingId === p.id}
                                                                    className="p-1.5 text-emerald-400 hover:bg-emerald-400/20 rounded-md transition-all"
                                                                >
                                                                    {addingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                )}
                            </div>

                            {/* Add recommendations */}
                            <div>
                                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                    3 · Ajouter des recommandations
                                </div>
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        value={searchAdd}
                                        onChange={(e) => setSearchAdd(e.target.value)}
                                        placeholder="Rechercher un produit à ajouter…"
                                        className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                                    />
                                </div>
                                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                    {availableToAdd.length === 0 ? (
                                        <p className="text-xs text-zinc-600 text-center py-4">
                                            Tous les produits ont déjà été ajoutés ou aucun résultat.
                                        </p>
                                    ) : (
                                        availableToAdd.map((p) => (
                                            <div
                                                key={p.id}
                                                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2"
                                            >
                                                    <img 
                                                        src={p.image_url || '/images/presentation.png'} 
                                                        alt={p.name} 
                                                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0" 
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).src = '/images/presentation.png';
                                                        }}
                                                    />
                                                <span className="text-sm text-zinc-300 flex-1 line-clamp-1">{p.name}</span>
                                                <span className="text-xs text-zinc-500 flex-shrink-0">{Number(p.price).toFixed(2)} €</span>
                                                <button
                                                    onClick={() => handleAdd(p)}
                                                    disabled={addingId === p.id}
                                                    className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-green-400 disabled:opacity-40 transition-colors flex-shrink-0 ml-1"
                                                >
                                                    {addingId === p.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <Plus className="w-3.5 h-3.5" />}
                                                    Ajouter
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
