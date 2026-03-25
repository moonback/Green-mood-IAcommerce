import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Product } from './types';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';

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
        cbd_percentage?: number;
        thc_max?: number;
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
    2. 'description' : Texte immersif décrivant l'arôme (terpènes), le goût et l'expérience.
    3. 'seo' : Titre et meta-description optimisés pour le référencement CBD.
    4. 'attributes' : 
       - 'brand': Fabricant original ou 'Production Exclusive'.
       - 'cbd_percentage': Valeur numérique entre 5 et 90 (ex: 22.5).
       - 'thc_max': Valeur numérique <= 0.3 (ex: 0.18).
       - 'techFeatures': 3-5 tags (ex: ['Indoor', 'Bio-Organique', 'Grown in Italy', 'Full Spectrum']).
       - 'productMetrics': { 'Détente': 8, 'Saveur': 9, 'Arôme': 9, 'Puissance': 7 } (scores sur 10).
       - 'productSpecs': Liste d'objets { name, description, category } pour : 'Profil de Terpènes', 'Méthode de Culture', 'Effet Dominant', 'Certifications'.

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
        const { data: { session } } = await supabase.auth.getSession();
        const functionUrl = `${SUPABASE_URL}/functions/v1/ai-chat?apikey=${SUPABASE_ANON_KEY}`;
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY,
                'x-client-info': 'green-mood-ai-ecommerce'
            },
            body: JSON.stringify({
                model: AI_MODEL,
                messages: [{ role: 'user', content: prompt }],
                x_title: `${storeName} Admin AI`,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[AI] Direct Fetch Error:', {
                status: response.status,
                statusText: response.statusText,
                errorText,
                hasSession: !!session,
                url: functionUrl
            });
            
            useToastStore.getState().addToast({
                type: 'error',
                message: `Erreur IA (${response.status}): ${response.status === 401 ? 'Session expirée ou non autorisée' : 'Service indisponible'}`
            });
            
            return null;
        }

        const data = await response.json();

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
        if (generated.attributes?.cbd_percentage) updates.cbd_percentage = generated.attributes.cbd_percentage;
        if (generated.attributes?.thc_max) updates.thc_max = generated.attributes.thc_max;
        
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
            if (generated.attributes?.cbd_percentage) updates.cbd_percentage = generated.attributes.cbd_percentage;
            if (generated.attributes?.thc_max) updates.thc_max = generated.attributes.thc_max;

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
