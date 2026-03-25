# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
npm run lint         # TypeScript type-check (tsc --noEmit)
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run (CI)
npm run test:e2e     # Playwright E2E tests
npm run dev:importer # Product importer Express server (server/index.ts)
```

## Architecture Overview

**NeuroCart** is an AI-first e-commerce platform. Stack: React 19 + TypeScript 5.8 + Vite 6, Supabase (PostgreSQL + PostgREST + Edge Functions), Tailwind CSS v4, Zustand 5, Motion/React (Framer Motion v11+), Lucide React icons.

### Routing & Entry Points

- `src/main.tsx` — React root. Wraps: ErrorBoundary → SEOProvider → ThemeProvider → App
- `src/App.tsx` — BrowserRouter with lazy-loaded routes. Route guards: `AdminRoute` (admin role), `ProtectedRoute` (authenticated)
- `/admin` and `/pos` render outside the main Layout (no header/footer)
- All page components in `src/pages/` are lazy-loaded via `React.lazy`

### State Management

Nine Zustand stores in `src/store/`. Most important:
- `authStore` — user session & role
- `cartStore` — cart items & operations
- `settingsStore` — store config, theme colors, enabled modules (fetched from Supabase `settings` table on load)
- `toastStore` — notifications

No context providers for data — components fetch directly from Supabase or use stores.

### Supabase & Data Layer

- Client configured in `src/lib/supabaseClient.ts`
- Secrets without `VITE_` prefix (API keys, Stripe secret) are Edge Function–only; set via `supabase secrets set`
- Edge Functions in `supabase/functions/`: `ai-chat`, `ai-embeddings`, `gemini-token`, `stripe-payment`, `stripe-webhook`, `admin-action`
- Key RPC functions: `match_products(embedding, threshold, count)` (vector search), `process_checkout(...)` (atomic order + stock decrement)
- SQL migrations in `supabase/` root — run new ones in the Supabase SQL editor

### Category Hierarchy

3-level optional tree: Root (depth=0) → Sub (depth=1) → Sub-sub (depth=2). Migration: `supabase/20260320_category_hierarchy.sql`. Core utilities: `src/lib/categoryTree.ts` (`buildCategoryTree`, `flattenTree`, `getCategoryAncestors`, `getCategorySubtreeIds`). Always use `(cat.depth ?? 0)` and `(cat.parent_id ?? null)` since fields are optional for backward compat.

### Admin Dashboard

`src/pages/Admin.tsx` is the central data loader — fetches all categories flat and passes them as props to 28+ tab components in `src/components/admin/`. The Admin page owns the top-level data; tabs receive it as props rather than fetching independently.

### AI / Voice System

- **Voice** (`src/hooks/useGeminiLiveVoice.ts`, 83 KB): WebSocket to Gemini Live API, streams 16 kHz PCM audio in / 24 kHz PCM out. Handles 20+ client-side tool calls (product search, cart ops, etc.) with 2500 ms deduplication.
- **Text chat** (`src/hooks/useBudTenderChat.ts`): OpenRouter LLM streaming with conversation state.
- **Prompts** (`src/lib/budtenderPrompts.ts`, 31 KB): Modular system prompt builder. `VOICE_FORMAT_RULES` forbids markdown, emojis, and bullets (TTS-friendly output).
- **Memory** (`src/hooks/useBudTenderMemory.ts`): Persists user quiz responses and preferences in Supabase JSONB.

### Theming & Styling

Tailwind CSS v4 with dynamic CSS variables injected by `ThemeProvider` (values from `settingsStore`).

Variable pattern: `--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--color-text-muted`, `--color-border`, etc.

Usage in Tailwind: `[color:var(--color-primary)]` — never raw hex values.

Icons: `lucide-react` only (not heroicons or other icon sets).

### Code Splitting

`vite.config.ts` defines manual chunks: `app-admin`, `app-budtender`, `app-account`, plus vendor chunks for motion, icons, charts, PDF, QR, Stripe, Supabase, AI SDKs, CSV libs.

### Testing

- Unit/component tests: `src/test/setup.ts`, jsdom environment, vitest globals
- E2E: `e2e/` directory, Playwright auto-starts dev server on port 3000
- Run a single test file: `npx vitest run src/path/to/file.test.ts`

### Key `src/lib/` Utilities

- `types.ts` — 40+ shared TypeScript interfaces (Category, Product, Order, etc.)
- `categoryTree.ts` — hierarchy tree utilities
- `budtenderPrompts.ts` — AI system prompt builder
- `productAI.ts` — product enrichment via AI
- `analytics.ts` — event tracking
- `seo/` — SEO utilities used by SEOProvider

### Environment Variables

```
VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY   # Required for all features
VITE_STRIPE_PUBLIC_KEY                         # Payments
VITE_OPENROUTER_EMBED_MODEL / _DIMENSIONS      # Embeddings config
VITE_SENTRY_DSN                                # Optional monitoring

# Edge Function secrets (not VITE_ prefixed):
OPENROUTER_API_KEY, GEMINI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```
