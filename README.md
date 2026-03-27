<div align="center">
<img src="public/header.png" alt="Green-mood" />

# 🚀 Green-mood

**La solution e-commerce "Full Stack" & "AI-First" spécialisée dans le CBD et le Bien-être.**

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-purple?logo=vite" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-blue?logo=tailwindcss" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/Tests-380%20passing-brightgreen?logo=vitest" alt="Tests 380 passing" />
  <img src="https://img.shields.io/badge/AI-Gemini_Live-red?logo=google-gemini" alt="AI Gemini" />
</p>

[Présentation](#-présentation) · [Fonctionnalités](#-fonctionnalités-majeures) · [Nouveautés](#-nouveautés-ajoutées) · [Architecture](#-architecture-générale) · [Installation](#-installation-complète) · [Structure](#-structure-du-projet) · [Administration](#-administration-admin) · [Déploiement](#-déploiement)

</div>

---

## 🌟 Présentation

### Objectif du projet

**Green-mood** est une plateforme e-commerce "AI-First" spécialisée dans le domaine du CBD, construite avec React 19, TypeScript et Supabase. Elle intègre nativement l'intelligence artificielle à tous les niveaux : conseiller **BudTender IA** vocal et textuel expert en cannabinoïdes, génération de contenu automatisée, recherche vectorielle par effets, recommandations personnalisées et assistance administrative par commande vocale.

### Problème résolu

La majorité des solutions e-commerce existantes (Shopify, WooCommerce) sont des CMS génériques qui nécessitent des dizaines de plugins pour atteindre un niveau de fonctionnalité avancé. Elles ne sont pas conçues pour l'IA nativement. Ce projet résout ce problème en proposant :

- Une architecture "AI-First" où l'IA est un citoyen de première classe
- Un système omnicanal natif (web + POS physique + affichage digital)
- Une personnalisation semi-totale sans toucher au code
- Un programme de fidélisation et de parrainage intégré
- Une base de connaissance vectorielle (RAG) pour un IA métier précis

### Cas d'utilisation

| Secteur | Usage |
|---------|-------|
| CBD & Bien-être Premium | Boutique avec BudTender IA vocal + POS |
| CBD spécialisé | Catalogue de fleurs/huiles + quiz BudTender (effets/besoins) + matching vectoriel |
| Franchise | White-label, configuration JSON exportable entre instances |
| Commerce physique | Combinaison boutique en ligne + caisse POS + affichage TV |
| Abonnements | Commandes récurrentes + fidélisation avancée |

### Public cible

- **Développeurs** souhaitant une base solide pour un e-commerce IA
- **Agences web** cherchant un starter kit complet et déployable
- **Commerçants** avec un profil technique souhaitant une solution sur mesure
- **Startups** voulant lancer rapidement avec une architecture production-ready

---

## 🔥 Fonctionnalités Majeures

### 🛒 Expérience E-commerce Premium
- **Storefront Haute Performance** : React 19 + Vite 6, chargement < 1s, lazy loading natif
- **Recherche Prédictive Instantanée** : Affichage des résultats textuels et visuels en temps réel dès la première frappe.
- **Catalogue Dynamique** : Recherche sémantique, filtres multicritères, DualRangeSlider prix
- **Fiches Produits "Conversion-Ready"** : Galerie immersive, badges stock, preuve sociale, guides de consommation
- **Fidélisation Hub 3.0** :
  - Monnaie virtuelle configurable (nom, taux d'échange)
  - Paliers Bronze / Silver / Gold avec avantages automatiques
  - Parrainage automatisé avec dashboard de suivi
  - Abonnements récurrents (hebdo / bimensuel / mensuel)

### 🤖 Intelligence Artificielle de Pointe
- **Vendeur IA Élite (Multi-Action)** :
  - **Persona Vendeur** : Orchestration proactive (Comprendre, Qualifier, Recommander, Upsell, Close).
  - **Interaction Vocale Native** : Gemini Live API, conversation temps réel < 500ms latence.
  - **Bundling Intelligent** : Suggestion automatique de bundles pour maximiser l'AOV.
- **Mémoire & Personnalisation Prédictive** :
  - **Profil Dynamique** : Analyse des traits (`objectif`, `budget`, `fréquence`) persistés en base.
  - **Moteur Vectoriel (RAG)** : `pgvector` + OpenRouter pour des réponses métiers expertes.
- **Auto-Learning & Market Insights** :
  - **Intelligence Temps Réel** : L'IA analyse les tendances de vente via `get_market_insights` pour conseiller les best-sellers.
- **Génération de Contenu Admin** : Titres Hero, accroches, FAQ en un clic
- **Auto-complétion Produits** : Descriptions générées automatiquement via IA
- **Génération dans le Wizard** : Choix entre saisie manuelle et génération IA automatique
- **Actions IA de Masse** : Enrichissement automatique et vectorisation forcée de tous les produits d'une catégorie en un clic.
- **Cross-Selling Intelligent (IA)** : Suggestions automatiques de produits complémentaires via recherche vectorielle sémantique et gestion assistée par IA.

## 🆕 Nouveautés ajoutées

Les dernières fonctionnalités ajoutées sont documentées dans [`explication-fonctionnement/`](explication-fonctionnement/README.md).

- **Transformation "AI-Native Sales"** : Rebranding du BudTender en une machine de vente proactive avec gestion des Bundles et du Checkout Upsell.
- **Intelligence Omnicanale** : Intégration du playbook de vente IA dans le POS pour le personnel en magasin.
- **Auto-Learning Loop** : Nouvel outil `get_market_insights` permettant à l'IA d'analyser les tendances de ventes réelles.
- **Dashboard ROI/Performance IA** : Interface d'administration dédiée pour piloter l'impact de l'IA sur le chiffre d'affaires.

### Démarrage rapide des nouveautés

```bash
# Générer les articles/guides automatiques
npm run blog:generate

# Regénérer les sitemaps
npx tsx scripts/generate-sitemap.ts
```

### 🏪 Omnicanalité & Magasin Physique
- **Terminal POS "AI-Augmented"** :
  - **Playbook de Vente** : Affichage des préférences IA et conseils de vente pour le personnel en magasin.
  - **Synchronisation Online/Offline** : Profils clients et paniers unifiés.
- **Affichage TV (Digital Signage)** : Rotation produits, flash promos avec compte à rebours, météo locale.
- **Performance IA Dashboard** : Suivi du CA généré par l'IA, taux de conversion et engagement client.

### 🔐 Administration & Back-Office "Power User"
- **28 Modules de Gestion** : Stock, Commandes (liste & Kanban), CRM, Marketing, Analytique
- **CRM Hyper-Ciblé** : Suivi des anniversaires clients pour l'automatisation de fidélisation via récompenses.
- **Campagnes Publicitaires Intégrées** : Gestion centralisée pour planifier et diffuser des alertes ou bannières promotionnelles sur le storefront.
- **Analyses & Traçabilité** : Module gérant la complexité de conformité propre au CBD (certificats d'analyses labo, suivi des taux de THC/CBD, traçabilité des lots).
- **Dashboard DataViz** : Recharts, KPIs temps réel, top produits, revenus
- **Modification de Masse** : Centaines de prix / stocks mis à jour simultanément
- ⚡ **Setup Wizard** : Wizard guidé **9 étapes** pour onboarder une boutique en < 5 minutes (dont configuration Stripe)
- **Gestion Avancée des Paramètres** : Export / import JSON, réinitialisation aux défauts
- **Module Cross-Selling 2.0** : Interface dédiée avec indicateurs de couverture ("Sans recommandations") et suggestions intelligentes pour maximiser l'AOV (Average Order Value).

### 💳 Paiement Stripe Natif
- **Stripe Elements Embarqué** : Formulaire de paiement directement sur la page checkout (sans redirection)
- **Checkout 2 étapes** : Formulaire de livraison → formulaire de paiement séparé
- **Simulateur Dev** : Bannière orange DEV-only pour tester les scénarios succès / refus / annulation sans vraie transaction
- **Edge Functions Deno** : `stripe-payment` (création PaymentIntent) + `stripe-webhook` (confirmation & refunds)
- **Sécurité Webhook** : Vérification HMAC-SHA256 via Web Crypto API (compatible Deno)
- **Rollback automatique** : Stocks restaurés + commande annulée si paiement échoué
- **Configuration Admin** : Clé publique, mode Test/Live, activation toggle — onglet dédié **Admin → Paramètres → Paiement**

---

## 🏗 Architecture Générale

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19 + Vite)                  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Storefront  │  │ Admin Panel  │  │    POS / Display      │  │
│  │  (40+ pages) │  │  (26 tabs)   │  │  (TouchUI + WebSocket)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         │                 │                       │              │
│  ┌──────▼─────────────────▼───────────────────────▼───────────┐  │
│  │              Zustand State Management (7 stores)            │  │
│  │  authStore · cartStore · settingsStore · wishlistStore      │  │
│  │  toastStore · recentlyViewedStore · backgroundTaskStore     │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     SUPABASE BACKEND                             │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │ Edge Functions│  │      Storage         │  │
│  │  (20+ tables)│  │  (5 Deno fns) │  │  (product-images/)   │  │
│  │  + pgvector  │  │  ai-chat      │  │  store/ ads/         │  │
│  │  + RLS       │  │  ai-embeddings│  │  categories/         │  │
│  │              │  │  gemini-token │  │                      │  │
│  │              │  │  stripe-payment│ │                      │  │
│  │              │  │  stripe-webhook│ │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     EXTERNAL AI SERVICES                         │
│                                                                  │
│  ┌──────────────────┐   ┌─────────────────┐                     │
│  │  OpenRouter API  │   │  Google Gemini   │                     │
│  │  (text + embeds) │   │  (Live Voice API)│                     │
│  └──────────────────┘   └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Modules et Responsabilités

| Module | Rôle | Fichiers clés |
|--------|------|---------------|
| **Storefront** | Pages publiques, catalogue, panier, commandes | `src/pages/*.tsx` |
| **Admin Panel** | Dashboard, CRUD, analytics, configuration | `src/components/admin/` |
| **BudTender AI** | Conseiller IA vocal expert CBD (Moteur de Skills) | `src/skills/`, `src/lib/budtenderPrompts.ts` |
| **POS System** | Terminal de caisse physique | `src/components/admin/pos/`, `src/pages/POSPage.tsx` |
| **State Management** | Stores Zustand globaux | `src/store/*.ts` |
| **Supabase Layer** | Requêtes DB, auth, storage | `src/lib/supabase.ts` |
| **Settings Service** | Sauvegarde centralisée des paramètres boutique | `src/lib/settingsService.ts` |
| **AI Utilities** | Prompts, embeddings, cache | `src/lib/budtender/`, `src/lib/embeddings.ts` |
| **SEO Engine** | Meta tags, JSON-LD, Open Graph | `src/lib/seo/`, `src/components/SEO.tsx` |

### 📂 Architecture BudTender Skills (`src/skills/`)

Le comportement de l'IA (Melina) est piloté par un système modulaire de fichiers Markdown :

1. **Chargement Dynamique** : `import.meta.glob` dans `budtenderPrompts.ts`.
2. **Filtrage Intelligent** : Les skills sont injectés au vol.
3. **Minification Audio** : Nettoyage automatique des marqueurs de mise en forme pour une lecture TTS fluide.

| Skill | Rôle Technique | Canal |
|-------|----------------|-------|
| `skill.md` | Déclaration et orchestrations des **Action Tools** | Vocal |
| `vocal_actions.md` | Feedback audio simultané et gestion du délai | Vocal |
| `botanique_expert.md` | Expertise RAG (Terpènes, Cannabinoïdes) | Vocal |
| `objections.md` | Logique de levée de doute et techniques de vente | Vocal |
| `fidelite.md` | Promotion active du programme de points Carats | Vocal |
| `legal_confidentialite` | Disclaimers et conformité légale automatique | Vocal |

---

## 🛠 Stack Technique

| Domaine | Technologies | Version |
|---------|-------------|---------|
| **Core Framework** | React | 19 |
| **Langage** | TypeScript | 5.8 |
| **Bundler** | Vite | 6 |
| **Styles** | TailwindCSS | v4 |
| **Animations** | Motion/React (Framer Motion) | 12 |
| **State Management** | Zustand | 5 |
| **Routing** | React Router DOM | 7.13 |
| **Backend / BaaS** | Supabase (PostgreSQL + Edge Functions) | 2.98 |
| **Vector Search** | pgvector (Supabase extension) | — |
| **AI Chat / Embeddings** | OpenRouter API | — |
| **AI Voice** | Google Gemini Live API | @google/genai 1.29 |
| **Charts** | Recharts | 3.7 |
| **Icons** | Lucide React | 0.546 |
| **PDF / Factures** | jsPDF + jspdf-autotable | 4.2 / 5 |
| **QR Codes** | html5-qrcode, qrcode.react | 2.3 / 4.2 |
| **CSV / Excel** | PapaParse, xlsx | 5.5 / 0.18 |
| **Tests unitaires** | Vitest + Testing Library | 4 / 6 |
| **Tests E2E** | Playwright | 1.58 |
| **Déploiement** | Vercel, Netlify | — |

---

## 📦 Installation Complète

### Prérequis

- **Node.js** ≥ 18.0
- **npm** ≥ 9.0 (ou pnpm / yarn)
- **Compte Supabase** (gratuit) — [supabase.com](https://supabase.com)
- **Compte OpenRouter** pour les fonctionnalités IA — [openrouter.ai](https://openrouter.ai)
- **Clé API Google Gemini** pour la voix — [aistudio.google.com](https://aistudio.google.com)

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-org/ecommerce-full.git
cd ecommerce-full

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
```

### Variables d'environnement

Éditer `.env` avec vos clés :

```env
# Supabase — Obligatoire
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# OpenRouter — Requis pour IA embeddings
OPENROUTER_API_KEY=sk-or-...

# Google Gemini — Requis pour l'IA vocale
GEMINI_API_KEY=AIzaSy...

# Stripe — Paiement en ligne (clé publique côté client)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### Configuration de la base de données

```bash
# Option A — Supabase CLI (recommandé)
npx supabase login
npx supabase link --project-ref votre-project-ref
npx supabase db push

# Option B — Importer le schéma manuellement
# Ouvrir Supabase Dashboard → SQL Editor
# Coller et exécuter le contenu de supabase/boutique-vierge.sql
```

### Déploiement des Edge Functions

```bash
# Déployer toutes les fonctions
npx supabase functions deploy ai-embeddings
npx supabase functions deploy gemini-token
npx supabase functions deploy stripe-payment
npx supabase functions deploy stripe-webhook

# Configurer les secrets des fonctions
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set GEMINI_API_KEY=AIzaSy...
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Appliquer la migration Stripe
# Ouvrir Supabase Dashboard → SQL Editor → coller supabase/add_stripe_migration.sql
```

### Lancement

```bash
# Développement (port 3000)
npm run dev

# Build de production
npm run build

# Prévisualisation du build
npm run preview
```

---

## 📁 Structure du Projet

```
ecommerce-full/
│
├── src/
│   ├── App.tsx                    # Router principal (40+ routes, theme injection)
│   ├── main.tsx                   # Point d'entrée (ErrorBoundary, SEOProvider)
│   ├── index.css                  # Styles globaux (Tailwind v4 + variables CSS)
│   │
│   ├── pages/                     # 40+ pages (lazy-loaded)
│   │   ├── Home.tsx               # Page d'accueil (hero, stats, catégories, FAQ)
│   │   ├── Products.tsx           # Liste produits avec filtres avancés
│   │   ├── ProductDetail.tsx      # Fiche produit rich (galerie, specs, avis)
│   │   ├── Cart.tsx               # Panier
│   │   ├── Checkout.tsx           # Tunnel de commande
│   │   ├── Account.tsx            # Espace client
│   │   ├── Admin.tsx              # Dashboard admin (26 tabs)
│   │   ├── POSPage.tsx            # Terminal de caisse
│   │   ├── CustomerDisplay.jsx    # Écran client POS (WebSocket)
│   │   ├── StoreDisplay.jsx       # Affichage TV / Digital Signage
│   │   └── ...                    # 30+ autres pages
│   │
│   ├── components/
│   │   ├── layout/                # Header, Footer, BannerTicker, Search
│   │   ├── admin/                 # 40+ composants admin
│   │   │   ├── layout/            # AdminLayout, AdminSidebar, AdminHeader
│   │   │   ├── pos/               # Composants POS (grille, panier, paiement)
│   │   │   └── AdminSetupWizard.tsx # Wizard 8 étapes
│   │   ├── budtender/             # Composants IA advisor
│   │   ├── budtender-ui/          # UI atomique du BudTender
│   │   ├── product-premium/       # Composants fiche produit premium
│   │   └── ...                    # CartSidebar, ProductCard, LoyaltyCard, etc.
│   │
│   ├── store/                     # Zustand stores (7)
│   │   ├── authStore.ts           # Auth + sessions actives
│   │   ├── cartStore.ts           # Panier (persisté)
│   │   ├── settingsStore.ts       # Config boutique 
│   │   ├── wishlistStore.ts       # Favoris (persisté)
│   │   ├── toastStore.ts          # Notifications
│   │   ├── recentlyViewedStore.ts # Historique navigation (persisté)
│   │   └── backgroundTaskStore.ts # Tâches IA en arrière-plan
│   │
│   ├── hooks/                     # Hooks React personnalisés
│   │   ├── useBudTenderMemory.ts  # Mémoire préférences utilisateur
│   │   ├── useBudTenderQuiz.ts    # Machine d'état quiz IA
│   │   ├── useGeminiLiveVoice.ts  # Chat vocal Gemini Live
│   │   ├── useGeminiAdminVoice.ts # Commandes vocales admin
│   │   └── useAds.ts             # Campagnes publicitaires
│   │
│   ├── lib/                       # Utilitaires & services
│   │   ├── supabase.ts            # Client Supabase singleton
│   │   ├── types.ts               # 40+ interfaces TypeScript
│   │   ├── utils.ts               # Fonctions helper
│   │   ├── productAI.ts           # Auto-complétion produits IA
│   │   ├── embeddings.ts          # Génération embeddings vectoriels
│   │   ├── invoiceGenerator.ts    # Génération PDF factures
│   │   ├── accountingExport.ts    # Export CSV/Excel comptabilité
│   │   ├── budtender/             # IA utilities (prompts, cache, vector search)
│   │   └── seo/                   # SEO utilities (meta, JSON-LD)
│   │
│   ├── seo/
│   │   └── SEOProvider.tsx        # Context SEO global
│   │
│   ├── types/
│   │   └── premiumProduct.ts      # Types produit premium
│   │
│   ├── constants/
│   │   └── navigation.ts          # Définitions de routes
│   │
│   └── test/                      # Utilitaires de test
│       ├── setup.ts               # Configuration Vitest
│       ├── mocks/supabase.ts      # Mock Supabase
│       └── utils.tsx              # Helpers de test
│
├── supabase/
│   ├── config.toml                # Configuration Supabase local
│   ├── boutique-vierge.sql        # Schéma complet de la base
│   ├── migration_v8_esil_data.sql # Données d'exemple
│   └── functions/                 # Edge Functions Deno
│       ├── ai-embeddings/index.ts # Génération embeddings
│       └── gemini-token/index.ts  # Token Gemini Live
│
├── public/                        # Assets statiques
├── e2e/                           # Tests Playwright E2E
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── netlify.toml
└── vercel.json
```

---

## 🔄 Flux Global de l'Application

### Flux Client (Storefront)

```
Visiteur → AgeGate (si activé) → SplashScreen (si activé)
    ↓
Home (hero dynamique + contenu via settingsStore)
    ↓
Navigation: Catalogue → ProductDetail
    ↓
BudTender Widget (vocal) ──→ Recommandations de fleurs, huiles et produits CBD
    ↓
AddToCart → CartSidebar (calcul livraison + promo liée au CBD)
    ↓
Login/Register (si non connecté)
    ↓
Checkout (adresse + paiement Stripe Natif)
    ↓
OrderConfirmation → Email (Supabase)
    ↓
Account: Orders, Subscriptions, Loyalty, Referrals
```

### Flux Admin

```
Admin.tsx → Authentification vérifiée (AdminRoute)
    ↓
Dashboard (KPIs temps réel via Supabase)
    ↓
Onglets spécialisés (26 modules)
    ├── Products: CRUD + IA auto-fill + CSV import
    ├── Orders: Vue liste + Kanban drag-drop
    ├── Settings:  paramètres + Export JSON
    ├── BudTender: Config IA + quiz personnalisé
    └── Setup Wizard: Onboarding guidé 8 étapes
```

### Flux IA (BudTender)

```
Utilisateur active BudTender (voix)
    ↓
useGeminiLiveVoice → buildPrompt avec contexte:
    - Catalogue complet
    - Préférences utilisateur (DB)
    - Historique de commandes
    - Panier actuel
    - Mémoire session
    ↓
Connexion WebSocket API Google Gemini Live Mode
    ↓
Interaction fluide bidirectionnelle (< 500ms)
    ↓
Utilisation des tools (navigation, recherche)
    ↓
```

---

## 🛠 Administration (`/admin`)

Le panel admin comprend **28 onglets** organisés par domaine :

### Dashboard
- KPIs temps réel : revenus, commandes, stocks faibles, clients
- Graphiques Recharts (revenus, top produits)
- Widget "Configuration Rapide" (Setup Wizard)

### Gestion Produits
- CRUD complet avec validation
- Génération automatique descriptions IA
- Import CSV massif (CSVImporter)
- Modification de masse (MassModifyModal)
- Synchronisation vectorielle (pgvector)
- Prévisualisation produit (AdminProductPreviewModal)

### Gestion Commandes
- Vue liste filtrée par statut
- Détail complet (client, articles, adresse, paiement)
- Kanban drag-drop entre colonnes de statut

### Configuration (Settings)
- **5 sous-onglets** : Boutique, Design, Contenu, Livraison, Social
- Export JSON / Import JSON / Réinitialisation
- champs configurables

### ⚡ Setup Wizard
Accessible depuis le Dashboard, l'overlay wizard guide en **8 étapes** :
1. **Identité** — Nom, slogan, description, secteur, logo (upload + URL)
2. **Design** — Couleurs (présets), typographie (templates)
3. **Contenu** — Hero, marquee, bannière 
4. **Livraison** — Frais, seuil gratuit, informations légales
5. **Réseaux Sociaux** — Instagram, Facebook, Twitter, TikTok
6. **Modules** — Toggles de toutes les fonctionnalités
7. **IA & Fidélité** — Config conseiller BudTender (ton, expertise CBD), taux de points
8. **Paiement** — Stripe (CB)
9. **Récapitulatif** — Validation et sauvegarde Supabase

---

## 🤖 Fonctionnalités IA Détaillées

### BudTender Voix (Gemini Live)
- **Localisation** : `src/hooks/useGeminiLiveVoice.ts`
- API : Google Gemini Live (bidirectionnel, < 500ms)
- Token fetching via Edge Function `gemini-token`
- **Outils Intégrés** : Recherche catalogue (fleurs, huiles, accessoires), affichage produit, ajout au panier, navigation, gestion des favoris, base de connaissances experte CBD.
- **Moteur de Skills** : Injection dynamique de fichiers `.md` (minifiés pour le TTS) permettant d'ajouter des comportements métier sans modifier le code source.
- **Contexte injecté** : Catalogue (variétés, taux de CBD/THC), préférences, historique, panier.

### Admin Voice Commands
- **Localisation** : `src/hooks/useGeminiAdminVoice.ts`
- Commandes vocales pour l'administration
- Parsing d'intentions (créer produit, modifier stock, etc.)

### Auto-complétion Produits
- **Localisation** : `src/lib/productAI.ts`
- Génération automatique de descriptions produits
- Gestion du cache pour éviter les appels redondants
- Progression via `backgroundTaskStore`

### Embeddings & Recherche Vectorielle
- **Localisation** : `src/lib/embeddings.ts`, `src/lib/budtender/budtenderVectorSearch.ts`
- **Architecture HNSW Appliquée** : Indexation multidimensionnelle ultra-rapide (Produits, Connaissances, Informations expertes) atteignant la milliseconde en complétion.
- Génération via OpenRouter API
- Stockage pgvector dans Supabase
- Cache LRU local (max 1000 entrées)
- Similarité cosinus configurable par seuil

---

## 🧪 Tests

### Lancer les tests

```bash
# Tests unitaires (Vitest)
npm test

# Avec couverture de code
npm run test:coverage

# Tests E2E (Playwright)
npm run test:e2e

# Vérification TypeScript
npm run lint
```

### Structure des tests

```
src/
├── components/__tests__/          # Tests composants (14 fichiers)
│   ├── ProductCard.test.tsx
│   ├── AgeGate.test.tsx
│   ├── Toast.test.tsx
│   └── ...
├── store/__tests__/               # Tests stores Zustand (7 fichiers)
│   ├── authStore.test.ts
│   ├── cartStore.test.ts
│   └── ...
├── hooks/__tests__/               # Tests hooks (4 fichiers)
├── lib/__tests__/                 # Tests utilitaires (7 fichiers)
└── test/
    ├── setup.ts                   # Configuration globale + mocks
    ├── mocks/supabase.ts          # Mock client Supabase
    └── utils.tsx                  # Helpers render/act
e2e/                               # Tests Playwright
```

### Couverture

- **380+ tests** au total
- Composants UI, stores, hooks, utilitaires
- Mock Supabase complet (pas de dépendance réseau)
- Playwright pour les parcours critiques (checkout, auth)

---

## 🚀 Déploiement

### Vercel (Recommandé)

```bash
# Via CLI
npx vercel deploy

# Via GitHub integration
# → Connecter le repo sur vercel.com
# → Configurer les variables d'environnement dans le dashboard
```

### Netlify

```bash
# Build command: npm run build
# Publish directory: dist
# Le fichier netlify.toml est préconfiguré
```

### Variables d'environnement en production

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY=AIzaSy...
```

### Checklist de déploiement

- [ ] Schéma DB importé dans Supabase
- [ ] Edge Functions déployées et secrets configurés
- [ ] Variables d'environnement définies sur la plateforme
- [ ] Bucket `product-images` créé dans Supabase Storage (public)
- [ ] Extension pgvector activée dans Supabase
- [ ] Règles RLS configurées correctement
- [ ] Configuration du store (Nom, email, etc.) via le Setup Wizard

---

## 🤝 Contribution

### Workflow

```bash
# 1. Fork et clone
git clone https://github.com/votre-fork/ecommerce-full.git

# 2. Créer une branche
git checkout -b feature/ma-fonctionnalite

# 3. Développer + tester
npm test

# 4. Commiter (conventional commits)
git commit -m "feat: ajouter filtrage par prix sur catalogue"

# 5. Push + Pull Request
git push origin feature/ma-fonctionnalite
```

### Conventions de code

- **TypeScript strict** : pas de `any` implicite
- **Composants fonctionnels** uniquement (pas de classes)
- **Zustand** pour tout état global
- **Tailwind** pour tous les styles (pas de CSS inline sauf animations)
- **Lucide React** pour les icônes (pas d'autres librairies d'icônes)
- **Imports absolus** via alias `@/`
- **Tests requis** pour toute logique métier nouvelle

---

## 📊 Analytics & Métriques

Green-mood embarque un système d'analytics **first-party** complet, sans dépendance externe, stocké directement dans Supabase.

### Infrastructure de tracking

| Fichier | Rôle |
|---|---|
| `supabase/analytics_events.sql` | Table `analytics_events` avec RLS (insert public, select admin) |
| `src/lib/analytics.ts` | Module fire-and-forget : session_id, UTM params, `document.referrer` |
| `src/hooks/usePageTracker.ts` | Auto-track `page_view` à chaque changement de route (admin ignoré) |

### Événements trackés automatiquement

| Événement | Déclencheur | Payload |
|---|---|---|
| `page_view` | Changement de route (via `usePageTracker`) | page, referrer, UTM |
| `cart_add` | `cartStore.addItem()` | product_id, quantity, unit_price |
| `checkout_start` | `handlePrepareOrder()` dans Checkout | order_id, total |
| `purchase` | `handlePaymentSuccess()` dans Checkout | order_id, total |
| `cart_abandon` | `handleCancelOrder()` dans Checkout | order_id |

### Métriques disponibles dans l'Admin (`/admin` → Analytics)

#### Métriques existantes
- Revenus et CA (7j / 30j / 90j)
- Panier moyen (AOV) par jour
- Top produits & revenus par catégorie
- Distribution des statuts de commandes
- Acquisition client par jour
- Interactions BudTender IA (voix, feedback)

#### Nouvelles métriques (Sprint 2)
- **Funnel de conversion** — Taux panier → checkout → achat avec % d'abandon par étape
- **Abandon de panier** — BarChart empilé converti/abandonné par jour
- **LTV par client** — Top 20 clients par lifetime value totale, panier moyen, date 1ère commande
- **Cohortes d'acquisition** — Matrice 6 mois × 6 colonnes (M+0…M+5) avec heat-coloring vert
- **Heatmap des pages** — Top 12 pages visitées (slugs normalisés, URLs détail regroupées)
- **Sources de trafic** — Direct, Google, Facebook, Instagram, TikTok, etc.

### Sources de trafic reconnues automatiquement

```
google · facebook · instagram · tiktok · twitter/x · youtube · bing → label normalisé
utm_source présent → priorité sur le referrer
Pas de referrer → "direct"
```

### Données importantes

> La table `analytics_events` doit être créée dans Supabase avant de voir les données funnel/pages/trafic.
> Exécuter `supabase/analytics_events.sql` dans l'éditeur SQL Supabase.

---

## 📈 Évolutivité

Green-mood est conçu comme une solution **clé en main**. Que vous vendiez des fleurs, des huiles, des cosmétiques ou des accessoires, l'architecture modulaire + les paramètres de configuration permettent une adaptation immédiate à l'écosystème du CBD et du bien-être.

---

<div align="center">
  Propulsé par l'innovation de Maysson D • Green-mood © 2026
</div>
