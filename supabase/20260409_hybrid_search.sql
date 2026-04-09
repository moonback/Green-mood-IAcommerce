-- 🔍 Hybrid Search - Fallback Text Search Function
-- This function allows the UI to perform a non-vector search when embeddings are unavailable
-- or when pure text matching is more appropriate.

CREATE OR REPLACE FUNCTION public.match_products_text(
  query_text TEXT,
  match_count INT DEFAULT 30
)
RETURNS TABLE (
  id             uuid,
  category_id    uuid,
  slug           text,
  name           text,
  description    text,
  weight_grams   numeric(8,2),
  price          numeric(10,2),
  image_url      text,
  stock_quantity int,
  is_available   boolean,
  is_featured    boolean,
  is_active      boolean,
  created_at     timestamptz,
  attributes     jsonb,
  is_bundle      boolean,
  original_value numeric(10,2),
  similarity     float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.category_id, p.slug, p.name, p.description,
    p.weight_grams, p.price, p.image_url,
    p.stock_quantity, p.is_available, p.is_featured, p.is_active,
    p.created_at, p.attributes, p.is_bundle, p.original_value,
    (CASE 
      WHEN p.name ILIKE query_text THEN 1.0
      WHEN p.name ILIKE query_text || '%' THEN 0.8
      WHEN p.name ILIKE '%' || query_text || '%' THEN 0.6
      WHEN p.description ILIKE '%' || query_text || '%' THEN 0.4
      ELSE 0.2
    END)::float as similarity
  FROM public.products p
  WHERE p.is_active = true
    AND p.is_available = true
    AND (
      p.name ILIKE '%' || query_text || '%'
      OR p.description ILIKE '%' || query_text || '%'
      OR p.slug ILIKE '%' || query_text || '%'
      OR p.attributes::text ILIKE '%' || query_text || '%'
    )
  ORDER BY similarity DESC, p.is_featured DESC
  LIMIT match_count;
END;
$$;
