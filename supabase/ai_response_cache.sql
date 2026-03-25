-- Cache de réponses LLM (exact prompt match)
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  cache_key text PRIMARY KEY,
  response_json jsonb NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_response_cache
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes');

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_usage
  ON public.ai_response_cache (usage_count DESC, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires_at
  ON public.ai_response_cache (expires_at);

CREATE OR REPLACE FUNCTION public.increment_ai_response_cache_usage(p_cache_key text)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_response_cache
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE cache_key = p_cache_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_response_cache()
RETURNS bigint AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at <= now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can do everything on ai_response_cache" ON public.ai_response_cache;
CREATE POLICY "Service role can do everything on ai_response_cache"
ON public.ai_response_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
