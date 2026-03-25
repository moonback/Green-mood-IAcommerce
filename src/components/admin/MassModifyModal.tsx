import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Category } from '../../lib/types';
import { useToastStore } from '../../store/toastStore';

interface MassModifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedIds: string[];
    categories: Category[];
    onSuccess: () => void;
}

const INPUT = 'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-primary transition-colors';
const LABEL = 'block text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wider flex items-center gap-2 cursor-pointer';

export default function MassModifyModal({
    isOpen,
    onClose,
    selectedIds,
    categories,
    onSuccess,
}: MassModifyModalProps) {
    const { addToast } = useToastStore();
    const [isSaving, setIsSaving] = useState(false);

    // Selected fields to update
    const [updateCategory, setUpdateCategory] = useState(false);
    const [categoryId, setCategoryId] = useState('');

    const [updatePrice, setUpdatePrice] = useState(false);
    const [price, setPrice] = useState<number | ''>('');

    const [updateStatus, setUpdateStatus] = useState(false);
    const [isActive, setIsActive] = useState(true);

    const [updateFeatured, setUpdateFeatured] = useState(false);
    const [isFeatured, setIsFeatured] = useState(false);

    const [updateStock, setUpdateStock] = useState(false);
    const [stockQuantity, setStockQuantity] = useState<number | ''>('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) return;

        const updates: any = {};
        if (updateCategory && categoryId) updates.category_id = categoryId;
        if (updatePrice && price !== '') updates.price = price;
        if (updateStatus) updates.is_active = isActive;
        if (updateFeatured) updates.is_featured = isFeatured;
        if (updateStock && stockQuantity !== '') updates.stock_quantity = stockQuantity;

        if (Object.keys(updates).length === 0) {
            addToast({ type: 'info', message: 'Veuillez sélectionner au moins un champ à modifier.' });
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('products')
                .update(updates)
                .in('id', selectedIds);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error mass updating products:', error);
            addToast({ type: 'error', message: 'Erreur lors de la modification en masse.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl flex flex-col overflow-hidden max-h-full"
                >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                        <h2 className="font-serif text-xl font-bold text-white">
                            Modification en masse ({selectedIds.length})
                        </h2>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                        <p className="text-zinc-400 text-sm mb-4">
                            Cochez les champs que vous souhaitez appliquer à tous les produits sélectionnés.
                        </p>

                        {/* Category */}
                        <div className="p-3 border border-zinc-800 rounded-xl bg-zinc-900/50">
                            <label className={LABEL}>
                                <input
                                    type="checkbox"
                                    checked={updateCategory}
                                    onChange={(e) => setUpdateCategory(e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-400 focus:ring-emerald-500"
                                />
                                Changer la catégorie
                            </label>
                            {updateCategory && (
                                <select
                                    required={updateCategory}
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className={`${INPUT} mt-2`}
                                >
                                    <option value="">Sélectionner une catégorie...</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Price */}
                        <div className="p-3 border border-zinc-800 rounded-xl bg-zinc-900/50">
                            <label className={LABEL}>
                                <input
                                    type="checkbox"
                                    checked={updatePrice}
                                    onChange={(e) => setUpdatePrice(e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-400 focus:ring-emerald-500"
                                />
                                Changer le prix (€)
                            </label>
                            {updatePrice && (
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required={updatePrice}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : '')}
                                    className={`${INPUT} mt-2`}
                                    placeholder="Nouveau prix..."
                                />
                            )}
                        </div>

                        {/* Stock */}
                        <div className="p-3 border border-zinc-800 rounded-xl bg-zinc-900/50">
                            <label className={LABEL}>
                                <input
                                    type="checkbox"
                                    checked={updateStock}
                                    onChange={(e) => setUpdateStock(e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-400 focus:ring-emerald-500"
                                />
                                Définir le stock
                            </label>
                            {updateStock && (
                                <input
                                    type="number"
                                    min="0"
                                    required={updateStock}
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value ? parseInt(e.target.value) : '')}
                                    className={`${INPUT} mt-2`}
                                    placeholder="Quantité..."
                                />
                            )}
                        </div>

                        {/* Status */}
                        <div className="p-3 border border-zinc-800 rounded-xl bg-zinc-900/50">
                            <label className={LABEL}>
                                <input
                                    type="checkbox"
                                    checked={updateStatus}
                                    onChange={(e) => setUpdateStatus(e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-400 focus:ring-emerald-500"
                                />
                                Changer le statut
                            </label>
                            {updateStatus && (
                                <select
                                    value={isActive ? 'true' : 'false'}
                                    onChange={(e) => setIsActive(e.target.value === 'true')}
                                    className={`${INPUT} mt-2`}
                                >
                                    <option value="true">Actif (En ligne)</option>
                                    <option value="false">Inactif (Masqué)</option>
                                </select>
                            )}
                        </div>

                        {/* Featured */}
                        <div className="p-3 border border-zinc-800 rounded-xl bg-zinc-900/50">
                            <label className={LABEL}>
                                <input
                                    type="checkbox"
                                    checked={updateFeatured}
                                    onChange={(e) => setUpdateFeatured(e.target.checked)}
                                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-400 focus:ring-emerald-500"
                                />
                                Changer "Mis en avant" (Top)
                            </label>
                            {updateFeatured && (
                                <select
                                    value={isFeatured ? 'true' : 'false'}
                                    onChange={(e) => setIsFeatured(e.target.value === 'true')}
                                    className={`${INPUT} mt-2`}
                                >
                                    <option value="true">Oui</option>
                                    <option value="false">Non</option>
                                </select>
                            )}
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="submit"
                                disabled={isSaving || (!updateCategory && !updatePrice && !updateStatus && !updateFeatured && !updateStock)}
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                {isSaving ? 'En cours...' : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Appliquer aux {selectedIds.length} produits
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
