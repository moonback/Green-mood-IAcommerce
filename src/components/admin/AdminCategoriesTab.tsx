import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit3, Trash2, X, List, LayoutGrid, ChevronLeft, ChevronRight, Eye, ExternalLink, Sparkles, Tag, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Category, CategoryNode } from '../../lib/types';
import { buildCategoryTree, flattenTree } from '../../lib/categoryTree';
import CSVImporter from './CSVImporter';
import { slugify } from '../../lib/utils';
import ProductImageUpload from './ProductImageUpload';
import { useToastStore } from '../../store/toastStore';
import { useBackgroundTaskStore } from '../../store/backgroundTaskStore';
import { Brain } from 'lucide-react';

interface AdminCategoriesTabProps {
    categories: Category[];
    onRefresh: () => void;
}

const INPUT =
    'w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-neon transition-colors';
const LABEL = 'block text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wider';

export default function AdminCategoriesTab({ categories, onRefresh }: AdminCategoriesTabProps) {
    const { addToast } = useToastStore();
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryForm, setCategoryForm] = useState<Partial<Category>>({});
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [showInactive, setShowInactive] = useState(false);
    const [vectorizeConfirmModal, setVectorizeConfirmModal] = useState<{
        isOpen: boolean;
        category: Category | null;
        productsToSync: any[];
        totalProducts: number;
        missingCount: number;
        isForceSync: boolean;
    }>({
        isOpen: false,
        category: null,
        productsToSync: [],
        totalProducts: 0,
        missingCount: 0,
        isForceSync: false
    });
    const [aiFillConfirmModal, setAiFillConfirmModal] = useState<{
        isOpen: boolean;
        category: Category | null;
        productsToSync: any[];
        totalProducts: number;
        missingCount: number;
        isForceSync: boolean;
    }>({
        isOpen: false,
        category: null,
        productsToSync: [],
        totalProducts: 0,
        missingCount: 0,
        isForceSync: false
    });

    const { startVectorSync, isSyncingVectors, startMassAIFill, isSyncingAI } = useBackgroundTaskStore();
    const [vectorStats, setVectorStats] = useState<Record<string, { missing: number, total: number }>>({});
    const [aiFillStats, setAiFillStats] = useState<Record<string, { missing: number, total: number }>>({});

    useEffect(() => {
        const checkVectors = async () => {
            const { data } = await supabase.from('products').select('category_id, embedding, description, attributes');
            if (data) {
                const vStats: Record<string, { missing: number, total: number }> = {};
                const aiStats: Record<string, { missing: number, total: number }> = {};
                data.forEach(p => {
                    if (p.category_id) {
                        if (!vStats[p.category_id]) vStats[p.category_id] = { missing: 0, total: 0 };
                        if (!aiStats[p.category_id]) aiStats[p.category_id] = { missing: 0, total: 0 };
                        
                        vStats[p.category_id].total++;
                        aiStats[p.category_id].total++;
                        
                        const hasEmbed = Array.isArray(p.embedding) 
                            ? p.embedding.length > 0 
                            : (typeof p.embedding === 'string' && p.embedding.trim().length > 0 && p.embedding.trim() !== '[]');
                            
                        if (!hasEmbed) {
                            vStats[p.category_id].missing++;
                        }
                        
                        const attributes = p.attributes as null | Record<string, any>;
                        const hasAiContent = p.description && (attributes?.productSpecs?.length > 0 || attributes?.technical_specs?.length > 0) && attributes?.effects?.length > 0;
                        if (!hasAiContent) {
                            aiStats[p.category_id].missing++;
                        }
                    }
                });
                setVectorStats(vStats);
                setAiFillStats(aiStats);
            }
        };
        checkVectors();
    }, [categories, isSyncingVectors, isSyncingAI]);

    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // More resilient filtering to handle potential nulls or different types from DB
    const filteredCategories = categories.filter(cat => showInactive || cat.is_active !== false);
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    // Safety check: reset current page if it's out of bounds after filtering
    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    }

    const paginatedCategories = filteredCategories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Tree built from ALL categories (for admin, include inactive when showInactive=true)
    const categoryTree = useMemo(
        () => buildCategoryTree(categories, showInactive),
        [categories, showInactive]
    );

    // Flat ordered list with indent for parent <select> in the modal
    const flatForSelect = useMemo(
        () => flattenTree(buildCategoryTree(categories, true)),
        [categories]
    );

    const openCategoryModal = (cat?: Category, parentIdOverride?: string) => {
        if (cat) {
            setEditingCategoryId(cat.id);
            setCategoryForm({ ...cat });
        } else {
            const parentId = parentIdOverride ?? null;
            const parent = parentId ? categories.find(c => c.id === parentId) : null;
            const depth = parent ? (parent.depth ?? 0) + 1 : 0;
            const siblingsCount = categories.filter(c => c.parent_id === parentId).length;
            setEditingCategoryId(null);
            setCategoryForm({
                name: '',
                slug: '',
                description: '',
                is_active: true,
                sort_order: siblingsCount,
                parent_id: parentId,
                depth,
            });
        }
        setShowCategoryModal(true);
    };

    const handleSaveCategory = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // Derive depth from the selected parent (never trust form-provided depth)
        const parentCat = categoryForm.parent_id
            ? categories.find(c => c.id === categoryForm.parent_id)
            : null;
        const depth = parentCat ? (parentCat.depth ?? 0) + 1 : 0;

        const payload = {
            name: categoryForm.name,
            slug: categoryForm.slug || slugify(categoryForm.name ?? ''),
            description: categoryForm.description,
            image_url: categoryForm.image_url,
            is_active: categoryForm.is_active,
            sort_order: categoryForm.sort_order,
            icon_name: categoryForm.icon_name,
            parent_id: categoryForm.parent_id ?? null,
            depth,
        };

        if (editingCategoryId) {
            await supabase.from('categories').update(payload).eq('id', editingCategoryId);
        } else {
            await supabase.from('categories').insert(payload);
        }
        setShowCategoryModal(false);
        onRefresh();
        setIsSaving(false);
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        setIsSaving(true);
        await supabase.from('categories').update({ is_active: !currentStatus }).eq('id', id);
        onRefresh();
        setIsSaving(false);
    };

    const handleDeleteCategory = async (category: Category) => {
        // Warn about children becoming orphaned roots (ON DELETE SET NULL)
        const children = categories.filter(c => c.parent_id === category.id);
        if (children.length > 0) {
            if (!confirm(
                `Cette catégorie contient ${children.length} sous-catégorie(s) :\n` +
                children.map(c => `  • ${c.name}`).join('\n') +
                `\n\nSi vous supprimez "${category.name}", ces sous-catégories deviendront des catégories racines.\nContinuer ?`
            )) return;
        }

        const productCount = Array.isArray(category.products) ? category.products[0]?.count ?? 0 : (category.products as any)?.count ?? 0;

        if (productCount > 0) {
            if (!confirm(`ATTENTION : Cette catégorie contient ${productCount} produit(s).\nVoulez-vous supprimer DÉFINITIVEMENT la catégorie "${category.name}" ET tenter de supprimer ses produits ?\n\nNote : Les produits ayant un historique de commandes seront archivés au lieu d'être supprimés.`)) return;
            
            setIsSaving(true);
            
            // 1. Récupérer tous les IDs des produits de cette catégorie
            const { data: catProducts } = await supabase.from('products').select('id').eq('category_id', category.id);
            const pIds = (catProducts ?? []).map(p => p.id);

            if (pIds.length > 0) {
                // 2. Supprimer les dépendances nettoyables (historique de stock, avis, packs, abonnements)
                await supabase.from('stock_movements').delete().in('product_id', pIds);
                await supabase.from('bundle_items').delete().in('product_id', pIds);
                await supabase.from('bundle_items').delete().in('bundle_id', pIds);
                await supabase.from('reviews').delete().in('product_id', pIds);
                await supabase.from('subscriptions').delete().in('product_id', pIds);
                
                // 3. Tenter de supprimer les produits
                const { error: productsError } = await supabase.from('products').delete().eq('category_id', category.id);
                
                if (productsError) {
                    // Si erreur de contrainte (ex: lié à des commandes), on doit déplacer les produits
                    if (productsError.code === '23503') {
                        console.log('Certains produits sont liés à des commandes. Déplacement vers Archives...');
                        
                        // Trouver ou créer la catégorie "Archives"
                        let { data: archiveCat } = await supabase.from('categories').select('id').eq('slug', 'archives').maybeSingle();
                        
                        if (!archiveCat) {
                            const { data: newArchive, error: createError } = await supabase
                                .from('categories')
                                .insert({ 
                                    name: 'Archives', 
                                    slug: 'archives', 
                                    is_active: false, 
                                    description: 'Produits conservés pour historique de commandes' 
                                })
                                .select('id')
                                .single();
                            
                            if (createError) {
                                console.error('Error creating Archives category:', createError);
                                addToast({ type: 'error', message: 'Impossible de créer la catégorie Archives.' });
                                setIsSaving(false);
                                return;
                            }
                            archiveCat = newArchive;
                        }

                        // Déplacer les produits restants vers Archives et les désactiver
                        const { error: moveError } = await supabase
                            .from('products')
                            .update({ category_id: archiveCat!.id, is_active: false })
                            .eq('category_id', category.id);
                        
                        if (moveError) {
                            console.error('Error moving products to archives:', moveError);
                            addToast({ type: 'error', message: 'Erreur lors du déplacement en archives.' });
                            setIsSaving(false);
                            return;
                        }
                        
                        addToast({ type: 'info', message: 'Produits archivés avec succès.' });
                    } else {
                        console.error('Error deleting products:', productsError);
                        addToast({ type: 'error', message: 'Erreur lors de la suppression des produits.' });
                        setIsSaving(false);
                        return;
                    }
                }
            }
        } else {
            if (!confirm(`Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT la catégorie "${category.name}" ?`)) return;
            setIsSaving(true);
        }

        // 4. Supprimer la catégorie
        const { error } = await supabase.from('categories').delete().eq('id', category.id);

        if (error) {
            console.error('Error deleting category:', error);
            addToast({ type: 'error', message: 'Erreur lors de la suppression de la catégorie.' });
        } else {
            addToast({ type: 'success', message: 'Catégorie supprimée avec succès.' });
            onRefresh();
        }
        setIsSaving(false);
    };





    const hasEmbedding = (embedding: any) => {
        if (Array.isArray(embedding)) return embedding.length > 0;
        if (typeof embedding === 'string') return embedding.trim().length > 0 && embedding.trim() !== '[]';
        return false;
    };

    const handleVectorizeCategory = async (category: Category) => {
        if (isSyncingVectors) {
            addToast({ message: "Une synchronisation est déjà en cours. Veuillez patienter.", type: "error" });
            return;
        }

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id);

        if (error || !products) {
            addToast({ message: "Erreur lors de la récupération des produits.", type: "error" });
            return;
        }

        if (products.length === 0) {
            addToast({ message: "Aucun produit dans cette catégorie.", type: "info" });
            return;
        }

        const missingVectors = products.filter(p => !hasEmbedding(p.embedding));
        let toSync = missingVectors;

        if (missingVectors.length === 0) {
            setVectorizeConfirmModal({
                isOpen: true,
                category,
                productsToSync: products,
                totalProducts: products.length,
                missingCount: 0,
                isForceSync: true
            });
        } else {
            setVectorizeConfirmModal({
                isOpen: true,
                category,
                productsToSync: missingVectors,
                totalProducts: products.length,
                missingCount: missingVectors.length,
                isForceSync: false
            });
        }
    };

    const confirmVectorizeCategory = () => {
        if (!vectorizeConfirmModal.productsToSync.length) return;
        
        startVectorSync(vectorizeConfirmModal.productsToSync, onRefresh);
        addToast({ message: `Vectorisation de ${vectorizeConfirmModal.productsToSync.length} produit(s) lancée en arrière-plan.`, type: "info" });
        setVectorizeConfirmModal({ ...vectorizeConfirmModal, isOpen: false });
    };

    const hasMissingAI = (product: any) => {
        const attributes = product.attributes || {};
        return !product.description || (!attributes.productSpecs?.length && !attributes.technical_specs?.length) || !attributes.effects?.length;
    };

    const handleAIFillCategory = async (category: Category) => {
        if (isSyncingAI) {
            addToast({ message: "Un enrichissement est déjà en cours. Veuillez patienter.", type: "error" });
            return;
        }

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id);

        if (error || !products) {
            addToast({ message: "Erreur lors de la récupération des produits.", type: "error" });
            return;
        }

        if (products.length === 0) {
            addToast({ message: "Aucun produit dans cette catégorie.", type: "info" });
            return;
        }

        const missingAI = products.filter(hasMissingAI);

        if (missingAI.length === 0) {
            setAiFillConfirmModal({
                isOpen: true,
                category,
                productsToSync: products,
                totalProducts: products.length,
                missingCount: 0,
                isForceSync: true
            });
        } else {
            setAiFillConfirmModal({
                isOpen: true,
                category,
                productsToSync: missingAI,
                totalProducts: products.length,
                missingCount: missingAI.length,
                isForceSync: false
            });
        }
    };

    const confirmAIFillCategory = () => {
        if (!aiFillConfirmModal.productsToSync.length) return;
        
        startMassAIFill(aiFillConfirmModal.productsToSync, aiFillConfirmModal.isForceSync, onRefresh);
        setAiFillConfirmModal({ ...aiFillConfirmModal, isOpen: false });
    };

    const toggleNode = (id: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const depthBadge = (depth: number) => {
        if (depth === 0) return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 ml-1.5">Racine</span>;
        if (depth === 1) return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50 ml-1.5">Niv. 2</span>;
        return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800/50 ml-1.5">Niv. 3</span>;
    };

    const renderTreeRows = (nodes: CategoryNode[], depth: number): React.ReactNode => {
        return nodes.map(node => {
            const hasChildren = node.children.length > 0;
            const isExpanded = expandedNodes.has(node.id);
            const indentPx = depth * 24;
            const productCount = Array.isArray(node.products) ? node.products[0]?.count ?? 0 : (node.products as any)?.count ?? 0;

            return (
                <>
                    <tr key={node.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-5 py-4">
                            <div className="flex items-center gap-3" style={{ paddingLeft: `${indentPx}px` }}>
                                <button
                                    onClick={() => hasChildren && toggleNode(node.id)}
                                    className={`w-5 h-5 flex items-center justify-center flex-shrink-0 transition-colors ${hasChildren ? 'text-zinc-400 hover:text-white' : 'text-transparent cursor-default'}`}
                                    tabIndex={hasChildren ? 0 : -1}
                                >
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                </button>
                                <div className="relative w-10 h-10 rounded-xl border border-zinc-700/50 bg-zinc-800 overflow-hidden flex-shrink-0">
                                    {node.image_url ? (
                                        <img src={node.image_url} alt={node.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] uppercase font-bold">N/A</div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors line-clamp-1">
                                        {node.name}
                                        {depthBadge(node.depth ?? 0)}
                                    </p>
                                </div>
                            </div>
                        </td>
                        <td className="px-5 py-4">
                            <span className="text-xs px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">/{node.slug}</span>
                        </td>
                        <td className="px-5 py-4">
                            <span className="font-bold text-white text-sm">{productCount}</span>
                        </td>
                        <td className="px-5 py-4 font-bold text-white text-sm">{node.sort_order}</td>
                        <td className="px-5 py-4">
                            <button
                                onClick={() => handleToggleActive(node.id, node.is_active)}
                                className={`text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-lg border transition-all hover:scale-105 active:scale-95 ${node.is_active ? 'text-green-400 bg-green-900/20 border-green-800/50 hover:bg-green-900/40' : 'text-red-400 bg-red-900/20 border-red-800/50 hover:bg-red-900/40'}`}
                                title={node.is_active ? 'Désactiver' : 'Activer'}
                            >
                                {node.is_active ? 'Active' : 'Inactive'}
                            </button>
                        </td>
                        <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(node.depth ?? 0) < 2 && (
                                    <button
                                        onClick={() => openCategoryModal(undefined, node.id)}
                                        className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-all"
                                        title="Ajouter une sous-catégorie"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={() => openCategoryModal(node)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all" title="Modifier"><Edit3 className="w-4 h-4" /></button>
                                <button
                                    onClick={() => handleVectorizeCategory(node)}
                                    className={`p-2 rounded-lg transition-all ${!vectorStats[node.id] || vectorStats[node.id].total === 0 ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800' : vectorStats[node.id].missing > 0 ? 'text-amber-400 hover:text-amber-300 hover:bg-zinc-800' : 'text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800'}`}
                                    title={!vectorStats[node.id] || vectorStats[node.id].total === 0 ? "Aucun produit" : vectorStats[node.id].missing > 0 ? `${vectorStats[node.id].missing} produit(s) non vectorisé(s)` : "Tous vectorisés"}
                                ><Brain className="w-4 h-4" /></button>
                                <button
                                    onClick={() => handleAIFillCategory(node)}
                                    className={`p-2 rounded-lg transition-all ${!aiFillStats[node.id] || aiFillStats[node.id].total === 0 ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800' : aiFillStats[node.id].missing > 0 ? 'text-pink-400 hover:text-pink-300 hover:bg-zinc-800' : 'text-purple-400 hover:text-purple-300 hover:bg-zinc-800'}`}
                                    title={!aiFillStats[node.id] || aiFillStats[node.id].total === 0 ? "Aucun produit" : aiFillStats[node.id].missing > 0 ? `${aiFillStats[node.id].missing} produit(s) à enrichir` : "Tous enrichis"}
                                ><Sparkles className="w-4 h-4" /></button>
                                <a href={`/catalogue?category=${node.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-all" title="Voir sur le site"><ExternalLink className="w-4 h-4" /></a>
                                <button onClick={() => handleDeleteCategory(node)} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all" title="Supprimer définitivement"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </td>
                    </tr>
                    {hasChildren && isExpanded && renderTreeRows(node.children, depth + 1)}
                </>
            );
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 px-1 border-b border-white/5">
                <div>
                    <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                        <Tag className="w-5 h-5 text-emerald-400" />
                        Gestion des Catégories
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold ml-2">
                            {filteredCategories.length} Catégories
                        </span>
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Organisez votre catalogue par thématiques.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <CSVImporter
                        type="categories"
                        onComplete={onRefresh}
                        exampleUrl="/examples/categories_example.csv"
                    />

                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-zinc-800 text-emerald-400 shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                            title="Vue Liste"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-emerald-400 shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                            title="Vue Grille"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showInactive
                            ? 'bg-zinc-800 border-zinc-700 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        {showInactive ? 'Masquer inactives' : 'Voir inactives'}
                    </button>

                    <button
                        onClick={() => openCategoryModal()}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle catégorie
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-800/50">
                                    <th className="px-5 py-4 font-bold">Catégorie</th>
                                    <th className="px-5 py-4 font-bold">Slug</th>
                                    <th className="px-5 py-4 font-bold">Produits</th>
                                    <th className="px-5 py-4 font-bold">Ordre</th>
                                    <th className="px-5 py-4 font-bold">Statut</th>
                                    <th className="px-5 py-4 text-right font-bold flex-shrink-0">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/80">
                                {renderTreeRows(categoryTree, 0)}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedCategories.map((cat) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden"
                        >
                            {cat.image_url && (
                                <div className="relative h-36 overflow-hidden">
                                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                                </div>
                            )}
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold text-white flex items-center flex-wrap gap-1">
                                            {cat.name}
                                            {depthBadge(cat.depth ?? 0)}
                                        </h3>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            /{cat.slug} · ordre {cat.sort_order} · {Array.isArray(cat.products) ? cat.products[0]?.count ?? 0 : (cat.products as any)?.count ?? 0} produit{(Array.isArray(cat.products) ? cat.products[0]?.count ?? 0 : (cat.products as any)?.count ?? 0) > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleToggleActive(cat.id, cat.is_active)}
                                        className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${cat.is_active
                                            ? 'text-green-400 bg-green-900/30 border-green-800'
                                            : 'text-red-400 bg-red-900/30 border-red-800'
                                            }`}
                                        title={cat.is_active ? 'Désactiver' : 'Activer'}
                                    >
                                        {cat.is_active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                                {cat.description && (
                                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{cat.description}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openCategoryModal(cat)}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        Modifier
                                    </button>
                                    {(cat.depth ?? 0) < 2 && (
                                        <button
                                            onClick={() => openCategoryModal(undefined, cat.id)}
                                            className="flex items-center justify-center p-2 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors"
                                            title="Ajouter une sous-catégorie"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleVectorizeCategory(cat)}
                                        className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                                            !vectorStats[cat.id] || vectorStats[cat.id].total === 0
                                                ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                                                : vectorStats[cat.id].missing > 0
                                                ? 'text-amber-400 hover:text-amber-300 hover:bg-zinc-800'
                                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800'
                                        }`}
                                        title={
                                            !vectorStats[cat.id] || vectorStats[cat.id].total === 0
                                                ? "Aucun produit"
                                                : vectorStats[cat.id].missing > 0
                                                ? `${vectorStats[cat.id].missing} produit(s) non vectorisé(s)`
                                                : "Tous les produits sont vectorisés"
                                        }
                                    >
                                        <Brain className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleAIFillCategory(cat)}
                                        className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                                            !aiFillStats[cat.id] || aiFillStats[cat.id].total === 0
                                                ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                                                : aiFillStats[cat.id].missing > 0
                                                ? 'text-pink-400 hover:text-pink-300 hover:bg-zinc-800'
                                                : 'text-purple-400 hover:text-purple-300 hover:bg-zinc-800'
                                        }`}
                                        title={
                                            !aiFillStats[cat.id] || aiFillStats[cat.id].total === 0
                                                ? "Aucun produit"
                                                : aiFillStats[cat.id].missing > 0
                                                ? `${aiFillStats[cat.id].missing} produit(s) à enrichir (IA)`
                                                : "Tous les produits sont enrichis"
                                        }
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                    <a
                                        href={`/catalogue?category=${cat.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center p-2 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                                        title="Voir sur le site"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button
                                        onClick={() => handleDeleteCategory(cat)}
                                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                                        title="Supprimer définitivement"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <span className="text-zinc-500 font-medium text-sm px-4">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </div>
            )}

            {categories.length === 0 && (
                <p className="text-zinc-500 text-center py-10">Aucune catégorie.</p>
            )}

            {/* Category Modal */}
            <AnimatePresence>
                {showCategoryModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCategoryModal(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl z-50"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                                <h2 className="font-serif text-xl font-bold">
                                    {editingCategoryId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                                </h2>
                                <button onClick={() => setShowCategoryModal(false)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                                <div>
                                    <label className={LABEL}>Catégorie parente</label>
                                    <select
                                        value={categoryForm.parent_id ?? ''}
                                        onChange={(e) => {
                                            const parentId = e.target.value || null;
                                            const parent = parentId ? categories.find(c => c.id === parentId) : null;
                                            const depth = parent ? (parent.depth ?? 0) + 1 : 0;
                                            setCategoryForm({ ...categoryForm, parent_id: parentId, depth });
                                        }}
                                        className={INPUT}
                                        disabled={!!editingCategoryId}
                                    >
                                        <option value="">— Catégorie racine (niveau 1) —</option>
                                        {flatForSelect
                                            .filter(c =>
                                                (c.depth ?? 0) < 2 &&
                                                c.id !== editingCategoryId
                                            )
                                            .map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.indent}{(c.depth ?? 0) > 0 ? '└ ' : ''}{c.name}
                                                </option>
                                            ))
                                        }
                                    </select>
                                    <p className="text-[10px] text-zinc-500 mt-1">
                                        {editingCategoryId
                                            ? 'Le changement de parent n\'est pas disponible en édition.'
                                            : 'Laisser vide pour une catégorie racine (niveau 1).'}
                                    </p>
                                </div>
                                <div>
                                    <label className={LABEL}>Nom *</label>
                                    <input
                                        required
                                        value={categoryForm.name ?? ''}
                                        onChange={(e) =>
                                            setCategoryForm({ ...categoryForm, name: e.target.value, slug: slugify(e.target.value) })
                                        }
                                        className={INPUT}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Slug</label>
                                    <input
                                        value={categoryForm.slug ?? ''}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                                        className={INPUT}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Description</label>
                                    <textarea
                                        rows={2}
                                        value={categoryForm.description ?? ''}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                        className={INPUT}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Image de la catégorie</label>
                                    <ProductImageUpload
                                        value={categoryForm.image_url ?? null}
                                        onChange={(url: string | null) => setCategoryForm({ ...categoryForm, image_url: url })}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Ordre d'affichage</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={categoryForm.sort_order ?? 0}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) })}
                                        className={INPUT}
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={categoryForm.is_active ?? true}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                                        className="w-4 h-4 accent-green-600"
                                    />
                                    <span className="text-sm text-zinc-300">Catégorie active</span>
                                </label>
                                <div className="flex gap-3 pt-1">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 bg-emerald-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                                    >
                                        {isSaving ? 'Enregistrement…' : editingCategoryId ? 'Mettre à jour' : 'Créer'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryModal(false)}
                                        className="px-6 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
                
                {vectorizeConfirmModal.isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setVectorizeConfirmModal({ ...vectorizeConfirmModal, isOpen: false })}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl z-50 p-6"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full">
                                    <Brain className="w-6 h-6" />
                                </div>
                                <h2 className="font-serif text-xl font-bold">Vectorisation IA</h2>
                            </div>
                            
                            <p className="text-zinc-300 mb-6">
                                {vectorizeConfirmModal.isForceSync ? (
                                    <>Tous les produits ({vectorizeConfirmModal.totalProducts}) ont déjà un vecteur IA. Voulez-vous forcer la re-génération pour toute la catégorie ?</>
                                ) : (
                                    <>Voulez-vous générer les vecteurs manquants pour <strong className="text-white">{vectorizeConfirmModal.missingCount} produit(s)</strong> sur {vectorizeConfirmModal.totalProducts} dans cette catégorie ?</>
                                )}
                            </p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setVectorizeConfirmModal({ ...vectorizeConfirmModal, isOpen: false })}
                                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmVectorizeCategory}
                                    className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Oui, vectoriser
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
                
                {aiFillConfirmModal.isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAiFillConfirmModal({ ...aiFillConfirmModal, isOpen: false })}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl z-50 p-6"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-full">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <h2 className="font-serif text-xl font-bold">Enrichissement IA</h2>
                            </div>
                            
                            <p className="text-zinc-300 mb-6">
                                {aiFillConfirmModal.isForceSync ? (
                                    <>Tous les produits ({aiFillConfirmModal.totalProducts}) semblent déjà avoir un contenu enrichi. Voulez-vous <strong>forcer la re-génération totale</strong> pour toute la catégorie ? (Cela écrasera les descriptions actuelles)</>
                                ) : (
                                    <>Voulez-vous générer le contenu IA manquant (description, attributs) pour <strong className="text-white">{aiFillConfirmModal.missingCount} produit(s)</strong> sur {aiFillConfirmModal.totalProducts} dans cette catégorie ?</>
                                )}
                            </p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAiFillConfirmModal({ ...aiFillConfirmModal, isOpen: false })}
                                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmAIFillCategory}
                                    className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-purple-500/20"
                                >
                                    {aiFillConfirmModal.isForceSync ? 'Oui, forcer la génération' : 'Oui, enrichir'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
