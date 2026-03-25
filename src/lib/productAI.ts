import { supabase } from './supabase';
import { Product } from './types';
import { useSettingsStore } from '../store/settingsStore';

const AI_MODEL = 'liquid/lfm-2-24b-a2b:latest';

export interface GeneratedProductData {
    description?: string;
    seo?: {
        title?: string;
        meta_description?: string;
    };
    attributes?: {
        brand?: string;
        specs?: string[];
        connectivity?: string[];
        benefits?: string[];
        technical_specs?: {
            group: string;
            items: {
                label: string;
                value: string;
                icon?: string;
                description?: string;
            }[];
        }[];
    };
}

/**
 * Uses OpenRouter to generate missing product information based on the name.
 */
export async function generateProductInfo(productName: string, categoryName?: string): Promise<GeneratedProductData | null> {
    const storeName = useSettingsStore.getState().settings.store_name || 'e-commerce';
    const domainContext = categoryName ? `dans le domaine "${categoryName}"` : `pour le store "${storeName}"`;

    const prompt = `
    Recherche les specs de : "${productName}" ${domainContext}.
    Génère un JSON e-commerce en français.

    CONSIGNES DE SÉCURITÉ JSON :
    - NE JAMAIS utiliser de guillemets doubles (") à l'intérieur des valeurs (texte). Utilise des guillemets simples (').
    - Utilise des balises HTML (<p>, <strong>, <ul>, <li>) dans 'description' avec des guillemets simples pour les classes.
    - Pas de texte avant/après le bloc {}.
    3. INFOS : Marque, specs (10), technical_specs (structurés par groupe), connectivity, benefits (3).

    Structure :
    {
        "description": "...",
        "seo": { "title": "...", "meta_description": "..." },
        "attributes": {
            "brand": "...",
            "specs": ["...", "..."],
            "technical_specs": [{ "group": "...", "items": [{ "label": "...", "value": "..." }] }],
            "connectivity": ["..."],
            "benefits": ["...", "...", "..."]
        }
    }
    `;

    try {
        const { data, error } = await supabase.functions.invoke('ai-chat', {
            body: {
                model: AI_MODEL,
                messages: [{ role: 'user', content: prompt }],
                x_title: `${storeName} Admin AI`,
            },
        });

        if (error) throw new Error(`AI error: ${error.message}`);

        let content = data?.choices?.[0]?.message?.content;
        if (!content) return null;

        // More aggressive JSON extraction and repair
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start === -1 || end === -1) return null;

        let jsonString = content.substring(start, end + 1);

        // Sanitize problematic white spaces and common AI errors
        jsonString = jsonString
            .replace(/\\n/g, "\\n")
            .replace(/\\'/g, "'")
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');

        try {
            return JSON.parse(jsonString) as GeneratedProductData;
        } catch (e) {
            console.warn('[AI] JSON Parse failed, attempting repair...', e);
            // Last resort: try to fix unescaped double quotes that are NOT property keys
            // This is complex, but here we just try to return null and let the next attempt try
            return null;
        }
    } catch (err) {
        console.error('[AI] Error generating product info:', err);
        return null;
    }
}

/**
 * Automatically fill empty fields for a product in the database.
 */
export async function autoFillProductSync(product: Product, force: boolean = false): Promise<boolean> {
    const generated = await generateProductInfo(product.name, (product.category as any)?.name);
    if (!generated) return false;

    const updates: any = {};

    if (force) {
        if (generated.description) updates.description = generated.description;
        updates.attributes = {
            ...product.attributes,
            seo_title: generated.seo?.title || product.attributes?.seo_title || '',
            seo_meta_description: generated.seo?.meta_description || product.attributes?.seo_meta_description || '',
            brand: generated.attributes?.brand || product.attributes?.brand || '',
            specs: generated.attributes?.specs || [],
            connectivity: generated.attributes?.connectivity || [],
            benefits: generated.attributes?.benefits || [],
            technical_specs: generated.attributes?.technical_specs || [],
        };
    } else {
        if (!product.description && generated.description) updates.description = generated.description;

        const currentAttrs = product.attributes || {};
        const hasBrand = !!currentAttrs.brand;
        const hasBenefits = currentAttrs.benefits && currentAttrs.benefits.length > 0;
        const hasSpecs = currentAttrs.specs && currentAttrs.specs.length > 0;
        const hasTechnicalSpecs = currentAttrs.technical_specs && currentAttrs.technical_specs.length > 0;
        const hasSeoTitle = typeof currentAttrs.seo_title === 'string' && currentAttrs.seo_title.trim().length > 0;
        const hasSeoMeta = typeof currentAttrs.seo_meta_description === 'string' && currentAttrs.seo_meta_description.trim().length > 0;

        if (!hasBrand || !hasBenefits || !hasSpecs || !hasTechnicalSpecs || !hasSeoTitle || !hasSeoMeta) {
            updates.attributes = {
                ...currentAttrs,
                seo_title: hasSeoTitle ? currentAttrs.seo_title : generated.seo?.title || '',
                seo_meta_description: hasSeoMeta ? currentAttrs.seo_meta_description : generated.seo?.meta_description || '',
                brand: hasBrand ? currentAttrs.brand : generated.attributes?.brand || '',
                specs: hasSpecs ? currentAttrs.specs : generated.attributes?.specs || [],
                connectivity: currentAttrs.connectivity || generated.attributes?.connectivity || [],
                benefits: hasBenefits ? currentAttrs.benefits : generated.attributes?.benefits || [],
                technical_specs: hasTechnicalSpecs ? currentAttrs.technical_specs : generated.attributes?.technical_specs || [],
            };
        }
    }

    if (Object.keys(updates).length === 0) return true;

    const { error } = await supabase.from('products').update(updates).eq('id', product.id);
    if (error) {
        console.error('[AI] Update error:', error);
        return false;
    }

    return true;
}
