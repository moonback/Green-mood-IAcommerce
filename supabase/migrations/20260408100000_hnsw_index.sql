-- Création de l'index HNSW (Hierarchical Navigable Small World)
-- Permet des performances de recherche sémantique sub-millisecondes comparé à un scan séquentiel ou même IVFFlat.
CREATE INDEX IF NOT EXISTS idx_products_embedding_hnsw
ON public.products
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- L'index HNSW permet des requêtes quasi instantanées, ce qui réduit considérablement
-- la latence perçue pour les réponses de BudTender impliquant du Vector Search (match_products).
