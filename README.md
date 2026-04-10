<div align="center">
<img src="public/header.png" alt="Green-mood — AI-First E-Commerce Platform" />
<video src="public/video.mp4"></video>
  
# Green-mood E-commerce IA

**Plateforme e-commerce AI-First spécialisée CBD & bien-être.**
*React 19 · TypeScript · Supabase · Gemini Live Voice · Vector Search · Stripe · POS*

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_Live-Voice_AI-EA4335?logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Tests-364%20passing-brightgreen?logo=vitest" alt="Tests 364 passing" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white" />
  <img src="https://img.shields.io/badge/Playwright-21%2F21_Passed-28A745?logo=playwright&logoColor=white" />
</p>

[Présentation](#-présentation) · [Fonctionnalités](#-fonctionnalités) · [Architecture](#-architecture) · [Stack](#-stack-technique) · [Installation](#-installation) · [Variables d'environnement](#-variables-denvironnement) · [Structure](#-structure-du-projet) · [Système IA](#-système-ia) · [Base de données](#-base-de-données) · [Admin](#-administration) · [Déploiement](#-déploiement)

</div>

---

## Présentation

### Objectif

**Green-mood** est une plateforme e-commerce **production-ready** et **AI-First**, conçue nativement pour le domaine du CBD et du bien-être. L'intelligence artificielle n'est pas un plugin ajouté après coup — elle est intégrée à chaque couche : conseiller vocal temps réel, recherche sémantique par effets, enrichissement automatique des produits, recommandations personnalisées, et assistance administrative par commande vocale.

### Problème résolu

Les solutions génériques (Shopify, WooCommerce) imposent des dizaines de plugins tiers pour atteindre un niveau de personnalisation avancé, et ne sont pas architecturées pour l'IA native. Green-mood résout ce problème en proposant :

- Une architecture **AI-First** où l'IA est un citoyen de première classe, pas un add-on
- Un système **omnicanal natif** : web storefront + terminal POS physique + affichage digital (TV)
- Une **personnalisation totale** via Admin Dashboard sans modifier le code
- Un **programme de fidélisation et parrainage** intégré nativement
- Une **base de connaissances vectorielle (RAG)** pour un IA métier précis et fiable

### Cas d'usage

| Secteur | Usage principal |
|---------|----------------|
| CBD & Bien-être Premium | BudTender IA vocal + POS + fidélité |
| Boutique spécialisée | Catalogue + quiz + matching vectoriel par effets |
| Commerce physique | En ligne + caisse POS + affichage TV |
| White-label / Franchise | Configuration JSON exportable entre instances |
| Abonnements | Commandes récurrentes + paliers de fidélité |

### Public cible

- **Développeurs** souhaitant une base solide pour un e-commerce IA production-ready
- **Agences web** cherchant un starter kit complet et déployable en < 1 jour
- **CTOs / Startups** voulant lancer rapidement avec une architecture scalable
- **Investisseurs techniques** évaluant une solution SaaS spécialisée

---

## Fonctionnalités

### E-commerce Premium

- **Storefront haute performance** — React 19 + Vite 6, chargement < 1s, lazy loading natif sur toutes les routes
- **Catalogue dynamique** — Recherche hybride IA (Sémantique vectorielle + Fallback PostgreSQL ILIKE), filtres hiérarchiques, DualRangeSlider prix, tri intelligent
- **Recherche prédictive instantanée** — Résultats textuels et visuels en temps réel dès la première frappe
- **Fiches produit "Conversion-Ready"** — Galerie immersive, badges stock, preuve sociale, guides de consommation, spécifications botaniques, profil sensoriel interactif
- **Panier & tunnel de commande** — CartSidebar persisté, calcul livraison dynamique, codes promo, checkout Stripe 2 étapes (adresse → paiement)
- **Paiement Stripe natif** — Stripe Elements embarqué (sans redirection), PaymentIntent côté Edge Function, vérification webhook HMAC-SHA256
- **Gestion abonnements** — Commandes récurrentes (hebdo / bimensuel / mensuel) avec tableau de bord client
- **Programme fidélité** — Monnaie virtuelle configurable (nom + taux), paliers Bronze / Silver / Gold avec avantages automatiques, historique de transactions
- **Parrainage automatisé** — Lien unique par client, tableau de bord parrain/filleul, attribution automatique de points
- **Espace client complet** — Commandes, adresses, profil, abonnements, favoris, avis, historique fidélité

### BudTender IA Vocal (Gemini Live)

Le cœur différenciant du projet. Un conseiller expert CBD disponible 24h/24 directement dans le navigateur, sans aucune application externe.

- **Modèle** : `gemini-3.1-flash-live-preview` (Gemini Live Native Audio)
- **Latence Ressentie Nulle** : Système de feedback simultané ("Verbal Mirroring") où l'IA accuse réception professionnellement de la demande pendant que les outils de recherche s'exécutent.
- **Mémoire Sémantique Évolutive** : Extraction automatique d'insights long-terme (expertise, goûts, objectifs) stockés en base (`user_ai_preferences`), injectés proactivement dans le contexte de l'IA.
- **Persistance Multi-onglets** : Historique et préférences migrés vers `localStorage`, permettant une continuité de session fluide après un rafraîchissement ou l'ouverture de nouveaux onglets.
- **UI Premium Réactive** : Indicateur visuel "Pulse" cyan/bleu ultra-fluide signalant l'activité de recherche IA en temps réel.
- **20+ outils Function Calling** : recherche catalogue, navigation, ajout panier, comparaison produits, suivi commande, gestion favoris, application promo, quiz préférences, etc.
- **Recherche floue 4 niveaux** : cache FIFO local → exact match → substring → fuzzy RPC PostgreSQL (`pg_trgm`, index GIST)
- **Calibration adaptative du bruit** : seuil de détection recalibré toutes les 60s, barge-in avec fade-out 80ms
- **Message Queue** : synchronisation panier / navigation sans perte pendant les gaps WebSocket
- **Moteur de Skills modulaire** : fichiers `.md` injectés dynamiquement, minifiés automatiquement pour le TTS
- **Token éphémère sécurisé** : la clé API Gemini ne transite jamais dans le navigateur (Edge Function `gemini-token`)
- **Proactivité intelligente** : relance vocale après 8s (panier actif) ou 15s (navigation seule)

### Intelligence Omnicanale

- **Dashboard IA POS** : insights temps réel intégrés à l'interface caisse pour le personnel en magasin
- **Boucle auto-apprenante** : feedback loop optimisant les recommandations à partir des données de ventes
- **Dashboard de performance IA** : métriques de conversion, revenus générés par l'IA, taux de recommandation

### Terminal POS (Point de Vente)

- Interface tactile optimisée, grille produits par catégorie, scanner QR codes produits
- Sélection client (liaison avec comptes existants), attribution automatique de points fidélité
- Encaissement hybride (espèces / carte), modal de paiement avec calcul monnaie
- Rapports X & Z (clôture de caisse), modal de rapport détaillé
- Écran client dédié (affichage secondaire via WebSocket temps réel)
- Commandes IA POS : suggestions de produits complémentaires pour le vendeur

### Affichage Digital (Digital Signage)

- **Store Display** (`/store-display`) — Rotation produits configurée en admin, flash promos avec compte à rebours, météo locale
- **Customer Display** (`/customer-display`) — Récapitulatif commande affiché sur écran secondaire pendant l'encaissement POS

### Administration Back-office (28 modules)

| Module | Capacités |
|--------|-----------|
| **Dashboard** | KPIs temps réel, graphiques Recharts, revenus, top produits |
| **Produits** | CRUD complet, auto-fill IA, import CSV massif, modification de masse, vectorisation forcée |
| **Catégories** | Arborescence 3 niveaux (Root → Sub → Sub-sub), icônes, slugs |
| **Commandes** | Vue liste + Kanban drag-drop, détail complet, changement de statut |
| **Stock** | Mouvements, alertes seuil bas, historique |
| **Clients (CRM)** | Profils, historique achats, points fidélité, anniversaires |
| **Analytics** | Taux de conversion, pages vues, événements personnalisés |
| **BudTender IA** | Configuration quiz, ton, prompt custom, base de connaissances |
| **POS** | Configuration terminal, rapport de caisse |
| **Marketing** | Campagnes publicitaires, bannières promotionnelles |
| **Promo Codes** | Création codes avec type (% / fixe), limites, expiration |
| **Fidélité** | Taux points, paliers, historique transactions |
| **Parrainage** | Suivi filleuls, attributions, statistiques |
| **Recommandations** | Cross-selling IA, similarité vectorielle par profil terpénique, associations produits |
| **Abonnements (Kanban)** | Gestion visuelle des préparations quotidiennes, vue Jour/Mois, sélecteur de date, validation en 1 clic |
| **Avis** | Modération, réponses, approbation |
| **Blog RAG** | Génération guides SEO depuis base de connaissances |
| **Base de connaissances** | Import PDF, import Obsidian (.md), CRUD articles, vectorisation auto |
| **Cannabis Conditions** | Base de données scientifique (evidence score, études) |
| **SEO Auto** | Génération IA title + meta description par produit |
| **Comptabilité** | Export CSV/Excel, génération factures PDF |
| **Sessions IA** | Historique conversations BudTender, durées |
| **Publicités** | Création et planification campagnes storefront |
| **Anniversaires** | Automatisation récompenses clients |
| **Display** | Configuration affichage TV / digital signage |
| **Modèles IA** | Sélection et configuration des modèles OpenRouter |
| **Paramètres** | Configuration globale + export/import JSON + reset |

### SEO & Contenu Automatisé

- **SEO produits automatisé** : génération IA des balises `title` + `meta description` exploitées côté front
- **Base de connaissances hybride** : support natif des notices PDF et des vaults **Obsidians** (Markdown avec frontmatter). Nettoyage automatique de la syntaxe Obsidian (WikiLinks, tags, callouts) pour une vectorisation optimale.
- **Blog automatique via RAG** : génération de guides SEO depuis la base de connaissances (`npm run blog:generate`)
- **Sitemap enrichi** : injection automatique des URLs produits et guides (`npx tsx scripts/generate-sitemap.ts`)
- **JSON-LD structuré** : schemas Product, BreadcrumbList, Organization pour le rich snippet Google
- **Open Graph** : balises OG complètes pour le partage réseaux sociaux

- **Check Admin Server-Side** : Fonction `check_is_admin()` durcie avec validation systématique contre les escalades de privilèges
- **Tests Qualité** : Suite exhaustive Vitest (364 tests passants) + Tests E2E Playwright (21/21 scénarios critiques réussis)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND  (React 19 + Vite 6)                  │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────────┐  │
│  │  Storefront  │   │  Admin Panel │   │   POS  /  Display       │  │
│  │  35+ pages   │   │  28 modules  │   │  Touch UI + WebSocket   │  │
│  └──────┬───────┘   └──────┬───────┘   └────────────┬────────────┘  │
│         │                  │                         │               │
│  ┌──────▼──────────────────▼─────────────────────────▼────────────┐  │
│  │                  Zustand 5  (9 stores)                          │  │
│  │  auth · cart · settings · wishlist · toast                      │  │
│  │  recentlyViewed · backgroundTask · budtender                    │  │
│  └─────────────────────────┬───────────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────────┘
                             │  Supabase JS SDK
┌────────────────────────────▼────────────────────────────────────────┐
│                       SUPABASE BACKEND                               │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   PostgreSQL    │  │  Edge Functions  │  │    Storage       │   │
│  │  20+ tables     │  │  (Deno runtime)  │  │  product-images  │   │
│  │  pgvector       │  │                  │  │  store / ads     │   │
│  │  pg_trgm        │  │  ai-chat         │  │  categories      │   │
│  │  RLS policies   │  │  ai-embeddings   │  └──────────────────┘   │
│  │  RPC functions  │  │  gemini-token    │                         │
│  └─────────────────┘  │  stripe-payment  │                         │
│                       │  stripe-webhook  │                         │
│                       │  admin-action    │                         │
│                       └──────────────────┘                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  OpenRouter API  │  │  Google Gemini  │  │  Stripe API      │
│  LLM streaming   │  │  Live Voice API │  │  PaymentIntents  │
│  Embeddings      │  │  WebSocket WSS  │  │  Webhooks        │
└──────────────────┘  └─────────────────┘  └──────────────────┘
```

### Couche IA — Flux de données

```
Utilisateur parle dans le micro
        │
        ▼
AudioWorklet (src mic) ──► Web Worker /downsample-worker.js
        │                   (Int16 downsampling 48kHz→16kHz, zero-copy)
        ▼
sessionRef.sendRealtimeInput(audio PCM base64)
        │
        ▼
WebSocket ──► Gemini Live API (gemini-3.1-flash-live-preview)
        │
        ▼
onmessage: serverContent | toolCall
        │
    ┌───┴──────────────────────────────────────────┐
    ▼                                              ▼
Audio PCM chunks (24kHz)                    Function Calls (20+ tools)
    │                                              │
    │  ◄── [DÉCLENCHEMENT AUDIO IMMÉDIAT]          │  ◄── [EXÉCUTION PARALLÈLE]
    ▼                                              ▼
playPcmChunk() → AudioContext                 executeToolCall()
  (scheduled, barge-in capable)                │  (Pulse UI bleu activé)
                                          ┌────┴───────────────────────────┐
                                          │  search_catalog → pgvector RPC │
                                          │  add_to_cart → cartStore       │
                                          │  save_preferences → Memory     │
                                          │  extract_insights → Semantic   │
                                          └────────────────────────────────┘
```

### Modules et responsabilités

| Module | Rôle | Fichiers clés |
|--------|------|---------------|
| **Storefront** | Pages publiques, catalogue, panier, commandes | `src/pages/*.tsx` |
| **Admin Panel** | Dashboard, CRUD, analytics, configuration | `src/components/admin/` |
| **BudTender Voice** | Conseiller IA vocal expert CBD | `src/hooks/useGeminiLiveVoice.ts` |
| **Prompts Engine** | Génération system prompts modulaires | `src/lib/budtenderPrompts.ts`, `src/skills/` |
| **POS System** | Terminal de caisse physique | `src/components/admin/pos/`, `src/pages/POSPage.tsx` |
| **State Management** | Stores Zustand globaux | `src/store/*.ts` |
| **Supabase Layer** | Requêtes DB, auth, storage, RPC | `src/lib/supabase.ts` |
| **AI Utilities** | Embeddings, vector search, product AI | `src/lib/embeddings.ts`, `src/lib/productAI.ts` |
| **SEO Engine** | Meta tags, JSON-LD, Open Graph, sitemap | `src/lib/seo/`, `src/seo/SEOProvider.tsx` |
| **Settings Service** | Configuration boutique centralisée | `src/lib/settingsService.ts`, `src/store/settingsStore.ts` |

---

## Stack Technique

| Domaine | Technologie | Version | Rôle |
|---------|------------|---------|------|
| **Core** | React | 19 | Framework UI avec concurrent features |
| **Langage** | TypeScript | 5.8 | Typage strict, 40+ interfaces partagées |
| **Bundler** | Vite | 6 | HMR, code splitting manuel, assets |
| **Styles** | Tailwind CSS | v4 | CSS variables dynamiques, theming runtime |
| **Animations** | Motion/React | 12 | Framer Motion v11+, AnimatePresence |
| **State** | Zustand | 5 | 9 stores globaux, persist middleware |
| **Routing** | React Router | 7.13 | Lazy loading, route guards, BrowserRouter |
| **Backend/BaaS** | Supabase | 2.98 | PostgreSQL + PostgREST + Edge Functions + Storage |
| **Vector Search** | pgvector | — | Embeddings, similarité cosinus, index HNSW |
| **Fuzzy Search** | pg_trgm | — | Recherche floue, index GIST, RPC server-side |
| **Runtime Edge** | Deno (Supabase) | — | Edge Functions isolées, crypto native |
| **AI LLM** | OpenRouter API | — | Streaming LLM, génération contenu, embeddings |
| **AI Embeddings** | text-embedding-3-large | 3072d | Vecteurs produits, knowledge base, conditions |
| **AI Voice** | Google Gemini Live | @google/genai 1.29 | WebSocket bidirectionnel, audio natif |
| **Audio** | AudioWorklet + Web Worker | — | Capture mic, downsampling, barge-in |
| **Paiements** | Stripe | Elements 5.6 | PaymentIntent, webhook HMAC, Elements UI |
| **Charts** | Recharts | 3.7 | KPIs, revenus, histogrammes |
| **Icons** | Lucide React | 0.546 | Seule bibliothèque d'icônes utilisée |
| **PDF** | jsPDF + autotable | 4.2 | Factures, exports comptables |
| **QR Codes** | html5-qrcode + qrcode.react | 2.3 / 4.2 | Scanner POS, génération QR |
| **CSV / Excel** | PapaParse + xlsx | 5.5 / 0.18 | Import/export produits, comptabilité |
| **Tests unitaires** | Vitest | 4 | jsdom, Testing Library, coverage |
| **Tests E2E** | Playwright | 1.58 | Auto-start dev server, 5 scénarios |
| **Monitoring** | Sentry | — | Optionnel, DSN configurable |
| **Déploiement** | Vercel / Netlify | — | `vercel.json` + `netlify.toml` inclus |

---

## Installation

### Prérequis

- **Node.js** ≥ 18.0 (recommandé : 20 LTS)
- **npm** ≥ 9 (ou pnpm / yarn)
- **Compte Supabase** (tier gratuit suffisant pour démarrer) — [supabase.com](https://supabase.com)
- **Compte OpenRouter** pour les fonctionnalités IA text + embeddings — [openrouter.ai](https://openrouter.ai)
- **Clé API Google Gemini** pour la voix — [aistudio.google.com](https://aistudio.google.com)
- **Compte Stripe** pour les paiements (mode test disponible) — [stripe.com](https://stripe.com)

### Étape 1 — Cloner et installer

```bash
git clone https://github.com/votre-org/green-mood.git
cd green-mood
npm install
```

### Étape 2 — Variables d'environnement

```bash
cp .env.example .env
# Éditer .env avec vos clés (voir section Variables d'environnement)
```

### Étape 3 — Configurer Supabase

```bash
# Option A : Supabase CLI (recommandé)
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_REF
npx supabase db push

# Option B : Import manuel
# Dashboard Supabase → SQL Editor
# Exécuter supabase/boutique-vierge.sql
# Puis supabase/migrations/20260327_fuzzy_search.sql
# Puis supabase/add_stripe_migration.sql (si Stripe activé)
```

**Extensions Supabase requises** (activer via Dashboard → Database → Extensions) :
- `vector` — recherche vectorielle pgvector
- `pg_trgm` — recherche floue trigram (fuzzy search)

### Étape 4 — Déployer les Edge Functions

```bash
# Déployer les fonctions
npx supabase functions deploy ai-chat
npx supabase functions deploy ai-embeddings
npx supabase functions deploy gemini-token
npx supabase functions deploy stripe-payment
npx supabase functions deploy stripe-webhook
npx supabase functions deploy admin-action

# Configurer les secrets (NE JAMAIS préfixer avec VITE_)
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set GEMINI_API_KEY=AIzaSy...
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### Étape 5 — Lancer l'application

```bash
# Développement (port 3000)
npm run dev

# Build de production
npm run build

# Prévisualisation du build
npm run preview

# Serveur d'import produits (optionnel)
npm run dev:importer
```
---

## Variables d'environnement

### Client (préfixe `VITE_` — exposées dans le bundle)

```env
# Supabase — OBLIGATOIRE
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe — clé publique uniquement (sans secret)
VITE_STRIPE_PUBLIC_KEY=pk_test_51...

# OpenRouter Embeddings — dimensions DOIVENT correspondre à vector(N) en DB
VITE_OPENROUTER_EMBED_MODEL=openai/text-embedding-3-large
VITE_OPENROUTER_EMBED_DIMENSIONS=3072

# Monitoring (optionnel)
VITE_SENTRY_DSN=https://xxx@sentry.io/yyy
```

### Serveur — Edge Functions uniquement (`supabase secrets set`)

> **Attention** : Ces variables ne doivent **jamais** avoir le préfixe `VITE_`. Elles sont injectées dans les Edge Functions Deno via `supabase secrets set` et n'apparaissent jamais dans le bundle client.

```env
# OpenRouter — LLM streaming + génération embeddings
OPENROUTER_API_KEY=sk-or-v1-...

# Google Gemini — token éphémère pour Gemini Live Voice
GEMINI_API_KEY=AIzaSy...

# Stripe — secret pour créer les PaymentIntents
STRIPE_SECRET_KEY=sk_test_51... (ou sk_live_... en production)

# Stripe — validation signature webhook (HMAC-SHA256)
STRIPE_WEBHOOK_SECRET=whsec_...

# Application URL (pour les webhooks, emails transactionnels)
APP_URL=https://votre-app.vercel.app
```

### Règle de sécurité critique

```
VITE_* → Bundle navigateur (publique)  → Valeurs non sensibles uniquement
Secrets → Edge Function Deno (serveur) → API keys, secrets, tokens
```

---

## Structure du Projet

```
green-mood/
│
├── src/
│   ├── App.tsx                        # Router principal, 40+ routes lazy-loaded
│   ├── main.tsx                       # Entrée : ErrorBoundary → SEOProvider → ThemeProvider → App
│   ├── index.css                      # Tailwind v4 + CSS variables dynamiques (--color-*)
│   │
│   ├── pages/                         # 35 pages (toutes lazy-loaded via React.lazy)
│   │   ├── Home.tsx / HomeV2.tsx      # Page d'accueil avec hero dynamique
│   │   ├── Catalog.tsx                # Catalogue filtrable + recherche vectorielle
│   │   ├── Products.tsx               # Liste produits avec filtres avancés
│   │   ├── ProductDetail.tsx          # Fiche produit premium (22 KB, galerie, specs, avis)
│   │   ├── Cart.tsx / Checkout.tsx    # Panier + tunnel de commande Stripe
│   │   ├── OrderConfirmation.tsx      # Page de confirmation post-paiement
│   │   ├── Account.tsx                # Espace client (commandes, favoris, points)
│   │   ├── Admin.tsx                  # Dashboard admin central (28 tabs, 13KB)
│   │   ├── POSPage.tsx                # Terminal de caisse (wrapper)
│   │   ├── CustomerDisplay.tsx        # Écran client POS (WebSocket)
│   │   ├── StoreDisplay.tsx           # Affichage digital signage TV
│   │   ├── Guides.tsx                 # Blog guides SEO générés par RAG
│   │   └── ...                        # Login, FAQ, CGV, Livraison, Contact, etc.
│   │
│   ├── components/
│   │   ├── Layout.tsx                 # Header + Footer + BannerTicker
│   │   ├── ThemeProvider.tsx          # Injection CSS variables depuis settingsStore
│   │   ├── ErrorBoundary.tsx          # Catch d'erreurs React
│   │   ├── SEO.tsx                    # Balises meta + JSON-LD dynamiques
│   │   ├── ProductCard.tsx            # Carte produit (version legacy)
│   │   ├── ProductCardV2.tsx          # Carte produit redesignée
│   │   ├── ProductCompareModal.tsx    # Tableau de comparaison produits
│   │   ├── CartSidebar.tsx            # Panier latéral
│   │   ├── BudTender.tsx              # Wrapper BudTender vocal
│   │   ├── VoiceAdvisor.tsx           # Interface widget vocal
│   │   │
│   │   ├── admin/                     # 35+ composants admin
│   │   │   ├── layout/                # AdminLayout, AdminSidebar, AdminHeader
│   │   │   ├── pos/                   # 10 composants POS (grille, panier, paiement, QR)
│   │   │   ├── AdminProductsTab.tsx   # CRUD produits (99 KB, feature-rich)
│   │   │   ├── AdminSettingsTab.tsx   # Configuration globale (114 KB)
│   │   │   ├── AdminBudTenderTab.tsx  # Config IA BudTender (88 KB)
│   │   │
│   │   ├── budtender/                 # Composants IA advisor (recommandations, quiz)
│   │   ├── budtender-ui/              # Atoms UI du widget BudTender
│   │   ├── product-premium/           # 13 composants fiche produit premium
│   │   └── home/                      # Hero, Hero2, FuturisticBackground
│   │
│   ├── store/                         # Zustand stores (9)
│   │   ├── authStore.ts               # Session utilisateur, rôle admin
│   │   ├── cartStore.ts               # Panier, persistance localStorage
│   │   ├── settingsStore.ts           # Config boutique, theme, modules activés
│   │   ├── wishlistStore.ts           # Produits favoris
│   │   ├── toastStore.ts              # Notifications toast
│   │   ├── recentlyViewedStore.ts     # Historique de navigation
│   │   ├── backgroundTaskStore.ts     # Tâches IA en arrière-plan (progress)
│   │   └── budtenderStore.ts          # État BudTender
│   │
│   ├── hooks/                         # 13 hooks React personnalisés
│   │   ├── useGeminiLiveVoice.ts      # Moteur vocal complet (104 KB, 20+ tools)
│   │   ├── useGeminiAdminVoice.ts     # Commandes vocales admin (37 KB)
│   │   ├── useBudTenderMemory.ts      # Mémoire préférences utilisateur (Supabase JSONB)
│   │   ├── useBudTenderQuiz.ts        # Machine d'état quiz IA
│   │   ├── useCustomerDisplayChannel.ts # WebSocket écran client POS
│   │   └── usePageTracker.ts          # Tracking analytics pages vues
│   │
│   ├── lib/                           # 27 modules utilitaires
│   │   ├── types.ts                   # 40+ interfaces TypeScript partagées
│   │   ├── supabase.ts                # Client singleton + exports URL/KEY
│   │   ├── budtenderPrompts.ts        # Constructeur system prompts (21 KB)
│   │   ├── budtenderKnowledge.ts      # Requêtes base de connaissances vectorielle
│   │   ├── obsidianImport.ts          # Traitement et nettoyage notes Obsidian
│   │   ├── productAI.ts               # Auto-complétion produits via LLM (17 KB)
│   │   ├── embeddings.ts              # Génération + cache embeddings (OpenRouter)
│   │   ├── matchProductsRpc.ts        # Wrapper RPC pgvector + guard disponibilité
│   │   ├── categoryTree.ts            # Utilitaires hiérarchie catégories 3 niveaux
│   │   ├── invoiceGenerator.ts        # Génération PDF factures (20 KB)
│   │   ├── accountingExport.ts        # Export CSV/Excel comptabilité (13 KB)
│   │   ├── cannabisKnowledgeService.ts# Recherche vectorielle cannabis conditions
│   │   ├── voiceSkills.ts             # Chargement dynamique skills vocaux
│   │   ├── analytics.ts               # Event tracking Supabase
│   │   ├── monitoring.ts              # Sentry initialisation
│   │   └── seo/                       # metaBuilder.ts, schemaBuilder.ts, internalLinks.ts
│   │
│   ├── skills/                        # 8 fichiers Markdown (skills IA)
│   │   ├── skill.md                   # Déclaration tools (toujours injecté en premier)
│   │   ├── vocal_actions.md           # Protocole vocal, phrases de transition
│   │   
│   │
│   ├── seo/
│   │   └── SEOProvider.tsx            # Context SEO global (title, OG, canonical)
│   │
│   ├── types/
│   │   └── premiumProduct.ts          # Types produit premium enrichis
│   │
│   └── test/
│       ├── setup.ts                   # Config Vitest (jsdom, globals)
│       ├── mocks/supabase.ts          # Mock client Supabase
│       └── utils.tsx                  # Helpers de rendu test
│
├── supabase/
│   ├── config.toml                    # Configuration Supabase local dev
│   ├── boutique-vierge.sql            # Schéma complet (62 KB)
│   ├── migration_v8_esil_data.sql     # Données d'exemple (22 KB)
│   ├── functions/                     # 6 Edge Functions Deno
│   │   ├── ai-chat/                   # Streaming LLM chat
│   │   ├── ai-embeddings/             # Génération embeddings batch
│   │   ├── gemini-token/              # Token éphémère Gemini Live
│   │   ├── stripe-payment/            # Création PaymentIntent
│   │   ├── stripe-webhook/            # Confirmation paiement + rollback
│   │   ├── admin-action/              # Actions admin sécurisées
│   │   └── _shared/                   # CORS headers, embedding cache utils
│   └── migrations/                    # Migrations incrémentales
│       ├── 20260325173918_remote_commit.sql  # Migration principale (127 KB)
│       ├── 20260326_centralize_loyalty.sql   # Centralisation fidélité
│       ├── 20260326_orders_rls_fix.sql       # Fix RLS commandes
│       └── 20260327_fuzzy_search.sql         # pg_trgm + RPC fuzzy + index GIST
│
├── public/
│   ├── audio-processor.js             # AudioWorklet (capture micro, isolation thread)
│   ├── downsample-worker.js           # Web Worker downsampling 48kHz→16kHz
│   ├── sw.js                          # Service Worker (cache offline)
│   ├── manifest.webmanifest           # PWA manifest
│   ├── robots.txt / ai.txt            # SEO + directives crawlers IA
│   └── logo.png / header*.png         # Assets statiques
│
├── e2e/                               # Tests Playwright
│   ├── auth.spec.ts
│   ├── cart.spec.ts
│   ├── homepage.spec.ts
│   ├── protected-routes.spec.ts
│   └── shop.spec.ts
│
├── scripts/                           # Scripts d'automatisation
│   ├── generate-rag-blog.ts           # Génération guides blog depuis RAG
│   ├── generate-sitemap.ts            # Génération sitemap XML enrichi
│   ├── sync-embeddings.ts             # Synchronisation embeddings produits
│   ├── import-cannabis-conditions.ts  # Import base conditions médicales
│   ├── index-cannabis-condition-vectors.ts
│   ├── seed-knowledge.ts              # Population base de connaissances
│   ├── sync-obsidian-vault.ts         # Synchronisation vault Obsidian complet
│   └── check_settings.ts             # Validation configuration
│
├── server/
│   └── index.ts                       # Serveur Express import produits (/api)
│
├── vite.config.ts                     # Code splitting, chunks manuels, proxy
├── tsconfig.json                      # TypeScript strict, paths alias @/*
├── vitest.config.ts                   # Configuration Vitest
├── playwright.config.ts               # Config E2E (auto-start port 3000)
├── netlify.toml                       # Redirects Netlify SPA
└── vercel.json                        # Configuration Vercel
```

---

## Système IA

### Architecture BudTender Voice

Le hook `useGeminiLiveVoice.ts` (104 KB) est le moteur de l'expérience vocale. Il gère intégralement :

**Audio Pipeline**
```
MediaDevices.getUserMedia()
    ↓
AudioContext → AudioWorkletNode (audio-processor.js)
    ↓  [Float32Array, Transferable]
Web Worker (downsample-worker.js)
    ↓  [Int16Array 16kHz, zero-copy]
session.sendRealtimeInput({ audio: { mimeType: 'audio/pcm', data: base64 } })
    ↓
Gemini Live API ──► PCM chunks (24kHz)
    ↓
AudioBufferSourceNode → AudioContext.destination
```

**Système de détection de barge-in (interruption)**

```
RMS frame ≥ threshold (adaptif) pendant 80ms + 1 frame stable
    → stopAllPlayback(80ms fade)
    → setVoiceState('listening')
    → cooldown 500ms

Calibration bruit ambiant : 2s au démarrage de session
Seuil = median(samples) × 3.5, clampé [0.02, 0.12]
Recalibration automatique toutes les 60s
```

**Token éphémère Gemini**

```
Client → POST /functions/v1/gemini-token
    { model, systemInstruction, voiceName, assistantType }
Edge Function → Google Gemini API (avec GEMINI_API_KEY serveur)
    ← { token, expireTime }
Client → new GoogleGenAI({ apiKey: token })
// La GEMINI_API_KEY réelle n'est jamais dans le bundle
```

### Moteur de Skills (src/skills/)

Les skills sont des fichiers Markdown qui définissent le comportement de l'IA. Ils sont chargés via `import.meta.glob` et injectés dynamiquement dans le system prompt selon le contexte (vocal / chat).

| Skill | Canal | Rôle |
|-------|-------|------|
| `skill.md` | Vocal uniquement | Déclaration et orchestration des 20+ Action Tools |
| `vocal_actions.md` | Vocal uniquement | Protocole feedback simultané, gestion délai, transitions |



**Règles de chargement** :
- `skill.md` est toujours trié **en premier** (définitions tools avant règles d'usage)
- `vocal_actions.md` exclu du mode chat
- `skill.md` exclu du mode chat
- Mode vocal : minification automatique (suppression `**bold**`, `*italic*`, backticks, blocs de citation) pour compatibilité TTS

### Tools disponibles (Function Calling)

**Phase 1 — Exécution parallèle** :

| Tool | Description |
|------|-------------|
| `think` | Raisonnement interne avant action |
| `search_catalog` | Recherche vectorielle pgvector + fallback keyword |
| `filter_catalog` | Filtrage par catégorie, prix, stock |
| `search_knowledge` | Recherche base de connaissances RAG |
| `search_cannabis_conditions` | Base scientifique conditions + evidence score |
| `search_expert_data` | Données techniques expertes |
| `navigate_to` | Navigation React Router (40+ routes mappées) |
| `track_order` | Suivi commandes Supabase |
| `get_favorites` | Liste favoris du client |
| `get_cart` | État panier courant |
| `get_referral_link` | Lien parrainage personnalisé |
| `compare_products` | Comparaison 2 produits + affichage modal UI |
| `suggest_bundle` | Suggestion produit complémentaire |
| `watch_stock` | Alerte disponibilité |
| `submit_review` | Soumission avis produit |
| `apply_promo` | Application code promo (validation DB) |
| `open_product_modal` | Ouverture section modale produit |
| `save_preferences` | Persistance profil évolutif JSONB |
| `get_current_time` | Date/heure locale formatée |
| `remove_from_cart` | Retrait article panier |
| `update_cart_quantity` | Mise à jour quantité panier |
| `load_voice_skill` | Chargement dynamique skill optionnel |

**Phase 2 — Après Phase 1** :

| Tool | Description |
|------|-------------|
| `view_product` | Affichage fiche produit (obligatoire avant add_to_cart) |
| `add_to_cart` | Ajout au panier (nécessite consentement explicite + view_product préalable) |
| `toggle_favorite` | Ajout/retrait favoris |
| `close_session` | Fermeture session vocale |

### Recherche vectorielle (pgvector)

```sql
-- Fonction RPC principale
SELECT * FROM match_products(
  query_embedding  vector(3072),  -- généré via OpenRouter text-embedding-3-large
  match_threshold  float,          -- seuil similarité cosinus (défaut 0.1)
  match_count      int             -- nombre max de résultats
);

-- Fuzzy search (pg_trgm)
SELECT * FROM search_products_fuzzy(
  search_text     text,            -- query vocale brute
  match_threshold float,           -- similarité trigramme (défaut 0.3)
  match_count     int
);
```

**Pipeline de recherche produit (Hybride)** :
1. **Cache FIFO local** (max 100 entrées, clé = query normalisée)
2. **Recherche Vectorielle** (L1) — Similarité cosinus via `match_products` (pgvector)
3. **Fallback Textuel** (L2) — Recherche `ILIKE` via `match_products_text` (Name, Desc, Specs)
4. **Fuzzy Search** (L3) — Algorithme trigramme via `search_products_fuzzy`

### Mémoire sémantique et personnalisation

Le système utilise une architecture de mémoire à deux niveaux pour une expérience fluide et prédictive :

1. **Mémoire Session (Court Terme)** : Persistance via `localStorage` (via `useBudTenderMemory`) pour une réactivité immédiate et une continuité entre les onglets/rafraîchissements.
2. **Profil Évolutif (Long Terme)** :
    - **JSONB Store** : Stockage direct des choix du quiz dans `budtender_user_prefs`.
    - **Extraction d'Insights** : Après chaque interaction majeure, Gemini analyse l'historique pour en extraire des traits stables (ex: "Expert en terpènes", "Cherche une relaxation profonde pour le soir").
    - **Confiance Statistique** : Chaque insight bénéficie d'un score de confiance ; seules les données > 80% influencent proactivement les conseils futurs.

La synchronisation s'effectue en temps réel via `messageQueueRef`, garantissant que le "cerveau" de l'IA est toujours à jour des dernières préférences client, même en cas de coupure réseau temporaire.

---

## Base de Données

### Tables principales

| Table | Description | Colonnes clés |
|-------|-------------|---------------|
| `profiles` | Comptes utilisateurs | `id`, `is_admin`, `loyalty_points`, `referral_code` |
| `products` | Catalogue produits | `id`, `name`, `price`, `stock_quantity`, `embedding vector(3072)`, `attributes jsonb` |
| `categories` | Arbre catégories | `id`, `parent_id`, `depth`, `slug` |
| `orders` | Commandes | `id`, `user_id`, `status`, `total`, `stripe_payment_intent_id` |
| `order_items` | Lignes de commande | `order_id`, `product_id`, `quantity`, `price` |
| `addresses` | Adresses livraison | `user_id`, `street`, `city`, `country` |
| `loyalty_transactions` | Historique points | `user_id`, `points`, `type`, `order_id` |
| `referrals` | Parrainage | `referrer_id`, `referred_id`, `status` |
| `reviews` | Avis produits | `product_id`, `user_id`, `rating`, `comment`, `approved` |
| `promo_codes` | Codes promo | `code`, `discount_type`, `discount_value`, `max_uses`, `expires_at` |
| `settings` | Configuration boutique | `key`, `value jsonb` |
| `knowledge_base` | Base de connaissances RAG | `title`, `content`, `embedding vector(3072)` |
| `cannabis_conditions_vectors` | Conditions médicales | `condition`, `evidence_score`, `summary`, `embedding` |
| `budtender_interactions` | Sessions IA | `user_id`, `interaction_type`, `duration_seconds` |
| `budtender_user_prefs` | Préférences IA | `user_id`, `preferences jsonb` |
| `analytics_events` | Événements tracking | `event_type`, `properties jsonb`, `user_id` |
| `blog_posts` | Articles guides | `title`, `content`, `slug`, `generated_at` |
| `stock_movements` | Traçabilité stock | `product_id`, `quantity`, `type`, `created_by` |

### Fonctions RPC

| RPC | Paramètres | Description |
|-----|-----------|-------------|
| `match_products` | `embedding`, `match_threshold`, `match_count` | Recherche sémantique vectorielle (pgvector) |
| `search_products_fuzzy` | `search_text`, `match_threshold`, `match_count` | Recherche floue trigramme (pg_trgm) |
| `process_checkout` | `user_id`, `items[]`, `address_id`, `payment_intent` | Checkout atomique (commande + décrémentation stock) |

### Row Level Security (RLS)

Toutes les tables sensibles ont des policies RLS :
- `profiles` : lecture propre uniquement, écriture self
- `orders` : lecture/écriture liée à `auth.uid()`
- `products` : lecture publique, écriture admin uniquement
- `settings` : lecture publique, écriture admin uniquement
- `knowledge_base` : lecture publique, écriture admin

---

## Administration

### Accès

URL : `/admin` — nécessite `is_admin = true` dans la table `profiles`.

Pour créer un admin :
```sql
UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_UUID';
```

---

## Focus : Gestion des Abonnements (Kanban)

L'administration intègre désormais un module de gestion des abonnements ultra-moderne conçu pour la logistique quotidienne.

### Fonctionnalités Clés
- **Vue Kanban Dynamique** : Visualisez vos préparations par jour ou par mois.
- **Workflow de Validation** : Validez une livraison en un clic. Le système génère automatiquement la commande Stripe/Interne, met à jour les stocks et calcule la prochaine date de livraison selon la fréquence (Hebdo, Mensuel, etc.).
- **Planification Flexible** :
    - **Sélecteur de date** : Choisissez n'importe quelle date de départ pour votre planning.
    - **Glisser-Déposer** : Reprogrammez une livraison ou mettez un abonnement en pause par simple drag-and-drop.
- **Preview Logistique** : Survolez l'indicateur "Prévision Demain" pour voir instantanément le récapitulatif des produits et quantités à préparer pour la journée suivante.
- **Mode Plein Écran** : Interface immersive pour une gestion dédiée en entrepôt ou tablette.

### Commandes admin disponibles

```bash
# Générer les guides blog depuis la base de connaissances RAG
npm run blog:generate

# Régénérer le sitemap XML
npx tsx scripts/generate-sitemap.ts

# Synchroniser les embeddings produits
npx tsx scripts/sync-embeddings.ts

# Importer la base de conditions médicales cannabis
npx tsx scripts/import-cannabis-conditions.ts

# Synchroniser un vault Obsidian entier (CLI)
npx tsx scripts/sync-obsidian-vault.ts "C:/Mon/Vault"

# Valider la configuration settings
npx tsx scripts/check_settings.ts
```

---

## Tests

### Tests unitaires (Vitest)

```bash
npm test              # Mode watch
npm run test:run      # Single run (CI)
npm run test:coverage # Avec rapport de couverture
npm run test:ui       # Interface graphique Vitest
```

**Couverture** :
- `src/lib/embeddings.ts` : 100%
- `src/lib/pdfKnowledge.ts` : 85%+
- `src/store/__tests__/` : stores Zustand
- `src/hooks/__tests__/` : hooks custom

### Tests E2E (Playwright)

```bash
npm run test:e2e        # Headless (auto-start port 3000)
npm run test:e2e:ui     # Interface graphique Playwright
```

**Scénarios couverts** :
- `auth.spec.ts` — Connexion, déconnexion, inscription
- `cart.spec.ts` — Ajout panier, modification quantité, suppression
- `homepage.spec.ts` — Rendu page d'accueil, navigation
- `protected-routes.spec.ts` — Guard routes admin et compte
- `shop.spec.ts` — Catalogue, filtres, recherche

---

## Déploiement

### Vercel (recommandé)

```bash
# 1. Pusher sur GitHub
git push origin main

# 2. Importer sur Vercel (vercel.com)
# 3. Configurer les variables d'environnement VITE_* dans l'interface Vercel
# 4. Build Command : npm run build
# 5. Output Directory : dist
```

Le fichier `vercel.json` est déjà configuré pour le routing SPA.

### Netlify

```bash
# Build Command : npm run build
# Publish Directory : dist
# Le fichier netlify.toml + public/_redirects gèrent le routing SPA
```

### Variables à configurer sur la plateforme

Sur Vercel / Netlify, configurer dans les variables d'environnement :
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLIC_KEY
VITE_OPENROUTER_EMBED_MODEL
VITE_OPENROUTER_EMBED_DIMENSIONS
VITE_SENTRY_DSN  (optionnel)
```

Les secrets Gemini / OpenRouter / Stripe côté serveur restent dans Supabase secrets (jamais en variables plateforme front).

### Checklist production

- [ ] Supabase : activer les extensions `vector` et `pg_trgm`
- [ ] Supabase : exécuter `boutique-vierge.sql` + toutes les migrations
- [ ] Supabase : déployer les 6 Edge Functions avec leurs secrets
- [ ] Stripe : configurer le webhook endpoint `https://votre-app.com/api/stripe-webhook`
- [ ] Stripe : passer en mode Live (clés `pk_live_` / `sk_live_`)
- [ ] Variables d'environnement VITE_* configurées sur la plateforme
- [ ] Domaine custom configuré (Vercel / Netlify)
- [ ] HTTPS actif (requis pour `getUserMedia` / AudioWorklet)

---

## Performance & Sécurité

### Optimisations frontend

| Optimisation | Implémentation |
|-------------|----------------|
| Code splitting | Chunks manuels Vite : `app-admin`, `app-budtender`, `app-account`, vendors séparés |
| Lazy loading | `React.lazy` + `Suspense` sur toutes les routes |
| Audio thread-safe | AudioWorklet + Web Worker + Transferable Objects (zero-copy) |
| Cache produits | FIFO 100 entrées dans `useGeminiLiveVoice` |
| Cache embeddings | LRU local 1000 entrées dans `embeddings.ts` |
| Image optimization | Lazy loading natif, Supabase Storage CDN |
| Vector index | HNSW index sur `products.embedding` (sub-milliseconde) |

### Sécurité

| Mesure | Détail |
|--------|--------|
| RLS Supabase | Policies sur toutes les tables sensibles |
| JWT validation | Vérification systématique dans les Edge Functions |
| API keys serveur | Jamais dans le bundle client (Supabase secrets) |
| Token éphémère Gemini | Durée de vie limitée, générée à la demande |
| HMAC webhook Stripe | Vérification signature via Web Crypto API |
| Admin guard | Vérification `is_admin` côté serveur ET client |
| HTTPS requis | `isSecureContext` vérifié avant activation mic |

---

## Commandes de référence

```bash
npm run dev              # Serveur dev localhost:3000
npm run build            # Build production
npm run preview          # Prévisualisation build
npm run lint             # TypeScript tsc --noEmit
npm run test             # Vitest watch mode
npm run test:run         # Vitest CI (single run)
npm run test:coverage    # Coverage report
npm run test:e2e         # Playwright E2E
npm run blog:generate    # Génération guides blog RAG
npm run dev:importer     # Serveur Express import produits

# Scripts utilitaires
npx tsx scripts/generate-sitemap.ts
npx tsx scripts/sync-embeddings.ts
npx tsx scripts/import-cannabis-conditions.ts
npx tsx scripts/sync-obsidian-vault.ts "C:/Users/Mayss/Documents/GitHub/Green-mood-IAcommerce/src/skills"
```

---

## Contribution

```bash
# Créer une branche feature
git checkout -b feature/ma-fonctionnalite

# Développer + tester
npm run test:run
npm run lint

# Commiter
git commit -m "feat: description courte"

# Pull Request vers main
git push origin feature/ma-fonctionnalite
```

---

<div align="center">

**Green-mood** — Plateforme e-commerce AI-First | React 19 + Supabase + Gemini Live

*Projet sous licence MIT — Développé avec passion pour l'e-commerce du futur.*

</div>
