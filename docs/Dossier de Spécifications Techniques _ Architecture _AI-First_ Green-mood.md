### Dossier de Spécifications Techniques : Architecture "AI-First" Green-mood

#### 1\. Vision Stratégique et Paradigme "AI-First"

L'architecture de Green-mood ne se contente pas d'intégrer l'intelligence artificielle comme une couche additionnelle ; elle la définit comme le pivot central de l'écosystème. Contrairement aux solutions monolithiques telles que Shopify ou WooCommerce, qui reposent sur une accumulation de plugins tiers fragmentés, Green-mood adopte un paradigme  **"AI-First"**  où l'IA bénéficie d'une  **agence autonome**  et d'une  **conscience d'état**  (State-awareness). Cela signifie que l'IA n'est pas un simple moteur de texte, mais un agent capable d'interagir en temps réel avec le panier, la navigation et les préférences utilisateur pour agir sur l'intégralité du tunnel de conversion.Cette approche offre un avantage compétitif décisif pour les modèles de  **White-label et de Franchise** . Grâce à des configurations JSON exportables entre instances, la plateforme permet une scalabilité industrielle sans modification du code source.**Les trois piliers de la solution :**

* **Omnicanalité native :**  Synchronisation temps réel entre le storefront web, le terminal POS physique (Point de Vente) et l'affichage dynamique (Digital Signage).  
* **RAG (Retrieval-Augmented Generation) métier :**  Une base de connaissances vectorielle garantissant une expertise "BudTender" fiable, ancrée dans des données scientifiques (terpènes, cannabinoïdes).  
* **Intégration profonde :**  Orchestration directe des outils de vente (Function Calling) par le modèle de langage, éliminant les frictions transactionnelles.

#### 2\. Analyse de la Stack Technologique et Architecture Globale

L'infrastructure a été conçue pour garantir une réactivité sub-seconde, indispensable à l'immersion IA. Le choix de  **React 19**  permet d'exploiter les  *concurrent features* , tandis que  **Supabase**  (PostgreSQL \+ PostgREST) assure une persistance haute performance.L'intégrité des données est garantie de bout en bout par plus de  **40 interfaces TypeScript partagées** , unifiant le contrat d'interface entre le backend et le frontend. Pour optimiser le chargement (\< 1s), une stratégie de  **code splitting manuel**  est configurée dans vite.config.ts, isolant les chunks critiques : app-admin, app-budtender et app-account. La gestion d'état repose sur  **Zustand 5** , utilisant le  **Persist Middleware**  pour assurer la continuité des sessions utilisateur à travers les 9 stores globaux.| Domaine | Technologie | Version | Rôle Spécifique || \------ | \------ | \------ | \------ || **Core UI** | React | 19 | Framework avec rendu concurrent et transitions fluides || **Langage** | TypeScript | 5.8 | Typage strict et 40+ interfaces de données partagées || **IA Voice** | Gemini Live | 1.29 | Flux WebSocket bidirectionnel (Native Audio) || **Vector Search** | pgvector | — | Embeddings 3072d et index HNSW (sub-milliseconde) || **Runtime Edge** | Deno (Supabase) | — | Edge Functions isolées avec Web Crypto API || **State** | Zustand | 5 | 9 stores globaux avec persistance de session || **Styling** | Tailwind CSS | v4 | Variables CSS dynamiques et thémage au runtime |

#### 3\. Ingénierie du Pipeline Audio Temps Réel (Gemini Live)

La fluidité de l'assistant vocal repose sur une latence cible  **\< 500ms** , orchestrée par le modèle gemini-3.1-flash-live-preview. L'exigence de sécurité isSecureContext est impérative pour l'accès aux APIs getUserMedia et AudioWorklet.Le pipeline technique est segmenté pour optimiser les ressources processeur :

1. **Capture (Main Thread) :**  Initialisation de l'AudioWorklet pour une capture brute.  
2. **Traitement (Web Worker) :**  Downsampling  **16 kHz PCM**  (entrée) et  **24 kHz PCM**  (sortie) via "zero-copy" (Transferable Objects).  
3. **Gestion du "Barge-in" :**  Détection d'interruption avec un fade-out déterministe de 80ms pour une transition naturelle.  
4. **Proactivité Intelligente :**  Logique de relance vocale automatisée après 8s (si panier actif) ou 15s (en navigation simple).  
5. **Dédoublonnage :**  Un mécanisme de  **déduplication de 2500ms**  est appliqué aux appels d'outils (tool calls) pour éviter les exécutions redondantes lors des gaps WebSocket.

#### 4\. Logique de Recherche Sémantique et Vectorielle à Quatre Niveaux

Le moteur de recherche transforme les requêtes naturelles en intentions d'achat via une architecture hiérarchisée, utilisant des embeddings  **text-embedding-3-large** .**Contrainte Critique :**  Les dimensions sont fixées à  **3072d**  (colonne PostgreSQL vector(3072)). Toute modification du modèle nécessite une régénération complète de la base vectorielle.**Hiérarchie de recherche :**

1. **Cache FIFO local :**  100 dernières entrées pour une réponse instantanée.  
2. **Exact Match & Substring :**  Recherche textuelle directe sur les métadonnées.  
3. **Fuzzy Search local :**  Distance de Levenshtein ≤ 2 gérée côté client.  
4. **RPC PostgreSQL (pg\_trgm) :**  Recherche trigramme serveur avec index GIST pour les requêtes complexes.**Function Calling & Agence**  Les 20+ outils sont orchestrés en deux phases :  
* **Phase 1 (Parallèle) :**  search\_catalog, search\_knowledge, get\_cart, search\_cannabis\_conditions (incluant l' **Evidence Score**  scientifique).  
* **Phase 2 (Séquentielle) :**  Actions changeant l'état du système comme add\_to\_cart (nécessitant view\_product préalable) ou apply\_promo.

#### 5\. Sécurisation des Échanges et Logique "Serverless" via Edge Functions

La sécurité repose sur l'isolation stricte de la logique métier dans le runtime Deno de Supabase. Les clés API (Gemini, OpenRouter, Stripe) sont confinées dans les  **Supabase Secrets**  et ne transitent jamais côté client.**Mesures de sécurité critiques :**

* **Runtime Isolation :**  Utilisation de la  **Web Crypto API**  pour la vérification HMAC-SHA256 des webhooks Stripe.  
* **Tokens Ephémères :**  Génération de jetons à durée de vie limitée pour les sessions Gemini Live via la fonction gemini-token.  
* **Double Protection Admin :**  Les "Admin Guards" sont implémentés au niveau du routing (Client-side) et systématiquement vérifiés dans les Edge Functions (Server-side).  
* **Atomicité & Rollback :**  En cas d'échec de transaction Stripe, les stocks sont restaurés automatiquement via une procédure de rollback intégrée.

#### 6\. Écosystème Omnicanal, POS et Administration Avancée

La plateforme Green-mood s'étend au-delà du web pour couvrir le commerce physique. Le  **Terminal POS**  et le  **Digital Signage**  communiquent via WebSocket pour synchroniser l'affichage client en temps réel.**Structure de Données & SEO :**

* **Hiérarchie Catalogue :**  Arborescence optionnelle à 3 niveaux (Root → Sub → Sub-sub).  
* **Automated SEO Engine :**  Génération automatique de JSON-LD (Product, BreadcrumbList) et injection d'URLs enrichies via le script generate-sitemap.ts.  
* **Blog RAG Automatisé :**  Le script generate-rag-blog.ts produit des guides SEO optimisés en transformant la base de connaissances en articles structurés.**Modules Administratifs Critiques (28 modules) :**  | Module | Impact Métier | | :--- | :--- | |  **Setup Wizard**  | Onboarding guidé en 9 étapes pour un déploiement en \< 5 min. | |  **Cannabis Conditions**  | Base scientifique avec "Evidence Score" pour la crédibilité thérapeutique. | |  **Loyalty & Referral**  | Système de monnaie virtuelle et parrainage automatisé natif. | |  **Analytics IA**  | Métriques de revenus et taux de conversion spécifiquement attribués à l'IA. |

#### 7\. Robustesse et Validation du Système

La fiabilité "Production-Ready" est certifiée par des protocoles de test rigoureux :

* **368 tests Vitest**  : Validation des calculs d'embeddings, des 9 stores Zustand et de la logique de réduction audio.  
* **21 scénarios critiques Playwright**  : Tests E2E couvrant l'authentification, le tunnel d'achat Stripe et les privilèges administrateur.**Checklist de Déploiement Production :**  
*   **Database :**  Exécution de boutique-vierge.sql et activation des extensions vector et pg\_trgm.  
*   **Edge Functions :**  Déploiement des 6 fonctions (ai-chat, gemini-token, etc.) avec injection des secrets via supabase secrets set.  
*   **Infrastructure :**  Activation obligatoire de  **HTTPS**  (requis pour AudioWorklet).  
*   **Stripe :**  Configuration du webhook endpoint avec signature HMAC-SHA256.  
*   **AI Config :**  Validation du modèle d'embedding (3072d) en cohérence avec la structure de la table products.

