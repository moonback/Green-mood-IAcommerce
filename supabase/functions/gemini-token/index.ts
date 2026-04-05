import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions MUST live in the ephemeral token's bidiGenerateContentSetup.
// When using ephemeral tokens, Gemini uses the server-side setup exclusively —
// the client's ai.live.connect() config is not applied by the server.
const BUDTENDER_TOOLS = [{
  functionDeclarations: [
    {
      name: 'add_to_cart',
      description: "Ajouter un produit au panier dès que le client donne son accord ou exprime une intention d'achat. Utilisez le nom exact du produit.",
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: "Le nom du produit à ajouter." },
          quantity: { type: 'NUMBER', description: "Nombre d'unités (optionnel, par défaut 1)." },
        },
        required: ['product_name'],
      },
    },
    {
      name: 'view_product',
      description: "Ouvrir la fiche détaillée d'un produit. Vous DEVEZ impérativement fournir le nom exact du produit pour que l'affichage fonctionne.",
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: "Le nom exact du produit. Ne laissez jamais ce champ vide." },
        },
        required: ['product_name'],
      },
    },
    {
      name: 'think',
      description: "Obligatoire avant de répondre. Planifiez votre raisonnement et vos prochaines actions ici.",
      parameters: {
        type: 'OBJECT',
        properties: {
          intent: { type: 'STRING', description: "User intent" },
          reasoning: { type: 'STRING', description: "Your internal reasoning" },
          next_action: { type: 'STRING', description: "What tool you will call next, or what you will say." },
        },
        required: ['intent', 'reasoning', 'next_action'],
      },
    },
    {
      name: 'search_catalog',
      description: "Rechercher des produits par mots-clés, effets ou arômes.",
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Le besoin du client' },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_knowledge',
      description: "Rechercher des informations générales ou scientifiques (bienfaits, effets, lois, livraison, boutique).",
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Concept recherché' },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_expert_data',
      description: "Rechercher des informations techniques approfondies sur un produit dans la base de connaissances.",
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: "Terme technique ou scientifique" },
        },
        required: ['query'],
      },
    },
    {
      name: 'load_voice_skill',
      description:
        "Charge des instructions vocales étendues non présentes dans le prompt initial. Appeler avant d'approfondir : botanique_expert (terpènes, cannabinoïdes, variétés, spectre complet) ; cross_selling (stratégie de compléments au-delà de suggest_bundle). Après réception, applique le texte retourné.",
      parameters: {
        type: 'OBJECT',
        properties: {
          skill_id: {
            type: 'STRING',
            description:
              "Identifiant exact : botanique_expert ou cross_selling (aucune autre valeur).",
          },
        },
        required: ['skill_id'],
      },
    },
    {
      name: 'search_cannabis_conditions',
      description:
        "Recherche scientifique sur le CBD et les conditions de bien-être (sommeil, anxiété, douleur, inflammation, etc.). Utiliser pour des questions médicalisées ou de données cannabis_conditions.",
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Condition ou concept recherché' },
        },
        required: ['query'],
      },
    },
    {
      name: 'navigate_to',
      description: "Naviguer vers une page du site. Pages disponibles : accueil, catalogue, boutique, produits, qualite, contact, panier, compte, faq, livraison, a-propos, cgv, guides. Pour naviguer vers une catégorie de produits, utiliser le format 'category:NomCategorie'.",
      parameters: {
        type: 'OBJECT',
        properties: {
          page: { type: 'STRING', description: "Le nom de la page de destination. Exemples : 'accueil', 'catalogue', 'panier', 'contact', 'category:Électronique'." },
        },
        required: ['page'],
      },
    },
    {
      name: 'track_order',
      description: "Vérifier le statut d'une commande du client. Si aucun order_id n'est fourni, retourne les 3 dernières commandes.",
      parameters: {
        type: 'OBJECT',
        properties: {
          order_id: { type: 'STRING', description: "Identifiant partiel ou complet de la commande (optionnel)." },
        },
      },
    },
    {
      name: 'save_preferences',
      description: "Sauvegarder de nouveaux traits ou préférences identifiés chez le client (ex: passion, budget, style, expertise).",
      parameters: {
        type: 'OBJECT',
        properties: {
          new_prefs: { 
            type: 'OBJECT', 
            description: "Un objet JSON contenant les nouveaux traits. Exemple: { passion: 'rétrogaming', budget: 'premium' }",
            properties: {} // Allows any field
          },
        },
        required: ['new_prefs'],
      },
    },
    {
      name: 'open_product_modal',
      description: "Ouvrir une section spécifique (modale) du produit actuellement affiché à l'écran. Utilisez cet outil dès que le client demande des détails techniques, les effets, l'histoire ou les avis alors qu'il est déjà sur une fiche produit.",
      parameters: {
        type: 'OBJECT',
        properties: {
          modal_name: {
            type: 'STRING',
            enum: ['specs', 'performance', 'story', 'reviews', 'related'],
            description: "Le nom de la section à ouvrir : 'specs' (technique), 'performance' (ex-effets), 'story' (histoire/concept), 'reviews' (avis clients), 'related' (plus de produits)."
          },
        },
        required: ['modal_name'],
      },
    },
    {
      name: 'toggle_favorite',
      description: "Ajouter ou retirer un produit des favoris (wishlist). Utilisez le nom exact du produit.",
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: "Le nom du produit à mettre en favoris." },
        },
        required: ['product_name'],
      },
    },
    {
      name: 'get_favorites',
      description: "Lister tous les produits actuellement dans les favoris du client.",
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: 'suggest_bundle',
      description: "Après un ajout au panier réussi, suggérer automatiquement un produit complémentaire ou accessoire. Appeler uniquement après add_to_cart réussi et si le panier a moins de 3 articles.",
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: 'compare_products',
      description: "Comparer deux produits côte à côte : prix, description, caractéristiques. Utiliser quand le client hésite entre deux produits.",
      parameters: {
        type: 'OBJECT',
        properties: {
          product_a: { type: 'STRING', description: "Nom du premier produit à comparer." },
          product_b: { type: 'STRING', description: "Nom du second produit à comparer." },
        },
        required: ['product_a', 'product_b'],
      },
    },
    {
      name: 'apply_promo',
      description: "Appliquer un code promo au panier du client. Proposer cette action si le client mentionne un code ou hésite sur le prix.",
      parameters: {
        type: 'OBJECT',
        properties: {
          code: { type: 'STRING', description: "Le code promo à appliquer (insensible à la casse)." },
        },
        required: ['code'],
      },
    },
    {
      name: 'watch_stock',
      description: "Inscrire le client à une alerte retour en stock pour un produit. Proposer automatiquement si le produit est hors stock ou indisponible.",
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: "Le nom du produit à surveiller." },
        },
        required: ['product_name'],
      },
    },
    {
      name: 'filter_catalog',
      description: "Filtrer le catalogue par budget maximum, catégorie ou attribut. Utiliser quand le client donne des critères précis.",
      parameters: {
        type: 'OBJECT',
        properties: {
          budget: { type: 'NUMBER', description: "Budget maximum en euros (optionnel)." },
          category: { type: 'STRING', description: "Nom de la catégorie (optionnel)." },
          attribute: { type: 'STRING', description: "Attribut ou mot-clé spécifique (ex: 'sans fil', 'compact', 'premium') (optionnel)." },
        },
      },
    },
    {
      name: 'get_referral_link',
      description: "Récupérer le lien de parrainage personnel du client pour qu'il le partage avec ses proches.",
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
    {
      name: 'submit_review',
      description: "Soumettre un avis sur un produit acheté par le client. Proposer après avoir parlé d'un produit de son historique d'achats.",
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: "Le nom du produit à évaluer." },
          rating: { type: 'NUMBER', description: "Note de 1 à 5." },
          comment: { type: 'STRING', description: "Commentaire de l'avis (optionnel)." },
        },
        required: ['product_name', 'rating'],
      },
    },
    {
      name: 'close_session',
      description: "Terminer la discussion et fermer la fenêtre vocale (à utiliser après avoir dit au revoir).",
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
  ],
}];


// Admin assistant tools — declared here so Gemini knows their exact signatures.
// The system prompt (adminVoicePrompts.ts) describes when to call them.
const ADMIN_TOOLS = [{
  functionDeclarations: [
    {
      name: 'query_dashboard',
      description: "Récupère les statistiques de ventes et du tableau de bord (chiffre d'affaires, commandes, clients, stock critique).",
      parameters: {
        type: 'OBJECT',
        properties: {
          period: {
            type: 'STRING',
            description: "Période : 'today' (défaut), 'week' (7 derniers jours), 'month' (mois en cours).",
          },
        },
      },
    },
    {
      name: 'search_orders',
      description: "Recherche des commandes par statut, identifiant ou nom du client. Retourne les détails complets : articles, client, mode de livraison, notes.",
      parameters: {
        type: 'OBJECT',
        properties: {
          status: {
            type: 'STRING',
            description: "Filtre par statut : 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'.",
          },
          search: { type: 'STRING', description: "Texte partiel pour filtrer par ID de commande." },
          customer_name: { type: 'STRING', description: "Nom (partiel) du client pour filtrer les commandes par client." },
          limit: { type: 'NUMBER', description: "Nombre maximum de résultats (défaut : 8)." },
        },
      },
    },
    {
      name: 'search_customers',
      description: "Recherche des clients par nom, email ou téléphone. Retourne le profil complet : points fidélité, adresse, historique des commandes récentes, anniversaire.",
      parameters: {
        type: 'OBJECT',
        properties: {
          search: { type: 'STRING', description: "Texte de recherche (nom, email, téléphone)." },
          limit: { type: 'NUMBER', description: "Nombre maximum de résultats (défaut : 8)." },
        },
        required: ['search'],
      },
    },
    {
      name: 'check_stock',
      description: "Vérifie les niveaux de stock. Sans product_name, retourne les produits en rupture ou faible stock (≤5).",
      parameters: {
        type: 'OBJECT',
        properties: {
          product_name: { type: 'STRING', description: "Nom partiel du produit à vérifier (optionnel)." },
        },
      },
    },
    {
      name: 'search_products',
      description: "Recherche des produits dans le catalogue par nom ou catégorie.",
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: "Nom partiel ou catégorie du produit." },
          limit: { type: 'NUMBER', description: "Nombre maximum de résultats (défaut : 8)." },
        },
        required: ['query'],
      },
    },
    {
      name: 'update_order_status',
      description: "Met à jour le statut d'une commande et optionnellement ajoute une note. Supporte un identifiant partiel.",
      parameters: {
        type: 'OBJECT',
        properties: {
          order_id: { type: 'STRING', description: "L'identifiant complet ou partiel de la commande." },
          status: {
            type: 'STRING',
            description: "Nouveau statut : 'pending', 'paid', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'.",
          },
          notes: { type: 'STRING', description: "Note optionnelle à ajouter à la commande." },
        },
        required: ['order_id', 'status'],
      },
    },
    {
      name: 'update_customer_points',
      description: "Ajoute, retire ou fixe les points de fidélité d'un client. Recherche par nom, email ou téléphone.",
      parameters: {
        type: 'OBJECT',
        properties: {
          customer_name: { type: 'STRING', description: "Nom, email ou téléphone du client." },
          points: { type: 'NUMBER', description: "Points à ajouter (positif), retirer (négatif) ou fixer (mode 'set')." },
          mode: { type: 'STRING', description: "'add' (défaut) pour ajouter/retirer, 'set' pour fixer à une valeur précise." },
        },
        required: ['customer_name', 'points'],
      },
    },
    {
      name: 'navigate_admin',
      description: "Navigue vers un onglet de l'interface d'administration.",
      parameters: {
        type: 'OBJECT',
        properties: {
          tab: {
            type: 'STRING',
            description: "Clé de l'onglet : dashboard, orders, kanban, products, categories, stock, customers, analytics, accounting, promo_codes, pos, loyalty, referrals, budtender, knowledge, marketing, display, sessions, reviews, subscriptions, birthdays, cannabis_conditions, ads, recommendations, settings_store, settings_ai, settings_delivery, settings_design, settings_features, settings_referral.",
          },
        },
        required: ['tab'],
      },
    },
    {
      name: 'close_session',
      description: "Ferme la session vocale admin (après avoir dit au revoir ou terminé la tâche).",
      parameters: {
        type: 'OBJECT',
        properties: {},
      },
    },
  ],
}];


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    console.log('[gemini-token] apiKey present:', !!apiKey, 'length:', apiKey?.length ?? 0);

    if (!apiKey) {
      console.error('[gemini-token] ERROR: GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { model, systemInstruction, voiceName = 'Puck', assistantType = 'budtender' } = await req.json().catch(() => ({
      model: 'models/gemini-2.5-flash-native-audio-latest',
      systemInstruction: '',
      voiceName: 'Puck',
      assistantType: 'budtender',
    }));

    const tools = assistantType === 'admin' ? ADMIN_TOOLS : BUDTENDER_TOOLS;



    const normalizedSystemInstruction =
      typeof systemInstruction === 'string' && systemInstruction.trim().length > 0
        ? {
          parts: [{ text: systemInstruction.trim() }],
        }
        : undefined;

    console.log('[gemini-token] Using model:', model, '| voiceName:', voiceName);

    // Ephemeral auth tokens are v1alpha-only and use snake_case path: /auth_tokens
    const googleUrl = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';
    const newSessionExpireTime = new Date(Date.now() + 60_000).toISOString();

    console.log('[gemini-token] Calling Google API:', googleUrl, 'model:', model);

    const payload = {
      newSessionExpireTime,
      bidiGenerateContentSetup: {
        model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
        // tools must be here — client config is ignored with ephemeral tokens.
        tools,
        ...(normalizedSystemInstruction
          ? { systemInstruction: normalizedSystemInstruction }
          : {}),
      },
    };

    console.log('[gemini-token] Payload preview (first 500 chars):', JSON.stringify(payload).slice(0, 500));

    const response = await fetch(`${googleUrl}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    console.log('[gemini-token] Google API status:', response.status, 'rawText preview:', rawText.slice(0, 300));

    let data: Record<string, unknown> = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error('[gemini-token] Invalid JSON from Google API');
      return new Response(
        JSON.stringify({ error: 'Google API returned invalid JSON', raw: rawText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!response.ok) {
      const apiErrorMessage = (data?.error as Record<string, unknown> | undefined)?.message;
      const message = typeof apiErrorMessage === 'string' ? apiErrorMessage : 'Token generation failed';
      console.error('[gemini-token] Google API error:', JSON.stringify(data?.error ?? data));
      return new Response(
        JSON.stringify({ error: message }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = (data?.name as string | undefined) ?? (data?.token as string | undefined);
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Google API did not return an auth token' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ token, expireTime: data.expireTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[gemini-token] CATCH error:', (err as Error).message, (err as Error).stack?.slice(0, 300));
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});