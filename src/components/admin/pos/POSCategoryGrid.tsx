import { useState, useMemo } from 'react';
import { LayoutGrid, Star, ArrowLeft } from 'lucide-react';
import { Category, CategoryNode } from '../../../lib/types';
import { buildCategoryTree } from '../../../lib/categoryTree';
import { motion } from 'motion/react';

interface POSCategoryGridProps {
    categories: Category[];
    onSelectCategory: (categoryId: string) => void;
    onBack?: () => void;
    isLightTheme?: boolean;
}

export default function POSCategoryGrid({ categories, onSelectCategory, onBack, isLightTheme }: POSCategoryGridProps) {
    const [currentParentId, setCurrentParentId] = useState<string | null>(null);
    const [navStack, setNavStack] = useState<Array<{ parentId: string | null; label: string }>>([]);

    const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

    // Find the current level's nodes
    const currentNodes = useMemo(() => {
        if (currentParentId === null) return categoryTree;
        const findNode = (nodes: CategoryNode[], id: string): CategoryNode | null => {
            for (const n of nodes) {
                if (n.id === id) return n;
                const found = findNode(n.children, id);
                if (found) return found;
            }
            return null;
        };
        return findNode(categoryTree, currentParentId)?.children ?? [];
    }, [categoryTree, currentParentId]);

    const currentTitle = navStack.length > 0 ? navStack[navStack.length - 1].label : 'Catégories';

    const handleCategoryClick = (cat: CategoryNode) => {
        if (cat.children.length > 0) {
            // Drill into subcategory
            setNavStack(prev => [...prev, { parentId: currentParentId, label: cat.name }]);
            setCurrentParentId(cat.id);
        } else {
            // Leaf — select and pass up
            onSelectCategory(cat.id);
        }
    };

    const handleBack = () => {
        const prev = navStack[navStack.length - 1];
        if (prev) {
            setNavStack(s => s.slice(0, -1));
            setCurrentParentId(prev.parentId);
        } else if (onBack) {
            onBack();
        }
    };

    const showBackButton = navStack.length > 0 || !!onBack;

    return (
        <div className="flex flex-col h-full gap-2 sm:gap-3">
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {showBackButton && (
                    <button
                        onClick={handleBack}
                        className={`p-2 sm:p-2.5 border rounded-xl sm:rounded-2xl transition-all group ${isLightTheme
                            ? 'bg-white hover:bg-emerald-50 border-emerald-100 text-emerald-400 hover:text-emerald-900 shadow-sm'
                            : 'bg-zinc-800/30 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                )}
                <div>
                    <h2 className={`text-lg sm:text-xl font-black uppercase tracking-tight ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>{currentTitle}</h2>
                    <p className={`text-[10px] sm:text-xs font-medium ${isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>
                        {navStack.length > 0 ? navStack.map(s => s.label).join(' › ') : 'Sélectionnez une catégorie'}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                    {/* All Products — only shown at root level */}
                    {currentParentId === null && (
                        <>
                            <motion.button
                                whileHover={{ y: -3 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelectCategory('all')}
                                className={`flex flex-col items-center justify-center gap-1.5 sm:gap-3 border rounded-xl sm:rounded-[1.5rem] p-3 sm:p-5 transition-all group shadow-xl ${isLightTheme
                                    ? 'bg-white hover:bg-emerald-50 border-emerald-100 hover:border-green-500/50 shadow-emerald-100/50'
                                    : 'bg-zinc-900/40 hover:bg-zinc-800 border-zinc-800 hover:border-green-500/50'
                                    }`}
                            >
                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-green-500/10 group-hover:text-green-500 transition-colors ${isLightTheme ? 'bg-emerald-50 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    <LayoutGrid className="w-5 h-5 sm:w-7 sm:h-7" />
                                </div>
                                <h3 className={`font-black text-xs sm:text-base transition-colors group-hover:text-green-500 ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Tous les produits</h3>
                            </motion.button>

                            <motion.button
                                whileHover={{ y: -3 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelectCategory('favorites')}
                                className={`flex flex-col items-center justify-center gap-1.5 sm:gap-3 border rounded-xl sm:rounded-[1.5rem] p-3 sm:p-5 transition-all group shadow-xl ${isLightTheme
                                    ? 'bg-white hover:bg-emerald-50 border-emerald-100 hover:border-amber-500/50 shadow-emerald-100/50'
                                    : 'bg-zinc-900/40 hover:bg-zinc-800 border-zinc-800 hover:border-amber-500/50'
                                    }`}
                            >
                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors ${isLightTheme ? 'bg-emerald-50 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    <Star className="w-5 h-5 sm:w-7 sm:h-7" />
                                </div>
                                <h3 className={`font-black text-xs sm:text-base transition-colors group-hover:text-amber-500 ${isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Favoris</h3>
                            </motion.button>
                        </>
                    )}

                    {/* Dynamic Categories — current level */}
                    {currentNodes.map((cat) => (
                        <motion.button
                            key={cat.id}
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCategoryClick(cat)}
                            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-3 border rounded-xl sm:rounded-[1.5rem] p-3 sm:p-5 transition-all group shadow-xl ${isLightTheme
                                ? 'bg-white hover:bg-emerald-50 border-emerald-100 hover:border-emerald-400 shadow-emerald-100/50'
                                : 'bg-zinc-900/40 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-500'
                                }`}
                        >
                            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${isLightTheme ? 'bg-emerald-50 text-emerald-400 group-hover:bg-emerald-100 group-hover:text-emerald-900' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 hover:text-white'}`}>
                                {cat.image_url ? (
                                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover rounded-lg sm:rounded-xl" />
                                ) : (
                                    <span className="text-lg sm:text-xl font-black">{cat.name.charAt(0)}</span>
                                )}
                            </div>
                            <div className="text-center">
                                <h3 className={`font-black text-xs sm:text-base transition-colors truncate w-full ${isLightTheme ? 'text-emerald-950 group-hover:text-emerald-900' : 'text-white group-hover:text-zinc-300'}`}>
                                    {cat.name}
                                </h3>
                                {cat.children.length > 0 && (
                                    <p className={`text-[10px] mt-0.5 ${isLightTheme ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                        {cat.children.length} sous-catégorie{cat.children.length > 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
