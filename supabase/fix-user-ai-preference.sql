-- REFONTE TOTALE : user_ai_preferences
-- Transition CBD (terpènes, intensity) -> HIGH-TECH (tech_goal, platform, priority)

-- 1. Supprimer l'ancienne table si elle existe
DROP TABLE IF EXISTS public.user_ai_preferences;

-- 2. Créer la nouvelle table avec les nouveaux champs high-tech
CREATE TABLE public.user_ai_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  user_id uuid NULL,
  
  -- Nouveaux champs High-Tech
  tech_goal text NULL, -- ex: "Gaming", "Work", "Creation"
  experience_level text NULL, -- ex: "Beginner", "Enthusiast", "Pro"
  preferred_categories text[] NULL DEFAULT '{}'::text[], -- ex: ["Laptops", "GPU"]
  budget_range text NULL, -- ex: "Entry", "Mid", "High-End"
  platform_preference text NULL, -- ex: "Windows", "MacOS"
  usage_frequency text NULL, -- ex: "Daily", "Occasional"
  priority_features text[] NULL DEFAULT '{}'::text[], -- ex: ["Performance", "Battery"]
  
  -- Champs génériques conservés
  extra_prefs jsonb NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT user_ai_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_ai_preferences_user_id_key UNIQUE (user_id),
  CONSTRAINT user_ai_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 3. Indexation pour les préférences dynamiques
CREATE INDEX IF NOT EXISTS idx_user_ai_extra_prefs ON public.user_ai_preferences USING gin (extra_prefs) TABLESPACE pg_default;

-- 4. RLS (Row Level Security) - Optionnel mais recommandé
ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_ai_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_ai_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

