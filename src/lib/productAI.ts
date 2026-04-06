import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Product } from './types';
import { useSettingsStore } from '../store/settingsStore';
import { useToastStore } from '../store/toastStore';

const AI_MODEL = 'mistralai/mistral-small-creative';

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

    CONSIGNES DE SÉCURITÉ JSON (CRITIQUE) :
    - RÉPONDRE EXCLUSIVEMENT AVEC UN OBJET JSON VALIDE STRICT.
    - AUCUN TEXTE avant ou après le JSON. PAS DE BACKTICKS (\`\`\`json).
    - N'UTILISE JAMAIS de guillemets doubles (") à l'intérieur de tes textes (headline, description, seo). Si tu dois citer, utilise UNIQUEMENT des guillemets simples (').
    - DANS LE CHAMP 'seo', N'ÉCRIS JAMAIS DE BALISES HTML.
    - Utilise TOUJOURS des guillemets doubles (") EXCLUSIVEMENT pour encadrer CHAQUE CLÉ et CHAQUE VALEUR de type chaîne.
    - Vérifie toujours la présence des guillemets ouvrants ET fermants pour chaque mot.
    - Utilise des balises HTML standards (<p>, <strong>, <ul>, <li>) exclusivement à l'intérieur de 'description'.

    CONSIGNES SPÉCIFIQUES POUR 'productSpecs' :
    - Rends les descriptions ULTRA COUNCISES (Max 15-20 mots par critère).
    - 'Profil de Terpènes' : Liste uniquement les 2-3 notes dominantes avec pourcentages si possible (ex: 'Citron (35%), Pin (20%)').
    - 'Méthode de Culture' : Sois très direct (ex: 'Indoor, 100% Organique' ou 'Glasshouse, Terre').
    - 'Cannabinoïdes' : Résume l'essentiel (ex: 'CBD: 12%, THC < 0.2%, Full Spectrum').
    - 'Certifications' : Cite uniquement le labo ou la norme (ex: 'Labo Indépendant (ISO 17025)').
    - Utilise des balises <strong> pour mettre en valeur les MOTS CLÉS uniquement à l'intérieur des descriptions de specs.

    STRUCTURE STRICTE EXIGÉE :
    {
        "headline": "Texte court",
        "description": "<p>Texte HTML</p>",
        "seo": { "title": "Titre", "meta_description": "Description" },
        "attributes": {
            "brand": "Marque",
            "cbd_percentage": 15.5,
            "thc_max": 0.18,
            "techFeatures": ["Tag1", "Tag2"],
            "productMetrics": { "Détente": 8, "Saveur": 9, "Arôme": 9, "Puissance": 7 },
            "productSpecs": [
                { "name": "Profil de Terpènes", "icon": "🌿", "category": "Profil Aromatique", "description": "Notes de <strong>Citron</strong> et <strong>Pin</strong>", "intensity": 85 },
                { "name": "Méthode de Culture", "icon": "🏗️", "category": "Culture", "description": "<strong>Indoor</strong> haute performance", "intensity": 90 }
            ]
        }
    }

    ATTENTION : Le champ 'productSpecs' DOIT être une liste d'objets [{}, {}]. Ne mets JAMAIS de clés directes comme "Cannabinoïdes": {} à l'intérieur de la liste.

    CONTEXTE LÉGAL : THC toujours <= 0,3 %. Pas d'allégations thérapeutiques.
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

        if (data.error) {
            console.error('[AI] Internal Function Error:', data);
            useToastStore.getState().addToast({
                type: 'error',
                message: `Erreur IA Interne: ${data.message || data.error}`
            });
            return null;
        }

        let content = data?.choices?.[0]?.message?.content;
        if (!content) {
            console.warn('[AI] No content returned from AI model:', data);
            return null;
        }

        let jsonString = '';
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && end > start) {
            jsonString = content.substring(start, end + 1);
            
            // Replace newlines, tabs, and carriage returns with a single space to avoid syntax errors
            // while maintaining valid JSON token separation. 
            // Control characters are stripped.
            jsonString = jsonString
                .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '')
                .replace(/[\n\r\t]/g, ' ');
            
            // Cleanup tags
            jsonString = jsonString
                .replace(/<attributes>|<\/attributes>|<components>|<\/components>/g, '')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');

        } else {
            console.error('[AI] No JSON block found in content');
            return null;
        }

        const initialParse = (str: string) => {
            try { return JSON.parse(str); } catch { return null; }
        };

        let parsed = initialParse(jsonString);

        if (!parsed) {
            // --- Advanced Repair Chain ---
            console.log('[AI] Initial parse failed, attempting advanced repairs...');
            
            let repaired = jsonString
                // 1. Fix smart/fancy quotes
                .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
                .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

            // 2. Fix unquoted keys or keys with single quotes, allowing accented characters
            repaired = repaired.replace(/([{,]\s*)(['"]?)([a-zA-ZÀ-ÿ0-9_]+)(['"]?\s*):/g, '$1"$3":');

            // 3. Fix values with single quotes
            repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');

            // 4. Fix missing opening quotes for string values ending with quote and comma
            // e.g. "category": Cannabinoïdes", -> "category": "Cannabinoïdes",
            repaired = repaired.replace(/:\s*([^"'\s{}[\]][^"']*?)["']\s*([,}])/g, ': "$1"$2');

            parsed = initialParse(repaired);
            if (parsed) {
                console.log('[AI] Advanced repair successful.');
                jsonString = repaired;
            }
        }

        try {
            return (parsed || JSON.parse(jsonString)) as GeneratedProductData;
        } catch (e) {
            console.warn('[AI] JSON Parse failed permanently after all repair attempts:', e);
            console.log('[AI] Failed JSON string was:', jsonString);
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
    const currentAttrs = product.attributes || {};

    if (force) {
        if (generated.description) updates.description = generated.description;
        
        updates.attributes = {
            ...currentAttrs,
            cbd_percentage: generated.attributes?.cbd_percentage || 0,
            thc_max: generated.attributes?.thc_max || 0.2,
            headline: generated.headline || currentAttrs.headline || '',
            seo_title: generated.seo?.title || currentAttrs.seo_title || '',
            seo_meta_description: generated.seo?.meta_description || currentAttrs.seo_meta_description || '',
            brand: generated.attributes?.brand || currentAttrs.brand || '',
            culture_method: generated.attributes?.techFeatures?.[0] || 'Indoor',
            effects: generated.attributes?.techFeatures || [],
            techFeatures: generated.attributes?.techFeatures || [],
            productMetrics: generated.attributes?.productMetrics || {},
            productSpecs: generated.attributes?.productSpecs || [],
            technical_specs: generated.attributes?.productSpecs?.map((ps: any) => ({
                group: ps.category,
                items: [{ label: ps.name, value: ps.description }]
            })) || [],
        };
    } else {
        if (!product.description && generated.description) updates.description = generated.description;

        const hasBrand = !!currentAttrs.brand;
        const hasMetrics = currentAttrs.productMetrics && Object.keys(currentAttrs.productMetrics).length > 0;
        const hasTechFeatures = currentAttrs.techFeatures && currentAttrs.techFeatures.length > 0;
        const hasProductSpecs = currentAttrs.productSpecs && currentAttrs.productSpecs.length > 0;
        const hasSeoTitle = !!currentAttrs.seo_title;
        const hasSeoMeta = !!currentAttrs.seo_meta_description;
        const hasHeadline = !!currentAttrs.headline;
        const hasEffects = currentAttrs.effects && currentAttrs.effects.length > 0;

        if (!hasBrand || !hasMetrics || !hasTechFeatures || !hasProductSpecs || !hasSeoTitle || !hasSeoMeta || !hasHeadline || !hasEffects) {
            updates.attributes = {
                ...currentAttrs,
                cbd_percentage: currentAttrs.cbd_percentage || generated.attributes?.cbd_percentage || 0,
                thc_max: currentAttrs.thc_max || generated.attributes?.thc_max || 0.2,
                headline: currentAttrs.headline || generated.headline || '',
                seo_title: currentAttrs.seo_title || generated.seo?.title || '',
                seo_meta_description: currentAttrs.seo_meta_description || generated.seo?.meta_description || '',
                brand: currentAttrs.brand || generated.attributes?.brand || '',
                culture_method: currentAttrs.culture_method || generated.attributes?.techFeatures?.[0] || 'Indoor',
                effects: (currentAttrs.effects?.length ?? 0) > 0 ? currentAttrs.effects : (generated.attributes?.techFeatures || []),
                techFeatures: currentAttrs.techFeatures?.length ? currentAttrs.techFeatures : (generated.attributes?.techFeatures || []),
                productMetrics: (currentAttrs.productMetrics && Object.keys(currentAttrs.productMetrics).length > 0) ? currentAttrs.productMetrics : (generated.attributes?.productMetrics || {}),
                productSpecs: currentAttrs.productSpecs?.length ? currentAttrs.productSpecs : (generated.attributes?.productSpecs || []),
                technical_specs: (currentAttrs.technical_specs?.length ?? 0) > 0 ? currentAttrs.technical_specs : (generated.attributes?.productSpecs?.map((ps: any) => ({
                    group: ps.category,
                    items: [{ label: ps.name, value: ps.description }]
                })) || []),
            };
        }
    }

    if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('products').update(updates).eq('id', product.id);
        if (error) {
            console.error('[AI] Update error:', error);
            return false;
        }
    }

    return true;
}

/**
 * Assigne automatiquement un produit à la meilleure catégorie via l'IA.
 */
export async function autoCategorizeProduct(product: Product, categories: {id: string, name: string}[]): Promise<string | null> {
    const prompt = `
    Agis en tant qu'expert en classification de produits CBD et bien-être.
    Tu dois trouver la meilleure catégorie pour le produit suivant :
    - Nom: ${product.name}
    - Description: ${product.description || 'Non renseignée'}
    
    Voici la liste des catégories disponibles :
    ${categories.map(c => `- ID: ${c.id} | Nom: ${c.name}`).join('\n')}
    
    CONSIGNES (CRITIQUE) :
    - RÉPONDRE EXCLUSIVEMENT AVEC UN OBJET JSON. NE JAMAIS inclure de texte avant ou après.
    - Le JSON doit avoir la structure suivante : { "category_id": "L'ID CHOISI" }
    - Si aucune catégorie ne correspond, renvoie { "category_id": null }
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
                x_title: `Auto Categorization`,
            })
        });

        if (!response.ok) return null;
        const data = await response.json();

        let content = data?.choices?.[0]?.message?.content;
        if (!content) return null;

        let jsonString = '';
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && end > start) {
            jsonString = content.substring(start, end + 1);
            jsonString = jsonString.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '').replace(/[\n\r\t]/g, ' ');
            
            try {
                const parsed = JSON.parse(jsonString);
                if (parsed && typeof parsed.category_id === 'string' && parsed.category_id) {
                    return parsed.category_id;
                }
            } catch (e) {
                console.error('[AI] Failed to parse category JSON:', e);
            }
        }
        return null;
    } catch (err) {
        console.error('[AI] Error in autoCategorizeProduct:', err);
        return null;
    }
}
