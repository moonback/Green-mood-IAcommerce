import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product, Category } from '../../lib/types';

interface AdminProductPreviewModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function AdminProductPreviewModal({
    product,
    isOpen,
    onClose,
}: AdminProductPreviewModalProps) {
    if (!isOpen || !product) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col overflow-hidden max-h-full"
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                        <h2 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                            Aperçu du Produit
                        </h2>
                        <div className="flex items-center gap-2">
                            <Link
                                to={`/catalogue/${product.slug}`}
                                target="_blank"
                                className="p-2 text-zinc-400 hover:text-emerald-400 rounded-lg hover:bg-zinc-800 transition-all"
                                title="Voir sur le site"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </Link>
                            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Image */}
                            <div className="w-full md:w-1/2 aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 flex-shrink-0">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img
                                        src="https://images.unsplash.com/photo-1555617766-c94804975da3?q=80&w=2070&auto=format&fit=crop"
                                        alt="Placeholder"
                                        className="w-full h-full object-cover opacity-50 contrast-50 grayscale"
                                    />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-lg border ${product.is_active ? 'text-green-400 bg-green-900/20 border-green-800/50' : 'text-zinc-500 bg-zinc-900 border-zinc-800'}`}>
                                            {product.is_active ? 'Actif' : 'Masqué'}
                                        </span>
                                        {product.is_featured && (
                                            <span className="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-lg border text-yellow-500 bg-yellow-500/10 border-yellow-500/30">
                                                Top
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-bold text-white leading-tight">{product.name}</h3>
                                    <p className="text-xs text-zinc-400 font-mono mt-1">SKU: {product.sku || 'N/A'}</p>
                                </div>

                                <div className="py-3 border-y border-zinc-800/50 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Prix</p>
                                        <p className="text-xl font-bold text-emerald-400">{product.price.toFixed(2)} €</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Stock</p>
                                        <p className={`text-xl font-bold ${product.stock_quantity <= 5 ? 'text-orange-400' : 'text-white'}`}>
                                            {product.stock_quantity}
                                        </p>
                                    </div>
                                </div>


                                {product.description && (
                                    <div>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Description</p>
                                        <p className="text-sm text-zinc-300 leading-relaxed max-h-32 overflow-y-auto">
                                            {product.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
