import React, { useRef, useState } from 'react';
import { Upload, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';

interface CSVImporterProps {
    type: 'products' | 'categories';
    onComplete: () => void;
    exampleUrl: string;
    variant?: 'default' | 'menu';
}

export default function CSVImporter({ type, onComplete, exampleUrl, variant = 'default' }: CSVImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setError(null);
        setSuccess(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const data = results.data as any[];

                    if (type === 'categories') {
                        await importCategories(data);
                    } else {
                        await importProducts(data);
                    }

                    setSuccess(`${data.length} ${type === 'categories' ? 'catégories' : 'produits'} importés avec succès.`);
                    onComplete();
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } catch (err: any) {
                    console.error('Import error:', err);
                    setError(err.message || 'Une erreur est survenue lors de l\'importation.');
                } finally {
                    setIsImporting(false);
                }
            },
            error: (err) => {
                setError('Erreur lors de la lecture du fichier CSV.');
                setIsImporting(false);
            }
        });
    };

    const importCategories = async (data: any[]) => {
        // Fetch existing categories to resolve parent_slug → id
        const { data: existingCats } = await supabase
            .from('categories')
            .select('id, slug, depth');

        // NOTE: CSV rows must be ordered parent-before-child for single-pass resolution.
        // This map is updated as we process rows so that parent slugs created in this import
        // can also be used as parents for subsequent rows.
        const slugToId = new Map<string, { id: string | null; depth: number }>(
            (existingCats ?? []).map(c => [c.slug, { id: c.id, depth: c.depth ?? 0 }])
        );

        const categoriesToUpsert = data.map(row => {
            const name = row.name || row.nom_categorie || row.nom || 'Sans nom';
            const slug = (row.slug || row.id_categorie || slugify(name)).toString().trim().toLowerCase();

            // Resolve parent from parent_slug column
            const parentSlug = row.parent_slug ? row.parent_slug.toString().trim().toLowerCase() : null;
            const parentEntry = parentSlug ? slugToId.get(parentSlug) : null;
            let parentId: string | null = parentEntry?.id ?? null;
            let depth = parentEntry ? (parentEntry.depth ?? 0) + 1 : 0;

            if (depth > 2) {
                console.warn(`[CSVImporter] Category "${name}" (parent: "${parentSlug}") would exceed max depth (3 levels). Treating as root.`);
                parentId = null;
                depth = 0;
            }

            // Register this slug so subsequent rows can use it as parent (single-pass)
            // id is null here (will be assigned by DB) but depth is known
            if (!slugToId.has(slug)) {
                slugToId.set(slug, { id: null, depth });
            }

            return {
                name,
                slug,
                description: row.description || null,
                is_active: row.is_active !== 'false' && row.is_active !== false,
                sort_order: parseInt(row.sort_order) || 0,
                parent_id: parentId,
                depth,
            };
        });

        const { error } = await supabase.from('categories').upsert(categoriesToUpsert, { onConflict: 'slug' });
        if (error) throw error;
    };

    const importProducts = async (data: any[]) => {
        // 1. Get all categories for slug matching
        const { data: categories, error: catError } = await supabase.from('categories').select('id, slug');
        if (catError) throw catError;

        const categoryMap = new Map(categories?.map(c => [c.slug.trim().toLowerCase(), c.id]));

        // 1.5 Get all existing products to match by sku or slug
        const { data: existingProducts, error: prodError } = await supabase.from('products').select('id, sku, slug');
        if (prodError) throw prodError;

        const productsBySku = new Map(existingProducts?.filter(p => p.sku).map(p => [String(p.sku).trim(), p]));
        const productsBySlug = new Map(existingProducts?.map(p => [p.slug, p]));

        // 1.6 Detect duplicate SKUs within the CSV itself
        const csvSkus = data.map((row, i) => {
            const rowSku = row.sku || row.id_produit;
            return { sku: rowSku ? String(rowSku).trim() : null, line: i + 2 };
        }).filter(r => r.sku);
        const skuCount = new Map<string, number[]>();
        csvSkus.forEach(({ sku, line }) => {
            if (!skuCount.has(sku!)) skuCount.set(sku!, []);
            skuCount.get(sku!)!.push(line);
        });
        const dupes = [...skuCount.entries()].filter(([, lines]) => lines.length > 1);
        if (dupes.length > 0) {
            const details = dupes.map(([sku, lines]) => `"${sku}" (lignes ${lines.join(', ')})`).join('; ');
            throw new Error(`SKU dupliqués dans le CSV — chaque produit doit avoir un SKU unique: ${details}`);
        }

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        // 2. Format products
        data.forEach((row, index) => {
            const rawSlug = (row.category_slug || row.id_categorie || row.category || '').toString().trim().toLowerCase();
            const categoryId = categoryMap.get(rawSlug);

            if (!categoryId && rawSlug) {
                throw new Error(`Erreur ligne ${index + 2}: La catégorie "${rawSlug}" n'existe pas. Importez les catégories d'abord.`);
            }
            if (!categoryId) {
                throw new Error(`Erreur ligne ${index + 2}: Le champ "category_slug" (ou id_categorie) est obligatoire.`);
            }

            // Parse pipe-separated list fields
            const parseList = (val: string | undefined) =>
                val ? val.split('|').map(s => s.trim()).filter(Boolean) : [];

            // Build attributes from individual CSV columns
            const attributes: Record<string, any> = {};
            const brand = row.brand || row.marque;
            if (brand)        attributes.brand        = brand.trim();
            if (row.year)         attributes.year         = parseInt(row.year) || undefined;
            if (row.dimensions)   attributes.dimensions   = row.dimensions.trim();
            if (row.players)      attributes.players      = parseInt(row.players) || undefined;
            if (row.power_watts)  attributes.power_watts  = parseInt(row.power_watts) || undefined;
            if (row.specs)        attributes.specs        = parseList(row.specs);
            if (row.connectivity) attributes.connectivity = parseList(row.connectivity);
            if (row.benefits)     attributes.benefits     = parseList(row.benefits);

            const rowSku = (row.sku || row.id_produit) ? String(row.sku || row.id_produit).trim() : null;
            const name = row.name || row.nom_produit || row.nom || 'Sans nom';
            let rowSlug = row.slug ? String(row.slug).trim() : slugify(name);

            // Match existing product
            let matchedProduct = null;
            if (rowSku && productsBySku.has(rowSku)) {
                matchedProduct = productsBySku.get(rowSku);
            } else if (productsBySlug.has(rowSlug)) {
                matchedProduct = productsBySlug.get(rowSlug);
            }

            // If we matched by SKU but user didn't explicitly provide a new slug, keep the existing one
            // to avoid breaking URLs unnecessarily, unless we are generating it from a new name
            if (matchedProduct && !row.slug) {
                 rowSlug = matchedProduct.slug;
            }

            const productData = {
                category_id:    categoryId,
                name:           name,
                slug:           rowSlug,
                sku:            rowSku,
                description:    row.description || null,
                price:          parseFloat(row.price || row.prix) || 0,
                original_value: row.original_value ? parseFloat(row.original_value) : null,
                stock_quantity: parseInt(row.stock_quantity || row.stock) || (String(row.stock_quantity || row.stock).toLowerCase() === 'en_stock' ? 10 : 0),
                weight_grams:   row.weight_grams ? parseFloat(row.weight_grams) : null,
                is_available:   row.is_available !== 'false' && row.is_available !== false && String(row.stock).toLowerCase() !== 'rupture',
                is_active:      row.is_active    !== 'false' && row.is_active    !== false,
                is_featured:    row.is_featured  === 'true'  || row.is_featured  === true,
                is_subscribable: row.is_subscribable === 'true' || row.is_subscribable === true,
                image_url:      row.image_url || null,
                attributes,
            };

            if (matchedProduct) {
                toUpdate.push({ ...productData, id: matchedProduct.id });
            } else {
                toInsert.push(productData);
            }
        });

        if (toUpdate.length > 0) {
            const { error } = await supabase.from('products').upsert(toUpdate, { onConflict: 'id' });
            if (error) throw error;
        }

        if (toInsert.length > 0) {
            // Split by presence of SKU: upsert on sku/slug as safety net against missed matches
            const withSku = toInsert.filter(p => p.sku);
            const withoutSku = toInsert.filter(p => !p.sku);

            if (withSku.length > 0) {
                const { error } = await supabase.from('products').upsert(withSku, { onConflict: 'sku' });
                if (error) throw error;
            }
            if (withoutSku.length > 0) {
                const { error } = await supabase.from('products').upsert(withoutSku, { onConflict: 'slug' });
                if (error) throw error;
            }
        }
    };

    const slugify = (s: string) =>
        (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (variant === 'menu') {
        return (
            <div className="space-y-0.5">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                    {isImporting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    <span>Importer CSV</span>
                </button>

                <a
                    href={exampleUrl}
                    download
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                >
                    <FileDown className="w-4 h-4" />
                    <span>Exemple CSV</span>
                </a>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImport}
                    accept=".csv"
                    className="hidden"
                />

                {error && (
                    <div className="mx-3 my-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mx-3 my-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-[11px] text-green-400">
                        {success}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all border border-zinc-700"
                >
                    {isImporting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    Importer CSV
                </button>

                <a
                    href={exampleUrl}
                    download
                    className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs transition-colors"
                >
                    <FileDown className="w-3.5 h-3.5" />
                    Exemple CSV
                </a>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImport}
                    accept=".csv"
                    className="hidden"
                />
            </div>

            {error && (
                <div className="flex items-start gap-2 text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-start gap-2 text-green-400 bg-green-400/10 border border-green-400/20 p-3 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{success}</p>
                </div>
            )}
        </div>
    );
}
