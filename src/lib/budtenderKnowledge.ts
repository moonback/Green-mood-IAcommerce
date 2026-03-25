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
            console.error('[BudTender RAG] match_knowledge RPC error:', error);
            throw error;
        }

        if (data && data.length > 0) {
            relevantKnowledge = data;
            console.log(`[BudTender RAG] Found ${data.length} relevant knowledge entries.`);
        }
    } catch (err) {
        console.warn('[BudTender RAG] Vector search on knowledge base failed:', err);
    }

    return relevantKnowledge;
}
