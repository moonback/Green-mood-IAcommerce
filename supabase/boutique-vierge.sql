-- ═══════════════════════════════════════════════════════════════════
-- ESIL Ventes — Schéma complet vierge (sans données)
-- Toutes les migrations consolidées + RLS corrigées
-- Exécuter dans : Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── Extensions ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;


-- ═══════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        UNIQUE NOT NULL,
  name        text        NOT NULL,
  description text,
  icon_name   text,
  image_url   text,
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. products (colonnes consolidées de toutes les migrations) ───
CREATE TABLE IF NOT EXISTS public.products (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    uuid         NOT NULL REFERENCES public.categories(id),
  slug           text         UNIQUE NOT NULL,
  name           text         NOT NULL,
  description    text,
  weight_grams   numeric(8,2),
  price          numeric(10,2) NOT NULL,
  image_url      text,
  stock_quantity int           NOT NULL DEFAULT 0,
  is_available   boolean       NOT NULL DEFAULT true,
  is_featured    boolean       NOT NULL DEFAULT false,
  is_active      boolean       NOT NULL DEFAULT true,
  is_bundle        boolean       NOT NULL DEFAULT false,
  is_subscribable  boolean       NOT NULL DEFAULT false,
  original_value   numeric(10,2),
  attributes       jsonb         DEFAULT '{}'::jsonb,
  sku            text          UNIQUE,
  embedding      vector(3072),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

-- ─── 3. profiles (colonnes consolidées de toutes les migrations) ───
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             text,
  phone                 text,
  email                 text,
  loyalty_points        int         NOT NULL DEFAULT 0,
  is_admin              boolean     NOT NULL DEFAULT false,
  referral_code         text        UNIQUE,
  referred_by_id        uuid        REFERENCES public.profiles(id),
  birthday              date,
  last_birthday_gift_at timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. addresses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label       text        NOT NULL DEFAULT 'Domicile',
  street      text        NOT NULL,
  city        text        NOT NULL,
  postal_code text        NOT NULL,
  country     text        NOT NULL DEFAULT 'France',
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. orders (colonnes consolidées) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        REFERENCES public.profiles(id),
  status                  text        NOT NULL DEFAULT 'pending',
  delivery_type           text        NOT NULL DEFAULT 'click_collect',
  address_id              uuid        REFERENCES public.addresses(id),
  subtotal                numeric(10,2) NOT NULL,
  delivery_fee            numeric(10,2) NOT NULL DEFAULT 0,
  total                   numeric(10,2) NOT NULL,
  loyalty_points_earned   int         NOT NULL DEFAULT 0,
  loyalty_points_redeemed int         NOT NULL DEFAULT 0,
  promo_code              text,
  promo_discount          numeric(10,2) NOT NULL DEFAULT 0,
  viva_order_code         text,
  payment_status          text        NOT NULL DEFAULT 'pending',
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ─── 6. order_items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   uuid          NOT NULL REFERENCES public.products(id),
  product_name text          NOT NULL,
  unit_price   numeric(10,2) NOT NULL,
  quantity     int           NOT NULL,
  total_price  numeric(10,2) NOT NULL
);

-- ─── 7. stock_movements ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid        NOT NULL REFERENCES public.products(id),
  quantity_change int         NOT NULL,
  type            text        NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 8. store_settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_settings (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 9. loyalty_transactions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id      uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  type          text        NOT NULL CHECK (type IN ('earned', 'redeemed', 'adjusted', 'expired')),
  points        int         NOT NULL,
  balance_after int         NOT NULL,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── 10. subscriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id         uuid        NOT NULL REFERENCES public.products(id),
  quantity           int         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  frequency          text        NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_delivery_date date        NOT NULL,
  status             text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── 11. subscription_orders ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid        NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  order_id        uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 12. reviews ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id     uuid        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating       smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  is_verified  boolean     NOT NULL DEFAULT false,
  is_published boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id, order_id)
);

-- ─── 13. catalog_ads ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalog_ads (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  tagline           text        NOT NULL DEFAULT '',
  description       text        NOT NULL DEFAULT '',
  image_url         text        NOT NULL DEFAULT '',
  cta_label         text        NOT NULL DEFAULT 'Voir',
  cta_url           text        NOT NULL DEFAULT '',
  badge_text        text,
  badge_color       text        CHECK (badge_color IN ('neon','amber','purple','pink','blue')),
  target_categories text[]      NOT NULL DEFAULT '{}',
  target_tags       text[]      NOT NULL DEFAULT '{}',
  is_active         boolean     NOT NULL DEFAULT true,
  position          int         NOT NULL DEFAULT 4,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── 14. promo_codes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text          UNIQUE NOT NULL,
  description     text,
  discount_type   text          NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value numeric(10,2) NOT NULL DEFAULT 0,
  max_uses        int,
  uses_count      int           NOT NULL DEFAULT 0,
  expires_at      timestamptz,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ─── 14. bundle_items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bundle_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id  uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_id uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity   int         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, product_id)
);

-- ─── 15. product_recommendations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_recommendations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recommended_id uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order     int         NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, recommended_id),
  CHECK (product_id <> recommended_id)
);

-- ─── 16. pos_reports (colonnes consolidées) ───────────────────────
CREATE TABLE IF NOT EXISTS public.pos_reports (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  date              date          UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  total_sales       numeric(10,2) NOT NULL DEFAULT 0,
  cash_total        numeric(10,2) NOT NULL DEFAULT 0,
  card_total        numeric(10,2) NOT NULL DEFAULT 0,
  mobile_total      numeric(10,2) NOT NULL DEFAULT 0,
  items_sold        int           NOT NULL DEFAULT 0,
  order_count       int           NOT NULL DEFAULT 0,
  product_breakdown jsonb         DEFAULT '{}'::jsonb,
  cash_counted      numeric(10,2) DEFAULT 0,
  cash_difference   numeric(10,2) DEFAULT 0,
  closed_at         timestamptz   NOT NULL DEFAULT now(),
  closed_by         uuid          REFERENCES public.profiles(id),
  created_at        timestamptz   NOT NULL DEFAULT now()
);

-- ─── 17. referrals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    uuid        NOT NULL REFERENCES public.profiles(id),
  referee_id     uuid        NOT NULL REFERENCES public.profiles(id),
  status         text        NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'completed')),
  reward_issued  boolean     DEFAULT false,
  points_awarded integer     DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

-- ─── 18. user_ai_preferences (colonnes consolidées) ───────────────
CREATE TABLE IF NOT EXISTS public.user_ai_preferences (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  goal                 text,
  experience_level     text,
  preferred_format     text,
  budget_range         text,
  terpene_preferences  text[]      DEFAULT '{}',
  age_range            text,
  intensity_preference text,
  extra_prefs          jsonb       DEFAULT '{}',
  updated_at           timestamptz DEFAULT now()
);

-- ─── 19. budtender_interactions (colonnes consolidées + fix session_id) ─
CREATE TABLE IF NOT EXISTS public.budtender_interactions (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id           text,                   -- nullable (fix v4 contrainte trop stricte)
  interaction_type     text        NOT NULL,
  quiz_answers         jsonb       DEFAULT '{}',
  recommended_products uuid[],
  clicked_product      uuid        REFERENCES public.products(id) ON DELETE SET NULL,
  feedback             text        CHECK (feedback IN ('positive', 'negative')),
  feedback_reason      text        CHECK (
    feedback_reason IS NULL OR
    feedback_reason IN ('wrong_product', 'too_brief', 'irrelevant', 'tone')
  ),
  user_message         text,
  ai_response          text,
  is_gold_standard     boolean     NOT NULL DEFAULT false,
  admin_note           text,
  duration_seconds     integer,
  tokens_input         integer,
  tokens_output        integer,
  created_at           timestamptz DEFAULT now()
);

-- ─── 20. user_active_sessions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_active_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   text        NOT NULL,
  device_name text,
  user_agent  text,
  ip_address  text,
  last_seen   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- ─── 21. knowledge_base ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  content    text        NOT NULL,
  category   text,
  embedding  vector(3072),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 22. cannabis_conditions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cannabis_conditions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  condition         text        NOT NULL,
  alternate_name    text,
  evidence_score    integer     NOT NULL CHECK (evidence_score BETWEEN 0 AND 6),
  popular_interest  integer,
  scholar_citations integer,
  cbd_effect        text,
  simple_notes      text,
  scientific_notes  text,
  study_link        text,
  source_name       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cannabis_conditions_unique_condition UNIQUE (condition, alternate_name)
);

-- ─── 23. cannabis_conditions_vectors ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.cannabis_conditions_vectors (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id uuid        NOT NULL UNIQUE REFERENCES public.cannabis_conditions(id) ON DELETE CASCADE,
  embedding    vector(3072) NOT NULL,
  text_content text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);



-- ─── 24. blog_posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  slug         text        NOT NULL UNIQUE,
  excerpt      text,
  content      text        NOT NULL,
  is_published boolean     NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_products_sku
  ON public.products(sku);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id
  ON public.bundle_items(bundle_id);

CREATE INDEX IF NOT EXISTS idx_user_ai_extra_prefs
  ON public.user_ai_preferences USING GIN (extra_prefs);

CREATE INDEX IF NOT EXISTS idx_bi_feedback_type
  ON public.budtender_interactions(feedback, created_at DESC)
  WHERE feedback IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bi_gold
  ON public.budtender_interactions(is_gold_standard, created_at DESC)
  WHERE is_gold_standard = true;

CREATE INDEX IF NOT EXISTS idx_bi_duration
  ON public.budtender_interactions(duration_seconds)
  WHERE duration_seconds IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_active_sessions_user_last_seen
  ON public.user_active_sessions(user_id, last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_cannabis_conditions_condition
  ON public.cannabis_conditions(condition);

CREATE INDEX IF NOT EXISTS idx_cannabis_conditions_alternate_name
  ON public.cannabis_conditions(alternate_name);

CREATE INDEX IF NOT EXISTS idx_cannabis_conditions_evidence_score
  ON public.cannabis_conditions(evidence_score);

CREATE INDEX IF NOT EXISTS idx_cannabis_vectors_condition_id
  ON public.cannabis_conditions_vectors(condition_id);


-- ═══════════════════════════════════════════════════════════════════
-- FONCTIONS
-- ═══════════════════════════════════════════════════════════════════

-- ─── Trigger : profil automatique à l'inscription ─────────────────
-- Version consolidée v11 : inclut l'email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Code de parrainage ───────────────────────────────────────────
-- Version consolidée rescue : SECURITY DEFINER, boucle limitée
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text AS $$
DECLARE
  new_code text;
  done     boolean DEFAULT false;
BEGIN
  FOR i IN 1..10 LOOP
    new_code := 'ESL-' || upper(substring(md5(random()::text) FROM 1 FOR 6));
    done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    IF done THEN
      RETURN new_code;
    END IF;
  END LOOP;
  -- Fallback timestamp si aléatoire échoue (très improbable)
  RETURN 'ESL-' || upper(substring(md5(now()::text) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.tr_generate_referral_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    BEGIN
      NEW.referral_code := public.generate_referral_code();
    EXCEPTION WHEN OTHERS THEN
      -- Ne pas bloquer l'inscription si la génération échoue
      RAISE WARNING 'Referral code generation failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── Codes promo ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_promo_uses(code_text text)
RETURNS void AS $$
BEGIN
  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE code = code_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Bundles ──────────────────────────────────────────────────────
-- Recalcule le stock d'un bundle = min(floor(stock_composant / qté))
CREATE OR REPLACE FUNCTION public.sync_bundle_stock(p_bundle_id uuid)
RETURNS void AS $$
DECLARE
  min_stock int;
BEGIN
  SELECT MIN(FLOOR(p.stock_quantity::float / bi.quantity))::int
    INTO min_stock
    FROM public.bundle_items bi
    JOIN public.products p ON p.id = bi.product_id
   WHERE bi.bundle_id = p_bundle_id;

  UPDATE public.products
     SET stock_quantity = COALESCE(min_stock, 0)
   WHERE id = p_bundle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Propagation automatique aux bundles quand le stock d'un composant change
CREATE OR REPLACE FUNCTION public.trigger_sync_bundles_on_stock_change()
RETURNS trigger AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT bundle_id FROM public.bundle_items WHERE product_id = NEW.id
  LOOP
    PERFORM public.sync_bundle_stock(r.bundle_id);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Recommandations produits ─────────────────────────────────────
-- Recommandations explicites + fallback même catégorie
CREATE OR REPLACE FUNCTION public.get_product_recommendations(
  p_product_id uuid,
  p_limit      int DEFAULT 4
)
RETURNS SETOF public.products AS $$
DECLARE
  cat_id uuid;
BEGIN
  SELECT category_id INTO cat_id FROM public.products WHERE id = p_product_id;

  RETURN QUERY
    SELECT prod.*
    FROM (
      SELECT r.recommended_id AS id, 0 AS priority, r.sort_order AS srt
      FROM public.product_recommendations r
      JOIN public.products p ON p.id = r.recommended_id
      WHERE r.product_id = p_product_id
        AND p.is_active = true AND p.is_available = true
      UNION ALL
      SELECT p.id, 1 AS priority, (random() * 100)::int AS srt
      FROM public.products p
      WHERE p.category_id = cat_id
        AND p.id <> p_product_id
        AND p.is_active = true AND p.is_available = true
        AND NOT EXISTS (
          SELECT 1 FROM public.product_recommendations
          WHERE product_id = p_product_id AND recommended_id = p.id
        )
    ) sub
    JOIN public.products prod ON prod.id = sub.id
    ORDER BY sub.priority, sub.srt
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── POS : création client en caisse ──────────────────────────────
-- Version consolidée v10 : avec auth.identities pour visibilité Dashboard
CREATE OR REPLACE FUNCTION public.create_pos_customer(
  p_full_name text,
  p_phone     text DEFAULT NULL,
  p_email     text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email   text;
BEGIN
  -- Vérification admin (inclut bypass pour service_role/postgres)
  IF NOT (
    auth.role() = 'service_role' OR 
    auth.uid() IS NULL OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  v_email := COALESCE(p_email, 'pos_' || replace(v_user_id::text, '-', '') || '@esilventes.internal');

  -- 1. Créer l'utilisateur auth minimal
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, role,
    raw_user_meta_data, created_at, updated_at, aud, confirmation_token, is_super_admin
  ) VALUES (
    v_user_id,
    v_email,
    crypt(replace(gen_random_uuid()::text, '-', ''), gen_salt('bf')),
    now(),
    'authenticated',
    jsonb_build_object('full_name', p_full_name),
    now(), now(),
    'authenticated', '',
    false
  );

  -- 2. Créer l'identité (nécessaire pour la visibilité dans le Dashboard Supabase)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email',
    now(), now(), now()
  );

  -- 3. Compléter le profil (créé par le trigger handle_new_user)
  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    UPDATE public.profiles SET phone = p_phone WHERE id = v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_pos_customer IS
  'Crée un profil client depuis le terminal POS. Admin uniquement. '
  'Inclut la création d''identité pour la visibilité dans le Dashboard Supabase.';

-- ─── Admin : récupérer l'email d'un client ─────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_user_email(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT (
    auth.role() = 'service_role' OR 
    auth.uid() IS NULL OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Sécurité : bloquer l'auto-escalade is_admin ──────────────────
CREATE OR REPLACE FUNCTION public.prevent_admin_self_escalation()
RETURNS trigger AS $$
BEGIN
  -- Permettre la modification si on est en mode admin (service_role ou pas de session auth/direct SQL)
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Unauthorized: only an admin can change the is_admin flag';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Parrainage : création d'un enregistrement de parrainage ──────
-- SECURITY DEFINER pour bypasser RLS lors de l'inscription
CREATE OR REPLACE FUNCTION public.create_referral_record(
  p_referral_code text,
  p_referee_id    uuid,
  p_welcome_bonus integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_balance     integer;
BEGIN
  -- Trouver le parrain par son code
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = upper(trim(p_referral_code))
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  -- Lier le filleul au parrain
  UPDATE profiles
  SET referred_by_id = v_referrer_id
  WHERE id = p_referee_id
    AND referred_by_id IS NULL;

  -- Insérer l'enregistrement de parrainage
  INSERT INTO referrals (referrer_id, referee_id, status)
  VALUES (v_referrer_id, p_referee_id, 'joined')
  ON CONFLICT DO NOTHING;

  -- Appliquer le bonus de bienvenue au filleul
  IF p_welcome_bonus > 0 THEN
    UPDATE profiles
    SET loyalty_points = COALESCE(loyalty_points, 0) + p_welcome_bonus
    WHERE id = p_referee_id
    RETURNING loyalty_points INTO v_balance;

    INSERT INTO loyalty_transactions (user_id, type, points, balance_after, note)
    VALUES (
      p_referee_id,
      'earned',
      p_welcome_bonus,
      COALESCE(v_balance, p_welcome_bonus),
      'Cadeau de bienvenue (Parrainage)'
    );
  END IF;
END;
$$;

-- ─── Admin : suppression sécurisée d'un client ────────────────────
-- Les commandes sont conservées (user_id mis à NULL) pour l'historique comptable
CREATE OR REPLACE FUNCTION public.delete_customer_cascade(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_caller_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'Accès refusé : droits admin requis';
  END IF;

  -- Conserver l'historique des commandes (nullifier user_id)
  UPDATE orders SET user_id = NULL WHERE user_id = p_user_id;

  -- Supprimer le profil (cascade sur les autres tables)
  DELETE FROM profiles WHERE id = p_user_id;
END;
$$;

-- ─── Recherche vectorielle : produits ─────────────────────────────
CREATE OR REPLACE FUNCTION public.match_products(
  query_embedding vector(3072),
  match_threshold float,
  match_count     int
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
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.products p
  WHERE p.is_active = true
    AND p.is_available = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── Recherche vectorielle : base de connaissances ────────────────
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(3072),
  match_threshold float,
  match_count     int
)
RETURNS TABLE (
  id         uuid,
  title      text,
  content    text,
  category   text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id, k.title, k.content, k.category,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base k
  WHERE k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─── Recherche vectorielle : conditions cannabis ───────────────────
CREATE OR REPLACE FUNCTION public.match_cannabis_conditions(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.25,
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  condition_id     uuid,
  condition        text,
  alternate_name   text,
  evidence_score   integer,
  simple_notes     text,
  scientific_notes text,
  source_name      text,
  study_link       text,
  similarity       float
)
LANGUAGE sql
AS $$
  SELECT
    cc.id AS condition_id,
    cc.condition,
    cc.alternate_name,
    cc.evidence_score,
    cc.simple_notes,
    cc.scientific_notes,
    cc.source_name,
    cc.study_link,
    1 - (cv.embedding <=> query_embedding) AS similarity
  FROM public.cannabis_conditions_vectors cv
  INNER JOIN public.cannabis_conditions cc ON cc.id = cv.condition_id
  WHERE 1 - (cv.embedding <=> query_embedding) >= match_threshold
  ORDER BY cv.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ─── Trigger updated_at pour knowledge_base ───────────────────────
CREATE OR REPLACE FUNCTION public.trigger_set_kb_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

-- Profil automatique à chaque inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Code de parrainage automatique à chaque création de profil
DROP TRIGGER IF EXISTS on_profile_created_gen_code ON public.profiles;
CREATE TRIGGER on_profile_created_gen_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tr_generate_referral_code();

-- Synchronisation du stock des bundles
DROP TRIGGER IF EXISTS trg_sync_bundle_stock ON public.products;
CREATE TRIGGER trg_sync_bundle_stock
  AFTER UPDATE OF stock_quantity ON public.products
  FOR EACH ROW
  WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity AND NEW.is_bundle = false)
  EXECUTE FUNCTION public.trigger_sync_bundles_on_stock_change();

-- Bloquer l'auto-escalade is_admin
DROP TRIGGER IF EXISTS trg_prevent_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_self_escalation();

-- Mise à jour automatique de knowledge_base.updated_at
DROP TRIGGER IF EXISTS set_kb_updated_at ON public.knowledge_base;
CREATE TRIGGER set_kb_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_kb_updated_at();

-- Mise à jour automatique de blog_posts.updated_at
DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ─── Helper : vérification admin sans récursion ──────────────────
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  -- Permettre l'accès si service_role ou pas de session auth (contexte admin/postgres)
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — CORRIGÉES
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_ads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recommendations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_preferences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budtender_interactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cannabis_conditions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cannabis_conditions_vectors ENABLE ROW LEVEL SECURITY;

-- ── categories ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_public_read"  ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_admin_write"  ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── products ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_public_read"  ON public.products;
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_admin_write"  ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── profiles ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_self_read"  ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR
    public.check_is_admin()
  );

-- CORRIGÉ v12 : WITH CHECK empêche l'auto-escalade du flag is_admin
DROP POLICY IF EXISTS "profiles_self_update"  ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_admin_all"  ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── addresses ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "addresses_owner"  ON public.addresses;
CREATE POLICY "addresses_owner" ON public.addresses
  FOR ALL USING (user_id = auth.uid());

-- ── orders ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_owner_read"  ON public.orders;
CREATE POLICY "orders_owner_read" ON public.orders
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.check_is_admin()
  );

DROP POLICY IF EXISTS "orders_auth_insert"  ON public.orders;
CREATE POLICY "orders_auth_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "orders_admin_update"  ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE USING (
    public.check_is_admin()
  );

-- ── order_items ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_owner_read"  ON public.order_items;
CREATE POLICY "order_items_owner_read" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND (
        o.user_id = auth.uid() OR
        public.check_is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "order_items_auth_insert"  ON public.order_items;
CREATE POLICY "order_items_auth_insert" ON public.order_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── stock_movements ───────────────────────────────────────────────
DROP POLICY IF EXISTS "stock_admin_all"  ON public.stock_movements;
CREATE POLICY "stock_admin_all" ON public.stock_movements
  FOR ALL USING (
    public.check_is_admin()
  );

-- CORRIGÉ v15 : INSERT autorisé aux utilisateurs authentifiés (traitement des commandes)
DROP POLICY IF EXISTS "stock_auth_insert"  ON public.stock_movements;
CREATE POLICY "stock_auth_insert" ON public.stock_movements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── store_settings ────────────────────────────────────────────────
DROP POLICY IF EXISTS "store_settings_public_read"  ON public.store_settings;
CREATE POLICY "store_settings_public_read" ON public.store_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "store_settings_admin_all"  ON public.store_settings;
CREATE POLICY "store_settings_admin_all" ON public.store_settings
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── loyalty_transactions ──────────────────────────────────────────
DROP POLICY IF EXISTS "loyalty_tx_owner_read"  ON public.loyalty_transactions;
CREATE POLICY "loyalty_tx_owner_read" ON public.loyalty_transactions
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.check_is_admin()
  );

DROP POLICY IF EXISTS "loyalty_tx_auth_insert"  ON public.loyalty_transactions;
CREATE POLICY "loyalty_tx_auth_insert" ON public.loyalty_transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "loyalty_tx_admin_all"  ON public.loyalty_transactions;
CREATE POLICY "loyalty_tx_admin_all" ON public.loyalty_transactions
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── subscriptions ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "subscriptions_owner_read"  ON public.subscriptions;
CREATE POLICY "subscriptions_owner_read" ON public.subscriptions
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.check_is_admin()
  );

DROP POLICY IF EXISTS "subscriptions_owner_insert"  ON public.subscriptions;
CREATE POLICY "subscriptions_owner_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_owner_update"  ON public.subscriptions;
CREATE POLICY "subscriptions_owner_update" ON public.subscriptions
  FOR UPDATE USING (
    user_id = auth.uid() OR
    public.check_is_admin()
  );

-- ── subscription_orders ───────────────────────────────────────────
DROP POLICY IF EXISTS "sub_orders_owner_read"  ON public.subscription_orders;
CREATE POLICY "sub_orders_owner_read" ON public.subscription_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_id AND (
        s.user_id = auth.uid() OR
        public.check_is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "sub_orders_admin_insert"  ON public.subscription_orders;
CREATE POLICY "sub_orders_admin_insert" ON public.subscription_orders
  FOR INSERT WITH CHECK (
    public.check_is_admin()
  );

-- ── reviews ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reviews_public_read"  ON public.reviews;
CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (
    is_published = true OR
    user_id = auth.uid() OR
    public.check_is_admin()
  );

DROP POLICY IF EXISTS "reviews_owner_insert"  ON public.reviews;
CREATE POLICY "reviews_owner_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "reviews_owner_update"  ON public.reviews;
CREATE POLICY "reviews_owner_update" ON public.reviews
  FOR UPDATE USING (user_id = auth.uid() AND is_published = false);

DROP POLICY IF EXISTS "reviews_admin_all"  ON public.reviews;
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── catalog_ads ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "catalog_ads_public_read" ON public.catalog_ads;
CREATE POLICY "catalog_ads_public_read" ON public.catalog_ads
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "catalog_ads_admin_all" ON public.catalog_ads;
CREATE POLICY "catalog_ads_admin_all" ON public.catalog_ads
  FOR ALL USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

-- ── promo_codes ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "promo_codes_auth_read"  ON public.promo_codes;
CREATE POLICY "promo_codes_auth_read" ON public.promo_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "promo_codes_admin_all"  ON public.promo_codes;
CREATE POLICY "promo_codes_admin_all" ON public.promo_codes
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── bundle_items ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "bundle_items_public_read"  ON public.bundle_items;
CREATE POLICY "bundle_items_public_read" ON public.bundle_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bundle_items_admin_all"  ON public.bundle_items;
CREATE POLICY "bundle_items_admin_all" ON public.bundle_items
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── product_recommendations ───────────────────────────────────────
DROP POLICY IF EXISTS "recommendations_public_read"  ON public.product_recommendations;
CREATE POLICY "recommendations_public_read" ON public.product_recommendations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "recommendations_admin_all"  ON public.product_recommendations;
CREATE POLICY "recommendations_admin_all" ON public.product_recommendations
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── pos_reports ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "pos_reports_admin_all"  ON public.pos_reports;
CREATE POLICY "pos_reports_admin_all" ON public.pos_reports
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── referrals ─────────────────────────────────────────────────────
-- CORRIGÉ : ajout policy INSERT + UPDATE filleul + admin complet (fix_referral_policies + v15)
DROP POLICY IF EXISTS "referrals_referrer_select"  ON public.referrals;
CREATE POLICY "referrals_referrer_select" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "referrals_referee_select"  ON public.referrals;
CREATE POLICY "referrals_referee_select" ON public.referrals
  FOR SELECT USING (auth.uid() = referee_id);

DROP POLICY IF EXISTS "referrals_auth_insert"  ON public.referrals;
CREATE POLICY "referrals_auth_insert" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "referrals_referee_update"  ON public.referrals;
CREATE POLICY "referrals_referee_update" ON public.referrals
  FOR UPDATE TO authenticated
  USING (auth.uid() = referee_id)
  WITH CHECK (auth.uid() = referee_id);

DROP POLICY IF EXISTS "referrals_admin_all"  ON public.referrals;
CREATE POLICY "referrals_admin_all" ON public.referrals
  FOR ALL TO authenticated
  USING (
    public.check_is_admin()
  );

-- ── user_ai_preferences ───────────────────────────────────────────
DROP POLICY IF EXISTS "ai_prefs_owner_all"  ON public.user_ai_preferences;
CREATE POLICY "ai_prefs_owner_all" ON public.user_ai_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_prefs_admin_select"  ON public.user_ai_preferences;
CREATE POLICY "ai_prefs_admin_select" ON public.user_ai_preferences
  FOR SELECT TO authenticated
  USING (
    public.check_is_admin()
  );

-- ── budtender_interactions ────────────────────────────────────────
DROP POLICY IF EXISTS "interactions_owner_all"  ON public.budtender_interactions;
CREATE POLICY "interactions_owner_all" ON public.budtender_interactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "interactions_admin_select"  ON public.budtender_interactions;
CREATE POLICY "interactions_admin_select" ON public.budtender_interactions
  FOR SELECT TO authenticated
  USING (
    public.check_is_admin()
  );

-- ── user_active_sessions ──────────────────────────────────────────
DROP POLICY IF EXISTS "sessions_self_select"  ON public.user_active_sessions;
CREATE POLICY "sessions_self_select" ON public.user_active_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "sessions_self_insert"  ON public.user_active_sessions;
CREATE POLICY "sessions_self_insert" ON public.user_active_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sessions_self_update"  ON public.user_active_sessions;
CREATE POLICY "sessions_self_update" ON public.user_active_sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sessions_self_delete"  ON public.user_active_sessions;
CREATE POLICY "sessions_self_delete" ON public.user_active_sessions
  FOR DELETE USING (user_id = auth.uid());

-- CORRIGÉ v14 : les admins peuvent voir et gérer toutes les sessions
DROP POLICY IF EXISTS "sessions_admin_all"  ON public.user_active_sessions;
CREATE POLICY "sessions_admin_all" ON public.user_active_sessions
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── knowledge_base ────────────────────────────────────────────────
DROP POLICY IF EXISTS "knowledge_base_public_read"  ON public.knowledge_base;
CREATE POLICY "knowledge_base_public_read" ON public.knowledge_base
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "knowledge_base_admin_insert"  ON public.knowledge_base;
CREATE POLICY "knowledge_base_admin_insert" ON public.knowledge_base
  FOR INSERT WITH CHECK (
    public.check_is_admin()
  );

DROP POLICY IF EXISTS "knowledge_base_admin_update"  ON public.knowledge_base;
CREATE POLICY "knowledge_base_admin_update" ON public.knowledge_base
  FOR UPDATE USING (
    public.check_is_admin()
  );

DROP POLICY IF EXISTS "knowledge_base_admin_delete"  ON public.knowledge_base;
CREATE POLICY "knowledge_base_admin_delete" ON public.knowledge_base
  FOR DELETE USING (
    public.check_is_admin()
  );

-- ── cannabis_conditions ───────────────────────────────────────────
-- CORRIGÉ : RLS manquante dans v20, ajoutée ici
DROP POLICY IF EXISTS "cannabis_conditions_public_read"  ON public.cannabis_conditions;
CREATE POLICY "cannabis_conditions_public_read" ON public.cannabis_conditions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "cannabis_conditions_admin_write"  ON public.cannabis_conditions;
CREATE POLICY "cannabis_conditions_admin_write" ON public.cannabis_conditions
  FOR ALL USING (
    public.check_is_admin()
  );

-- ── cannabis_conditions_vectors ───────────────────────────────────
-- CORRIGÉ : RLS manquante dans v20, ajoutée ici
DROP POLICY IF EXISTS "cannabis_vectors_public_read"  ON public.cannabis_conditions_vectors;
CREATE POLICY "cannabis_vectors_public_read" ON public.cannabis_conditions_vectors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "cannabis_vectors_admin_write"  ON public.cannabis_conditions_vectors;
CREATE POLICY "cannabis_vectors_admin_write" ON public.cannabis_conditions_vectors
  FOR ALL USING (
    public.check_is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════

-- ── blog_posts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blog_posts_public_read" ON public.blog_posts;
CREATE POLICY "blog_posts_public_read" ON public.blog_posts
  FOR SELECT USING (is_published = true OR public.check_is_admin());

DROP POLICY IF EXISTS "blog_posts_admin_insert" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_insert" ON public.blog_posts
  FOR INSERT WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "blog_posts_admin_update" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_update" ON public.blog_posts
  FOR UPDATE USING (public.check_is_admin())
  WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "blog_posts_admin_delete" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_delete" ON public.blog_posts
  FOR DELETE USING (public.check_is_admin());

-- STORAGE — Bucket product-images
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'product-images',
      'product-images',
      true,
      5242880, -- 5 Mo
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    );
  END IF;
END $$;

DROP POLICY IF EXISTS "product_images_public_read"   ON storage.objects;
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert"  ON storage.objects;
CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND public.check_is_admin()
  );

DROP POLICY IF EXISTS "product_images_admin_update"  ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images'
    AND public.check_is_admin()
  );

DROP POLICY IF EXISTS "product_images_admin_delete"  ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND public.check_is_admin()
  );


-- ═══════════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════

-- Permet à la page afficheur (/afficheur) de se mettre à jour en temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;


GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon;

GRANT ALL ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO anon;
GRANT ALL ON public.referrals TO service_role;

GRANT EXECUTE ON FUNCTION public.create_pos_customer(text, text, text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_customer_cascade(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_referral_record(text, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.create_referral_record(text, uuid, integer) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- VUES
-- ═══════════════════════════════════════════════════════════════════

-- Agrège les avis publiés par produit (avg_rating, review_count)
-- Utilisée par le catalogue et la fiche produit via Supabase PostgREST.
CREATE OR REPLACE VIEW public.product_ratings AS
SELECT
  product_id,
  round(avg(rating)::numeric, 2)  AS avg_rating,
  count(*)                         AS review_count
FROM public.reviews
WHERE is_published = true
GROUP BY product_id;

GRANT SELECT ON public.product_ratings TO anon, authenticated;
