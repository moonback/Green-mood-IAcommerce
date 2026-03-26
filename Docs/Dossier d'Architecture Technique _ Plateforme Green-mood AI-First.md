### Dossier d'Architecture Technique : Plateforme Green-mood AI-First

#### 1\. Vision Stratégique et Fondations "AI-First"

L'architecture Green-mood marque une rupture technologique avec les CMS traditionnels (Shopify, WooCommerce). Là où ces solutions traitent l'intelligence artificielle comme une couche additive via des plugins souvent mal synchronisés, Green-mood adopte une approche  **"AI-First"**  où l'IA est un citoyen de première classe. Cette conception native permet une intégration profonde du conseiller "BudTender" au sein des flux transactionnels, du catalogue et de la gestion client. En éliminant la latence et les silos de données propres aux solutions par plugins, nous transformons l'IA en un véritable moteur de conversion omnicanal capable de piloter l'expérience utilisateur avec une pertinence chirurgicale.Cette vision repose sur trois piliers fondamentaux :

* **Intelligence Artificielle Experte (Sommelier du Chanvre) :**  Un agent multimodal (Chat & Voix) s'appuyant sur une base de connaissances vectorielle (RAG) pour une expertise botanique et légale sans compromis.  
* **Expérience Premium Haute Performance :**  Une interface dont le temps de réponse est inférieur à 1 seconde, conçue pour minimiser la friction cognitive et maximiser l'engagement.  
* **Omnicanalité Native Synchronisée :**  Une source de vérité unique (Supabase) alimentant simultanément le Web, les points de vente physiques (POS) et l'affichage digital (TV) via des  **WebSockets**  pour une mise à jour en temps réel des stocks et promotions.

#### 2\. Architecture Frontend et Gestion de l'État Civilisé

La réactivité de l'interface est le premier levier de conversion en e-commerce. Nous avons sélectionné une stack de pointe pour garantir une fluidité de rendu constante (60 FPS) et des builds ultra-rapides via Vite 6\.

##### Analyse de la Stack Frontend

Technologie,Rôle Stratégique,Impact Architectural  
React 19,Bibliothèque UI,Gestion native des transitions et optimisation des ressources (Resources Loading).  
Vite 6,Bundler & Dev Server,Temps de build quasi instantané et Hot Module Replacement (HMR) optimisé.  
Tailwind CSS v4,Design System,"Utilisation exclusive de variables CSS dynamiques injectées par le ThemeProvider, éliminant les valeurs hexadécimales brutes."  
Motion/React,Moteur d'animations,Orchestration fluide des composants (ex-Framer Motion v11+) pour une expérience immersive.

##### Gestion de l'état avec Zustand 5

Le passage à  **Zustand 5**  est une décision architecturale majeure visant à éviter le "Provider Hell" inhérent aux Context Providers de React. Dans un système complexe incluant un  **Panel Admin de 28 modules** , Zustand permet un abonnement sélectif aux stores, empêchant les re-rendus massifs et inutiles qui dégradent les performances.Les quatre stores critiques assurent la synchronisation globale :

1. **authStore :**  Sessions JWT et gestion des rôles (Client vs Admin).  
2. **cartStore :**  Logique transactionnelle, calcul des remises et persistance.  
3. **settingsStore :**  Injection dynamique des configurations boutique (couleurs, modules activés).  
4. **toastStore :**  Système de notifications asynchrones pour le feedback utilisateur.

#### 3\. Infrastructure Backend et Orchestration Serverless (Supabase & Deno)

Nous utilisons  **Supabase**  comme orchestrateur  *Backend-as-a-Service*  (BaaS), capitalisant sur PostgreSQL pour la robustesse des données et Deno pour la logique métier distribuée.

##### Analyse des Edge Functions (Deno)

Les Edge Functions assurent une exécution serverless à faible latence, indispensable pour l'IA et les paiements :

* gemini-token : Génération de tokens éphémères pour Gemini Live avec injection sécurisée des Action Tools.  
* ai-chat : Streaming HTTP des réponses LLM via OpenRouter.  
* stripe-payment : Initialisation sécurisée des intentions de paiement.  
* admin-action : Opérations privilégiées (stock, prix) utilisant la  **service-role**  **key**  pour bypasser les politiques RLS lors des modifications de masse.

##### Persistance et Hiérarchie des Données

Le schéma PostgreSQL est optimisé pour la recherche et l'intégrité transactionnelle. Une innovation clé réside dans la  **hiérarchie de catégories à 3 niveaux**  (Racine \-\> Sous \-\> Sous-sous), permettant une navigation granulaire indispensable au "Sommelier du Chanvre".

* **Atomicité via RPC :**  La fonction process\_checkout garantit l'atomicité des transactions (décrémentation des stocks et création de commande simultanées), éliminant tout risque de survente (race conditions).

#### 4\. Moteur d'IA, RAG et Recherche Sémantique (pgvector)

La recherche sémantique permet de passer d'une recherche par mots-clés à une recherche par intention (ex: "quelque chose pour l'anxiété").

##### Architecture du RAG (Retrieval-Augmented Generation)

La recherche vectorielle repose sur l'extension pgvector. Les descriptions produits et la base de connaissances experte sont converties en vecteurs via le modèle text-embedding-3-large (OpenRouter) et stockées dans une colonne de type  **vector(3072)** . L'indexation  **HNSW (Hierarchical Navigable Small World)**  assure des recherches de similarité cosinus en moins de 10ms.

##### Capacités du BudTender : Chat vs Vocal

Caractéristique,Mode Chat (OpenRouter),Mode Vocal (Gemini Live)  
Protocole,Streaming HTTP,WebSockets / WebRTC  
Modèle,Gemini / Mistral / Llama,models/gemini-2.0-flash-audio-latest  
Latence,\~1.5s (premier token),\< 500ms  (réponse instantanée)  
Contraintes,Markdown enrichi,"VOICE\_FORMAT\_RULES  (Français oral pur, ni Markdown, ni emojis)."

#### 5\. Protocoles de Sécurité et Flux Transactionnels Stripe

Dans le secteur du CBD, la confiance est impérative. La plateforme applique des standards de sécurité de niveau bancaire.

##### Sécurisation par JWT et RLS

Chaque requête vers la base de données ou les Edge Functions est validée par un jeton JWT. Le  **Row Level Security (RLS)**  assure que les utilisateurs ne peuvent accéder qu'à leurs propres données (commandes, favoris), tandis que les actions administratives sont isolées derrière des rôles spécifiques.

##### Intégration Stripe et Idempotence

Le flux de paiement utilise  **Stripe Elements**  pour une intégration native sans redirection.

* **Validation HMAC-SHA256 :**  La vérification des webhooks est implémentée via la  **Web Crypto API**  native de Deno, garantissant l'authenticité des messages Stripe sans dépendances externes lourdes.  
* **Rollback Automatique :**  En cas d'échec de transaction détecté via webhook, un protocole d'idempotence restaure instantanément les stocks et marque la commande comme annulée.

#### 6\. Architecture Modulaire des 'Skills' du BudTender

Le comportement de l'IA est découplé du code source via un système de "Skills" (fichiers Markdown dans src/skills/). Cela permet d'ajuster l'expertise botanique ou la conformité légale sans déploiement de code.

##### Outils et Actions IA (Agentic AI)

Le BudTender n'est pas qu'un informateur, c'est un agent capable d'agir. Il dispose de plus de  **20 Action Tools**  avec une  **fenêtre de déduplication de 2500ms**  pour éviter les exécutions multiples dues aux latences réseau.

* suggest\_bundle : Création de paires de produits intelligentes (ex: fleur \+ vaporisateur).  
* compare\_products : Comparaison verbale des profils de terpènes et taux de CBD/THC.  
* search\_expert\_data : Recherche RAG dans les guides PDF et le blog expert.  
* toggle\_favorite / add\_to\_cart : Gestion directe de l'interface par la voix.

#### 7\. Analytics First-Party et Pilotage de la Performance

Pour contrer les ad-blockers et garantir la souveraineté des données, Green-mood intègre un système d'analytics  **first-party**  natif via analytics.ts.Les événements sont capturés directement en base de données (analytics\_events) :

* **Conversion Funnel :**  Tracking des étapes page\_view \-\> cart\_add \-\> checkout\_start \-\> purchase.  
* **Fidélité & LTV :**  Analyse de la Lifetime Value par client et des cohortes d'acquisition sur 6 mois via des heatmaps (Recharts).  
* **Performance IA :**  Suivi des interactions vocales et du taux de succès des recommandations du BudTender.

#### 8\. Stratégie de Déploiement et Maintenance

La robustesse est garantie par un workflow de contribution strict : TypeScript en mode strict, composants fonctionnels uniquement, et une couverture de  **380+ tests automatisés**  (Vitest pour l'unité, Playwright pour le E2E).

##### Pipeline de Déploiement

Le déploiement sur Vercel ou Netlify suit une checklist rigoureuse :

1. **Extension pgvector :**  Activation impérative dans Supabase.  
2. **Edge Functions :**  Déploiement des secrets (OpenRouter, Stripe, Gemini).  
3. **Setup Wizard :**  Exécution de l'assistant de configuration en  **9 étapes**  pour initialiser l'identité de marque, les paramètres de paiement et le programme de fidélité "Carats" en moins de 5 minutes.En synthèse, Green-mood ne se contente pas de vendre des produits ; elle déploie un écosystème intelligent, sécurisé et hautement scalable qui redéfinit les standards de l'e-commerce moderne.

