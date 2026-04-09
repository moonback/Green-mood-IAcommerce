import { generateEmbedding } from './embeddings';
import { toPgVectorLiteral } from './vector';
import { supabase } from './supabase';

export interface KnowledgeItem {
    id: string;
    title: string;
    content: string;
    category?: string;
    similarity?: number;
}

export async function getRelevantKnowledge(
    text: string, 
    limit: number = 3, 
    minSimilarity: number = 0.3,
    queryEmbedding?: number[],
): Promise<KnowledgeItem[]> {
    let relevantKnowledge: KnowledgeItem[] = [];

    try {
        console.log('[BudTender RAG] Semantic search on knowledge base for:', text);
        const embedding = queryEmbedding && queryEmbedding.length > 0
            ? queryEmbedding
            : await generateEmbedding(text);
        
        // Call the RPC defined in the migration
        const { data, error } = await supabase.rpc('match_knowledge', {
            query_embedding: toPgVectorLiteral(embedding),
            match_threshold: minSimilarity, 
            match_count: limit,
        });

        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
            relevantKnowledge = data;
        }
    } catch (err) {
        console.warn('[BudTender RAG] Vector search on knowledge base failed. Using fallback text search.', err);
        try {
            // Text search fallback if semantic search fails (e.g. pgvector not enabled or function missing)
            const textQuery = text.trim().split(' ').filter(w => w.length > 2).join(' | ');
            if (textQuery) {
                const { data: textData } = await supabase
                    .from('budtender_knowledge')
                    .select('id, title, content, category')
                    .textSearch('title', textQuery, { type: 'websearch' })
                    .limit(limit);
                
                if (textData && textData.length > 0) {
                    relevantKnowledge = textData.map(k => ({ ...k, similarity: 0.5 }));
                } else {
                    // Ultra-basic ILIKE fallback for short 1-word queries
                    const ilikeTerm = `%${text.trim()}%`;
                    const { data: ilikeData } = await supabase
                        .from('budtender_knowledge')
                        .select('id, title, content, category')
                        .or(`title.ilike.${ilikeTerm},content.ilike.${ilikeTerm}`)
                        .limit(limit);
                    if (ilikeData) relevantKnowledge = ilikeData.map(k => ({ ...k, similarity: 0.5 }));
                }
            }
        } catch (fbErr) {
            console.error('[BudTender RAG] Fallback text search also failed:', fbErr);
        }
    }

    return relevantKnowledge;
}
