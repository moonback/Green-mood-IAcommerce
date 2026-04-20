# Implementation Plan: BudTender AI Enhancements

## Overview

Implémentation des 4 améliorations du BudTender IA en TypeScript/React 19. Les tâches suivent l'ordre de dépendance : les types partagés d'abord, puis les features dans l'ordre Feature 1 → 2 → 3 → 4, en terminant par le câblage final.

## Tasks

- [x] 1. Définir les types partagés et installer fast-check
  - Créer `src/types/budtenderSession.ts` avec les interfaces `TranscriptMessage`, `RecommendedProduct`, `BudTenderSession`
  - Ajouter `fast-check` comme dépendance dev dans `package.json` (`npm install --save-dev fast-check`)
  - _Requirements: 1.1, 2.10, 4.2_

- [ ] 2. Feature 1 — Exposer les transcripts dans `useGeminiLiveVoice`
  - [x] 2.1 Ajouter `inputTranscript` et `outputTranscript` au `return` du hook `src/hooks/useGeminiLiveVoice.ts`
    - La ligne 2434 retourne actuellement `{ voiceState, error, isMuted, isSupported, compatibilityError, toolActivity, startSession, stopSession, toggleMute }`
    - Ajouter `inputTranscript` et `outputTranscript` à ce return
    - Réinitialiser `setInputTranscript('')` et `setOutputTranscript('')` au début de `startSession`
    - _Requirements: 1.2, 1.3_

  - [x] 2.2 Écrire le test de propriété pour le rendu des messages de transcript
    - **Property 1: Transcript message rendering**
    - **Validates: Requirements 1.2, 1.3**
    - Créer `src/components/budtender-ui/__tests__/TranscriptPanel.test.tsx`
    - Utiliser `fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)` et `fc.constantFrom('user', 'assistant')`
    - Vérifier que chaque message non-vide est rendu avec le bon rôle CSS
    - `numRuns: 100`

  - [x] 2.3 Écrire le test de propriété pour le filtrage des messages vides
    - **Property 2: Whitespace messages are filtered**
    - **Validates: Requirements 1.7**
    - Dans le même fichier de test
    - Utiliser `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))`
    - Vérifier que la liste de messages reste inchangée
    - `numRuns: 100`

- [ ] 3. Feature 1 — Créer le composant `TranscriptPanel`
  - [x] 3.1 Créer `src/components/budtender-ui/TranscriptPanel.tsx`
    - Props : `messages: TranscriptMessage[]`
    - Messages `user` alignés à droite avec fond `bg-[color:var(--color-primary)]/15`
    - Messages `assistant` alignés à gauche avec fond `bg-white/5` (dark) / `bg-slate-100` (light)
    - Filtrer les messages dont `text.trim()` est vide avant affichage
    - Utiliser `React.memo` pour éviter les re-renders inutiles
    - `useRef` pour le scroll container + `useEffect` sur `messages` pour auto-scroll vers le bas
    - _Requirements: 1.1, 1.4, 1.5, 1.7, 1.8_

- [ ] 4. Feature 1 — Intégrer `TranscriptPanel` dans `VoiceAdvisor`
  - [x] 4.1 Modifier `src/components/VoiceAdvisor.tsx` pour afficher le transcript
    - Déstructurer `inputTranscript` et `outputTranscript` depuis `useGeminiLiveVoice`
    - Ajouter le state `messages: TranscriptMessage[]` et les refs `prevInputRef`, `prevOutputRef`
    - Implémenter la logique d'accumulation : `useEffect` sur `inputTranscript` (rôle `user`) et `useEffect` sur `outputTranscript` (rôle `assistant`) — mettre à jour le dernier message du même rôle si en cours, sinon ajouter
    - Réinitialiser `messages` uniquement quand `isOpen` passe à `false`
    - Rendre `<TranscriptPanel messages={messages} />` sous le bloc Body, visible si `messages.length > 0`
    - Agrandir le panneau flottant avec `max-h` et scroll interne pour accueillir le transcript
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_

- [x] 5. Checkpoint — Feature 1 complète
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Feature 2 — Migration SQL et table `budtender_sessions`
  - [x] 6.1 Créer `supabase/migrations/20260601_budtender_sessions.sql`
    - Table `budtender_sessions` avec colonnes : `id UUID PK`, `user_id UUID REFERENCES auth.users`, `started_at TIMESTAMPTZ`, `ended_at TIMESTAMPTZ`, `duration_sec INTEGER`, `transcript JSONB DEFAULT '[]'`, `recommended_products JSONB DEFAULT '[]'`, `email_sent BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ DEFAULT now()`
    - `ALTER TABLE budtender_sessions ENABLE ROW LEVEL SECURITY`
    - Policy `"Users see own sessions"` : `FOR SELECT USING (auth.uid() = user_id)`
    - Policy `"Users insert own sessions"` : `FOR INSERT WITH CHECK (auth.uid() = user_id)`
    - _Requirements: 2.10, 4.9_

- [ ] 7. Feature 2 — Edge Function `send-session-summary`
  - [x] 7.1 Créer `supabase/functions/send-session-summary/index.ts`
    - Valider le payload : `user_id` requis, `duration_sec >= 10` (sinon retourner `{ skipped: true }`)
    - `INSERT` dans `budtender_sessions` avec tous les champs requis
    - Si `RESEND_API_KEY` présent : générer le HTML de l'email (template inline en français avec nom client, date/heure, liste produits recommandés avec liens `/catalogue/:slug`, résumé), appeler Resend API, `UPDATE email_sent = true`
    - `try/catch` autour de l'envoi email — l'INSERT réussit même si l'email échoue
    - Retourner `{ success: true, session_id }`
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 7.2 Écrire le test de propriété pour la complétude du template email
    - **Property 3: Email template completeness**
    - **Validates: Requirements 2.2, 2.7**
    - Créer `src/lib/__tests__/emailTemplate.test.ts`
    - Extraire la fonction `renderEmailTemplate` dans un module testable `src/lib/emailTemplate.ts`
    - Utiliser `fc.record({ userName, storeName, budtenderName, startedAt: fc.date(), products: fc.array(...) })`
    - Vérifier que le HTML contient `userName`, `storeName`, `budtenderName`
    - `numRuns: 100`

  - [x] 7.3 Écrire le test de propriété pour le guard de durée de session
    - **Property 4: Session duration guard**
    - **Validates: Requirements 2.5**
    - Dans `src/lib/__tests__/sessionGuard.test.ts`
    - Extraire la logique de guard dans une fonction pure `shouldSendSummary(durationSec: number, userId: string | null): boolean`
    - Utiliser `fc.integer({ min: 0, max: 9 })` pour les sessions courtes → `shouldSendSummary` doit retourner `false`
    - Utiliser `fc.integer({ min: 10, max: 3600 })` avec userId non-null → doit retourner `true`
    - `numRuns: 100`

  - [x] 7.4 Écrire le test de propriété pour la persistance des données de session
    - **Property 5: Session data persistence completeness**
    - **Validates: Requirements 2.10**
    - Dans `src/lib/__tests__/sessionPersistence.test.ts`
    - Tester que `buildSessionRecord(payload)` retourne un objet avec tous les champs requis non-null
    - Utiliser `fc.record({ userId: fc.uuid(), transcript: fc.array(...), recommendedProducts: fc.array(...), durationSec: fc.integer({ min: 10 }), startedAt: fc.date(), endedAt: fc.date() })`
    - `numRuns: 100`

- [ ] 8. Feature 2 — Modifier `BudTender.tsx` pour déclencher l'envoi post-session
  - [x] 8.1 Ajouter le callback `onSessionEnd` dans `BudTender.tsx` et le passer à `VoiceAdvisor`
    - Ajouter `onSessionEnd?: (data: SessionEndData) => void` dans les props de `VoiceAdvisor`
    - Dans `VoiceAdvisor`, appeler `onSessionEnd` avec `{ startedAt, endedAt, transcript: messages, recommendedProducts }` quand `stopSession` est appelé (dans `handleHangup` et `handleClose`)
    - Tracker `startedAt` via un `useRef` initialisé quand `voiceState` passe de `idle/connecting` à `listening`
    - Tracker `recommendedProducts` : exposer `viewedProductIdsRef` depuis le hook ou passer les produits vus via un callback `onProductViewed`
    - Dans `BudTender.tsx`, implémenter le callback : récupérer l'utilisateur depuis `authStore`, calculer `duration_sec`, si `< 10` ou non authentifié → skip, sinon appeler l'Edge Function en fire-and-forget
    - _Requirements: 2.1, 2.4, 2.5, 2.9_

- [x] 9. Checkpoint — Feature 2 complète
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Feature 3 — BudTender proactif sur la fiche produit
  - [x] 10.1 Ajouter `proactiveGreeting` dans `budtenderStore`
    - Modifier `src/store/budtenderStore.ts` : ajouter `proactiveGreeting: string | null` et `setProactiveGreeting: (greeting: string | null) => void`
    - _Requirements: 3.1, 3.2_

  - [x] 10.2 Créer la fonction `buildProactiveGreeting` et le timer dans `ProductDetail.tsx`
    - Créer la fonction pure `buildProactiveGreeting(product, settings)` dans `src/lib/proactiveGreeting.ts`
    - Le greeting doit contenir le nom du produit, le taux CBD si disponible, le prix, et proposer une aide sur les effets/dosage/comparaison
    - Dans `ProductDetail.tsx`, ajouter `useRef` `proactiveTriggeredRef` et `proactiveTimerRef`
    - Ajouter un `useEffect` avec guards : `if (!product || !globalSettings?.budtender_voice_enabled || isVoiceOpen || proactiveTriggeredRef.current) return`
    - Timer de 30 000ms : si non déclenché et BudTender fermé → `proactiveTriggeredRef.current = true`, appeler `setProactiveGreeting(greeting)`, puis `openVoice()`
    - Cleanup : `clearTimeout` dans le return du `useEffect`
    - Dépendances : `[product?.id, isVoiceOpen, globalSettings?.budtender_voice_enabled]`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 10.3 Écrire le test de propriété pour le greeting proactif
    - **Property 6: Proactive greeting contains product name**
    - **Validates: Requirements 3.2**
    - Créer `src/lib/__tests__/proactiveGreeting.test.ts`
    - Utiliser `fc.record({ name: fc.string({ minLength: 1 }), price: fc.float({ min: 0.01 }), cbd_percentage: fc.option(fc.float({ min: 0.1, max: 30 })) })`
    - Vérifier que `buildProactiveGreeting(product, settings)` contient `product.name`
    - `numRuns: 100`

  - [x] 10.4 Lire `proactiveGreeting` depuis le store dans `VoiceAdvisor`
    - Dans `VoiceAdvisor.tsx`, lire `proactiveGreeting` depuis `useBudtenderStore`
    - Passer `proactiveGreeting` au hook `useGeminiLiveVoice` (prop déjà définie dans l'interface `Options`)
    - Appeler `setProactiveGreeting(null)` après que la session démarre (dans le `useEffect` qui appelle `startSession`)
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 11. Checkpoint — Feature 3 complète
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Feature 4 — Page `BudTenderHistory`
  - [x] 12.1 Créer `src/pages/BudTenderHistory.tsx`
    - Utiliser `AccountPageLayout` pour la mise en page (sidebar + main)
    - Requête Supabase : `supabase.from('budtender_sessions').select('*').eq('user_id', user.id).order('started_at', { ascending: false })`
    - State : `sessions`, `selectedSession`, `periodFilter: '7d' | '30d' | 'all'`
    - Implémenter `filterSessionsByPeriod(sessions, period)` : filtrer par `started_at >= cutoff`
    - Composant `SessionCard` inline : afficher date formatée (`toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })`), durée (`Xm Ys`), nombre de messages (`transcript.length`), aperçu du premier message assistant (tronqué à 80 chars, fallback "Conversation démarrée")
    - Vue détaillée `SessionDetail` : transcript complet avec messages `user`/`assistant` distingués visuellement (même style que `TranscriptPanel`), grille de produits recommandés sous forme de `<Link to={/catalogue/${slug}}>`, bouton "Relancer" qui appelle `setProactiveGreeting(relaunchGreeting)` puis `openVoice()`
    - État vide : message d'invitation + lien vers `/catalogue`
    - État d'erreur : message + bouton "Réessayer"
    - Filtres période : 3 boutons `7j / 30j / Tout`
    - Icônes : `lucide-react` uniquement (`MessageSquare`, `Clock`, `Calendar`, `ChevronRight`, `Play`)
    - Tailwind CSS v4 avec CSS variables (`[color:var(--color-primary)]`, etc.)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 4.10_

  - [x] 12.2 Écrire le test de propriété pour le tri des sessions par date décroissante
    - **Property 7: Session list sorted by date descending**
    - **Validates: Requirements 4.2**
    - Créer `src/pages/__tests__/BudTenderHistory.test.ts`
    - Extraire `sortSessions(sessions)` dans un module testable
    - Utiliser `fc.array(fc.record({ id: fc.uuid(), started_at: fc.date().map(d => d.toISOString()) }), { minLength: 2, maxLength: 20 })`
    - Vérifier que pour tout `i`, `new Date(sorted[i].started_at) >= new Date(sorted[i+1].started_at)`
    - `numRuns: 100`

  - [x] 12.3 Écrire le test de propriété pour l'affichage des champs requis dans `SessionCard`
    - **Property 8: Session card displays required fields**
    - **Validates: Requirements 4.3**
    - Dans le même fichier de test
    - Utiliser `fc.record({ id: fc.uuid(), started_at: fc.date().map(d => d.toISOString()), ended_at: fc.date().map(d => d.toISOString()), duration_sec: fc.integer({ min: 0 }), transcript: fc.array(fc.record({ role: fc.constantFrom('user', 'assistant'), text: fc.string({ minLength: 1 }), timestamp: fc.integer({ min: 0 }) })) })`
    - Rendre `<SessionCard session={...} />` et vérifier que la date, la durée, le nombre de messages sont présents dans le DOM
    - `numRuns: 100`

  - [x] 12.4 Écrire le test de propriété pour le filtre par période
    - **Property 9: Period filter correctness**
    - **Validates: Requirements 4.5**
    - Dans le même fichier de test
    - Utiliser `fc.array(fc.record({ started_at: fc.date().map(d => d.toISOString()) }))` et `fc.constantFrom('7d', '30d', 'all')`
    - Vérifier que chaque session dans le résultat filtré a `started_at >= cutoff`, et qu'aucune session hors période n'apparaît
    - `numRuns: 100`

  - [x] 12.5 Écrire le test de propriété pour les liens vers les produits recommandés
    - **Property 10: Recommended products rendered as links**
    - **Validates: Requirements 4.8**
    - Dans le même fichier de test
    - Utiliser `fc.array(fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }), price: fc.float({ min: 0.01 }), slug: fc.string({ minLength: 1 }) }), { minLength: 1 })`
    - Rendre la vue détaillée avec ces produits et vérifier que chaque produit est rendu comme un `<a>` dont `href` contient le `slug`
    - `numRuns: 100`

- [x] 13. Feature 4 — Câblage route, tuile Account et sidebar
  - [x] 13.1 Ajouter la route `/compte/budtender-historique` dans `App.tsx`
    - Ajouter `const BudTenderHistory = lazy(() => import('./pages/BudTenderHistory'))` avec les autres imports lazy
    - Ajouter `<Route path="compte/budtender-historique" element={<BudTenderHistory />} />` dans le bloc `ProtectedRoute`
    - _Requirements: 4.1, 4.7_

  - [x] 13.2 Ajouter la tuile "Historique BudTender" dans `Account.tsx`
    - Importer `MessageSquare` depuis `lucide-react`
    - Ajouter dans le tableau `services` : `{ icon: MessageSquare, label: 'Historique BudTender', description: 'Vos conversations passées', to: '/compte/budtender-historique', accentHex: '#10b981', size: 'large' }`
    - _Requirements: 4.1_

  - [x] 13.3 Ajouter l'entrée dans `AccountSidebar.tsx`
    - Importer `MessageSquare` depuis `lucide-react`
    - Ajouter `{ icon: MessageSquare, label: 'Historique IA', to: '/compte/budtender-historique' }` dans le tableau `links`
    - _Requirements: 4.1_

- [x] 14. Checkpoint final — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP rapide
- Chaque tâche référence les requirements spécifiques pour la traçabilité
- Les tests de propriétés utilisent `fast-check` avec `numRuns: 100` minimum
- Les tests unitaires et de propriétés sont complémentaires — les deux sont utiles
- Tailwind CSS v4 : utiliser `[color:var(--color-primary)]` et non les classes Tailwind directes pour les couleurs thémées
- Icônes : `lucide-react` uniquement, pas d'autres bibliothèques d'icônes
