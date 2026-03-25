import { Search, Package, Plus, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Product } from '../../../lib/types';
import { CartLine } from './types';

interface POSProductGridProps {
    products: Product[];
    cart: CartLine[];
    isLoading: boolean;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    onAddToCart: (p: Product) => void;
    onBack: () => void;
    categoryName: string;
    isLightTheme?: boolean;
}

export default function POSProductGrid({
    products,
    cart,
    isLoading,
    searchQuery,
    setSearchQuery,
    onAddToCart,
    onBack,
    categoryName,
    isLightTheme
}: POSProductGridProps) {
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination when the product list changes
    useEffect(() => {
        setCurrentPage(1);
    }, [products, searchQuery]);

    const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
    const paginatedProducts = products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="flex flex-col h-full gap-2 sm:gap-3">
            {/* Header & Search */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button
                    onClick={onBack}
                    className={`p-2 sm:p-2.5 border rounded-xl sm:rounded-2xl transition-all group ${isLightTheme
                        ? 'bg-white hover:bg-emerald-50 border-emerald-100 text-emerald-400 hover:text-emerald-900 shadow-sm'
                        : 'bg-zinc-800/30 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="relative flex-1">
                    <Search className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${isLightTheme ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Rechercher...`}
                        className={`w-full border rounded-xl sm:rounded-2xl pl-9 sm:pl-12 pr-4 sm:pr-6 py-2 sm:py-2.5 text-xs sm:text-sm transition-all focus:outline-none focus:ring-4 focus:ring-green-500/20 ${isLightTheme
                            ? 'bg-white border-emerald-100 text-emerald-950 placeholder-emerald-300 shadow-sm'
                            : 'bg-black/40 border-zinc-800 text-white placeholder-zinc-600 focus:bg-black/60 shadow-inner'
                            }`}
                    />
                </div>
                <div className={`px-3 py-1.5 rounded-xl sm:rounded-2xl border text-[8px] sm:text-[10px] font-black uppercase tracking-widest hidden md:block transition-all ${isLightTheme
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    : 'bg-zinc-800/30 border-zinc-800 text-zinc-500'
                    }`}>
                    {products.length} Produits
                </div>
            </div>

            {/* Grid wrapper with scroll */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="bg-zinc-800/20 rounded-2xl h-48 animate-pulse" />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 transition-all">
                        <div className={`w-24 h-24 rounded-full border flex items-center justify-center mb-6 transition-all ${isLightTheme ? 'bg-emerald-50 border-emerald-100' : 'bg-zinc-900 border border-zinc-800'}`}>
                            <Package className={`w-10 h-10 transition-all ${isLightTheme ? 'opacity-20 text-emerald-400' : 'opacity-10 text-zinc-700'}`} />
                        </div>
                        <p className={`font-black uppercase tracking-[0.2em] text-xs ${isLightTheme ? 'text-emerald-700' : 'text-zinc-700'}`}>Aucun résultat trouvé</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 content-start pb-6">
                        {paginatedProducts.map((product) => {
                            const inCart = cart.find((l) => l.product.id === product.id);
                            return (
                                <motion.button
                                    key={product.id}
                                    whileHover={{ y: -3 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onAddToCart(product)}
                                    className={`group relative flex flex-col items-center text-center rounded-xl sm:rounded-2xl border transition-all overflow-hidden p-1 sm:p-1.5 ${inCart
                                        ? 'bg-green-500/10 border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.1)]'
                                        : isLightTheme
                                            ? 'bg-white border-emerald-50 hover:border-emerald-200 hover:bg-emerald-50/50 shadow-sm shadow-emerald-100/50'
                                            : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/60 shadow-xl'
                                        }`}
                                >
                                    {/* Badge stock */}
                                    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
                                        {product.stock_quantity <= 5 && (
                                            <div className="flex items-center gap-1 bg-red-600 text-white text-[7px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full uppercase tracking-widest shadow-lg shadow-red-900/50">
                                                Low
                                            </div>
                                        )}
                                    </div>

                                    {/* Img Container */}
                                    <div className={`w-full aspect-square rounded-lg sm:rounded-xl overflow-hidden mb-1 sm:mb-2 relative shadow-2xl transition-all ${isLightTheme ? 'bg-emerald-50' : 'bg-zinc-800'}`}>
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Package className="w-10 h-10 text-zinc-700" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                                            <div className="bg-white text-black p-3 rounded-full shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-300">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-1.5 pb-2 w-full">
                                        <h4 className={`text-[10px] sm:text-xs font-black truncate px-1 transition-colors ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{product.name}</h4>
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 mt-0.5">
                                            <span className={`text-[7px] sm:text-[9px] font-bold uppercase tracking-widest transition-colors ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>{product.stock_quantity} g</span>
                                            <span className={`hidden sm:block w-0.5 h-0.5 rounded-full ${isLightTheme ? 'bg-emerald-100' : 'bg-zinc-700'}`} />
                                            <span className="text-xs sm:text-base font-black text-green-500">{product.price.toFixed(2)}€</span>
                                        </div>
                                    </div>

                                    {inCart && (
                                        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 w-5 h-5 sm:w-7 sm:h-7 bg-green-500 text-black font-black text-[9px] sm:text-xs rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 animate-in zoom-in duration-300">
                                            {inCart.quantity}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && products.length > ITEMS_PER_PAGE && (
                <div className={`flex items-center justify-between shrink-0 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all ${isLightTheme
                    ? 'bg-white border-emerald-100 shadow-sm shadow-emerald-100/20'
                    : 'bg-zinc-900/40 border-zinc-800'
                    }`}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${isLightTheme
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:bg-emerald-25 disabled:text-emerald-200'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30'
                            }`}
                    >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="flex items-center gap-1">
                        <span className={`font-bold text-[9px] sm:text-xs hidden sm:block mr-2 transition-colors ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>Page {currentPage} sur {totalPages}</span>
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold transition-all ${currentPage === i + 1
                                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/20'
                                    : isLightTheme
                                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${isLightTheme
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:bg-emerald-25 disabled:text-emerald-200'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30'
                            }`}
                    >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
