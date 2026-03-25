import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingCart, Sparkles, Package, Star } from 'lucide-react';
import { applyProductImageFallback, getProductImageSrc } from '../lib/productImage';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { useCartStore } from '../store/cartStore';

interface RelatedProductsProps {
    productId: string;
    categoryId?: string;
    title?: string;
}

export default function RelatedProducts({
    productId,
    categoryId,
    title = 'Vous aimerez aussi',
}: RelatedProductsProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const addItem = useCartStore((s) => s.addItem);
    const openSidebar = useCartStore((s) => s.openSidebar);

    useEffect(() => {
        if (!productId) return;
        setLoading(true);
        fetchRecommendations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);

    const fetchRecommendations = async () => {
        // 1. Try the RPC (requires migration to be applied)
        const { data: rpcData, error: rpcError } = await supabase.rpc(
            'get_product_recommendations',
            { p_product_id: productId, p_limit: 4 }
        );

        if (!rpcError && rpcData && rpcData.length > 0) {
            setProducts(rpcData as Product[]);
            setLoading(false);
            return;
        }

        // 2. Fallback: same category, direct query (works before migration)
        // First get the current product's category_id if not provided
        let catId = categoryId;
        if (!catId) {
            const { data: prod } = await supabase
                .from('products')
                .select('category_id')
                .eq('id', productId)
                .single();
            catId = prod?.category_id;
        }

        if (!catId) {
            setLoading(false);
            return;
        }

        const { data: fallback } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', catId)
            .eq('is_active', true)
            .eq('is_available', true)
            .neq('id', productId)
            .order('is_featured', { ascending: false })
            .limit(4);

        setProducts((fallback ?? []) as Product[]);
        setLoading(false);
    };

    const handleAdd = (e: React.MouseEvent, product: Product) => {
        e.preventDefault();
        addItem(product);
        openSidebar();
    };

    // Skeleton while loading
    if (loading) {
        return (
            <section className="mt-20">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 animate-pulse" />
                    <div className="h-7 w-40 bg-zinc-800 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="bg-zinc-900/50 rounded-2xl border border-white/[0.06] overflow-hidden animate-pulse">
                            <div className="aspect-[4/5] bg-zinc-800/50" />
                            <div className="p-3 space-y-2">
                                <div className="h-4 bg-zinc-800 rounded-md w-3/4" />
                                <div className="h-3 bg-zinc-800 rounded-md w-1/2" />
                                <div className="h-8 bg-zinc-800 rounded-xl mt-3" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (products.length === 0) return null;

    return (
        <section className="mt-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="font-serif text-2xl font-bold">{title}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-transparent ml-2" />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.map((product, i) => {
                    const savings =
                        product.is_bundle && product.original_value && product.original_value > product.price
                            ? product.original_value - product.price
                            : null;

                    return (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="group relative bg-zinc-900/50 rounded-2xl border border-white/[0.06] overflow-hidden hover:border-emerald-500/20 transition-all duration-300 flex flex-col"
                        >
                            {/* Badge */}
                            {product.is_bundle ? (
                                <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-purple-600 px-2 py-0.5 rounded-full text-xs font-bold text-white">
                                    <Package className="w-3 h-3" />
                                    Pack
                                </span>
                            ) : product.is_featured ? (
                                <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-emerald-500 px-2 py-0.5 rounded-full text-xs font-bold text-black">
                                    <Star className="w-3 h-3" />
                                    Top
                                </span>
                            ) : null}

                            {/* Image */}
                            <Link to={`/catalogue/${product.slug}`} className="block aspect-[4/5] overflow-hidden bg-zinc-800/50">
                                <img
                                    src={getProductImageSrc(product.image_url)}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={applyProductImageFallback}
                                />
                            </Link>

                            {/* Info */}
                            <div className="p-3 flex flex-col flex-1">
                                <Link
                                    to={`/catalogue/${product.slug}`}
                                    className="font-semibold text-sm text-white hover:text-emerald-400 transition-colors line-clamp-2 flex-1"
                                >
                                    {product.name}
                                </Link>


                                {/* Price + CTA */}
                                <div className="flex items-end justify-between mt-3 gap-2">
                                    <div>
                                        <span className="text-base font-bold text-emerald-400">
                                            {Number(product.price).toFixed(2)} €
                                        </span>
                                        {savings && (
                                            <span className="block text-xs font-bold text-purple-400">
                                                −{savings.toFixed(2)} €
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleAdd(e, product)}
                                        disabled={!product.is_available || product.stock_quantity === 0}
                                        aria-label={`Ajouter ${product.name} au panier`}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black transition-all hover:scale-110 flex-shrink-0"
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
