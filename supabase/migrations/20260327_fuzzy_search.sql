-- Enable the pg_trgm extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIST index on the product name for fast similarity searches
-- Using gin_trgm_ops or gist_trgm_ops. GIST is often better for similarity ordering.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIST (name gist_trgm_ops);

-- RPC function for fuzzy product search
CREATE OR REPLACE FUNCTION public.search_products_fuzzy(
  search_text text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the similarity threshold for the % operator
  -- Note: similarity() ignores the set_limit, but % uses it.
  -- Here we use similarity() directly for ordering.
  RETURN QUERY
  SELECT p.*
  FROM public.products p
  WHERE p.is_active = true
    AND (
      p.name % search_text 
      OR similarity(p.name, search_text) > match_threshold
    )
  ORDER BY similarity(p.name, search_text) DESC
  LIMIT match_count;
END;
$$;

ALTER FUNCTION public.search_products_fuzzy(text, float, int) OWNER TO postgres;

COMMENT ON FUNCTION public.search_products_fuzzy IS 'Recherche floue de produits utilisant pg_trgm (trigrammes) pour une meilleure performance et tolérance aux fautes de frappe.';
