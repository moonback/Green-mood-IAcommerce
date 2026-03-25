-- ─── Table pour la mise en cache des embeddings (Economie API) ───
CREATE TABLE IF NOT EXISTS public.search_embeddings_cache (
  query_text    text        PRIMARY KEY, -- Requête normalisée (lowercase, trimmed)
  embedding     vector(3072) NOT NULL,   -- Vecteur généré par l'IA
  usage_count   integer      NOT NULL DEFAULT 1,
  last_used_at  timestamptz  NOT NULL DEFAULT now(),
  created_at    timestamptz  NOT NULL DEFAULT now()
);

-- Index pour accélérer les mises à jour et le suivi de fréquence
CREATE INDEX IF NOT EXISTS idx_search_cache_usage ON public.search_embeddings_cache (usage_count DESC, last_used_at DESC);

-- Fonction pour incrémenter les stats de cache de manière atomique
CREATE OR REPLACE FUNCTION public.increment_search_cache_usage(p_query text)
RETURNS void AS $$
BEGIN
  UPDATE public.search_embeddings_cache
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE query_text = p_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS : Seul le rôle service (Edge Functions) peut insérer/modifier.
ALTER TABLE public.search_embeddings_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything"
ON public.search_embeddings_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Permettre la lecture anonyme si on veut déporter la logique côté client plus tard (optionnel)
CREATE POLICY "Public read access"
ON public.search_embeddings_cache
FOR SELECT
TO anon, authenticated
USING (true);
