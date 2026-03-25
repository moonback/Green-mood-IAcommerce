-- ═══════════════════════════════════════════════════════════════════
-- Migration: 3-level optional category hierarchy
-- Safe to run on a live DB — only ADDs columns, constraints, indexes.
-- Existing rows automatically get parent_id = NULL, depth = 0.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add parent_id (self-referential FK, nullable)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- 2. Add depth (0 = root, 1 = sub, 2 = sub-sub). Default 0 is safe for all existing rows.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS depth int NOT NULL DEFAULT 0;

-- 3. Enforce the 3-level maximum
ALTER TABLE public.categories
  ADD CONSTRAINT categories_depth_check CHECK (depth BETWEEN 0 AND 2);

-- 4. Index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);

-- 5. Composite index for sorted children queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_sort
  ON public.categories(parent_id, sort_order);

-- VERIFICATION QUERIES (run manually after applying):
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_name = 'categories' AND column_name IN ('parent_id', 'depth');
-- SELECT COUNT(*) FROM categories WHERE depth != 0;  -- should be 0 initially
-- INSERT INTO categories(slug, name, depth) VALUES ('test-depth-fail', 'Test', 3); -- expect error
