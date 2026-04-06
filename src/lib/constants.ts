// ─── Category slugs ──────────────────────────────────────────────────────────
// Single source of truth for DB category slugs used throughout the app.
// If a slug changes in the DB, update here only.

export const CATEGORY_SLUGS = {
  FLEURS: 'fleurs',
  RESINES: 'resines',
  HUILES: 'huiles',
  VAPES: 'vapes',
  GUMMIES: 'gummies',
  ACCESSORIES: 'accessoires',
} as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[keyof typeof CATEGORY_SLUGS];
