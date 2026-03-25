-- ═══════════════════════════════════════════════════════════════════
-- ESIL Ventes — Migration v8 : Données initiales
-- • Colonne is_subscribable sur products
-- • Vue product_ratings (agrégation avis)
-- • Table catalog_ads (annonces catalogue)
-- • Codes parrainage ESL- (était GRN-)
-- • Domaine email POS @esilventes.internal
-- • Catégories & produits arcade
-- • Paramètres store_settings
-- Exécuter dans : Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════


-- ─── 1. Colonne is_subscribable ────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_subscribable boolean NOT NULL DEFAULT false;


-- ─── 2. Codes de parrainage : préfixe ESL- ─────────────────────────
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
  RETURN 'ESL-' || upper(substring(md5(now()::text) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ─── 3. POS : domaine email interne ────────────────────────────────
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════
-- 4. CATÉGORIES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.categories (slug, name, description, icon_name, sort_order, is_active)
VALUES
  (
    'jeux-arcade',
    'Jeux d''Arcade',
    'Bornes d''arcade multi-jeux classiques et modernes. Certifiées CE. Usage privé ou professionnel.',
    'Gamepad2', 0, true
  ),
  (
    'flippers',
    'Flippers & Pinball',
    'Flippers mécaniques et numériques des plus grandes marques mondiales : Stern Pinball Chicago Gaming American Pinball.',
    'Joystick', 1, true
  ),
  (
    'simulateurs',
    'Simulateurs',
    'Simulateurs de course moto et vol immersifs. Siège cockpit retour de force et écrans HD pour une immersion totale.',
    'Car', 2, true
  ),
  (
    'billard-bar',
    'Billard & Jeux de Bar',
    'Tables de billard babyfoots fléchettes électroniques et jeux de bar professionnels.',
    'Trophy', 3, true
  )
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name   = EXCLUDED.icon_name,
  sort_order  = EXCLUDED.sort_order,
  is_active   = EXCLUDED.is_active;


-- ═══════════════════════════════════════════════════════════════════
-- 5. PRODUITS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.products (
  category_id, name, slug, sku, description,
  price, original_value, stock_quantity, weight_grams,
  is_available, is_active, is_featured, is_subscribable,
  attributes
)
VALUES

-- ── Jeux d'Arcade ──────────────────────────────────────────────────

(
  (SELECT id FROM public.categories WHERE slug = 'jeux-arcade'),
  'Borne Arcade Multi-Jeux 60-en-1',
  'borne-arcade-multi-60',
  'ESL-ARC-001',
  'Borne d''arcade multi-jeux avec 60 jeux classiques pré-chargés. Écran 32" HD, monnayeur inclus. Idéale pour bar ou salle de jeux.',
  1290.00, 1590.00, 5, 85000, true, true, true, false,
  jsonb_build_object(
    'brand',        'Taito',
    'year',         2023,
    'dimensions',   '65 x 75 x 175 cm',
    'players',      2,
    'power_watts',  350,
    'specs',        jsonb_build_array('Écran 32" HD','60 jeux inclus','Monnayeur intégré','Haut-parleurs stéréo'),
    'connectivity', jsonb_build_array('USB','HDMI','Ethernet'),
    'benefits',     jsonb_build_array('Rentabilité rapide','Facile d''entretien','Certifié CE')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'jeux-arcade'),
  'Borne Cocktail Table 2 Joueurs',
  'borne-cocktail-table',
  'ESL-ARC-002',
  'Table arcade cocktail 2 joueurs face à face. Format bistrot, parfaite pour les cafés et restaurants.',
  890.00, NULL, 3, 45000, true, true, false, false,
  jsonb_build_object(
    'brand',        'Raw Thrills',
    'year',         2022,
    'dimensions',   '85 x 70 x 80 cm',
    'players',      2,
    'power_watts',  200,
    'specs',        jsonb_build_array('Écran 26" encastré','2 joueurs face à face','Monnayeur optionnel','Surface verre trempé'),
    'connectivity', jsonb_build_array('USB','HDMI'),
    'benefits',     jsonb_build_array('Format compact','Design bistrot','Certifié CE')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'jeux-arcade'),
  'Borne Upright Neo-Geo 4-en-1',
  'borne-upright-neo-geo',
  'ESL-ARC-003',
  'Borne upright format néo-géo avec 4 titres SNK emblématiques. Joystick et boutons américains Sanwa.',
  1490.00, 1790.00, 3, 90000, true, true, false, false,
  jsonb_build_object(
    'brand',        'SNK',
    'year',         2021,
    'dimensions',   '65 x 75 x 178 cm',
    'players',      2,
    'power_watts',  400,
    'specs',        jsonb_build_array('4 jeux SNK','Joystick Sanwa','Boutons Américains','Écran 29" Tate'),
    'connectivity', jsonb_build_array('USB','HDMI'),
    'benefits',     jsonb_build_array('Collection','Rare','Certifié CE')
  )
),

-- ── Flippers & Pinball ─────────────────────────────────────────────

(
  (SELECT id FROM public.categories WHERE slug = 'flippers'),
  'Flipper Stern Deadpool Premium',
  'flipper-stern-deadpool',
  'ESL-FLP-001',
  'Flipper Stern Deadpool Premium Edition. Le meilleur flipper de sa génération avec affichage LCD et multiballs.',
  6490.00, 6990.00, 2, 100000, true, true, true, false,
  jsonb_build_object(
    'brand',        'Stern Pinball',
    'year',         2018,
    'dimensions',   '56 x 143 x 191 cm',
    'players',      1,
    'power_watts',  600,
    'specs',        jsonb_build_array('Affichage LCD couleur','Multiballs','Sons & lumières LED','Wi-Fi connecté'),
    'connectivity', jsonb_build_array('Wi-Fi','USB'),
    'benefits',     jsonb_build_array('Pièce maîtresse','Valeur patrimoniale','SAV Stern France')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'flippers'),
  'Flipper Medieval Madness Remake',
  'flipper-medieval-madness',
  'ESL-FLP-002',
  'Medieval Madness Remake par Chicago Gaming Company. Édition limitée, reproduction fidèle de l''iconique de 1997.',
  7990.00, NULL, 1, 105000, true, true, true, false,
  jsonb_build_object(
    'brand',        'Chicago Gaming',
    'year',         2019,
    'dimensions',   '56 x 143 x 191 cm',
    'players',      1,
    'power_watts',  500,
    'specs',        jsonb_build_array('Reproduction fidèle de l''original','LED RGB','Mécanismes améliorés','Affichage HD'),
    'connectivity', jsonb_build_array()::jsonb,
    'benefits',     jsonb_build_array('Édition collector','Investissement sûr','Certifié CE')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'flippers'),
  'Flipper Stern The Mandalorian',
  'flipper-stern-mandalorian',
  'ESL-FLP-003',
  'Flipper Stern The Mandalorian avec thème Star Wars. Graphismes et sons officiels Disney Lucasfilm.',
  5990.00, NULL, 2, 98000, true, true, false, false,
  jsonb_build_object(
    'brand',        'Stern Pinball',
    'year',         2023,
    'dimensions',   '56 x 143 x 191 cm',
    'players',      1,
    'power_watts',  580,
    'specs',        jsonb_build_array('Thème Star Wars officiel','Affichage LCD','LED RGB','Effets sonores HD'),
    'connectivity', jsonb_build_array('Wi-Fi','USB'),
    'benefits',     jsonb_build_array('Licence officielle','Neuf','SAV Stern France')
  )
),

-- ── Simulateurs ────────────────────────────────────────────────────

(
  (SELECT id FROM public.categories WHERE slug = 'simulateurs'),
  'Simulateur Course Sit-Down Deluxe',
  'simulateur-course-sit-down',
  'ESL-SIM-001',
  'Simulateur de course Deluxe avec siège baquet, retour de force, pédales et écran 42" courbe. Expérience immersive totale.',
  3490.00, 3990.00, 4, 120000, true, true, true, false,
  jsonb_build_object(
    'brand',        'Sega',
    'year',         2021,
    'dimensions',   '130 x 110 x 160 cm',
    'players',      1,
    'power_watts',  800,
    'specs',        jsonb_build_array('Siège baquet réglable','Retour de force','Écran 42" courbe','Pédales acier'),
    'connectivity', jsonb_build_array('USB','HDMI','Ethernet'),
    'benefits',     jsonb_build_array('Immersion totale','Multi-jeux','Certifié CE')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'simulateurs'),
  'Simulateur Moto GP Arcade',
  'simulateur-moto-gp',
  'ESL-SIM-002',
  'Simulateur moto GP avec guidon force feedback, siège inclinable et écran 55". Titre officiel MotoGP.',
  4290.00, NULL, 2, 140000, true, true, false, false,
  jsonb_build_object(
    'brand',        'Bandai Namco',
    'year',         2022,
    'dimensions',   '100 x 80 x 180 cm',
    'players',      1,
    'power_watts',  700,
    'specs',        jsonb_build_array('Guidon force feedback','Siège inclinable','Écran 55"','Licence MotoGP officielle'),
    'connectivity', jsonb_build_array('USB','HDMI'),
    'benefits',     jsonb_build_array('Réalisme maximal','Licence officielle','Certifié CE')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'simulateurs'),
  'Simulateur Vol Chasse F1',
  'simulateur-vol-chasse-f1',
  'ESL-SIM-003',
  'Simulateur de vol avion de chasse avec cockpit fermé, écran panoramique 180° et effets vibratoires.',
  5490.00, NULL, 1, 200000, true, true, false, false,
  jsonb_build_object(
    'brand',        'Raw Thrills',
    'year',         2020,
    'dimensions',   '120 x 120 x 140 cm',
    'players',      1,
    'power_watts',  900,
    'specs',        jsonb_build_array('Cockpit fermé','Écran 180°','Effets vibratoires','Manette et pédales de vol'),
    'connectivity', jsonb_build_array('USB','HDMI'),
    'benefits',     jsonb_build_array('Expérience unique','Cockpit immersif','Certifié CE')
  )
),

-- ── Billard & Jeux de Bar ──────────────────────────────────────────

(
  (SELECT id FROM public.categories WHERE slug = 'billard-bar'),
  'Table Billard Américain 8 Pieds',
  'table-billard-americain-8',
  'ESL-BIL-001',
  'Table de billard américain 8 pieds professionnelle. Tapis tournoi, billes incluses, monnayeur optionnel.',
  1890.00, 2200.00, 6, 180000, true, true, false, false,
  jsonb_build_object(
    'brand',        'Brunswick',
    'year',         2023,
    'dimensions',   '220 x 120 x 80 cm',
    'players',      4,
    'power_watts',  0,
    'specs',        jsonb_build_array('Tapis tournoi','Billes professionnelles','Châssis acier','Monnayeur optionnel'),
    'connectivity', jsonb_build_array()::jsonb,
    'benefits',     jsonb_build_array('Robuste et durable','Norme tournoi','Certifié CE')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'billard-bar'),
  'Baby-Foot Professionnel Tornado',
  'babyfoot-tornado-pro',
  'ESL-BIL-002',
  'Baby-foot Tornado professionnel, le standard mondial des compétitions. Barres télescopiques, joueurs moulés.',
  890.00, NULL, 4, 65000, true, true, false, false,
  jsonb_build_object(
    'brand',        'Tornado',
    'year',         2023,
    'dimensions',   '120 x 70 x 90 cm',
    'players',      4,
    'power_watts',  0,
    'specs',        jsonb_build_array('Barres télescopiques','Joueurs moulés','Pieds antidérapants','Monnayeur optionnel'),
    'connectivity', jsonb_build_array()::jsonb,
    'benefits',     jsonb_build_array('Standard compétition','Référence mondiale','Certifié CE')
  )
),

(
  (SELECT id FROM public.categories WHERE slug = 'billard-bar'),
  'Fléchettes Électroniques Pro',
  'flechettes-electroniques-pro',
  'ESL-BIL-003',
  'Machine à fléchettes électroniques professionnelle. 30+ jeux, écran LCD, réseau internet pour tournois en ligne.',
  690.00, NULL, 8, 25000, true, true, false, false,
  jsonb_build_object(
    'brand',        'Target Darts',
    'year',         2022,
    'dimensions',   '45 x 10 x 90 cm',
    'players',      8,
    'power_watts',  150,
    'specs',        jsonb_build_array('30+ jeux intégrés','Écran LCD','Réseau tournois en ligne','Cible sécurisée'),
    'connectivity', jsonb_build_array('Wi-Fi','Ethernet'),
    'benefits',     jsonb_build_array('Compact','Réseau de tournois','Certifié CE')
  )
)

ON CONFLICT (slug) DO UPDATE SET
  category_id     = EXCLUDED.category_id,
  name            = EXCLUDED.name,
  sku             = EXCLUDED.sku,
  description     = EXCLUDED.description,
  price           = EXCLUDED.price,
  original_value  = EXCLUDED.original_value,
  stock_quantity  = EXCLUDED.stock_quantity,
  weight_grams    = EXCLUDED.weight_grams,
  is_available    = EXCLUDED.is_available,
  is_active       = EXCLUDED.is_active,
  is_featured     = EXCLUDED.is_featured,
  is_subscribable = EXCLUDED.is_subscribable,
  attributes      = EXCLUDED.attributes;


-- ═══════════════════════════════════════════════════════════════════
-- 6. PARAMÈTRES DE LA BOUTIQUE (store_settings)
-- ON CONFLICT DO NOTHING → les valeurs déjà personnalisées sont conservées
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.store_settings (key, value) VALUES
  ('store_name',               to_jsonb('ESIL Ventes'::text)),
  ('store_tagline',            to_jsonb('Leader Français du Loisir Récréatif'::text)),
  ('store_email',              to_jsonb('contact@esilventes.fr'::text)),
  ('store_phone',              to_jsonb('01 42 56 78 90'::text)),
  ('store_address',            to_jsonb('42 Avenue des Jeux, 75008 Paris'::text)),
  ('store_siret',              to_jsonb('123 456 789 00012'::text)),
  ('store_tva_intra',          to_jsonb('FR 12 345678901'::text)),
  ('store_city',               to_jsonb('Paris'::text)),
  ('store_sector',             to_jsonb('Loisirs & Jeux'::text)),
  ('store_brand_range',        to_jsonb('Pro Series'::text)),
  ('store_description',        to_jsonb('Spécialiste de l''importation et distribution de machines de loisirs, jeux d''arcade, flippers et simulateurs en France.'::text)),
  ('store_logo_url',           to_jsonb('/logo.png'::text)),
  ('store_url',                to_jsonb('https://esilventes.fr'::text)),
  ('banner_text',              to_jsonb('🎮 Livraison & installation incluses — Devis gratuit sous 24h !'::text)),
  ('banner_enabled',           to_jsonb(true)),
  ('budtender_name',           to_jsonb('PlayAdvisor'::text)),
  ('budtender_chat_enabled',   to_jsonb(true)),
  ('budtender_voice_enabled',  to_jsonb(true)),
  ('budtender_voice_name',     to_jsonb('Kore'::text)),
  ('budtender_base_prompt',    to_jsonb(''::text)),
  ('loyalty_currency_name',    to_jsonb('TOKENS'::text)),
  ('loyalty_earn_rate',        to_jsonb(1)),
  ('loyalty_redeem_rate',      to_jsonb(5)),
  ('subscriptions_enabled',    to_jsonb(false)),
  ('referral_program_enabled', to_jsonb(true)),
  ('referral_reward_points',   to_jsonb(500)),
  ('referral_welcome_bonus',   to_jsonb(0)),
  ('social_instagram',         to_jsonb('https://instagram.com/esilventes'::text)),
  ('social_facebook',          to_jsonb('https://facebook.com/esilventes'::text)),
  ('social_twitter',           to_jsonb(''::text)),
  ('social_tiktok',            to_jsonb(''::text)),
  ('theme_color_neon',         to_jsonb('#00e5ff'::text)),
  ('theme_color_dark',         to_jsonb('#080d1a'::text)),
  ('theme_color_primary',      to_jsonb('#0066cc'::text)),
  ('ai_model',                 to_jsonb('mistralai/mistral-small-creative'::text)),
  ('ai_temperature',           to_jsonb(0.7)),
  ('ai_max_tokens',            to_jsonb(1000)),
  ('invoice_tax_rate',         to_jsonb(20)),
  ('invoice_legal_text',       to_jsonb('Produits conformes aux normes CE et aux réglementations françaises en vigueur. Garantie constructeur 2 ans — SAV technique disponible. TVA 20% incluse. ESIL Ventes — Leader français du loisir récréatif.'::text)),
  ('delivery_fee',             to_jsonb(0)),
  ('delivery_free_threshold',  to_jsonb(500)),
  ('search_enabled',           to_jsonb(true)),
  ('home_reviews_enabled',     to_jsonb(true)),
  ('home_best_sellers_enabled',to_jsonb(true)),
  ('pos_background_url',       to_jsonb('/images/hero-bg-shop.png'::text)),
  ('hero_bg_url',              to_jsonb('/images/hero-bg-shop.png'::text)),
  ('home_hero_bg_url',         to_jsonb('/images/hero-bg-shop.png'::text)),
  ('ticker_messages',          '["✦ Livraison en France métropolitaine ✦","✦ Garantie constructeur 2 ans sur toutes nos machines ✦","✦ Financement professionnel disponible — Contactez-nous ✦"]'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ─── 7. Vue product_ratings ─────────────────────────────────────────
-- Agrège la table reviews par produit pour exposer avg_rating et review_count
-- Utilisée par le catalogue et la fiche produit via Supabase PostgREST.
CREATE OR REPLACE VIEW public.product_ratings AS
SELECT
  product_id,
  round(avg(rating)::numeric, 2)  AS avg_rating,
  count(*)                         AS review_count
FROM public.reviews
WHERE is_published = true
GROUP BY product_id;

-- Autoriser la lecture publique sur la vue
GRANT SELECT ON public.product_ratings TO anon, authenticated;


-- ─── 8. Table catalog_ads ───────────────────────────────────────────
-- Annonces sponsorisées injectées dans la grille catalogue (AdminAdsTab).
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

ALTER TABLE public.catalog_ads ENABLE ROW LEVEL SECURITY;

-- Lecture publique
DROP POLICY IF EXISTS "catalog_ads_public_read" ON public.catalog_ads;
CREATE POLICY "catalog_ads_public_read" ON public.catalog_ads
  FOR SELECT USING (is_active = true);

-- Gestion admin complète
DROP POLICY IF EXISTS "catalog_ads_admin_all" ON public.catalog_ads;
CREATE POLICY "catalog_ads_admin_all" ON public.catalog_ads
  FOR ALL USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());
