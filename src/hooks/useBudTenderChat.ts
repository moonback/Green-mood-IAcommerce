import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { BudTenderSettings } from '../lib/budtenderSettings';
import { getChatPrompt } from '../lib/budtenderPrompts';
import { Message } from '../lib/budtenderHelpers';
import { getRelevantProductsForQueryWithEmbedding } from '../lib/budtenderVectorSearch';
import { getRelevantKnowledge } from '../lib/budtenderKnowledge';
import { generateEmbedding } from '../lib/embeddings';
import { useSettingsStore } from '../store/settingsStore';
import { useRecentlyViewedStore } from '../store/recentlyViewedStore';
import { useCartStore } from '../store/cartStore';

interface BudTenderMemoryContext {
    savedPrefs: Record<string, any> | null;
    userName: string | null;
    pastProducts: { product_name: string }[];
    pastOrders?: { id: string, status: string, date: string, total: number, items: { product_name: string, quantity: number }[] }[];
    loyaltyPoints?: number;
    savePrefs: (prefs: Record<string, any>) => Promise<void> | void;
    updatePrefs: (newPrefs: Record<string, any>) => Promise<void> | void;
}

interface UseBudTenderChatParams {
    chatInput: string;
    isTyping: boolean;
    settings: BudTenderSettings;
    messages: Message[];
    products: Product[];
    memory: BudTenderMemoryContext;
    setChatInput: React.Dispatch<React.SetStateAction<string>>;
    setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    addUserMessage: (text: string) => void;
    addBotMessage: (msg: Partial<Message>, delay?: number) => void;
    addItem: (product: Product, quantity?: number) => void;
    openSidebar: () => void;
    onViewProduct: (product: Product) => void;
    logQuestion: (text: string) => void;
}

const SMALL_TALK_REGEX = /^(salut|bonjour|bonsoir|hello|hey|merci|thanks|ok|d'accord|ça va|ca va|yo|cool|top)[\s!?.]*$/i;
const COMMERCIAL_SIGNAL_REGEX = /(prix|budget|commande|livraison|stock|compar|recommand|meilleur|top|ajoute|panier|\d+\s?(€|euros?))/i;

function shouldUseRag(query: string, products: Product[]): boolean {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return false;
    if (COMMERCIAL_SIGNAL_REGEX.test(normalized)) return true;
    if (SMALL_TALK_REGEX.test(normalized)) return false;

    const words = normalized.split(/\s+/).filter(Boolean);
    const mentionsCatalog =
        products.some((p) => p.name.toLowerCase().includes(normalized))
        || products.some((p) => normalized.includes(p.name.toLowerCase()))
        || products.some((p) => {
            const cat = (p.category?.name || p.category?.slug || '').toLowerCase();
            return words.some((w) => w.length > 2 && cat.includes(w));
        });

    if (mentionsCatalog) return true;
    if (normalized.length <= 8 && words.length <= 2) return false;
    return true;
}

export function useBudTenderChat({
    chatInput,
    isTyping,
    settings,
    messages,
    products,
    memory,
    setChatInput,
    setIsTyping,
    setMessages,
    addUserMessage,
    addBotMessage,
    addItem,
    openSidebar,
    onViewProduct,
    logQuestion,
}: UseBudTenderChatParams) {
    // Keep track of products added via AI in this SPECIFIC session
    const addedDuringSessionRef = useRef<Set<string>>(new Set());

    // Pending tool action waiting for user confirmation
    const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

    const confirmPendingAction = useCallback(async (msgId: string) => {
        if (!pendingActionRef.current) return;
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, _confirmed: true } : m));
        await action();
    }, [setMessages]);

    const cancelPendingAction = useCallback((msgId: string) => {
        pendingActionRef.current = null;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, _confirmed: true } : m));
        addBotMessage({ text: "D'accord, action annulée. Comment puis-je vous aider autrement ?" });
    }, [setMessages, addBotMessage]);

    // ── Core AI call (shared by send and regenerate) ──────────────────────
    const runAICall = useCallback(async (text: string, replaceMessageId?: string) => {
        if (!settings.ai_enabled) {
            addBotMessage({ text: "Désolé, ma connexion à l'IA n'est pas configurée pour le moment." });
            setIsTyping(false);
            return;
        }

        const ragEnabled = shouldUseRag(text, products);
        let relevantProducts: Product[] = [];
        let relevantKnowledge: Awaited<ReturnType<typeof getRelevantKnowledge>> = [];
        let sharedEmbedding: any = null;

        if (ragEnabled) {
            const sharedEmbeddingPromise = generateEmbedding(text).catch((err) => {
                console.warn('[AI] Shared embedding generation failed, falling back per-retriever:', err);
                return null;
            });

            const [embedding, ragProducts, ragKnowledge] = await Promise.all([
                sharedEmbeddingPromise,
                sharedEmbeddingPromise.then((embedding) =>
                    getRelevantProductsForQueryWithEmbedding(text, products, embedding ?? undefined)),
                sharedEmbeddingPromise.then((embedding) =>
                    getRelevantKnowledge(text, 3, 0.3, embedding ?? undefined)),
            ]);

            sharedEmbedding = embedding;
            relevantProducts = ragProducts;
            relevantKnowledge = ragKnowledge;
        } else {
            console.info('[AI] Skipping RAG for short/small-talk query:', text);
            relevantProducts = products.filter((p) => p.is_featured).slice(0, 6);
            relevantKnowledge = [];
        }

        if (ragEnabled && !sharedEmbedding) {
            console.info('[AI] RAG retrieval executed without shared embedding (fallback path).');
        }

        const catalog = relevantProducts
            .map((p) => {
                const specs = (p.attributes?.specs ?? []).join(', ');
                const benefits = (p.attributes?.benefits ?? []).join(', ');
                const players = p.attributes?.players ? `${p.attributes.players} joueurs` : '';
                const brand = p.attributes?.brand ? `Marque: ${p.attributes.brand}` : '';
                return `- ${p.name} (${p.category?.slug}, ${p.price}€). ${p.description ?? ''} ${specs ? 'Spécifications: ' + specs : ''} ${benefits ? 'Avantages: ' + benefits : ''} ${players} ${brand}`.trim();
            })
            .join('\n');

        const { savedPrefs, userName, pastProducts, pastOrders, loyaltyPoints } = memory;
        const recentlyViewed = useRecentlyViewedStore.getState().items;
        const cartItems = useCartStore.getState().items;
        let userContext = '';
        if (userName) userContext += `Nom du client: ${userName}\n`;

        // Check for product context in URL
        const urlParams = new URLSearchParams(window.location.search);
        const productSlug = urlParams.get('product');
        if (productSlug) {
            const contextProduct = products.find(p => p.slug === productSlug);
            if (contextProduct) {
                userContext += `CONTEXTE PRODUIT : L'utilisateur est actuellement sur la page de "${contextProduct.name}". Priorise les informations sur ce produit.\n`;
            }
        }

        if (cartItems.length > 0) {
            const addedInSession = cartItems.filter(i => addedDuringSessionRef.current.has(i.product.id));
            const persistentItems = cartItems.filter(i => !addedDuringSessionRef.current.has(i.product.id));

            if (persistentItems.length > 0) {
                userContext += `PANIER PERSISTANT (déjà présent) : ${persistentItems.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}\n`;
            }
            if (addedInSession.length > 0) {
                userContext += `AJOUTS DE CETTE SESSION (via tes suggestions) : ${addedInSession.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}\n`;
            }
            userContext += `TOTAL PANIER ACTUEL: ${cartItems.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}\n`;
        }
        if (loyaltyPoints !== undefined) userContext += `Points de fidélité disponibles: ${loyaltyPoints} ${useSettingsStore.getState().settings.loyalty_currency_name}\n`;
        if (pastProducts.length > 0) {
            userContext += `Historique de produits achetés: ${pastProducts.slice(0, 3).map((p) => p.product_name).join(', ')}\n`;
        }
        if (pastOrders && pastOrders.length > 0) {
            userContext += `Dernières commandes: ${pastOrders.map(o => `[ID: ${o.id}] Le ${new Date(o.date).toLocaleDateString('fr-FR')} (Statut: ${o.status || 'Inconnu'}, ${o.total}€) - Articles: ${o.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}`).join(' || ')}\nTu as accès complet à ces commandes pour renseigner le client.\n`;
        }
        if (recentlyViewed && recentlyViewed.length > 0) {
            userContext += `Historique de navigation (récents): ${recentlyViewed.slice(0, 4).map(p => p.name).join(', ')} (sers-t'en pour proposer des analogies ou comprendre ses goûts)\n`;
        }
        if (savedPrefs) {
            const { tech_goal, experience_level, budget_range, platform_preference, priority_features, ...others } = savedPrefs;
            const entries = [
                `Objectif: ${tech_goal}`,
                `Expérience: ${experience_level}`,
                `Budget: ${budget_range}`,
                `Plateforme: ${platform_preference}`,
                `Priorités: ${priority_features?.join(', ')}`,
            ];
            Object.entries(others).forEach(([k, v]) => { if (v) entries.push(`${k}: ${v}`); });
            userContext += `Préférences: ${entries.join(' | ')}\n Adapte obligatoirement ton ton en fonction du niveau d'expertise (${experience_level}).`;
        }

        if (relevantKnowledge.length > 0) {
            userContext += `\n\n🎯 BASE DE CONNAISSANCES INTERNE (Priorité Haute) :\n`;
            userContext += relevantKnowledge.map(k => `[${k.category || 'Info'}] ${k.title} : ${k.content}`).join('\n\n');
        }


        const storeSettings = useSettingsStore.getState().settings;

        if (storeSettings.loyalty_tiers && storeSettings.loyalty_tiers.length > 0) {
            userContext += `\n\n🏆 PROGRAMME DE FIDÉLITÉ (RÈGLES) :\n`;
            userContext += `Le programme comporte ${storeSettings.loyalty_tiers.length} rangs :\n`;
            storeSettings.loyalty_tiers.forEach(t => {
                userContext += `- RANG ${t.name.toUpperCase()} (${t.min_points} ${storeSettings.loyalty_currency_name} min) : Multiplicateur x${t.multiplier}, Remise VIP -${t.vip_discount * 100}%, Livraison offerte dès ${t.free_shipping_threshold === 0 ? '0 (toujours Gratuit)' : t.free_shipping_threshold === null ? 'Seuil Standard' : t.free_shipping_threshold + '€'}.\n`;
            });
            userContext += `Valeur d'échange : 100 ${storeSettings.loyalty_currency_name} = ${storeSettings.loyalty_redeem_rate || 5}€ de réduction au paiement.\n`;
        }

        userContext += `📦 EXPÉDITION : Frais de livraison ${storeSettings.delivery_fee}€ (OFFERTS dès ${storeSettings.delivery_free_threshold}€ d'achat).\n`;

        const budtenderName = storeSettings.budtender_name || 'Assistant';
        const storeName = storeSettings.store_name || 'My Store';
        const effectiveCustomPrompt = [storeSettings.budtender_base_prompt?.trim(), settings.custom_chat_prompt?.trim()].filter(Boolean).join('\n\n');
        const systemPrompt = getChatPrompt(text, catalog, userContext, effectiveCustomPrompt, budtenderName, storeName);

        const history: { role: 'user' | 'assistant'; content: string }[] = [];
        messages
            .filter((m) => m.text && !m.isResult)
            .forEach((m) => {
                const role = m.sender === 'user' ? 'user' : 'assistant';
                if (history.length > 0 && history[history.length - 1].role === role) {
                    history[history.length - 1].content += `\n${m.text}`;
                } else {
                    history.push({ role, content: m.text || '' });
                }
            });

        const messagesForAI: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemPrompt },
            ...history,
        ];

        if (messagesForAI[messagesForAI.length - 1].role !== 'user') {
            messagesForAI.push({ role: 'user', content: text });
        }

        const modelToUse = settings.ai_model || 'mistralai/mistral-small-creative';

        const tools = [{
            type: 'function',
            function: {
                name: 'add_to_cart',
                description: "Ajouter un ou plusieurs produits au panier. Précisez la quantité d'unités (ex: 4 fois).",
                parameters: {
                    type: 'object',
                    properties: {
                        product_name: { type: 'string', description: 'Le nom du produit à ajouter.' },
                        quantity: { type: 'number', description: "Nombre d'unités (ex: 4)." },
                    },
                    required: ['product_name'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'track_order',
                description: "Permet de vérifier le statut d'une commande (livraison, préparation, encours). Si l'utilisateur ne fournit pas de numéro de commande, interroge les dernières commandes du client. Cette fonction renverra le statut de la commande en temps réel.",
                parameters: {
                    type: 'object',
                    properties: {
                        order_id: { type: 'string', description: "Le numéro/ID de la commande (optionnel)." },
                    },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'compare_products',
                description: "Comparer techniquement 2 ou 3 produits du catalogue. Retourne une analyse comparative des points forts et faibles.",
                parameters: {
                    type: 'object',
                    properties: {
                        product_names: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Liste des noms de produits à comparer.'
                        },
                    },
                    required: ['product_names'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'get_store_info',
                description: "Obtenir des informations sur la boutique : horaires, adresse, téléphone, politique de retour, garanties.",
                parameters: {
                    type: 'object',
                    properties: {
                        topic: { type: 'string', enum: ['horaires', 'adresse', 'contact', 'retours', 'garantie'], description: 'Le sujet spécifique.' },
                    },
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'view_product',
                description: "Ouvrir la fiche détaillée d'un produit pour que le client puisse voir les images et détails.",
                parameters: {
                    type: 'object',
                    properties: {
                        product_name: { type: 'string', description: "Le nom du produit à afficher" },
                    },
                    required: ['product_name'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'save_preferences',
                description: "Sauvegarder ou mettre à jour les préférences de l'utilisateur de manière dynamique (ex: { usage: 'gaming', passion: 'sim-racing' }).",
                parameters: {
                    type: 'object',
                    properties: {
                        new_prefs: { 
                            type: 'object', 
                            additionalProperties: true,
                            description: "Un objet JSON contenant les nouveaux traits de profil identifiés." 
                        },
                    },
                    required: ['new_prefs'],
                },
            },
        }];

        try {
            const { data: json, error: fnError } = await supabase.functions.invoke('ai-chat', {
                body: {
                    model: modelToUse,
                    messages: messagesForAI,
                    tools,
                    tool_choice: 'auto',
                    temperature: settings.ai_temperature,
                    max_tokens: settings.ai_max_tokens,
                    x_title: `${storeName} Cortex`,
                },
            });

            if (fnError) {
                console.error('ai-chat function error:', fnError);
                addBotMessage({ text: "Oups, j'ai eu une petite déconnexion. Pouvez-vous réessayer ?" });
                return;
            }

            if (json?.error) {
                const errDetail = json.error?.message || json.error?.code || 'Inconnue';
                console.error('OpenRouter Detailed Error:', json);
                addBotMessage({ text: `Erreur OpenRouter : ${errDetail}` });
                return;
            }

            const choice = json?.choices?.[0];
            const responseMessage = choice?.message;
            const responseText = responseMessage?.content;
            const toolCalls = responseMessage?.tool_calls;

            // Track whether at least one add_to_cart tool call was processed.
            // When true, we suppress responseText to avoid a double "I added X" message
            // (the tool handler already emits its own confirmation/error via addBotMessage).
            let hadCartToolCall = false;

            if (toolCalls && toolCalls.length > 0) {
                for (const toolCall of toolCalls) {
                    if (toolCall.function.name === 'add_to_cart') {
                        hadCartToolCall = true;

                        let args: any;
                        try { args = JSON.parse(toolCall.function.arguments); } catch { continue; }
                        const prodName = (args.product_name || '').trim();
                        let qty = Number(args.quantity) || 0;

                        if (prodName.length < 3) {
                            addBotMessage({ text: `Désolé, le nom du produit est invalide ou trop court pour être identifié.` }, 400);
                            continue;
                        }

                        const prodNameLower = prodName.toLowerCase();
                        let product = relevantProducts.find((i) => i.name.toLowerCase() === prodNameLower)
                            || products.find((i) => i.name.toLowerCase() === prodNameLower)
                            || (prodNameLower.length >= 4
                                ? relevantProducts.find((i) => i.name.toLowerCase().includes(prodNameLower) || prodNameLower.includes(i.name.toLowerCase()))
                                : undefined);

                        if (!product) {
                            try {
                                const { data } = await supabase
                                    .from('products')
                                    .select('*, category:categories(slug, name)')
                                    .ilike('name', `%${prodName}%`)
                                    .eq('is_active', true)
                                    .limit(1)
                                    .maybeSingle();
                                if (data) product = data as Product;
                            } catch (error) {
                                console.error('[BudTender Chat] Supabase fallback failed:', error);
                            }
                        }

                        if (product) {
                            const capturedProduct = product;
                            const capturedQty = qty;
                            pendingActionRef.current = async () => {
                                addItem(capturedProduct, capturedQty);
                                addedDuringSessionRef.current.add(capturedProduct.id);
                                openSidebar();
                                addBotMessage({ text: `🛒 **${capturedQty}x ${capturedProduct.name}** a été ajouté à votre panier !` }, 200);
                            };
                            addBotMessage({
                                type: 'tool_confirm',
                                text: `Souhaitez-vous que j'ajoute **${qty}x ${product.name}** à votre panier ?`,
                                toolName: 'add_to_cart',
                            }, 400);
                        } else {
                            addBotMessage({ text: `Désolé, je n'ai pas trouvé le produit "${prodName}" dans notre catalogue.` }, 400);
                        }
                    } else if (toolCall.function.name === 'track_order') {
                        hadCartToolCall = true; // Use this variable to suppress the duplicate text response
                        let args: any;
                        try { args = JSON.parse(toolCall.function.arguments); } catch { continue; }
                        const orderId = (args.order_id || '').trim();

                        try {
                            const { data: userData } = await supabase.auth.getUser();
                            const user = userData?.user;

                            if (!user) {
                                addBotMessage({ text: "Vous devez être connecté(e) pour suivre vos commandes." }, 400);
                                continue;
                            }

                            const { data: allOrders, error } = await supabase
                                .from('orders')
                                .select('id, created_at, status, total')
                                .eq('user_id', user.id)
                                .order('created_at', { ascending: false })
                                .limit(20);

                            if (error) throw error;

                            let orders = allOrders || [];
                            if (orderId) {
                                orders = orders.filter(o => o.id.toLowerCase().startsWith(orderId.toLowerCase()));
                            } else {
                                orders = orders.slice(0, 3);
                            }

                            if (orders && orders.length > 0) {
                                let textResponse = "📦 Voici le statut de vos commandes :\n\n";
                                orders.forEach(o => {
                                    const statusColors: Record<string, string> = { paid: '🟢 Payée', processing: '🟡 En préparation', ready: '🟠 Prête', shipped: '🔵 Expédiée', delivered: '✅ Livrée' };
                                    const statusFr = statusColors[o.status] || o.status;
                                    textResponse += `- Commande du **${new Date(o.created_at).toLocaleDateString('fr-FR')}** (Total : ${o.total}€) : ${statusFr}\n`;
                                });
                                addBotMessage({ text: textResponse }, 400);
                            } else {
                                addBotMessage({ text: "Je n'ai trouvé aucune commande récente pour votre compte." }, 400);
                            }
                        } catch (e) {
                            console.error('[BudTender Chat] track_order error:', e);
                            addBotMessage({ text: "Une erreur est survenue lors de la vérification de vos commandes." }, 400);
                        }
                    } else if (toolCall.function.name === 'compare_products') {
                        hadCartToolCall = true;
                        let args: any;
                        try { args = JSON.parse(toolCall.function.arguments); } catch { continue; }
                        const names = args.product_names || [];

                        const foundProducts = names.map((n: string) => {
                            const nl = n.toLowerCase();
                            return products.find(p => p.name.toLowerCase().includes(nl) || nl.includes(p.name.toLowerCase()));
                        }).filter(Boolean) as Product[];

                        if (foundProducts.length >= 2) {
                            setMessages(prev => [...prev, {
                                id: Math.random().toString(36).substring(7),
                                sender: 'bot',
                                text: `📊 **Comparatif : ${foundProducts.map(p => p.name).join(' vs ')}**\nVoici une vue d'ensemble pour vous aider à choisir.`,
                                isResult: true,
                                products: foundProducts
                            }]);
                        } else {
                            addBotMessage({ text: "Désolé, je n'ai pas trouvé assez de produits correspondants pour effectuer un comparatif précis." }, 400);
                        }
                    } else if (toolCall.function.name === 'get_store_info') {
                        hadCartToolCall = true;
                        let args: any;
                        try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }
                        const topic = args.topic || 'contact';

                        const info: Record<string, string> = {
                            horaires: `🕒 **Nos Horaires :**\nLundi - Vendredi : 08:30 - 20:00\nSamedi : 10:00 - 19:00\nDimanche : Fermé`,
                            adresse: `📍 **Adresse :** 42 Tech Avenue, Silicon District, 75008 Paris, France.`,
                            contact: `📞 **Contact :** Par téléphone au 01.99.88.77.66 ou par email à support@techstore-pro.fr`,
                            retours: `📦 **Politique de Retour :** 30 jours pour changer d'avis sur le matériel non déballé. Les frais de retour sont offerts pour les membres Elite.`,
                            garantie: `🛡️ **Garanties :** Tous nos composants bénéficient d'une garantie constructeur et d'un support technique dédié 24/7.`
                        };

                        addBotMessage({ text: info[topic] || info.contact }, 400);
                    } else if (toolCall.function.name === 'view_product') {
                        hadCartToolCall = true;
                        let args: any;
                        try { args = JSON.parse(toolCall.function.arguments); } catch { continue; }
                        const prodName = (args.product_name || '').trim();

                        const prodNameLower = prodName.toLowerCase();
                        const product = relevantProducts.find((i) => i.name.toLowerCase() === prodNameLower)
                            || products.find((i) => i.name.toLowerCase() === prodNameLower)
                            || products.find((i) => i.name.toLowerCase().includes(prodNameLower) || prodNameLower.includes(i.name.toLowerCase()));

                        if (product) {
                            const capturedProduct = product;
                            pendingActionRef.current = async () => {
                                onViewProduct(capturedProduct);
                            };
                            addBotMessage({
                                type: 'tool_confirm',
                                text: `Voulez-vous ouvrir la fiche de **${product.name}** ?`,
                                toolName: 'view_product',
                            }, 400);
                        } else {
                            addBotMessage({ text: `Désolé, je n'ai pas trouvé le produit "${prodName}" pour l'afficher.` }, 400);
                        }
                    } else if (toolCall.function.name === 'save_preferences') {
                        hadCartToolCall = true;
                        let args: any;
                        try { args = JSON.parse(toolCall.function.arguments); } catch { continue; }
                        // Fallback: if 'new_prefs' is missing but args has keys, use args directly
                        const newPrefs = args.new_prefs ?? (Object.keys(args).length > 0 ? args : {});
                        
                        // Use the new updatePrefs function to securely merge via DB
                        await memory.updatePrefs(newPrefs);

                        // Extract first key-value for a nice message
                        const keys = Object.keys(newPrefs);
                        if (keys.length > 0) {
                            addBotMessage({ text: `✨ J'ai mis à jour votre profil : **${keys[0]}** est maintenant noté comme **${newPrefs[keys[0]]}**.` }, 400);
                        }
                    }
                }
            }

            // Show text response only when there were no cart tool calls.
            // If there were tool calls, addBotMessage already provided the result
            // (success or "not found") — showing responseText on top would either
            // duplicate the confirmation or contradict an error with a false success.
            if (responseText && !hadCartToolCall) {
                setMessages((prev) => {
                    if (replaceMessageId) {
                        return prev.map(m => {
                            if (m.id === replaceMessageId) {
                                const newVersions = [...(m.versions || [m.text]), responseText];
                                return {
                                    ...m,
                                    text: responseText,
                                    versions: newVersions,
                                    currentVersionIndex: newVersions.length - 1
                                };
                            }
                            return m;
                        });
                    }
                    return [...prev, {
                        id: Math.random().toString(36).substring(7),
                        sender: 'bot',
                        text: responseText,
                        versions: [responseText],
                        currentVersionIndex: 0
                    }];
                });

                // Log asynchronously to avoid adding latency to the user-facing response path
                supabase.auth.getUser().then(({ data: authData }) => {
                    const authUser = authData?.user;
                    if (!authUser) return;

                    return supabase.from('budtender_interactions').insert({
                        user_id: authUser.id,
                        interaction_type: 'chat_response',
                        user_message: text,
                        quiz_answers: {
                            assistant_response: responseText,
                            versions: replaceMessageId ? undefined : [responseText]
                        },
                        created_at: new Date().toISOString()
                    }).then(({ error }) => {
                        if (error) console.warn('[BudTender] Log error:', error);
                    });
                }).catch((error) => {
                    console.warn('[BudTender] Unable to resolve auth user for interaction log:', error);
                });
            } else if (!toolCalls) {
                console.error('OpenRouter empty response:', json);
                addBotMessage({ text: "Je n'ai pas pu analyser votre message correctement. Pouvez-vous reformuler ?" });
            }
        } catch (err) {
            console.error('OpenRouter handleSendMessage error:', err);
            addBotMessage({ text: "Oups, j'ai eu une petite déconnexion. Pouvez-vous réessayer ?" });
        } finally {
            setIsTyping(false);
        }
    }, [addBotMessage, addItem, memory, messages, openSidebar, onViewProduct, products, setIsTyping, setMessages, settings]);

    // ── Standard send (reads chatInput, adds user message) ───────────────
    const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = chatInput.trim();
        if (!text || isTyping) return;

        setChatInput('');
        addUserMessage(text);
        logQuestion(text);
        setIsTyping(true);

        await runAICall(text);
    }, [chatInput, isTyping, setChatInput, addUserMessage, logQuestion, setIsTyping, runAICall]);

    // ── Regenerate (explicit text, no user message added) ────────────────
    const handleRegenerateResponse = useCallback(async (text: string, replaceMessageId?: string) => {
        if (!text || isTyping) return;
        setIsTyping(true);
        await runAICall(text, replaceMessageId);
    }, [isTyping, setIsTyping, runAICall]);

    return { handleSendMessage, handleRegenerateResponse, confirmPendingAction, cancelPendingAction };
}
