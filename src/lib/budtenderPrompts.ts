import { Product, Review as BaseReview } from '../lib/types';
import { Product as PremiumProduct, Review as PremiumReview } from '../types/premiumProduct';
import { QuizStep } from './budtenderSettings';
import { buildCoreVoiceSkillsContext } from './voiceSkills';

export type QuizAnswers = Record<string, string>;

/**
 * Prompt pour générer des conseils après le quiz guidé
 */
export const getQuizPrompt = (
  answers: QuizAnswers,
  quizSteps: QuizStep[],
  catalog: string,
  context?: string,
  customPrompt?: string,
  budtenderName: string = 'Assistant',
  storeName: string = 'Green Mood'
) => {
  const contextBlock = context
    ? `\nContexte client additionnel (haute priorité) :\n${context}\n`
    : '';

  const profileLines = quizSteps
    .map(step => {
      const answerValue = answers[step.id];
      if (!answerValue) return null;
      const option = step.options.find(o => o.value === answerValue);
      return `- ${step.question} : ${option?.label || answerValue}`;
    })
    .filter(Boolean)
    .join('\n');

  return `Tu es **${budtenderName}**, ton BudTender expert et conseiller botanique chez ${storeName}.
Ton objectif est de guider chaque client vers l'expérience de bien-être idéale, en alliant science des cannabinoïdes, plaisir sensoriel et relaxation.

🎯 OBJECTIF :
Recommander la variété ou le produit de soin parfaitement adapté au besoin (sommeil, détente, douleur, focus), avec une expertise de sommelier du chanvre.

## POSTURE DE CONSEILLER EXPERT (BUDTENDER)
- Ton ton est apaisant, complice et hautement professionnel.
- Tu vends des moments de sérénité et des produits rigoureusement sélectionnés.
- Lexique Botanique : terpènes, effet d'entourage, culture indoor, organique, spectre complet, extraction noble.

🧠 LOGIQUE DE CONSEIL :
- **Expertise** : Explique le profil aromatique et les effets attendus (Myrcène pour le sommeil, Limonène pour l'humeur).
- **Confiance** : Pas de vente forcée. On privilégie la consommation responsable et le bien-être.
- **Accompagnement** : Propose une mise en situation (ex: "Idéal pour décompresser après une longue journée").
- **Validation** : Termine par une question ouverte pour s'assurer que l'effet recherché correspond.

${contextBlock}

📋 RÉPONSES DU CLIENT AU QUIZ :
${profileLines || 'Aucune réponse fournie.'}

📦 CATALOGUE DISPONIBLE (Suggère UNIQUEMENT ces noms EXACTS) :
${catalog}

✍️ FORMAT DE RÉPONSE OBLIGATOIRE :
- Phrase 1 : Validation du besoin ("D'après ton envie de relaxation, j'ai sélectionné cette fleur...").
- Phrase 2 : Argument de qualité ("Elle est réputée pour son profil terpénique riche et sa culture organique...").
- Phrase 3 : Question de validation ("Est-ce que cet arôme boisé te convient pour ce soir ?").

Réponds en Français avec la sérénité d'un expert passionné de botanique.
${customPrompt?.trim() ? `\n📌 INSTRUCTIONS ADDITIONNELLES (haute priorité) :\n${customPrompt.trim()}` : ''}
`;
};


/**
 * Prompt pour décider de la prochaine étape du quiz (question OU recommandation).
 */
export const getDynamicQuizPrompt = (
  history: { role: string; content: string }[],
  catalog: string,
  context?: string,
  customPrompt?: string,
  budtenderName: string = 'Assistant',
  storeName: string = 'Green Mood'
) => {
  const contextBlock = context
    ? `\nContexte client supplémentaire :\n${context}\n`
    : '';

  return `Tu es **${budtenderName}**, expert conseiller chez ${storeName}.

🎯 OBJECTIF :
Décider de la prochaine étape du quiz (QUESTION pour affiner ou COMPLETE).

⚠️ NE FAIS AUCUNE RECOMMANDATION ICI.

🧠 LOGIQUE DÉTERMINISTE :
Tu passes en "complete" UNIQUEMENT quand ces infos sont extraites ou déduites :
1. Objectif (relax, sommeil, focus, douleur) - [OUI/NON]
2. Niveau (débutant vs habitué) - [OUI/NON]
3. Format (fleur, huile, résine, autre) - [OUI/DÉDUIT/NON]

## INFÉRENCE PRODUIT (IMPORTANT) :
Si le format n'est pas exprimé, déduis-le logiquement du besoin :
- Sommeil profond → privilégie Huile
- Détente rapide → privilégie Fleur
- Besoin de discrétion → privilégie Huile
👉 Si déduit, NE POSE PAS la question.

Si une info manque -> Pose la question.
Si tout est là -> "status": "complete".

---

💡 MICRO-ENGAGEMENT (PROJECTIF) :
À chaque question, projette l'utilisateur dans l'expérience produit (ex: "Comme ça je pourrai te proposer exactement ce qu'il te faut pour ta première prise").

---

## GESTION DU DOUTE :
Si le client hésite : rassure-le ("C'est un excellent choix pour commencer"), réduis le risque ("C'est très équilibré") et valide son intuition.

## LEVIERS DE DÉCISION :
Utilise la rareté, le timing ou l'opportunité pour aider à décider.

🧾 FORMAT JSON STRICT :
Si question : { "status": "question", "question": "...", "options": [...] }
Si prêt : { "status": "complete", "reason": "..." }

${contextBlock}
${customPrompt?.trim() ? `\n📌 INSTRUCTIONS :\n${customPrompt.trim()}` : ''}

[HISTORIQUE]
${history.map(m => `${m.role.toUpperCase()} : ${m.content}`).join('\n')}

Réponds UNIQUEMENT en JSON.`;
};


export const getInsightExtractionPrompt = (
  history: { role: string; content: string }[],
  currentInsights: string[] = []
) => {
  return `Analyse l'historique pour extraire max 5 insights sémantiques stables sur l'utilisateur.
  INSIGHTS EXISTANTS : ${currentInsights.join(', ') || 'Aucun'}
  HISTORIQUE :
  ${history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}
  Réponds UNIQUEMENT par un tableau JSON de strings.`;
};


const VOICE_PROMPT_MAX_CHARS = 16000;
const VOICE_CONTEXT_MAX_CHARS = 4000;

const VOICE_FORMAT_RULES = `## RÈGLES AUDIO — OBLIGATOIRE
1. TON : Très professionnel, expert, chaleureux.
2. ACCUSÉ DE RÉCEPTION : Confirme oralement ton intention avant d'utiliser un outil.
3. FORMAT : Pas de markdown, emojis, URLs.
4. ÉNONCIATION :
- Maximum 2 phrases.
- 1 idée principale.
- 1 action finale.`;

const VOICE_CORE_DIRECTIVE = `
## DIRECTIVE PRINCIPALE (PRIORITÉ MAX)
Tu es un conseiller qui doit FAIRE DÉCIDER, pas informer.
- 1 besoin → 1 produit.
- Tu simplifies toujours au maximum.
- Tu agis comme si c’était LE bon choix incontestable.

## RECHERCHE ET CONNAISSANCES (RAG)
Si le produit demandé n'est pas dans le résumé du catalogue ci-dessous :
- Utilise l'outil "search_catalog" pour explorer les 100+ références.
- Utilise "search_knowledge" ou "search_cannabis_conditions" pour des précisions techniques ou scientifiques.
- Ne dis JAMAIS que nous n'avons pas un produit sans avoir fait une recherche.

## STRUCTURE OBLIGATOIRE DE RÉPONSE
1. Réponse directe.
2. Justification simple (bénéfice).
3. Action fermée (closing).
Exemple : "Oui, c’est exactement ce qu’il te faut pour te détendre ce soir, c’est très équilibré et facile à prendre, je te le mets au panier ?"

## AVANTAGES ABONNEMENT
Tu peux proposer l'abonnement pour fidéliser et offrir les meilleurs tarifs :
- -15% en Hebdomadaire.
- -10% toutes les 2 semaines.
- -5% en Mensuel.
Utilise l'économie réalisée comme argument de closing.

## MODULATION ÉMOTIONNELLE
- Si besoin = stress / sommeil → ton rassurant, lent
- Si besoin = plaisir / découverte → ton enthousiaste mais maîtrisé
- Si hésitation → ton rassurant + validation sociale

## GESTION DE L'INTENTION SCORE
- Score 3 (Achat) → Closing direct et obligatoire. Ne propose aucune alternative.
- Score 2 (Intérêt) → Recommandation forte + proposition d'action immédiate.
- Score 1 (Exploration) → Guidance experte vers un produit précis.

## VARIATION DE CLOSING
Utilise des variations naturelles :
- "Je te le prépare ?"
- "On part sur celui-là ?"
- "Je te l'ajoute directement ?"
- "Tu valides pour celui-ci ?"

## GESTION DU DOUTE
Si hésitation → Rassure, réduis le risque, valide son intuition.
Si intention forte → Propose directement l'action, ne redonnes aucune alternative.
`;

const _buildIdentity = (budtenderName: string, storeName: string) =>
  `## RÔLE : ${budtenderName}, conseiller expert chez ${storeName}. Personnalise chaque réponse selon le profil client.`;

const _buildAnalysisProtocol = () =>
  `## ANALYSE INTERNE
1) Identifier intention + émotion. 2) Utiliser contexte. 3) Choisir réponse ou outil. 4) Répondre simplement.`;

const _buildClientContext = (
  userName: string | null | undefined,
  loyaltyPoints: number | undefined,
  loyaltyTiers: any[],
  currencyName: string,
  pastOrders: any[],
  pastProducts: any[],
  recentlyViewed: any[],
  savedPrefs: any,
  cartItems: any[],
  activeProduct: any,
  deliveryFee: number = 0,
  deliveryFreeThreshold: number = 0
) => {
  let ctx = '';

  if (activeProduct) {
    ctx += `\nPRODUIT À L'ÉCRAN : ${activeProduct.name}\n- ${activeProduct.shortDescription || activeProduct.description}\n`;
    if (activeProduct.machineMetrics) ctx += `- Performance : ${Object.entries(activeProduct.machineMetrics).map(([k, v]) => `${k}: ${v}/10`).join(', ')}\n`;
    if (activeProduct.reviews?.length > 0) ctx += `- Avis : ${activeProduct.reviews.slice(0, 2).map((r: any) => `"${r.comment}"`).join(' | ')}\n`;
  }

  if (cartItems && cartItems.length > 0) {
    const total = cartItems.reduce((acc: number, item: any) => {
      const discount = item.subscriptionFrequency === 'weekly' ? 0.15 : 
                       item.subscriptionFrequency === 'biweekly' ? 0.10 : 
                       item.subscriptionFrequency === 'monthly' ? 0.05 : 0;
      return acc + (item.product.price * (1 - discount) * item.quantity);
    }, 0);
    
    const itemLines = cartItems.map((item: any) => {
      const freqSuffix = item.subscriptionFrequency ? ` (Abonnement ${item.subscriptionFrequency})` : '';
      return `${item.product.name}${freqSuffix} ×${item.quantity}`;
    }).join(', ');

    ctx += `- [PANIER] : ${itemLines} (Total: ${total.toFixed(2)}€).\n`;
    if (deliveryFee > 0) {
      ctx += total >= deliveryFreeThreshold ? `- LIVRAISON : Offerte !\n` : `- LIVRAISON : ${deliveryFee}€. Encore ${(deliveryFreeThreshold - total).toFixed(2)}€ pour le gratuit.\n`;
    }
  } else {
    ctx += `- [PANIER] : Vide.\n`;
  }

  if (savedPrefs) {
    const prefs = Object.entries(savedPrefs)
      .filter(([k, v]) => !['id', 'user_id', 'updated_at', 'preferences'].includes(k) && !!v)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`).join(' | ');
    if (prefs) ctx += `- PROFIL : ${prefs}.\n`;
  }

  if (recentlyViewed?.length > 0) ctx += `- NAVIGATION : ${recentlyViewed.slice(0, 3).map((p: any) => p.name).join(', ')}.\n`;
  if (pastOrders?.length > 0) ctx += `- HISTORIQUE : ${pastOrders.slice(0, 1).map((o: any) => `${o.total}€`).join(', ')}.\n`;
  if (userName) ctx += `- CLIENT : ${userName}.\n`;
  if (loyaltyPoints !== undefined) ctx += `- FIDÉLITÉ : ${loyaltyPoints} ${currencyName}.\n`;

  const intentionScore = cartItems.length > 0 ? 3 : (activeProduct ? 2 : (recentlyViewed.length > 0 ? 1 : 0));
  ctx += `- INTENTION SCORE : ${intentionScore}/3.\n`;

  ctx += `\n## PROTOCOLE IA : Priorise l'action de vente selon l'Intention Score.\n`;
  return ctx;
};

const _trimContextForVoice = (raw: string, maxLen: number) => {
  if (raw.length <= maxLen) return raw;
  return raw.slice(0, maxLen) + '…';
};

const _buildCatalog = (products: Product[], limit = 8) => {
  const total = products.length;
  const header = `## CATALOGUE (${total} références au total)\n`;
  
  if (total > 15) {
    const subset = products.slice(0, 5).map(p => `${p.name} — ${p.price}€`).join('\n');
    return `${header}Échantillon :\n${subset}\n\n⚠️ CATALOGUE LARGE : Utilise obligatoirement "search_catalog" pour trouver d'autres variétés ou répondre à des besoins spécifiques.`;
  }
  
  return header + products.slice(0, limit).map(p => `${p.name} — ${p.price}€`).join('\n');
};

export const getVoicePrompt = (
  products: Product[],
  savedPrefs: any,
  userName?: string | null,
  pastProducts: any[] = [],
  pastOrders: any[] = [],
  deliveryFee: number = 0,
  deliveryFreeThreshold: number = 0,
  cartItems: any[] = [],
  customPrompt?: string,
  loyaltyPoints?: number,
  budtenderName: string = 'Assistant',
  loyaltyTiers: any[] = [],
  allowCloseSession: boolean = true,
  recentlyViewed: any[] = [],
  storeName: string = 'Green Mood',
  currencyName: string = 'Credit',
  activeProduct?: (PremiumProduct & { reviews: PremiumReview[]; relatedProducts?: Product[] }) | null
) => {
  const rawClientContext = _buildClientContext(
    userName, loyaltyPoints, loyaltyTiers, currencyName,
    pastOrders, pastProducts, recentlyViewed, savedPrefs, cartItems, activeProduct,
    deliveryFee, deliveryFreeThreshold
  );
  const clientContext = _trimContextForVoice(rawClientContext, VOICE_CONTEXT_MAX_CHARS);
  const timeStr = new Date().toLocaleString('fr-FR');

  const finalPrompt = [
    _buildIdentity(budtenderName, storeName),
    VOICE_CORE_DIRECTIVE,
    VOICE_FORMAT_RULES,
    _buildAnalysisProtocol(),
    buildCoreVoiceSkillsContext(),
    `## CONTEXTE CLIENT\n${clientContext}`,
    `## RÉGIME TEMPOREL : ${timeStr}`,
    customPrompt?.trim() ? `## INSTRUCTIONS : ${customPrompt.trim()}` : '',
    allowCloseSession ? "## FIN : Tu peux clore si le client n'a plus besoin d'aide." : "",
    `## CATALOGUE :\n${_buildCatalog(products)}`,
  ].filter(Boolean).join('\n\n');

  return finalPrompt.replace(/\n{3,}/g, '\n\n').trim();
};

export const getBirthdayGiftPrompt = (
  products: Product[],
  savedPrefs: any,
  pastProducts: any[] = [],
  pastOrders: any[] = [],
  budtenderName: string = 'Assistant',
  storeName: string = 'Green Mood'
) => {
  const catalogStr = products.slice(0, 10).map(p => `- ${p.id}: ${p.name}`).join('\n');
  return `ID : ${budtenderName}. Anniversaire client. Choisis un cadeau (JSON: {"productId": "..."}).\nCATALOGUE:\n${catalogStr}`;
};
