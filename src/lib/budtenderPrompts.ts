import { Product } from '../lib/types';
import { QuizStep } from './budtenderSettings';

// Charge les fichiers .md de manière dynamique via Vite (used by chat prompt only)
const skillsFiles = import.meta.glob('../skills/*.md', { query: '?raw', eager: true, import: 'default' });

// mode: 'chat' — skips skill.md and vocal_actions.md
const _buildSkillsContext = (mode: 'chat' | 'default' = 'default') => {
  const filePaths = Object.keys(skillsFiles);
  if (filePaths.length === 0) return '';

  // In chat mode: skip skill.md (voice-only tool defs) and vocal_actions.md
  const SKIP_FOR_CHAT = new Set(['skill.md', 'vocal_actions.md']);

  const sorted = [...filePaths].sort((a, b) => {
    const fa = a.split('/').pop() || '';
    const fb = b.split('/').pop() || '';
    if (fa === 'skill.md') return -1;
    if (fb === 'skill.md') return 1;
    return fa.localeCompare(fb);
  });

  let context = '## COMPÉTENCES (SKILLS)\n\n';

  for (const path of sorted) {
    const fileName = path.split('/').pop() || '';

    if (mode === 'chat' && SKIP_FOR_CHAT.has(fileName)) continue;

    const skillName = fileName.replace('.md', '');
    let content = skillsFiles[path] as string;

    // Minification pour la voix : supprime le markdown que le TTS lirait mot à mot
    content = content
      .replace(/\*\*(.+?)\*\*/g, '$1')   // **gras** → texte brut
      .replace(/\*([^*\n]+?)\*/g, '$1')   // *italique* → texte brut (sans croiser les sauts de ligne)
      .replace(/`([^`\n]+?)`/g, '$1')     // `code` → texte brut
      .replace(/^>\s.*/gm, '')            // citations de bloc
      .replace(/<!--[\s\S]*?-->/g, '')    // commentaires HTML
      .replace(/\n{2,}/g, '\n')           // doubles sauts de ligne → simple
      .trim();

    context += `### ${skillName.toUpperCase()}\n${content}\n\n`;
  }

  return context;
};

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
  storeName: string = 'My Store'
) => {
  const contextBlock = context
    ? `\nContexte client additionnel (haute priorité) :\n${context}\n`
    : '';

  // Convertit les réponses en une liste lisible pour l'IA en utilisant le texte réel des questions
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
 * Prompt pour générer la PROCHAINE étape d'un quiz dynamique
 */
export const getDynamicQuizPrompt = (
  history: { role: string; content: string }[],
  catalog: string,
  context?: string,
  customPrompt?: string,
  budtenderName: string = 'Assistant',
  storeName: string = 'My Store'
) => {
  const contextBlock = context
    ? `\nContexte client supplémentaire (achats passés, préférences) :\n${context}\n`
    : '';

  return `Tu es **${budtenderName}**, le BudTender passionné de ${storeName}. Ta mission est de mener une consultation dynamique et bienveillante pour recommander le produit de chanvre parfait.

🎯 TON OBJECTIF :
Analyser l'historique de la conversation et le catalogue pour décider de la PROCHAINE étape de la consultation.
Tu dois soit poser une nouvelle question sur les effets recherchés, les goûts ou le mode de consommation, soit décider que tu as trouvé la perle rare.

🧠 RÈGLES DE GÉNÉRATION (FORMAT JSON OBLIGATOIRE) :
Tu dois répondre EXCLUSIVEMENT avec un objet JSON valide au format suivant (NE JAMAIS inclure de sauts de ligne non échappés dans les chaînes). Réponds en JSON compact sur une seule ligne si possible :

Si l'historique de la conversation est vide, commence par poser la première question pour découvrir l'objectif bien-être du client.

Si tu avez besoin de plus d'informations :
{
  "status": "question",
  "question": "Quelle sensation recherches-tu principalement aujourd'hui ?",
  "options": [
    { "label": "Détente profonde", "value": "relax", "emoji": "🧘" },
    { "label": "Focus et Energie", "value": "energy", "emoji": "⚡" }
  ]
}

Si tu es prêt à recommander :
{
  "status": "complete",
  "reason": "Besoin identifié : recherche d'une fleur indoor puissante pour le sommeil avec arômes terreux."
}

📏 DIRECTIVES :
1. Questions : Max 3-5 questions au total. Sois percutant, comme un expert en comptoir.
2. Personnalisation : Ta question doit rebondir sur les préférences de goût ou de mode de vie exprimées.
3. Catalogue : Oriente tes questions vers les catégories disponibles (Fleurs, Huiles, Résines).
4. Ton : Expert, chaleureux, apaisant.

${contextBlock}
${customPrompt?.trim() ? `\n📌 INSTRUCTIONS ADDITIONNELLES :\n${customPrompt.trim()}` : ''}

📦 CATALOGUE ACTUEL (RÉSUMÉ) :
${catalog}

[HISTORIQUE DE LA CONVERSATION DU QUIZ]
${history.map(m => `${m.role.toUpperCase()} : ${m.content}`).join('\n')}

Réponds UNIQUEMENT en JSON.
`;
};



/**
 * System prompt for Gemini Live Voice — intentionally short (~600 chars).
 * Persona + rules only. NO dynamic data (catalog, cart, client) — those go in
 * getVoiceContextMessage() which is injected as the first session message.
 */
export const getVoicePrompt = (
  budtenderName: string = 'Assistant',
  storeName: string = 'My Store',
  customPrompt?: string,
  allowCloseSession: boolean = true,
) => {
  const parts = [
`Tu es ${budtenderName}, expert CBD chez ${storeName}. Tu conseilles avec chaleur, expertise et concision.

Tu reçois un bloc [CONTEXTE SESSION] en début de session contenant le nom du client, son panier, ses points de fidélité et son historique. Utilise impérativement ces informations pour personnaliser ton accueil et tes recommandations de manière naturelle.

RÈGLES VOCALES :
- 1 à 2 phrases max par réponse
- Jamais de markdown, listes, emojis, astérisques
- Une seule question courte à la fois
- Appelle search_catalog avant de recommander un produit
- Appelle think pour planifier toute action complexe
- Prix en toutes lettres : "vingt euros", "dix neuf euros cinquante"
- Français par défaut — adapte-toi si autre langue détectée

FAMILLES : fleurs (effet immédiat), huiles (action longue), résines (concentration élevée).
Tu n'es pas là pour vendre — tu offres une consultation sincère et apaisante.`
  ];

  if (allowCloseSession) {
    parts.push('Si le client veut terminer, clos la session chaleureusement.');
  }
  if (customPrompt?.trim()) {
    parts.push(customPrompt.trim());
  }

  return parts.join('\n\n');
};

/**
 * Dynamic context injected as the first user message of the session (NOT in systemInstruction).
 * Keeps systemInstruction short while giving the model full situational awareness.
 */
export const getVoiceContextMessage = (
  products: Product[],
  userName?: string | null,
  loyaltyPoints?: number,
  currencyName: string = 'points',
  pastOrders: any[] = [],
  pastProducts: any[] = [],
  cartItems: any[] = [],
  activeProduct?: any,
  deliveryFee: number = 0,
  deliveryFreeThreshold: number = 0,
  savedPrefs?: any,
  recentlyViewed: any[] = [],
) => {
  const lines: string[] = ['[CONTEXTE SESSION — NE PAS LIRE À VOIX HAUTE]'];

  lines.push(`Client : ${userName || 'invité'}`);

  if (loyaltyPoints !== undefined) {
    lines.push(`Fidélité : ${loyaltyPoints} ${currencyName}`);
  }

  if (cartItems.length > 0) {
    const cartStr = cartItems.map((i: any) => `${i.product.name} ×${i.quantity}`).join(', ');
    const total = cartItems.reduce((acc: number, i: any) => acc + i.product.price * i.quantity, 0);
    lines.push(`Panier : ${cartStr} — ${total.toFixed(2)}€`);
    if (deliveryFee > 0) {
      lines.push(total >= deliveryFreeThreshold && deliveryFreeThreshold > 0
        ? 'Livraison : offerte'
        : `Livraison : ${deliveryFee}€${deliveryFreeThreshold > 0 ? ` (offerte dès ${deliveryFreeThreshold}€)` : ''}`);
    }
  } else {
    lines.push('Panier : vide');
  }

  if (pastOrders.length > 0) {
    const recent = pastOrders.slice(0, 2)
      .map((o: any) => `[${o.id?.slice(0, 8)}] ${new Date(o.date).toLocaleDateString('fr-FR')} ${o.total}€`)
      .join(' | ');
    lines.push(`Commandes récentes : ${recent}`);
  } else if (pastProducts.length > 0) {
    lines.push(`Achats passés : ${pastProducts.slice(0, 3).map((p: any) => p.product_name || p.name).join(', ')}`);
  }

  if (savedPrefs) {
    const prefs = Object.entries(savedPrefs)
      .filter(([k, v]) => v && !['id', 'user_id', 'updated_at'].includes(k))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v as any[]).join(', ') : v}`)
      .slice(0, 5)
      .join(', ');
    if (prefs) lines.push(`Préférences : ${prefs}`);
  }

  if (recentlyViewed.length > 0) {
    lines.push(`Vus récemment : ${recentlyViewed.slice(0, 3).map((p: any) => p.name).join(', ')}`);
  }

  if (activeProduct) {
    lines.push(`Produit à l'écran : ${activeProduct.name} (${activeProduct.price}€)`);
  }

  const catalog = products.slice(0, 8)
    .map((p: Product) => `${p.name} (${p.category?.name || '?'}, ${p.price}€)`)
    .join(', ');
  lines.push(`Catalogue : ${catalog}`);

  return lines.join('\n');
};

export const getBirthdayGiftPrompt = (
  products: Product[],
  savedPrefs: any,
  pastProducts: any[] = [],
  pastOrders: any[] = [],
  budtenderName: string = 'Assistant',
  storeName: string = 'My Store'
) => {
  const catalogStr = products.map(p => `- ID : ${p.id}, Nom : ${p.name}, Description : ${p.description}, Catégorie : ${p.category?.name}`).join('\n');

  let historyStr = '';
  if (pastOrders && pastOrders.length > 0) {
    historyStr = pastOrders.map(o => o.items.map((i: any) => i.product_name).join(', ')).join(' | ');
  } else if (pastProducts && pastProducts.length > 0) {
    historyStr = pastProducts.map(p => p.product_name || p.name).join(', ');
  }

  return `
Tu es **${budtenderName}**, un Personal Shopper passionné expert en tendances mondiales chez ${storeName}.
C'est l'anniversaire de l'un de nos clients privilégiés et tu dois lui offrir un cadeau exceptionnel (accessoire ou pack promotionnel).

🎯 TON OBJECTIF :
Sélectionner le produit le plus pertinent dans la liste fournie.
CRITÈRE PRINCIPAL : L'historique des achats réels. Un client régulier a déjà montré de l'intérêt pour certaines catégories. Base-toi sur ces achats pour proposer quelque chose de complémentaire ou de gamme supérieure.
Si l'historique est vide, repose-toi sur ses préférences déclarées.

🧠 HISTORIQUE D'ACHATS RÉEL (Très important) :
${historyStr || "Aucun historique d'achat disponible. Ce client est probablement nouveau."}

🧠 PRÉFÉRENCES CLIENT DÉCLARÉES :
${Object.entries(savedPrefs || {})
      .filter(([k, v]) => v && !['id', 'user_id', 'updated_at'].includes(k))
      .map(([k, v]) => `- ${k.replace('_', ' ')} : ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\n') || "Aucune préférence spécifique déclarée."}

📦 LISTE DES PRODUITS DISPONIBLES :
${catalogStr}

📏 RÈGLES DE RÉPONSE :
1. Analyser l'historique réel pour trouver une logique d'équipement, complétée par les préférences.
2. Répondre UNIQUEMENT avec l'ID du produit choisi au format JSON suivant :
{"productId": "PRODUCT_UUID"}

Sois précis et stratégique dans ton choix.
`;
};
