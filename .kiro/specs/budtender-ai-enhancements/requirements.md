# Requirements Document

## Introduction

Ce document décrit les 4 améliorations à apporter au BudTender IA de la plateforme e-commerce Green-mood (CBD & bien-être). Le BudTender est un assistant vocal IA basé sur Gemini Live (WebSocket) qui conseille les clients sur les produits CBD. Les améliorations visent à enrichir l'expérience conversationnelle, à prolonger la valeur de chaque session au-delà de la conversation elle-même, et à rendre l'assistant plus proactif et consultable.

Stack technique : React 19 + TypeScript 5.8 + Vite 6, Supabase (PostgreSQL + Edge Functions Deno), Zustand.

---

## Glossaire

- **BudTender** : L'assistant vocal IA de Green-mood, propulsé par Gemini Live API via WebSocket.
- **Session BudTender** : Une conversation complète entre un client et le BudTender, de l'ouverture à la fermeture du panneau vocal.
- **Transcript** : La transcription textuelle en temps réel d'une session BudTender, composée des tours de parole de l'utilisateur (`inputTranscript`) et des réponses de l'IA (`outputTranscript`).
- **Message de transcript** : Un tour de parole individuel dans le transcript, avec un rôle (`user` ou `assistant`), un contenu textuel, et un horodatage.
- **Résumé de session** : Un email récapitulatif généré automatiquement après une session BudTender, contenant les produits recommandés et les points clés échangés.
- **Produit recommandé** : Un produit mentionné ou suggéré par le BudTender au cours d'une session.
- **Fiche produit** : La page de détail d'un produit (`/catalogue/:slug`), composant `ProductDetail.tsx`.
- **Espace compte** : La section client accessible via `/compte`, composant `Account.tsx`.
- **Historique de conversations** : La liste des sessions BudTender passées d'un client, consultable depuis son espace compte.
- **Déclenchement proactif** : L'ouverture automatique du BudTender vocal sur une fiche produit après un délai d'inactivité de l'utilisateur.
- **VoiceAdvisor** : Le composant React (`VoiceAdvisor.tsx`) qui encapsule l'interface utilisateur du BudTender vocal.
- **useGeminiLiveVoice** : Le hook React (`useGeminiLiveVoice.ts`) qui gère la connexion WebSocket Gemini Live, les transcripts et l'état vocal.
- **Edge Function** : Une fonction serverless Deno déployée sur Supabase, utilisée pour les opérations backend (envoi d'email, génération de résumé).
- **Client authentifié** : Un utilisateur connecté à son compte Green-mood (présent dans `authStore`).
- **Client anonyme** : Un utilisateur non connecté naviguant sur la plateforme.
- **budtender_sessions** : La table PostgreSQL (à créer) qui stocke les sessions BudTender et leurs transcripts.

---

## Requirements

### Requirement 1 : Mode texte + voix simultané (Transcript temps réel)

**User Story :** En tant que client utilisant le BudTender vocal, je veux voir la transcription textuelle de la conversation en temps réel pendant que la voix est active, afin de pouvoir suivre visuellement les échanges, relire une recommandation, et utiliser le BudTender dans des environnements bruyants ou sans son.

#### Acceptance Criteria

1. WHILE une session BudTender est active (état `listening` ou `speaking`), THE VoiceAdvisor SHALL afficher un panneau de chat textuel visible simultanément à l'interface vocale.
2. WHEN l'utilisateur parle, THE VoiceAdvisor SHALL afficher le texte transcrit de l'utilisateur dans le panneau de chat avec le rôle `user`, mis à jour en temps réel au fur et à mesure de la transcription.
3. WHEN le BudTender répond vocalement, THE VoiceAdvisor SHALL afficher le texte de la réponse de l'IA dans le panneau de chat avec le rôle `assistant`, mis à jour en temps réel au fur et à mesure de la synthèse.
4. THE VoiceAdvisor SHALL distinguer visuellement les messages `user` et les messages `assistant` par un alignement différent (user à droite, assistant à gauche) et une couleur de fond distincte.
5. WHEN un nouveau message est ajouté au panneau de chat, THE VoiceAdvisor SHALL faire défiler automatiquement le panneau vers le bas pour afficher le message le plus récent.
6. WHEN la session BudTender se termine, THE VoiceAdvisor SHALL conserver le transcript affiché jusqu'à la fermeture du panneau par l'utilisateur.
7. IF le transcript d'un tour de parole est vide ou contient uniquement des espaces, THEN THE VoiceAdvisor SHALL ne pas afficher ce message dans le panneau de chat.
8. THE VoiceAdvisor SHALL afficher le panneau de transcript sans dégrader les performances de la session vocale (pas de re-render bloquant sur le thread audio).

---

### Requirement 2 : Résumé de session IA par email

**User Story :** En tant que client authentifié ayant eu une conversation avec le BudTender, je veux recevoir automatiquement un email récapitulatif après la session, afin de retrouver facilement les produits recommandés et les informations clés sans avoir à les noter pendant la conversation.

#### Acceptance Criteria

1. WHEN une session BudTender se termine pour un client authentifié, THE System SHALL déclencher automatiquement l'envoi d'un email récapitulatif à l'adresse email du client.
2. THE Email_Summary SHALL contenir : le nom du client, la date et l'heure de la session, la liste des produits recommandés par le BudTender (nom, prix, lien direct vers la fiche produit), et un résumé textuel des points clés échangés.
3. WHEN aucun produit n'a été recommandé au cours de la session, THE Email_Summary SHALL indiquer explicitement qu'aucune recommandation produit n'a été faite et proposer un lien vers le catalogue.
4. IF le client n'est pas authentifié au moment de la fin de session, THEN THE System SHALL ne pas envoyer d'email récapitulatif.
5. IF la session BudTender dure moins de 10 secondes, THEN THE System SHALL ne pas envoyer d'email récapitulatif (session trop courte pour être significative).
6. THE Email_Summary SHALL être envoyé dans un délai maximum de 2 minutes après la fin de la session.
7. THE Email_Summary SHALL être rédigé en français et utiliser le nom de la boutique (`store_name`) et le nom du BudTender (`budtender_name`) issus des paramètres de la plateforme.
8. WHERE le système d'email transactionnel est configuré (variable d'environnement `RESEND_API_KEY` présente), THE Edge_Function SHALL utiliser Resend comme fournisseur d'envoi d'email.
9. IF l'envoi de l'email échoue, THEN THE Edge_Function SHALL logger l'erreur et ne pas bloquer la fin de session côté client.
10. THE System SHALL stocker chaque session BudTender terminée dans la table `budtender_sessions` avec : l'identifiant utilisateur, le transcript complet, la liste des produits recommandés, la durée de session, et l'horodatage de début et de fin.

---

### Requirement 3 : BudTender proactif sur la fiche produit

**User Story :** En tant que client consultant une fiche produit, je veux que le BudTender me propose automatiquement son aide après 30 secondes de consultation, afin de recevoir des conseils personnalisés sur le produit que je regarde sans avoir à initier moi-même la conversation.

#### Acceptance Criteria

1. WHEN un client reste sur une fiche produit pendant 30 secondes consécutives sans ouvrir le BudTender, THE ProductDetail SHALL déclencher automatiquement l'ouverture du BudTender vocal avec un message de bienvenue contextuel mentionnant le produit consulté.
2. THE Proactive_Greeting SHALL être personnalisé avec le nom du produit actuellement consulté et proposer une aide spécifique à ce produit (effets, dosage, comparaison).
3. WHEN le BudTender proactif s'ouvre, THE ProductDetail SHALL transmettre au BudTender le contexte complet du produit consulté (nom, description, taux CBD, prix, catégorie).
4. IF le client a déjà ouvert le BudTender manuellement au cours de la même visite sur la fiche produit, THEN THE ProductDetail SHALL ne pas déclencher le BudTender proactif.
5. IF le client ferme le BudTender proactif sans interagir, THEN THE ProductDetail SHALL ne pas redéclencher le BudTender proactif pendant la même visite sur cette fiche produit.
6. WHEN le client navigue vers une autre page, THE ProductDetail SHALL annuler le minuteur de déclenchement proactif en cours.
7. IF le BudTender vocal est désactivé dans les paramètres de la plateforme (`budtender_voice_enabled = false`), THEN THE ProductDetail SHALL ne pas déclencher le BudTender proactif.
8. THE Proactive_Trigger SHALL fonctionner uniquement sur les fiches produit (`/catalogue/:slug`) et non sur d'autres pages de la plateforme.

---

### Requirement 4 : Historique de conversations consultable

**User Story :** En tant que client authentifié, je veux pouvoir consulter l'historique de mes conversations passées avec le BudTender depuis mon espace compte, afin de retrouver des recommandations antérieures, suivre l'évolution de mes préférences, et relire des conseils reçus lors de sessions précédentes.

#### Acceptance Criteria

1. THE Account_Page SHALL afficher une tuile "Historique BudTender" dans la grille de services de l'espace compte, accessible via la route `/compte/budtender-historique`.
2. THE Conversation_History_Page SHALL afficher la liste des sessions BudTender passées du client authentifié, triées par date décroissante (la plus récente en premier).
3. THE Conversation_History_Page SHALL afficher pour chaque session : la date et l'heure, la durée de la session, le nombre de messages échangés, et un aperçu du premier message de l'IA.
4. WHEN le client clique sur une session dans la liste, THE Conversation_History_Page SHALL afficher le transcript complet de cette session dans une vue détaillée, avec les messages `user` et `assistant` distingués visuellement.
5. THE Conversation_History_Page SHALL permettre de filtrer les sessions par période (7 derniers jours, 30 derniers jours, toutes les sessions).
6. WHEN la liste des sessions est vide, THE Conversation_History_Page SHALL afficher un message invitant le client à démarrer sa première conversation avec le BudTender, avec un lien vers le catalogue.
7. IF le client n'est pas authentifié et tente d'accéder à `/compte/budtender-historique`, THEN THE Router SHALL rediriger le client vers la page de connexion.
8. THE Conversation_History_Page SHALL afficher les produits recommandés lors d'une session sous forme de liens cliquables vers les fiches produit correspondantes.
9. THE System SHALL ne stocker et afficher que les sessions BudTender du client authentifié, sans accès aux sessions d'autres clients (isolation par `user_id`).
10. WHEN une session est affichée en détail, THE Conversation_History_Page SHALL proposer un bouton permettant de relancer une conversation BudTender avec le contexte de la session précédente pré-chargé.
