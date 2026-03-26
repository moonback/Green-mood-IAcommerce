### Voyage au Cœur d'une Transaction Omnicanale : L'Analyse de Flux Green-mood

En tant qu'architecte, mon objectif est de vous faire oublier l'interface pour regarder la tuyauterie. Green-mood n'est pas un site web avec des "ajouts" ; c'est un écosystème  **AI-First**  où chaque brique a été pensée pour l'omnicanalité native. Déconstruisons ensemble la circulation de la donnée au sein de cette machine de guerre e-commerce.

#### 1\. Panorama de l'Écosystème Green-mood

L'architecture de Green-mood repose sur une volonté de rupture avec les CMS monolithiques. Ici, l'IA n'est pas un widget, c'est un citoyen de première classe. Le système s'appuie sur quatre piliers :

* **React 19 & Vite 6**  : Le fer de lance du Storefront. React 19 permet une gestion fine des transitions et du lazy loading natif, tandis que Vite 6 assure un environnement de développement et de build ultra-performant.  
* **Supabase (PostgreSQL & Edge Functions)**  : Bien plus qu'une base de données, c'est la "Single Source of Truth". Elle orchestre l'authentification, le stockage vectoriel et la logique serveur via des Edge Functions Deno.  
* **Stripe Elements**  : Intégration financière native. Contrairement aux redirections classiques, Stripe est ici encapsulé directement dans le flux React pour une friction minimale.  
* **IA Générative (Gemini & OpenRouter)**  : Le moteur d'intelligence qui pilote  **Melina**  (le BudTender). Elle utilise le RAG (Retrieval-Augmented Generation) pour puiser dans une base de connaissances métier.

##### Architecture Comparison : CMS Classique vs Green-mood

Caractéristique,Commerce Classique (CMS générique),Green-mood (Omnicanal Natif)  
Complexité & Maintenance,Empilement de plugins tiers instables,Modules natifs intégrés sans dette technique  
Performance (LCP),Souvent \> 3s (scripts bloquants),Vitesse éclair (\< 1s) via React 19 & Vite 6  
Intégrité de la Donnée,Synchronisation par lots (Batch),Temps réel via WebSockets & Single Source of Truth  
Intelligence Artificielle,Gadget externe (Iframe/Script),Native (Recherche vectorielle HNSW via pgvector)  
Expérience Client,Silos Web et Magasin déconnectés,"Flux unifié (Web, POS, TV Signage)"  
*Pour comprendre la robustesse de ce système, nous devons analyser comment la donnée pénètre dans l'entonnoir décisionnel.*

#### 2\. L'Interaction Initiale : Les Deux Portes d'Entrée

Que l'utilisateur soit sur son smartphone ou devant un vendeur en boutique, la logique de capture est identique.

##### Le Storefront Web (Vite 6 / React 19\)

L'état de l'application est piloté par  **9 stores Zustand distincts** . Pourquoi Zustand plutôt que l'API Context de React ? Pour l'efficacité architecturale : Zustand permet d'éviter les re-renders inutiles dans une UI complexe où le BudTender et le catalogue doivent coexister sans perte de FPS. Lors d'une recherche sémantique, le système interroge Supabase via des embeddings pour retourner des résultats basés sur l'intention (ex: "besoin de sommeil") plutôt que sur de simples mots-clés.

##### Le Terminal POS (Point de Vente)

En magasin, l'interface tactile utilise les mêmes hooks et stores que le web. Le  **scanner QR**  capture l'ID produit, qui vient alimenter le cartStore instantanément. Cette approche garantit qu'un client identifié en magasin retrouve ses préférences et ses "Carats" (points de fidélité) de manière transparente.

##### Fonctionnalités "Conversion-Ready" Stratégiques

1. **Abonnements Récurrents**  : Gestion native des cycles hebdomadaires ou mensuels pour stabiliser le MRR.  
2. **Fidélisation Hub 3.0**  : Système de paliers (Bronze/Silver/Gold) calculé en temps réel.  
3. **Galeries Immersives**  : Composants optimisés pour la haute performance visuelle sans dégrader le score Core Web Vitals.*Quelle que soit l'origine du flux, les données convergent vers un entonnoir de traitement atomique.*

#### 3\. Le Cœur du Réacteur : Gestion Atomique des Commandes et Stocks

C'est ici que se joue la fiabilité du système. Dans un contexte omnicanal, le risque de "double vente" d'un dernier article en stock est réel.

##### L'Atomicité via process\_checkout

Le système délègue la validation à une fonction RPC PostgreSQL nommée  **process\_checkout** . En architecture, l'atomicité signifie que l'opération est indivisible : soit la commande est créée ET le stock est décrémenté, soit rien ne se passe. Cela évite les états incohérents si une erreur survient à la milliseconde près.

##### Cycle Technique d'un Ajout au Panier

1. **cartStore (Zustand)**  : Mise à jour immédiate de l'état local pour une réactivité client optimale.  
2. **Table**  **cart\_items**  **(Supabase)**  : Persistance côté serveur pour permettre la reprise du panier sur n'importe quel appareil.  
3. **backgroundTaskStore**  : Gestion des tâches asynchrones (calcul des taxes, vérification des promotions) sans bloquer le thread principal.  
4. **Notifications Temps Réel**  : Diffusion du changement d'état via les canaux de broadcast de Supabase.**Mécanisme de Rollback**  : Si le paiement échoue, le système ne se contente pas d'afficher une erreur. Il déclenche une procédure de restauration automatique des stocks dans la table products et marque la commande comme cancelled pour libérer les ressources.*Une fois la cohérence logique assurée, le système engage la phase critique du transfert de valeur.*

#### 4\. Le Flux de Paiement : L'Intégration Stripe Native

Déconstruisons le "handshake" financier. Green-mood utilise Stripe Elements pour garder le contrôle total sur l'UX.

* **Formulaire de livraison**  : Capture et persistance des données logistiques dans le store de commande.  
* **Formulaire de paiement**  : Saisie sécurisée. À ce stade, le  **Simulateur Dev**  (matérialisé par une bannière orange en mode test) permet aux développeurs de simuler des scénarios critiques (refus, fraude, succès).

##### Orchestration des Edge Functions Deno

Fonction,Moment d'exécution,Rôle Technique  
stripe-payment,Validation du tunnel,Crée le  PaymentIntent  et sécurise le montant.  
stripe-webhook,Post-confirmation bancaire,Finalise la commande en base de données de manière  idempotente .  
**Sécurité & Idempotence**  : Le stripe-webhook utilise une vérification  **HMAC-SHA256** . L'aspect le plus crucial pour un architecte est l' **idempotence**  : si Stripe renvoie le même webhook deux fois, le système détecte que la commande est déjà traitée et ne décrémente pas le stock une seconde fois.*La confirmation du paiement agit comme un déclencheur synchrone pour tout l'écosystème.*

#### 5\. L'Effet de Vague : Synchronisation Temps Réel et Affichage Client

Grâce aux WebSockets de Supabase, une transaction réussie provoque une mise à jour instantanée de l'environnement physique et numérique :

* **Terminal POS**  : Mise à jour des  **rapports X & Z certifiés** . Le vendeur voit le stock s'ajuster visuellement sur sa console.  
* **Affichage TV (Digital Signage)**  : Si un produit atteint un stock de zéro, il est instantanément retiré des boucles publicitaires en magasin pour éviter toute frustration client.  
* **Écran Client**  : L'affichage secondaire (via WebSocket dédié) confirme la transaction et affiche le nouveau solde de points.

##### CRM et Fidélité : Le système "Carats"

La transaction alimente la table loyalty\_transactions. La règle métier est stricte :  **1€ dépensé \= 10 Carats gagnés** . Ce flux met à jour automatiquement le profil client via le  **settingsService.ts** , déclenchant potentiellement un changement de palier (ex: passage de Silver à Gold) et débloquant des avantages immédiats pour le prochain achat.

#### 6\. Le Rôle de l'IA Melina dans le Cycle de Vie

L'innovation majeure réside dans le  **Moteur de Skills**  (src/skills/). Le comportement de Melina est piloté par des fichiers Markdown qui découplent la logique métier du code source.

##### Architecture de Recherche & Action

1. **Recherche Vectorielle**  : Melina utilise  **pgvector avec une indexation HNSW**  (Hierarchical Navigable Small World), permettant des recherches sémantiques complexes dans le catalogue en quelques millisecondes.  
2. **Action Tools**  : L'IA n'est pas limitée à la parole ; elle possède des "mains" techniques pour manipuler le flux :  
3. add\_to\_cart : Modification directe du panier par la voix.  
4. view\_orders : Requête sur l'historique transactionnel.  
5. toggle\_favorite : Gestion des préférences clients.  
6. get\_loyalty\_points : Consultation en temps réel du solde Carats.  
7. search\_catalog : Exploration sémantique par effets (ex: "quelque chose pour relaxer").

#### 7\. Synthèse pour l'Apprenant : Les 3 Points Clés à Retenir

1. **L'Omnicanalité n'est pas une option, c'est une structure**  : Web et POS utilisent la même logique métier, les mêmes stores Zustand et la même base de données. Il n'y a pas de "synchronisation", il n'y a qu'une seule vérité.  
2. **L'Atomicité est le rempart contre le chaos**  : L'utilisation de fonctions RPC comme process\_checkout garantit qu'aucune erreur de stock ne peut survenir, même sous forte charge ou en cas de défaillance réseau.  
3. **L'IA est un composant d'infrastructure**  : Avec le système de  **Skills Markdown**  et la recherche vectorielle  **HNSW** , l'IA devient un outil de conversion actif capable d'exécuter des actions transactionnelles.**Conseil de l'Architecte**  : Ne construisez jamais de silos. La puissance de Green-mood réside dans sa  **Single Source of Truth (Supabase)** . Tant que vous maîtrisez la circulation de la donnée vers ce pivot central, votre système restera scalable, prévisible et performant.

