import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;

if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
    console.error('Missing required environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

async function syncEmbeddings() {
    console.log('--- Starting Embeddings Sync ---');

    // 1. Fetch products without embeddings (or all if forced)
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, attributes')
        .is('embedding', null);

    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    if (!products || products.length === 0) {
        console.log('No products found needing embeddings.');
        return;
    }

    console.log(`Found ${products.length} products to process.`);

    for (const product of products) {
        try {
            // 2. Build text to embed (name + description + attributes)
            const aromas = (product.attributes?.aromas ?? []).join(', ');
            const benefits = (product.attributes?.benefits ?? []).join(', ');

            const textToEmbed = `
        NOM: ${product.name}
        DESCRIPTION: ${product.description || ''}
        AROMES: ${aromas}
        EFFETS: ${benefits}
      `.trim();

            console.log(`Embedding: ${product.name}...`);
            const response = await genAI.models.embedContent({
                model: "gemini-embedding-001",
                contents: [{ parts: [{ text: textToEmbed }] }]
            });
            const embedding = response.embeddings?.[0]?.values;

            // 3. Update product with embedding
            const { error: updateError } = await supabase
                .from('products')
                .update({ embedding })
                .eq('id', product.id);

            if (updateError) {
                console.error(`Error updating product ${product.name}:`, updateError);
            } else {
                console.log(`Successfully updated ${product.name}!`);
            }
        } catch (err) {
            console.error(`Unexpected error processing ${product.name}:`, err);
        }
    }

    console.log('--- Embeddings Sync Complete ---');
}

syncEmbeddings();
