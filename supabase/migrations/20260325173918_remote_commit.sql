


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."admin_get_user_email"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_get_user_email"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
END;
$$;


ALTER FUNCTION "public"."check_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_ai_response_cache"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at <= now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_ai_response_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_pos_customer"("p_full_name" "text", "p_phone" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email   text;
BEGIN
  IF NOT (
    auth.role() = 'service_role' OR
    auth.uid() IS NULL OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  v_email := COALESCE(p_email, 'pos_' || replace(v_user_id::text, '-', '') || '@esilventes.internal');

  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, role,
    raw_user_meta_data, created_at, updated_at, aud, confirmation_token, is_super_admin
  ) VALUES (
    v_user_id, v_email,
    crypt(replace(gen_random_uuid()::text, '-', ''), gen_salt('bf')),
    now(), 'authenticated',
    jsonb_build_object('full_name', p_full_name),
    now(), now(), 'authenticated', '', false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', v_email),
    'email', now(), now(), now()
  );

  IF p_phone IS NOT NULL AND p_phone <> '' THEN
    UPDATE public.profiles SET phone = p_phone WHERE id = v_user_id;
  END IF;

  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."create_pos_customer"("p_full_name" "text", "p_phone" "text", "p_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_pos_customer"("p_full_name" "text", "p_phone" "text", "p_email" "text") IS 'Crée un profil client depuis le terminal POS. Admin uniquement. Inclut la création d''identité pour la visibilité dans le Dashboard Supabase.';



CREATE OR REPLACE FUNCTION "public"."create_referral_record"("p_referral_code" "text", "p_referee_id" "uuid", "p_welcome_bonus" integer DEFAULT 0) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_referral_record"("p_referral_code" "text", "p_referee_id" "uuid", "p_welcome_bonus" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_customer_cascade"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."delete_customer_cascade"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fail_order_and_restore_stock"("p_order_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item record;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_order.payment_status = 'failed' OR v_order.payment_status = 'cancelled' THEN
    RETURN;
  END IF;

  UPDATE public.orders
  SET payment_status = 'failed',
      status = 'cancelled'
  WHERE id = p_order_id;

  FOR v_item IN
    SELECT product_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity + v_item.quantity
    WHERE id = v_item.product_id;

    INSERT INTO public.stock_movements (product_id, quantity_change, type, note)
    VALUES (
      v_item.product_id,
      v_item.quantity,
      'return',
      COALESCE(p_reason, 'Paiement échoué') || ' — commande ' || left(p_order_id::text, 8)
    );
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."fail_order_and_restore_stock"("p_order_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_order_and_award_points"("p_order_id" "uuid", "p_payment_intent_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_profile_points integer;
  v_new_balance integer;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND:%', p_order_id;
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      status = 'processing',
      stripe_payment_intent_id = COALESCE(p_payment_intent_id, stripe_payment_intent_id)
  WHERE id = p_order_id;

  SELECT loyalty_points INTO v_profile_points
  FROM public.profiles
  WHERE id = v_order.user_id
  FOR UPDATE;

  v_new_balance := GREATEST(
    0,
    COALESCE(v_profile_points, 0)
    - COALESCE(v_order.loyalty_points_redeemed, 0)
    + COALESCE(v_order.loyalty_points_earned, 0)
  );

  UPDATE public.profiles
  SET loyalty_points = v_new_balance,
      updated_at = now()
  WHERE id = v_order.user_id;

  IF COALESCE(v_order.loyalty_points_earned, 0) > 0 THEN
    INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, balance_after, note)
    VALUES (
      v_order.user_id,
      v_order.id,
      'earned',
      v_order.loyalty_points_earned,
      v_new_balance,
      'Commande #' || upper(left(v_order.id::text, 8))
    );
  END IF;

  IF COALESCE(v_order.loyalty_points_redeemed, 0) > 0 THEN
    INSERT INTO public.loyalty_transactions (user_id, order_id, type, points, balance_after, note)
    VALUES (
      v_order.user_id,
      v_order.id,
      'redeemed',
      v_order.loyalty_points_redeemed,
      v_new_balance,
      'Utilisation de points sur commande #' || upper(left(v_order.id::text, 8))
    );
  END IF;

  IF v_order.promo_code IS NOT NULL THEN
    PERFORM public.increment_promo_uses(v_order.promo_code);
  END IF;
END;
$$;


ALTER FUNCTION "public"."finalize_order_and_award_points"("p_order_id" "uuid", "p_payment_intent_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_referral_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  RETURN 'ESL-' || upper(substring(md5(now()::text) FROM 1 FOR 6));
END;
$$;


ALTER FUNCTION "public"."generate_referral_code"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "weight_grams" numeric(8,2),
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_bundle" boolean DEFAULT false NOT NULL,
    "original_value" numeric(10,2),
    "attributes" "jsonb" DEFAULT '{}'::"jsonb",
    "sku" "text",
    "embedding" "public"."vector"(3072),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_subscribable" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_recommendations"("p_product_id" "uuid", "p_limit" integer DEFAULT 4) RETURNS SETOF "public"."products"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_product_recommendations"("p_product_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ai_response_cache_usage"("p_cache_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.ai_response_cache
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE cache_key = p_cache_key;
END;
$$;


ALTER FUNCTION "public"."increment_ai_response_cache_usage"("p_cache_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_product_stock"("p_product_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id;
END;
$$;


ALTER FUNCTION "public"."increment_product_stock"("p_product_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_promo_uses"("code_text" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE code = code_text;
END;
$$;


ALTER FUNCTION "public"."increment_promo_uses"("code_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_search_cache_usage"("p_query" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.search_embeddings_cache
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE query_text = p_query;
END;
$$;


ALTER FUNCTION "public"."increment_search_cache_usage"("p_query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_cannabis_conditions"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.25, "match_count" integer DEFAULT 5) RETURNS TABLE("condition_id" "uuid", "condition" "text", "alternate_name" "text", "evidence_score" integer, "simple_notes" "text", "scientific_notes" "text", "source_name" "text", "study_link" "text", "similarity" double precision)
    LANGUAGE "sql"
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


ALTER FUNCTION "public"."match_cannabis_conditions"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "category" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."match_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_products"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "category_id" "uuid", "slug" "text", "name" "text", "description" "text", "weight_grams" numeric, "price" numeric, "image_url" "text", "stock_quantity" integer, "is_available" boolean, "is_featured" boolean, "is_active" boolean, "created_at" timestamp with time zone, "attributes" "jsonb", "is_bundle" boolean, "original_value" numeric, "similarity" double precision)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."match_products"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_admin_self_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."prevent_admin_self_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_stock_and_create_order"("p_user_id" "uuid", "p_items" "jsonb", "p_delivery_type" "text", "p_address_id" "uuid", "p_subtotal" numeric, "p_delivery_fee" numeric, "p_total" numeric, "p_points_earned" integer, "p_points_redeemed" integer, "p_promo_code" "text", "p_promo_discount" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_stock integer;
  v_available boolean;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity, is_available
    INTO v_stock, v_available
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    IF NOT FOUND OR v_available = false THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE:%', v_item->>'product_id';
    END IF;

    IF v_stock < (v_item->>'quantity')::integer THEN
      RAISE EXCEPTION 'STOCK_INSUFFICIENT:%', v_item->>'product_id';
    END IF;

    UPDATE public.products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::integer
    WHERE id = (v_item->>'product_id')::uuid;
  END LOOP;

  INSERT INTO public.orders (
    user_id,
    delivery_type,
    address_id,
    subtotal,
    delivery_fee,
    total,
    loyalty_points_earned,
    loyalty_points_redeemed,
    promo_code,
    promo_discount,
    payment_status,
    status
  ) VALUES (
    p_user_id,
    p_delivery_type,
    p_address_id,
    p_subtotal,
    p_delivery_fee,
    p_total,
    p_points_earned,
    p_points_redeemed,
    p_promo_code,
    p_promo_discount,
    'pending',
    'pending'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    total_price
  )
  SELECT
    v_order_id,
    (value->>'product_id')::uuid,
    value->>'product_name',
    (value->>'unit_price')::numeric,
    (value->>'quantity')::integer,
    ((value->>'unit_price')::numeric * (value->>'quantity')::integer)
  FROM jsonb_array_elements(p_items);

  INSERT INTO public.stock_movements (
    product_id,
    quantity_change,
    type,
    note
  )
  SELECT
    (value->>'product_id')::uuid,
    -((value->>'quantity')::integer),
    'sale',
    'Commande ' || left(v_order_id::text, 8)
  FROM jsonb_array_elements(p_items);

  RETURN v_order_id;
END;
$$;


ALTER FUNCTION "public"."reserve_stock_and_create_order"("p_user_id" "uuid", "p_items" "jsonb", "p_delivery_type" "text", "p_address_id" "uuid", "p_subtotal" numeric, "p_delivery_fee" numeric, "p_total" numeric, "p_points_earned" integer, "p_points_redeemed" integer, "p_promo_code" "text", "p_promo_discount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_bundle_stock"("p_bundle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_bundle_stock"("p_bundle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_generate_referral_code"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."tr_generate_referral_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_kb_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_kb_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_sync_bundles_on_stock_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."trigger_sync_bundles_on_stock_change"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" DEFAULT 'Domicile'::"text" NOT NULL,
    "street" "text" NOT NULL,
    "city" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" DEFAULT 'France'::"text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_response_cache" (
    "cache_key" "text" NOT NULL,
    "response_json" "jsonb" NOT NULL,
    "usage_count" integer DEFAULT 1 NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:30:00'::interval) NOT NULL,
    "last_used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_response_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "page" "text",
    "referrer" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "excerpt" "text",
    "content" "text" NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budtender_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "interaction_type" "text" NOT NULL,
    "quiz_answers" "jsonb" DEFAULT '{}'::"jsonb",
    "recommended_products" "uuid"[],
    "clicked_product" "uuid",
    "feedback" "text",
    "feedback_reason" "text",
    "user_message" "text",
    "ai_response" "text",
    "is_gold_standard" boolean DEFAULT false NOT NULL,
    "admin_note" "text",
    "duration_seconds" integer,
    "tokens_input" integer,
    "tokens_output" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "budtender_interactions_feedback_check" CHECK (("feedback" = ANY (ARRAY['positive'::"text", 'negative'::"text"]))),
    CONSTRAINT "budtender_interactions_feedback_reason_check" CHECK ((("feedback_reason" IS NULL) OR ("feedback_reason" = ANY (ARRAY['wrong_product'::"text", 'too_brief'::"text", 'irrelevant'::"text", 'tone'::"text"]))))
);


ALTER TABLE "public"."budtender_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bundle_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bundle_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "bundle_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."bundle_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cannabis_conditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition" "text" NOT NULL,
    "alternate_name" "text",
    "evidence_score" integer NOT NULL,
    "popular_interest" integer,
    "scholar_citations" integer,
    "cbd_effect" "text",
    "simple_notes" "text",
    "scientific_notes" "text",
    "study_link" "text",
    "source_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cannabis_conditions_evidence_score_check" CHECK ((("evidence_score" >= 0) AND ("evidence_score" <= 6)))
);


ALTER TABLE "public"."cannabis_conditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cannabis_conditions_vectors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "condition_id" "uuid" NOT NULL,
    "embedding" "public"."vector"(3072) NOT NULL,
    "text_content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cannabis_conditions_vectors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalog_ads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "tagline" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "image_url" "text" DEFAULT ''::"text" NOT NULL,
    "cta_label" "text" DEFAULT 'Voir'::"text" NOT NULL,
    "cta_url" "text" DEFAULT ''::"text" NOT NULL,
    "badge_text" "text",
    "badge_color" "text",
    "target_categories" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "target_tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 4 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "catalog_ads_badge_color_check" CHECK (("badge_color" = ANY (ARRAY['neon'::"text", 'amber'::"text", 'purple'::"text", 'pink'::"text", 'blue'::"text"])))
);


ALTER TABLE "public"."catalog_ads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon_name" "text",
    "image_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" "uuid",
    "depth" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "categories_depth_check" CHECK ((("depth" >= 0) AND ("depth" <= 2)))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."knowledge_base" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text",
    "embedding" "public"."vector"(3072),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."knowledge_base" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "type" "text" NOT NULL,
    "points" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loyalty_transactions_type_check" CHECK (("type" = ANY (ARRAY['earned'::"text", 'redeemed'::"text", 'adjusted'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "quantity" integer NOT NULL,
    "total_price" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "delivery_type" "text" DEFAULT 'click_collect'::"text" NOT NULL,
    "address_id" "uuid",
    "subtotal" numeric(10,2) NOT NULL,
    "delivery_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "loyalty_points_earned" integer DEFAULT 0 NOT NULL,
    "loyalty_points_redeemed" integer DEFAULT 0 NOT NULL,
    "promo_code" "text",
    "promo_discount" numeric(10,2) DEFAULT 0 NOT NULL,
    "viva_order_code" "text",
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "stripe_payment_intent_id" "text",
    "payment_method" "text" DEFAULT 'stripe'::"text"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pos_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "total_sales" numeric(10,2) DEFAULT 0 NOT NULL,
    "cash_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "card_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "mobile_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "items_sold" integer DEFAULT 0 NOT NULL,
    "order_count" integer DEFAULT 0 NOT NULL,
    "product_breakdown" "jsonb" DEFAULT '{}'::"jsonb",
    "cash_counted" numeric(10,2) DEFAULT 0,
    "cash_difference" numeric(10,2) DEFAULT 0,
    "closed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pos_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "is_verified" boolean DEFAULT false NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_ratings" AS
 SELECT "product_id",
    "round"("avg"("rating"), 2) AS "avg_rating",
    "count"(*) AS "review_count"
   FROM "public"."reviews"
  WHERE ("is_published" = true)
  GROUP BY "product_id";


ALTER VIEW "public"."product_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "recommended_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_recommendations_check" CHECK (("product_id" <> "recommended_id"))
);


ALTER TABLE "public"."product_recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "email" "text",
    "loyalty_points" integer DEFAULT 0 NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "referral_code" "text",
    "referred_by_id" "uuid",
    "birthday" "date",
    "last_birthday_gift_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "min_order_value" numeric(10,2) DEFAULT 0 NOT NULL,
    "max_uses" integer,
    "uses_count" integer DEFAULT 0 NOT NULL,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percent'::"text", 'fixed'::"text"]))),
    CONSTRAINT "promo_codes_discount_value_check" CHECK (("discount_value" > (0)::numeric))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid" NOT NULL,
    "referee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'joined'::"text" NOT NULL,
    "reward_issued" boolean DEFAULT false,
    "points_awarded" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "referrals_status_check" CHECK (("status" = ANY (ARRAY['joined'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_embeddings_cache" (
    "query_text" "text" NOT NULL,
    "embedding" "public"."vector"(3072) NOT NULL,
    "usage_count" integer DEFAULT 1 NOT NULL,
    "last_used_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."search_embeddings_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity_change" integer NOT NULL,
    "type" "text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."store_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."subscription_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "frequency" "text" NOT NULL,
    "next_delivery_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_frequency_check" CHECK (("frequency" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "subscriptions_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_active_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "device_name" "text",
    "user_agent" "text",
    "ip_address" "text",
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_active_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_ai_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_ai_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_response_cache"
    ADD CONSTRAINT "ai_response_cache_pkey" PRIMARY KEY ("cache_key");



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."budtender_interactions"
    ADD CONSTRAINT "budtender_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_bundle_id_product_id_key" UNIQUE ("bundle_id", "product_id");



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cannabis_conditions"
    ADD CONSTRAINT "cannabis_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cannabis_conditions"
    ADD CONSTRAINT "cannabis_conditions_unique_condition" UNIQUE ("condition", "alternate_name");



ALTER TABLE ONLY "public"."cannabis_conditions_vectors"
    ADD CONSTRAINT "cannabis_conditions_vectors_condition_id_key" UNIQUE ("condition_id");



ALTER TABLE ONLY "public"."cannabis_conditions_vectors"
    ADD CONSTRAINT "cannabis_conditions_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalog_ads"
    ADD CONSTRAINT "catalog_ads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."knowledge_base"
    ADD CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pos_reports"
    ADD CONSTRAINT "pos_reports_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."pos_reports"
    ADD CONSTRAINT "pos_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_recommendations"
    ADD CONSTRAINT "product_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_recommendations"
    ADD CONSTRAINT "product_recommendations_product_id_recommended_id_key" UNIQUE ("product_id", "recommended_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_user_id_order_id_key" UNIQUE ("product_id", "user_id", "order_id");



ALTER TABLE ONLY "public"."search_embeddings_cache"
    ADD CONSTRAINT "search_embeddings_cache_pkey" PRIMARY KEY ("query_text");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_settings"
    ADD CONSTRAINT "store_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."subscription_orders"
    ADD CONSTRAINT "subscription_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_active_sessions"
    ADD CONSTRAINT "user_active_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_active_sessions"
    ADD CONSTRAINT "user_active_sessions_user_id_device_id_key" UNIQUE ("user_id", "device_id");



ALTER TABLE ONLY "public"."user_ai_preferences"
    ADD CONSTRAINT "user_ai_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_ai_preferences"
    ADD CONSTRAINT "user_ai_preferences_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_ai_response_cache_expires_at" ON "public"."ai_response_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_ai_response_cache_usage" ON "public"."ai_response_cache" USING "btree" ("usage_count" DESC, "last_used_at" DESC);



CREATE INDEX "idx_analytics_events_created_at" ON "public"."analytics_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_events_event_type" ON "public"."analytics_events" USING "btree" ("event_type");



CREATE INDEX "idx_analytics_events_session_id" ON "public"."analytics_events" USING "btree" ("session_id");



CREATE INDEX "idx_analytics_events_user_id" ON "public"."analytics_events" USING "btree" ("user_id");



CREATE INDEX "idx_bi_duration" ON "public"."budtender_interactions" USING "btree" ("duration_seconds") WHERE ("duration_seconds" IS NOT NULL);



CREATE INDEX "idx_bi_feedback_type" ON "public"."budtender_interactions" USING "btree" ("feedback", "created_at" DESC) WHERE ("feedback" IS NOT NULL);



CREATE INDEX "idx_bi_gold" ON "public"."budtender_interactions" USING "btree" ("is_gold_standard", "created_at" DESC) WHERE ("is_gold_standard" = true);



CREATE INDEX "idx_bundle_items_bundle_id" ON "public"."bundle_items" USING "btree" ("bundle_id");



CREATE INDEX "idx_cannabis_conditions_alternate_name" ON "public"."cannabis_conditions" USING "btree" ("alternate_name");



CREATE INDEX "idx_cannabis_conditions_condition" ON "public"."cannabis_conditions" USING "btree" ("condition");



CREATE INDEX "idx_cannabis_conditions_evidence_score" ON "public"."cannabis_conditions" USING "btree" ("evidence_score");



CREATE INDEX "idx_cannabis_vectors_condition_id" ON "public"."cannabis_conditions_vectors" USING "btree" ("condition_id");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_categories_parent_sort" ON "public"."categories" USING "btree" ("parent_id", "sort_order");



CREATE INDEX "idx_orders_stripe_payment_intent_id" ON "public"."orders" USING "btree" ("stripe_payment_intent_id") WHERE ("stripe_payment_intent_id" IS NOT NULL);



CREATE INDEX "idx_products_sku" ON "public"."products" USING "btree" ("sku");



CREATE INDEX "idx_search_cache_usage" ON "public"."search_embeddings_cache" USING "btree" ("usage_count" DESC, "last_used_at" DESC);



CREATE INDEX "idx_user_active_sessions_user_last_seen" ON "public"."user_active_sessions" USING "btree" ("user_id", "last_seen" DESC);



CREATE INDEX "idx_user_ai_preferences" ON "public"."user_ai_preferences" USING "gin" ("preferences");



CREATE OR REPLACE TRIGGER "on_profile_created_gen_code" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."tr_generate_referral_code"();



CREATE OR REPLACE TRIGGER "set_blog_posts_updated_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_kb_updated_at" BEFORE UPDATE ON "public"."knowledge_base" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_kb_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_admin_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_admin_self_escalation"();



CREATE OR REPLACE TRIGGER "trg_sync_bundle_stock" AFTER UPDATE OF "stock_quantity" ON "public"."products" FOR EACH ROW WHEN ((("old"."stock_quantity" IS DISTINCT FROM "new"."stock_quantity") AND ("new"."is_bundle" = false))) EXECUTE FUNCTION "public"."trigger_sync_bundles_on_stock_change"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analytics_events"
    ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budtender_interactions"
    ADD CONSTRAINT "budtender_interactions_clicked_product_fkey" FOREIGN KEY ("clicked_product") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budtender_interactions"
    ADD CONSTRAINT "budtender_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bundle_items"
    ADD CONSTRAINT "bundle_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cannabis_conditions_vectors"
    ADD CONSTRAINT "cannabis_conditions_vectors_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "public"."cannabis_conditions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pos_reports"
    ADD CONSTRAINT "pos_reports_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."product_recommendations"
    ADD CONSTRAINT "product_recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_recommendations"
    ADD CONSTRAINT "product_recommendations_recommended_id_fkey" FOREIGN KEY ("recommended_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referee_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."subscription_orders"
    ADD CONSTRAINT "subscription_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_orders"
    ADD CONSTRAINT "subscription_orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_active_sessions"
    ADD CONSTRAINT "user_active_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_ai_preferences"
    ADD CONSTRAINT "user_ai_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Public read access" ON "public"."search_embeddings_cache" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Service role can do everything" ON "public"."search_embeddings_cache" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can do everything on ai_response_cache" ON "public"."ai_response_cache" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can only see their own AI preferences" ON "public"."user_ai_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only update their own AI preferences" ON "public"."user_ai_preferences" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "addresses_owner" ON "public"."addresses" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."ai_response_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analytics_events_insert_all" ON "public"."analytics_events" FOR INSERT WITH CHECK (true);



CREATE POLICY "analytics_events_select_admin" ON "public"."analytics_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blog_posts_admin_delete" ON "public"."blog_posts" FOR DELETE TO "authenticated" USING ("public"."check_is_admin"());



CREATE POLICY "blog_posts_admin_insert" ON "public"."blog_posts" FOR INSERT TO "authenticated" WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "blog_posts_admin_update" ON "public"."blog_posts" FOR UPDATE TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "blog_posts_public_read" ON "public"."blog_posts" FOR SELECT USING ((("is_published" = true) OR "public"."check_is_admin"()));



ALTER TABLE "public"."budtender_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bundle_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bundle_items_admin_all" ON "public"."bundle_items" USING ("public"."check_is_admin"());



CREATE POLICY "bundle_items_public_read" ON "public"."bundle_items" FOR SELECT USING (true);



ALTER TABLE "public"."cannabis_conditions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cannabis_conditions_admin_write" ON "public"."cannabis_conditions" USING ("public"."check_is_admin"());



CREATE POLICY "cannabis_conditions_public_read" ON "public"."cannabis_conditions" FOR SELECT USING (true);



ALTER TABLE "public"."cannabis_conditions_vectors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cannabis_vectors_admin_write" ON "public"."cannabis_conditions_vectors" USING ("public"."check_is_admin"());



CREATE POLICY "cannabis_vectors_public_read" ON "public"."cannabis_conditions_vectors" FOR SELECT USING (true);



ALTER TABLE "public"."catalog_ads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalog_ads_admin_all" ON "public"."catalog_ads" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "catalog_ads_public_read" ON "public"."catalog_ads" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_admin_write" ON "public"."categories" TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "categories_public_read" ON "public"."categories" FOR SELECT USING (true);



CREATE POLICY "interactions_admin_select" ON "public"."budtender_interactions" FOR SELECT TO "authenticated" USING ("public"."check_is_admin"());



CREATE POLICY "interactions_owner_all" ON "public"."budtender_interactions" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."knowledge_base" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "knowledge_base_admin_delete" ON "public"."knowledge_base" FOR DELETE TO "authenticated" USING ("public"."check_is_admin"());



CREATE POLICY "knowledge_base_admin_insert" ON "public"."knowledge_base" FOR INSERT TO "authenticated" WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "knowledge_base_admin_update" ON "public"."knowledge_base" FOR UPDATE TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "knowledge_base_public_read" ON "public"."knowledge_base" FOR SELECT USING (true);



ALTER TABLE "public"."loyalty_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_tx_admin_all" ON "public"."loyalty_transactions" USING ("public"."check_is_admin"());



CREATE POLICY "loyalty_tx_auth_insert" ON "public"."loyalty_transactions" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "loyalty_tx_owner_read" ON "public"."loyalty_transactions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."check_is_admin"()));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_auth_insert" ON "public"."order_items" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "order_items_owner_read" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."user_id" = "auth"."uid"()) OR "public"."check_is_admin"())))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_admin_update" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "orders_auth_insert" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "orders_owner_read" ON "public"."orders" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."check_is_admin"()));



ALTER TABLE "public"."pos_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pos_reports_admin_all" ON "public"."pos_reports" USING ("public"."check_is_admin"());



ALTER TABLE "public"."product_recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_admin_write" ON "public"."products" TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "products_public_read" ON "public"."products" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_all" ON "public"."profiles" USING ("public"."check_is_admin"());



CREATE POLICY "profiles_self_read" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."check_is_admin"()));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("is_admin" = ( SELECT "profiles_1"."is_admin"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())))));



ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "promo_codes_admin_all" ON "public"."promo_codes" TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "promo_codes_auth_read" ON "public"."promo_codes" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "recommendations_admin_all" ON "public"."product_recommendations" TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "recommendations_public_read" ON "public"."product_recommendations" FOR SELECT USING (true);



ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "referrals_admin_all" ON "public"."referrals" TO "authenticated" USING ("public"."check_is_admin"());



CREATE POLICY "referrals_auth_insert" ON "public"."referrals" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "referrals_referee_select" ON "public"."referrals" FOR SELECT USING (("auth"."uid"() = "referee_id"));



CREATE POLICY "referrals_referee_update" ON "public"."referrals" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "referee_id")) WITH CHECK (("auth"."uid"() = "referee_id"));



CREATE POLICY "referrals_referrer_select" ON "public"."referrals" FOR SELECT USING (("auth"."uid"() = "referrer_id"));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_admin_all" ON "public"."reviews" USING ("public"."check_is_admin"());



CREATE POLICY "reviews_owner_insert" ON "public"."reviews" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "reviews_owner_update" ON "public"."reviews" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("is_published" = false)));



CREATE POLICY "reviews_public_read" ON "public"."reviews" FOR SELECT USING ((("is_published" = true) OR ("user_id" = "auth"."uid"()) OR "public"."check_is_admin"()));



ALTER TABLE "public"."search_embeddings_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_admin_all" ON "public"."user_active_sessions" USING ("public"."check_is_admin"());



CREATE POLICY "sessions_self_delete" ON "public"."user_active_sessions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sessions_self_insert" ON "public"."user_active_sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "sessions_self_select" ON "public"."user_active_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "sessions_self_update" ON "public"."user_active_sessions" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "stock_admin_all" ON "public"."stock_movements" TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "stock_auth_insert" ON "public"."stock_movements" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "store_settings_admin_all" ON "public"."store_settings" TO "authenticated" USING ("public"."check_is_admin"()) WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "store_settings_public_read" ON "public"."store_settings" FOR SELECT USING (true);



CREATE POLICY "sub_orders_admin_insert" ON "public"."subscription_orders" FOR INSERT WITH CHECK ("public"."check_is_admin"());



CREATE POLICY "sub_orders_owner_read" ON "public"."subscription_orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."subscriptions" "s"
  WHERE (("s"."id" = "subscription_orders"."subscription_id") AND (("s"."user_id" = "auth"."uid"()) OR "public"."check_is_admin"())))));



ALTER TABLE "public"."subscription_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_owner_insert" ON "public"."subscriptions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "subscriptions_owner_read" ON "public"."subscriptions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."check_is_admin"()));



CREATE POLICY "subscriptions_owner_update" ON "public"."subscriptions" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."check_is_admin"()));



ALTER TABLE "public"."user_active_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_ai_preferences" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."store_settings";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."admin_get_user_email"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_get_user_email"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_get_user_email"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_ai_response_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_ai_response_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_ai_response_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_pos_customer"("p_full_name" "text", "p_phone" "text", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_pos_customer"("p_full_name" "text", "p_phone" "text", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_pos_customer"("p_full_name" "text", "p_phone" "text", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_referral_record"("p_referral_code" "text", "p_referee_id" "uuid", "p_welcome_bonus" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_referral_record"("p_referral_code" "text", "p_referee_id" "uuid", "p_welcome_bonus" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_referral_record"("p_referral_code" "text", "p_referee_id" "uuid", "p_welcome_bonus" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_customer_cascade"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_customer_cascade"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_customer_cascade"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fail_order_and_restore_stock"("p_order_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fail_order_and_restore_stock"("p_order_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fail_order_and_restore_stock"("p_order_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_order_and_award_points"("p_order_id" "uuid", "p_payment_intent_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_order_and_award_points"("p_order_id" "uuid", "p_payment_intent_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_order_and_award_points"("p_order_id" "uuid", "p_payment_intent_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_referral_code"() TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_recommendations"("p_product_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_recommendations"("p_product_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_recommendations"("p_product_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_ai_response_cache_usage"("p_cache_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ai_response_cache_usage"("p_cache_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ai_response_cache_usage"("p_cache_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_product_stock"("p_product_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_product_stock"("p_product_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_product_stock"("p_product_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_promo_uses"("code_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_promo_uses"("code_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_promo_uses"("code_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_search_cache_usage"("p_query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_search_cache_usage"("p_query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_search_cache_usage"("p_query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_cannabis_conditions"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_cannabis_conditions"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_cannabis_conditions"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_knowledge"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_products"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_products"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_products"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_admin_self_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_admin_self_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_admin_self_escalation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reserve_stock_and_create_order"("p_user_id" "uuid", "p_items" "jsonb", "p_delivery_type" "text", "p_address_id" "uuid", "p_subtotal" numeric, "p_delivery_fee" numeric, "p_total" numeric, "p_points_earned" integer, "p_points_redeemed" integer, "p_promo_code" "text", "p_promo_discount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_stock_and_create_order"("p_user_id" "uuid", "p_items" "jsonb", "p_delivery_type" "text", "p_address_id" "uuid", "p_subtotal" numeric, "p_delivery_fee" numeric, "p_total" numeric, "p_points_earned" integer, "p_points_redeemed" integer, "p_promo_code" "text", "p_promo_discount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_stock_and_create_order"("p_user_id" "uuid", "p_items" "jsonb", "p_delivery_type" "text", "p_address_id" "uuid", "p_subtotal" numeric, "p_delivery_fee" numeric, "p_total" numeric, "p_points_earned" integer, "p_points_redeemed" integer, "p_promo_code" "text", "p_promo_discount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_bundle_stock"("p_bundle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_bundle_stock"("p_bundle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_bundle_stock"("p_bundle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."tr_generate_referral_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_generate_referral_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_generate_referral_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_kb_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_kb_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_kb_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_sync_bundles_on_stock_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_sync_bundles_on_stock_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_sync_bundles_on_stock_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."ai_response_cache" TO "anon";
GRANT ALL ON TABLE "public"."ai_response_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_response_cache" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_events" TO "anon";
GRANT ALL ON TABLE "public"."analytics_events" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_events" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."budtender_interactions" TO "anon";
GRANT ALL ON TABLE "public"."budtender_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."budtender_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."bundle_items" TO "anon";
GRANT ALL ON TABLE "public"."bundle_items" TO "authenticated";
GRANT ALL ON TABLE "public"."bundle_items" TO "service_role";



GRANT ALL ON TABLE "public"."cannabis_conditions" TO "anon";
GRANT ALL ON TABLE "public"."cannabis_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."cannabis_conditions" TO "service_role";



GRANT ALL ON TABLE "public"."cannabis_conditions_vectors" TO "anon";
GRANT ALL ON TABLE "public"."cannabis_conditions_vectors" TO "authenticated";
GRANT ALL ON TABLE "public"."cannabis_conditions_vectors" TO "service_role";



GRANT ALL ON TABLE "public"."catalog_ads" TO "anon";
GRANT ALL ON TABLE "public"."catalog_ads" TO "authenticated";
GRANT ALL ON TABLE "public"."catalog_ads" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."knowledge_base" TO "anon";
GRANT ALL ON TABLE "public"."knowledge_base" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge_base" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."pos_reports" TO "anon";
GRANT ALL ON TABLE "public"."pos_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."pos_reports" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."product_ratings" TO "anon";
GRANT ALL ON TABLE "public"."product_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."product_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."product_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."product_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."product_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."search_embeddings_cache" TO "anon";
GRANT ALL ON TABLE "public"."search_embeddings_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."search_embeddings_cache" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."store_settings" TO "anon";
GRANT ALL ON TABLE "public"."store_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."store_settings" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_orders" TO "anon";
GRANT ALL ON TABLE "public"."subscription_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_orders" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."user_active_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_active_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_ai_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_ai_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_ai_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "Public read access" on "public"."search_embeddings_cache";


  create policy "Public read access"
  on "public"."search_embeddings_cache"
  as permissive
  for select
  to anon, authenticated
using (true);


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "product_images_admin_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'product-images'::text) AND public.check_is_admin()));



  create policy "product_images_admin_insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'product-images'::text) AND public.check_is_admin()));



  create policy "product_images_admin_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'product-images'::text) AND public.check_is_admin()));



  create policy "product_images_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'product-images'::text));



