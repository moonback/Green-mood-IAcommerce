-- Migration indépendante: Blog Posts
-- But: permettre l'activation de l'onglet Blog admin même si boutique-vierge.sql
-- n'est pas rejoué en entier.

BEGIN;

-- 1) Table blog_posts
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

-- 2) Fonction utilitaire updated_at (créée si absente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Trigger updated_at
DROP TRIGGER IF EXISTS set_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER set_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4) RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

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

COMMIT;
