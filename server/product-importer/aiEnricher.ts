import { GoogleGenAI } from '@google/genai';
import type { ScrapedProduct } from '../../src/types/productImporter';

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  if (!aiInstance && GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiInstance;
}

export interface EnrichedProductData {
  title: string;
  description: string;
  shortDescription: string;
  features: string[];
  suggestedCategory?: string;
  suggestedTags: string[];
}

export async function enrichProductWithAI(product: ScrapedProduct): Promise<EnrichedProductData | null> {
  const ai = getAI();
  if (!ai) {
    console.warn('[AI Enricher] GEMINI_API_KEY is not configured.');
    return null;
  }

  const prompt = `
    Tu es un expert en e-commerce spécialisé dans le copywriting de luxe.
    Génère une fiche produit concise, premium et ultra-convaincante en français pour ce produit.

    Données brutes :
    - Titre : ${product.title}
    - Description : ${product.description}
    - Marque : ${product.metadata.brand || 'Inconnue'}

    Directives STRICTES :
    1. STYLE : Ton : Premium, Direct, Élégant. Évite le blabla inutile.
    2. TITRE : Un titre court et percutant (max 60 car).
    3. ACCROCHE : Maximum 2 phrases très courtes qui donnent envie.
    4. DESCRIPTION HTML : Utilise uniquement <p>, <strong>, <ul> et <li>. Sois CONCIS. Fais des phrases courtes. Ne dépasse pas 300 mots au total pour la description.
    5. POINTS FORTS : 3 points clés maximum, avec des phrases de 10 mots max.
    6. FORMAT : Réponds UNIQUEMENT en JSON.

    Format JSON attendu :
    {
      "title": "...",
      "description": "...",
      "shortDescription": "...",
      "features": ["...", "..."],
      "suggestedCategory": "...",
      "suggestedTags": ["...", "..."]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Utilisation de 1.5-flash par défaut qui est plus stable en quota
      contents: prompt,
      config: {
        tools: [{ google_search: {} }] as any
      }
    });

    const text = response.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as EnrichedProductData;
  } catch (error) {
    console.error('[AI Enricher] AI generation failed:', error);
    // Tentative finale avec 1.5-flash sans outils pour minimiser les erreurs
    try {
      console.log('[AI Enricher] Retrying simple generation...');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      const text = response.text;
      const jsonMatch = text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (retryError) {
      console.error('[AI Enricher] All attempts failed:', retryError);
    }
    return null;
  }
}
