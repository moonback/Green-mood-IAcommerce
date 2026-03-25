-- Hardening admin access:
-- 1) RLS enabled on critical admin tables
-- 2) Admin-only mutation policies based on authenticated profile.is_admin

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write"
ON public.products
FOR ALL
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write"
ON public.categories
FOR ALL
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "stock_admin_all" ON public.stock_movements;
CREATE POLICY "stock_admin_all"
ON public.stock_movements
FOR ALL
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "store_settings_admin_all" ON public.store_settings;
CREATE POLICY "store_settings_admin_all"
ON public.store_settings
FOR ALL
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "promo_codes_admin_all" ON public.promo_codes;
CREATE POLICY "promo_codes_admin_all"
ON public.promo_codes
FOR ALL
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "recommendations_admin_all" ON public.product_recommendations;
CREATE POLICY "recommendations_admin_all"
ON public.product_recommendations
FOR ALL
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "knowledge_base_admin_insert" ON public.knowledge_base;
CREATE POLICY "knowledge_base_admin_insert"
ON public.knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "knowledge_base_admin_update" ON public.knowledge_base;
CREATE POLICY "knowledge_base_admin_update"
ON public.knowledge_base
FOR UPDATE
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "knowledge_base_admin_delete" ON public.knowledge_base;
CREATE POLICY "knowledge_base_admin_delete"
ON public.knowledge_base
FOR DELETE
TO authenticated
USING (public.check_is_admin());

DROP POLICY IF EXISTS "blog_posts_admin_insert" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_insert"
ON public.blog_posts
FOR INSERT
TO authenticated
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "blog_posts_admin_update" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_update"
ON public.blog_posts
FOR UPDATE
TO authenticated
USING (public.check_is_admin())
WITH CHECK (public.check_is_admin());

DROP POLICY IF EXISTS "blog_posts_admin_delete" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_delete"
ON public.blog_posts
FOR DELETE
TO authenticated
USING (public.check_is_admin());
