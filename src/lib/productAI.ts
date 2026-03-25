import { supabase } from './supabase';
import { Product } from './types';
import { useSettingsStore } from '../store/settingsStore';

const AI_MODEL = 'liquid/lfm-2-24b-a2b:latest';

export interface GeneratedProductData {
    headline?: string;
    description?: string;
    seo?: {
        title?: string;
        meta_description?: string;
    };
    attributes?: {
        brand?: string;
        techFeatures?: string[];
        productMetrics?: Record<'Détente' | 'Saveur' | 'Arôme' | 'Puissance', number>;
        productSpecs?: {
            name: string;
            icon: string;
            category: string;
            description: string;
            intensity: number;
        }[];
    };
}

/**
 * Uses OpenRouter to generate missing product information based on the name.
 */
export async function generateProductInfo(productName: string, categoryName?: string): Promise<GeneratedProductData | null> {
    const storeName = useSettingsStore.getState().settings.store_name || 'Green Mood';
    const domainContext = categoryName ? `dans la catégorie "${categoryName}"` : `pour la boutique CBD "${storeName}"`;

    const prompt = `
    Agis en tant qu'expert en CBD et Cannabis légal. Recherche les caractéristiques de : "${productName}" ${domainContext}.
    Génère un JSON e-commerce en français, style premium, luxueux et apaisant.

    CONSIGNES DE SÉCURITÉ JSON :
    - NE JAMAIS utiliser de guillemets doubles (") à l'intérieur des valeurs (texte). Utilise des guillemets simples (').
    - Utilise des balises HTML (<p>, <strong>, <ul>, <li>) dans 'description'.
    - Pas de texte avant/après le bloc {}.

    INFOS À GÉNÉRER :
    1. 'headline' : Accroche courte et percutante (ex: 'L'excellence californienne au service de votre détente').
    2. 'description' : Texte immersif décrivant l'arôme, le goût et l'effet.
    3. 'seo' : Titre et meta-description optimisés.
    4. 'attributes' : 
       - 'brand': 'Green Mood Exclusive' (ou la marque réelle si connue).
       - 'techFeatures': 3-5 tags courts (ex: 'Indoor', 'Full Spectrum', 'Lab Tested', '100% Organique').
       - 'productMetrics': Un objet avec 'Détente', 'Saveur', 'Arôme', 'Puissance' (scores de 1 à 10).
       - 'productSpecs': Liste de specs structurées (Méthode de culture, Taux de CBD, Taux de THC < 0.3%, Profil de Terpènes, Effets Dominants).

    Exemple de structure :
    {
        "headline": "...",
        "description": "<p>...</p>",
        "seo": { "title": "...", "meta_description": "..." },
        "attributes": {
            "brand": "Green Mood",
            "techFeatures": ["Indoor", "Sans pesticides"],
            "productMetrics": { "Détente": 8, "Saveur": 9, "Arôme": 9, "Puissance": 7 },
            "productSpecs": [
                { "name": "Culture", "icon": "🌱", "category": "Culture", "description": "Indoor", "intensity": 90 },
                { "name": "CBD", "icon": "🧪", "category": "Taux", "description": "15%", "intensity": 75 }
            ]
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
            headline: generated.headline || product.attributes?.headline || '',
            seo_title: generated.seo?.title || product.attributes?.seo_title || '',
            seo_meta_description: generated.seo?.meta_description || product.attributes?.seo_meta_description || '',
            brand: generated.attributes?.brand || product.attributes?.brand || '',
            techFeatures: generated.attributes?.techFeatures || [],
            productMetrics: generated.attributes?.productMetrics || {},
            productSpecs: generated.attributes?.productSpecs || [],
        };
    } else {
        if (!product.description && generated.description) updates.description = generated.description;

        const currentAttrs = product.attributes || {};
        const hasBrand = !!currentAttrs.brand;
        const hasMetrics = currentAttrs.productMetrics && Object.keys(currentAttrs.productMetrics).length > 0;
        const hasTechFeatures = currentAttrs.techFeatures && currentAttrs.techFeatures.length > 0;
        const hasProductSpecs = currentAttrs.productSpecs && currentAttrs.productSpecs.length > 0;
        const hasSeoTitle = typeof currentAttrs.seo_title === 'string' && currentAttrs.seo_title.trim().length > 0;
        const hasSeoMeta = typeof currentAttrs.seo_meta_description === 'string' && currentAttrs.seo_meta_description.trim().length > 0;
        const hasHeadline = !!currentAttrs.headline;

        if (!hasBrand || !hasMetrics || !hasTechFeatures || !hasProductSpecs || !hasSeoTitle || !hasSeoMeta || !hasHeadline) {
            updates.attributes = {
                ...currentAttrs,
                headline: hasHeadline ? currentAttrs.headline : generated.headline || '',
                seo_title: hasSeoTitle ? currentAttrs.seo_title : generated.seo?.title || '',
                seo_meta_description: hasSeoMeta ? currentAttrs.seo_meta_description : generated.seo?.meta_description || '',
                brand: hasBrand ? currentAttrs.brand : generated.attributes?.brand || '',
                techFeatures: hasTechFeatures ? currentAttrs.techFeatures : generated.attributes?.techFeatures || [],
                productMetrics: hasMetrics ? currentAttrs.productMetrics : generated.attributes?.productMetrics || {},
                productSpecs: hasProductSpecs ? currentAttrs.productSpecs : generated.attributes?.productSpecs || [],
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
