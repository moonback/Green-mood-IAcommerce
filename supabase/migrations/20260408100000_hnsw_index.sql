-- L'extension pgvector limite les index HNSW à 2000 dimensions pour le type 'vector'.
-- Puisque votre colonne est en 3072 dimensions, nous utilisons le cast `halfvec` (flottant 16-bits)
-- qui supporte jusqu'à 4000 dimensions, avec une perte de précision négligeable.

CREATE INDEX IF NOT EXISTS idx_products_embedding_hnsw
ON public.products
USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Pour que PostgreSQL utilise cet index, la fonction de recherche (RPC) 
-- doit exécuter la comparaison sémantique en utilisant ce même cast "halfvec".
CREATE OR REPLACE FUNCTION public.match_products(
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  category_id uuid,
  slug text,
  name text,
  description text,
  weight_grams numeric,
  price numeric,
  image_url text,
  stock_quantity integer,
  is_available boolean,
  is_featured boolean,
  is_active boolean,
  created_at timestamp with time zone,
  attributes jsonb,
  is_bundle boolean,
  original_value numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.category_id, p.slug, p.name, p.description, p.weight_grams, p.price, p.image_url,
    p.stock_quantity, p.is_available, p.is_featured, p.is_active, p.created_at, p.attributes, p.is_bundle, p.original_value,
    1 - (p.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) AS similarity
  FROM products p
  WHERE p.is_active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)) > match_threshold
  ORDER BY p.embedding::halfvec(3072) <=> query_embedding::halfvec(3072)
  LIMIT match_count;
END;
$$;
