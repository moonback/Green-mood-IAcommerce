import { Product, Review as BaseReview } from '../lib/types';
import { Product as PremiumProduct, Review as PremiumReview } from '../types/premiumProduct';
import { QuizStep } from './budtenderSettings';
import { buildCoreVoiceSkillsContext, buildOptionalVoiceSkillsInstruction } from './voiceSkills';

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
  storeName: string = 'Green Mood'
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



// ─── VOICE FORMAT RULES — constante réutilisable ─────────────────────────────
const VOICE_FORMAT_RULES = `## RÈGLES AUDIO — OBLIGATOIRE
INTERDIT : Markdown, Emojis, parenthèses techniques, URLs, SKU, codes. Pas de formules de clôture ("au revoir", "n'hésitez pas"). Jamais de listes à puces.
OBLIGATOIRE : 
- Phrases courtes (10-18 mots), 2-3 par réponse.
- Chiffres en lettres ("vingt euros").
- Ponctuation pour les pauses (virgules, points).
- Connecteurs oraux ("Salut,", "Tu sais,","Bien sûr,","Absolument,","Parfait,","D'accord,","Compris,","Exactement,", etc).
- Contractions ("c'est", "y'a", "j'ai", "j'suis", etc).
- Varier légèrement l’intonation pour éviter un ton monotone.
- Donner l’impression d’une conversation réelle, simple, claire et engageante.`;

// ─── MODULES PRIVÉS ──────────────────────────────────────────────────────────

const _buildIdentity = (budtenderName: string, storeName: string) =>
  `## RÔLE : ${budtenderName}, conseiller expert chez ${storeName}. Spécialiste des solutions naturelles à base de CBD, tu guides chaque client avec précision, clarté et un ton professionnel, accessible et humain. analyse le profil client avant toutes interactions PROFIL ÉVOLUTIF ACTUEL : Vide. Tu ne connais pas encore les besoins de ce client. TU DOIS IMPÉRATIVEMENT appeler load_voice_skill avec l'ID "quiz" pour mener une consultation et découvrir ses objectifs (sommeil, détente, etc.) et  `;
const _buildAnalysisProtocol = () => {
  return `## ANALYSE INTERNE (non visible)

1. Identifier l’intention réelle du client.
2. Détecter l’émotion dominante.
3. Prendre en compte le contexte (profil, historique, panier).
4. Choisir la meilleure stratégie (réponse directe ou utilisation d’un outil).
5. Construire une accroche naturelle et engageante.

RÈGLE CLÉ :
Exploiter les informations du client de manière implicite et fluide, sans les mentionner explicitement.`;
};

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

  if (userName) {
    ctx += `- PRÉNOM CLIENT : ${userName} — utilise son prénom naturellement, sans en abuser.\n`;
  }

  if (loyaltyPoints !== undefined) {
    const currentTier = loyaltyTiers.find(t => loyaltyPoints >= t.min_points);
    const nextTier = loyaltyTiers.find(t => loyaltyPoints < t.min_points);
    ctx += `- FIDÉLITÉ : ${loyaltyPoints} ${currencyName}`;
    if (currentTier) ctx += ` — palier ${currentTier.name} (×${currentTier.multiplier} sur chaque achat)`;
    if (nextTier) ctx += ` — encore ${nextTier.min_points - loyaltyPoints} ${currencyName} pour atteindre le palier ${nextTier.name}`;
    ctx += `. Règle : 1€ dépensé = 1 ${currencyName}. Valeur : 100 ${currencyName} = 1€ de réduction.\n`;
    ctx += `Pour toute question détaillée sur le programme de fidélité ou le parrainage, charge impérativement le skill "fidelite".\n`;
  } else if (loyaltyTiers && loyaltyTiers.length > 0) {
    const tiersStr = loyaltyTiers.map(t => `${t.name} (≥${t.min_points} ${currencyName}, ×${t.multiplier})`).join(', ');
    ctx += `- PROGRAMME FIDÉLITÉ : ${tiersStr}. Règle : 1€ = 1 ${currencyName}. Valeur : 100 ${currencyName} = 1€. Charge le skill "fidelite" pour plus d'infos.\n`;
  }


  if (pastOrders && pastOrders.length > 0) {
    const ordersStr = pastOrders
      .slice(0, 3)
      .map(o => `[ID: ${o.id}] Date: ${new Date(o.date).toLocaleDateString('fr-FR')} | Statut: ${o.status} | Total: ${o.total}€ | Articles: ${o.items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ')}`)
      .join(' || ');
    ctx += `- HISTORIQUE COMMANDES (3 dernières) : ${ordersStr}. Tu as accès à ces commandes pour aider sans demander le numéro de commande.\n`;
  } else if (pastProducts && pastProducts.length > 0) {
    const lastProds = pastProducts.slice(0, 4).map((p: any) => p.product_name || p.name).join(', ');
    ctx += `- HISTORIQUE ACHATS : ${lastProds}.\n`;
  }

  if (recentlyViewed && recentlyViewed.length > 0) {
    const viewedStr = recentlyViewed.slice(0, 4).map((p: any) => p.name).join(', ');
    ctx += `- NAVIGATION RÉCENTE : ${viewedStr} — utilise cet intérêt pour orienter tes suggestions.\n`;
  }

  if (savedPrefs) {
    const renderValue = (val: any): string => {
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'object' && val !== null) {
        if ('value' in val) return String(val.value);
        return Object.entries(val).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`).join('; ');
      }
      return String(val);
    };

    const entries = Object.entries(savedPrefs)
      .filter(([k, v]) => {
        if (!v || ['id', 'user_id', 'updated_at', 'preferences'].includes(k)) return false;
        if (typeof v === 'object' && v !== null && 'confidence' in v) {
          return (v.confidence as number) >= 0.8;
        }
        return true;
      })
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${renderValue(v)}`);

    if (entries.length > 0) {
      ctx += `- PROFIL ÉVOLUTIF ACTUEL (BudTender) : ${entries.join(' | ')}. `;
      const expertiseEntry = savedPrefs.expertise;
      const expVal = (expertiseEntry && typeof expertiseEntry === 'object' && 'value' in expertiseEntry)
        ? expertiseEntry.value
        : expertiseEntry;
      const exp = String(expVal || '').toLowerCase();

      if (exp) {
        if (exp.includes('debutant')) ctx += `Le client est débutant, vulgarise au maximum. `;
        if (exp.includes('expert')) ctx += `Le client est expert (terpènes, spectre complet...), sois technique. `;
      }
    } else {
      ctx += `- PROFIL ÉVOLUTIF ACTUEL : Vide. Tu ne connais pas encore les besoins de ce client. TU DOIS IMPÉRATIVEMENT appeler load_voice_skill avec l'ID "quiz" pour mener une consultation et découvrir ses objectifs (sommeil, détente, etc.) et ses goûts.\n`;
    }
  } else {
    ctx += `- PROFIL ÉVOLUTIF ACTUEL : Inconnu. Nouveau client ou données non chargées. TU DOIS IMPÉRATIVEMENT appeler load_voice_skill avec l'ID "quiz" pour commencer ton profilage.\n`;
  }

  ctx += `\n## PROTOCOLE DE MISE À JOUR DU PROFIL (IA ÉVOLUTIVE)
Tu dois enrichir ce profil EN TEMPS RÉEL dès que tu captes une information STABLE et FIABLE.

CLÉS STANDARDISÉES :
- 'expertise' : Débutant, Intermédiaire, Passionné, Expert.
- 'goût' : Boisé, Fruité, Terreux, Sucre, Mentholé, Agrumes, etc.
- 'objectif' : Focus, Détente, Sommeil profond, Énergie, Récupération, Créativité.
- 'format' : Fleurs, Vapotage, Huile, Infusion, Bonbons.
- 'budget' : Économique, Standard, Premium.

FORMAT DE L'APPEL 'save_preferences' :
Passe un objet { value: string, confidence: number } pour chaque clé.
Exemple : { "new_prefs": { "goût": { "value": "Fruité", "confidence": 0.95 } } }

PROTOCOLE DE GESTION DES CONFLITS :
Si une information nouvelle contredit une information existante à haute confidence :
1. NE DÉCLENCHE PAS l'outil immédiatement.
2. Pose une question de validation subtile : "T'es plutôt un connaisseur ou tu découvres vraiment ?"
3. Ne mets à jour que si le client confirme son changement de statut.`;

  if (cartItems && cartItems.length > 0) {
    const cartStr = cartItems.map((item: any) => `${item.product.name} ×${item.quantity}`).join(', ');
    const total = cartItems.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0);
    ctx += `- [PANIER RÉEL] : ${cartStr} — total ${total.toFixed(2)}€. Considère cette liste comme l'état définitif du panier. Réponds aux questions sur le panier uniquement sur cette base.\n`;

    if (deliveryFee > 0) {
      if (deliveryFreeThreshold > 0 && total >= deliveryFreeThreshold) {
        ctx += `- LIVRAISON : Offerte ! (Seuil de ${deliveryFreeThreshold}€ atteint). Pour les délais ou transporteurs (Colissimo, etc.), charge le skill "livraison".\n`;
      } else {
        ctx += `- LIVRAISON : ${deliveryFee}€.`;
        if (deliveryFreeThreshold > 0) {
          ctx += ` Encore ${(deliveryFreeThreshold - total).toFixed(2)}€ pour la livraison gratuite.`;
        }
        ctx += ` Charge le skill "livraison" pour les détails d'expédition.\n`;
      }
    }
  } else {
    ctx += `- [PANIER RÉEL] : Vide.\n`;
    if (deliveryFee > 0) {
      ctx += `- LIVRAISON : ${deliveryFee}€ standard.`;
      if (deliveryFreeThreshold > 0) {
        ctx += ` Offerte dès ${deliveryFreeThreshold}€ d'achat.`;
      }
      ctx += ' Charge le skill "livraison" pour plus d\'infos sur les délais et retours.\n';
    }
  }

  if (activeProduct) {
    ctx += `\nPRODUIT ACTUELLEMENT À L'ÉCRAN : ${activeProduct.name}\n`;
    ctx += `- Description : ${activeProduct.shortDescription || activeProduct.description}\n`;

    if (activeProduct.machineSpecs && activeProduct.machineSpecs.length > 0) {
      const specs = activeProduct.machineSpecs.map((s: any) => `${s.name}: ${s.description}`).join(' | ');
      ctx += `- Spécifications : ${specs}\n`;
    }

    if (activeProduct.machineMetrics) {
      const metrics = Object.entries(activeProduct.machineMetrics).map(([k, v]) => `${k}: ${v}/10`).join(', ');
      ctx += `- Profil de performance : ${metrics}\n`;
    }

    if (activeProduct.reviews && activeProduct.reviews.length > 0) {
      const reviewsStr = activeProduct.reviews.slice(0, 3).map((r: any) => `"${r.comment}" (${r.rating}/5 par ${r.author})`).join(' | ');
      ctx += `- Avis clients : ${reviewsStr}\n`;
    }

    if (activeProduct.relatedProducts && activeProduct.relatedProducts.length > 0) {
      const relatedStr = activeProduct.relatedProducts.map((p: any) => `${p.name} (${p.price}€)`).join(', ');
      ctx += `- Produits associés : ${relatedStr}\n`;
    }

    ctx += `Utilise ces informations précises pour répondre aux questions sur ce produit sans recherche supplémentaire.\n`;
  }

  return ctx;
};

const _buildCatalog = (products: Product[], limit = 10) =>
  products
    .slice(0, limit)
    .map(p => `${p.name}${p.category?.name ? ` (${p.category.name})` : ''} — ${p.price}€`)
    .join('\n');

/**
 * Prompt pour Gemini Live Voice (Audio)
 */
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
  const clientContext = _buildClientContext(
    userName, loyaltyPoints, loyaltyTiers, currencyName,
    pastOrders, pastProducts, recentlyViewed, savedPrefs, cartItems, activeProduct,
    deliveryFee, deliveryFreeThreshold
  );
  const now = new Date();
  const timeStr = now.toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const finalPrompt = [
    _buildIdentity(budtenderName, storeName),
    `## CONTEXTE CLIENT\n${clientContext}`,
    `## RÉFÉRENCE TEMPORELLE (TEMPS RÉEL)\nNous sommes le : ${timeStr}`,
    VOICE_FORMAT_RULES,
    customPrompt?.trim() ? `## INSTRUCTIONS SPÉCIFIQUES\n${customPrompt.trim()}` : '',
    allowCloseSession ? "## FIN DE SESSION\nSi le client exprime explicitement le souhait de partir ou s'il n'a plus besoin d'aide, tu peux clore la session chaleureusement." : "",
    _buildAnalysisProtocol(),
    buildCoreVoiceSkillsContext(),
    buildOptionalVoiceSkillsInstruction(),
    `## CATALOGUE DISPONIBLE (RÉSUMÉ)\n${_buildCatalog(products)}`,
  ].filter(Boolean).join('\n\n');

  // Hard limit to 8000 characters to prevent WebSocket 1007 (Invalid Argument) error in Gemini Live.
  // We sanitize the string by removing potentially problematic non-printable characters or excessive whitespace.
  const sanitized = finalPrompt.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '').replace(/\s+/g, ' ').trim();

  if (sanitized.length > 7990) {
    console.warn('[Voice][Prompt] Prompt too long (', sanitized.length, '), truncating to 7990 chars.');
    return sanitized.slice(0, 7990) + '... (truncated for stability)';
  }
  return sanitized;
};

export const getBirthdayGiftPrompt = (
  products: Product[],
  savedPrefs: any,
  pastProducts: any[] = [],
  pastOrders: any[] = [],
  budtenderName: string = 'Assistant',
  storeName: string = 'Green Mood'
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
