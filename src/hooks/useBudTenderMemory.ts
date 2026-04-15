import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { fetchBudTenderSettings, QuizOption, BudTenderSettings, TECH_ADVISOR_DEFAULT_QUIZ } from '../lib/budtenderSettings';
import { CATEGORY_SLUGS } from '../lib/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrefValue {
    value: any;
    confidence?: number;
    updated_at: string;
}

export interface SavedPrefs {
    [key: string]: PrefValue | any;
    semantic_insights?: string[];
}

export interface ChatMessage {
    id: string;
    sender: 'bot' | 'user';
    text?: string;
    type?: string;
    isResult?: boolean;
    isOptions?: boolean;
    options?: QuizOption[];
    stepId?: string;
    recommended?: Product[];
}

export interface PastProduct {
    product_id: string;
    product_name: string;
    slug: string | null;
    image_url: string | null;
    price: number;
    orderedAt: string;
    categorySlug: string | null;
}

export interface RestockCandidate extends PastProduct {
    daysSince: number;
    threshold: number;
}

export interface PastOrderSummary {
    id: string;
    date: string;
    total: number;
    status: string;
    items: {
        product_name: string;
        quantity: number;
        unit_price: number;
    }[];
}

// Shape of each order_items row returned by the join query
interface OrderHistoryItem {
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity?: number;
    product: {
        slug: string;
        image_url: string | null;
        category: { slug: string } | null;
    } | null;
}

// Maps a category slug to the matching BudTenderSettings threshold key.
// Any slug not present falls back to 'restock_threshold_other'.
const CATEGORY_THRESHOLD_KEYS: Partial<Record<string, keyof BudTenderSettings>> = {
    [CATEGORY_SLUGS.FLEURS]: 'threshold_fleurs',
    [CATEGORY_SLUGS.RESINES]: 'threshold_resines',
    [CATEGORY_SLUGS.HUILES]: 'threshold_others',
};

// Fallback defaults if settings fail
const FALLBACK_THRESHOLDS: Record<string, number> = {
    [CATEGORY_SLUGS.FLEURS]: 14,
    [CATEGORY_SLUGS.RESINES]: 20,
    [CATEGORY_SLUGS.HUILES]: 30,
};
const FALLBACK_DEFAULT = 45;

const LS_KEY = 'budtender_prefs_v1';
const CHAT_SESSION_KEY = 'budtender_chat_history_v1';
const SESSION_ID_KEY = 'budtender_session_id';
// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBudTenderMemory() {
    const { user, profile } = useAuthStore();

    const [pastProducts, setPastProducts] = useState<PastProduct[]>([]);
    const [pastOrders, setPastOrders] = useState<PastOrderSummary[]>([]);
    const [restockCandidates, setRestockCandidates] = useState<RestockCandidate[]>([]);
    const [savedPrefs, setSavedPrefs] = useState<SavedPrefs | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [allChatSessions, setAllChatSessions] = useState<{ id: string, messages: ChatMessage[], title: string, created_at: string }[]>([]);
    const [extractedInsights, setExtractedInsights] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [activeDbId, setActiveDbId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const isLoggedIn = !!user;
    const userName = profile?.full_name
        ? profile.full_name.split(' ')[0]
        : null;

    // ── Load saved prefs and chat history ────────────────────────────────────
    // Prefs remain in localStorage; chat/session are session-scoped to reduce persistence of sensitive data.
    useEffect(() => {
        try {
            const rawPrefs = localStorage.getItem(LS_KEY);
            if (rawPrefs) {
                const parsed = JSON.parse(rawPrefs) as SavedPrefs;
                setSavedPrefs(parsed);
                if (parsed.semantic_insights) setExtractedInsights(parsed.semantic_insights);
            }

            const rawChat = sessionStorage.getItem(CHAT_SESSION_KEY);
            if (rawChat) setChatHistory(JSON.parse(rawChat));

            let sid = sessionStorage.getItem(SESSION_ID_KEY);
            if (!sid) {
                sid = `sess_${Math.random().toString(36).substring(2)}_${Date.now()}`;
                sessionStorage.setItem(SESSION_ID_KEY, sid);
            }
            setSessionId(sid);
        } catch {
            // ignore corrupt data
        }
    }, []);

    // ── Fetch order history for logged-in users ──────────────────────────────
    const { data: orderHistoryData } = useQuery({
        queryKey: ['order-history', user?.id],
        queryFn: async () => {
            if (!user?.id) return { past: [], pastOrds: [], restock: [] };
            
            const { data: orders } = await supabase
                .from('orders')
                .select('id, created_at, status, total, order_items(product_id, product_name, unit_price, quantity, product:products(slug, image_url, category:categories(slug)))')
                .eq('user_id', user.id)
                .in('status', ['paid', 'processing', 'ready', 'shipped', 'delivered'])
                .order('created_at', { ascending: false })
                .limit(10);

            if (!orders) return { past: [], pastOrds: [], restock: [] };

            const settings = await fetchBudTenderSettings();
            if (!settings.memory_enabled) {
                return { past: [], pastOrds: [], restock: [] };
            }

            const now = Date.now();
            const seen = new Set<string>();
            const past: PastProduct[] = [];
            const pastOrds: PastOrderSummary[] = [];
            const restock: RestockCandidate[] = [];

            for (const order of orders) {
                const items = (order.order_items as unknown as OrderHistoryItem[]) ?? [];
                const orderedAt = order.created_at as string;
                const daysSince = (now - new Date(orderedAt).getTime()) / (1000 * 60 * 60 * 24);

                pastOrds.push({
                    id: order.id,
                    date: orderedAt,
                    total: order.total as number,
                    status: order.status as string,
                    items: items.map(i => ({
                        product_name: i.product_name || i.product?.slug || 'Produit inconnu',
                        quantity: i.quantity || 1,
                        unit_price: i.unit_price
                    }))
                });

                for (const item of items) {
                    const catSlug = item.product?.category?.slug ?? null;
                    const candidate: PastProduct = {
                        product_id: item.product_id,
                        product_name: item.product_name,
                        slug: item.product?.slug ?? null,
                        image_url: item.product?.image_url ?? null,
                        price: item.unit_price,
                        orderedAt,
                        categorySlug: catSlug,
                    };

                    // Deduplicate — keep only most recent per product
                    if (!seen.has(item.product_id)) {
                        seen.add(item.product_id);
                        past.push(candidate);
                    }

                    // Restock check
                    const thresholdKey = (catSlug && CATEGORY_THRESHOLD_KEYS[catSlug]) ?? 'threshold_others';
                    const threshold = settings[thresholdKey as keyof BudTenderSettings] as number;

                    if (daysSince >= threshold && !restock.find(r => r.product_id === item.product_id)) {
                        restock.push({ ...candidate, daysSince: Math.round(daysSince), threshold });
                    }
                }
            }

            return {
                past: past.slice(0, 5),
                pastOrds: pastOrds.slice(0, 3),
                restock: restock.slice(0, 2)
            };
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 30, // Cache 30 minutes to reduce redundant calls
    });

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        if (orderHistoryData) {
            setPastProducts(orderHistoryData.past);
            setPastOrders(orderHistoryData.pastOrds);
            setRestockCandidates(orderHistoryData.restock);
            setIsLoading(false);
        }
    }, [orderHistoryData, user]);

    // ─── Save preferences ─────────────────────────────────────────────────────
    const savePrefs = async (prefs: SavedPrefs) => {
        try {
            // Local fallback
            localStorage.setItem(LS_KEY, JSON.stringify(prefs));
            setSavedPrefs(prefs);

            // Supabase sync
            if (user) {
                const payload = {
                    user_id: user.id,
                    preferences: {
                        ...prefs,
                        semantic_insights: extractedInsights
                    },
                    updated_at: new Date().toISOString()
                };

                if (import.meta.env.DEV) {
                    console.log('[BudTenderMemory] Dynamic Supabase Upsert Payload:', payload);
                }

                await supabase.from('user_ai_preferences').upsert(payload, { onConflict: 'user_id' });
            }
        } catch (err) {
            if (import.meta.env.DEV) console.error('[BudTenderMemory] Error saving prefs:', err);
        }
    };

    const updatePrefs = async (newPrefs: Partial<SavedPrefs>) => {
        try {
            const now = new Date().toISOString();
            const structuredNewPrefs: SavedPrefs = {};

            Object.entries(newPrefs).forEach(([key, val]) => {
                // If it's already a structured PrefValue object, use it
                if (val && typeof val === 'object' && 'updated_at' in val && 'value' in val) {
                    structuredNewPrefs[key] = val;
                } else if (val && typeof val === 'object' && 'value' in val) {
                    // AI sent value/confidence but no timestamp
                    structuredNewPrefs[key] = {
                        ...val,
                        updated_at: now
                    };
                } else {
                    // AI or UI sent raw value
                    structuredNewPrefs[key] = {
                        value: val,
                        confidence: 1.0,
                        updated_at: now
                    };
                }
            });

            let merged = { ...(savedPrefs || {}), ...structuredNewPrefs };

            if (user) {
                const { data } = await supabase
                    .from('user_ai_preferences')
                    .select('preferences')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data?.preferences) {
                    merged = { ...data.preferences, ...structuredNewPrefs };
                }
            }

            await savePrefs(merged);
        } catch (err) {
            if (import.meta.env.DEV) console.error('[BudTenderMemory] Error updating prefs:', err);
        }
    };

    const removePref = async (key: string) => {
        try {
            if (!savedPrefs) return;
            const updated = { ...savedPrefs };
            delete updated[key];
            await savePrefs(updated);
        } catch (err) {
            if (import.meta.env.DEV) console.error('[BudTenderMemory] Error removing pref:', err);
        }
    };

    const saveChatHistory = async (history: ChatMessage[]) => {
        try {
            // Session-scoped storage (cleared when browser session ends)
            sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(history));
            setChatHistory(history);

            if (user && history.length > 0) {
                const activeSid = sessionId || history[0].id || new Date().toISOString();
                const payload = {
                    user_id: user.id,
                    interaction_type: 'chat_session',
                    quiz_answers: {
                        session_id: sessionId,
                        messages: history
                    }
                };

                if (activeDbId) {
                    await supabase.from('budtender_interactions')
                        .update(payload)
                        .eq('id', activeDbId);
                } else {
                    const { data } = await supabase.from('budtender_interactions')
                        .insert({ ...payload, created_at: new Date().toISOString() })
                        .select('id')
                        .maybeSingle();
                    if (data) setActiveDbId(data.id);
                }
            } else if (history.length === 0) {
                setActiveDbId(null);
            }
        } catch (err) {
            if (import.meta.env.DEV) console.error('[BudTenderMemory] Error saving history:', err);
        }
    };

    const fetchAllSessions = async () => {
        if (!user) return;
        setIsHistoryLoading(true);
        try {
            const { data } = await supabase
                .from('budtender_interactions')
                .select('id, quiz_answers, created_at')
                .eq('user_id', user.id)
                .eq('interaction_type', 'chat_session')
                .order('created_at', { ascending: false });

            if (data) {
                const sessions = data.map(d => {
                    const messages = (d.quiz_answers?.messages as ChatMessage[]) || [];
                    const sid = d.quiz_answers?.session_id || d.created_at;

                    const nonSystemUserMessages = messages.filter(m =>
                        m.sender === 'user' &&
                        !m.text.includes("Utilise mes préférences") &&
                        !m.text.includes("conseiller moi") &&
                        !m.text.includes("Recommencer")
                    );

                    const firstRealMessage = nonSystemUserMessages[0]?.text ||
                        messages.find(m => m.sender === 'user')?.text ||
                        "Diagnostic personnalisé";

                    return {
                        id: sid as string,
                        dbId: d.id,
                        messages,
                        title: firstRealMessage,
                        created_at: d.created_at as string
                    };
                }).filter(s => s.messages.length > 1);

                setAllChatSessions(sessions);
            }
        } catch (err) {
            console.error('[BudTenderMemory] Error fetching sessions:', err);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const logQuestion = async (question: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('budtender_interactions').insert({
                user_id: user.id,
                interaction_type: 'question',
                quiz_answers: { question },
                created_at: new Date().toISOString()
            });
            if (error) console.error('[BudTenderMemory] Question log error:', error);
        } catch (err) {
            console.error('[BudTenderMemory] Question log exception:', err);
        }
    };

    const deleteSession = async (dbId: string) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('budtender_interactions').delete().eq('id', dbId);
            if (!error) {
                setAllChatSessions(prev => prev.filter(s => (s as any).dbId !== dbId));
            }
        } catch (err) {
            console.error('[BudTenderMemory] Error deleting session:', err);
        }
    };

    const deleteAllSessions = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('budtender_interactions')
                .delete()
                .eq('user_id', user.id)
                .eq('interaction_type', 'chat_session');

            if (!error) {
                setAllChatSessions([]);
            } else {
                console.error('[BudTenderMemory] Error deleting all sessions:', error);
            }
        } catch (err) {
            console.error('[BudTenderMemory] Exception deleting all sessions:', err);
        }
    };

    const clearChatHistory = () => {
        sessionStorage.removeItem(CHAT_SESSION_KEY);
        sessionStorage.removeItem(SESSION_ID_KEY);
        setChatHistory([]);
        setSessionId(null);
    };

    const clearPrefs = async () => {
        localStorage.removeItem(LS_KEY);
        sessionStorage.removeItem(CHAT_SESSION_KEY);
        sessionStorage.removeItem(SESSION_ID_KEY);
        setSavedPrefs(null);
        setChatHistory([]);
        setExtractedInsights([]);
        setSessionId(null);

        if (user) {
            try {
                const payload = {
                    user_id: user.id,
                    preferences: {},
                    updated_at: new Date().toISOString()
                };
                await supabase.from('user_ai_preferences').upsert(payload, { onConflict: 'user_id' });
            } catch (err) {
                console.error('[BudTenderMemory] Error clearing DB prefs:', err);
            }
        }
    };

    // ── Load from Supabase on Login ───────────────────────────────────────────
    const { data: dbSyncData } = useQuery({
        queryKey: ['budtender-sync', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            
            // 1. Fetch AI Preferences
            const { data: prefsData } = await supabase
                .from('user_ai_preferences')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            // 2. Fetch Latest Chat Session
            const { data: interactionData } = await supabase
                .from('budtender_interactions')
                .select('quiz_answers')
                .eq('user_id', user.id)
                .eq('interaction_type', 'chat_session')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            return {
                prefs: prefsData?.preferences || null,
                chat: interactionData?.quiz_answers?.messages as ChatMessage[] || null
            };
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 60, // Cache for 1 hour to heavily reduce repeated RPC overhead
    });

    useEffect(() => {
        if (!dbSyncData) return;
        
        if (dbSyncData.prefs) {
            setSavedPrefs(dbSyncData.prefs);
            localStorage.setItem(LS_KEY, JSON.stringify(dbSyncData.prefs));
            if (dbSyncData.prefs.semantic_insights) {
                setExtractedInsights(dbSyncData.prefs.semantic_insights);
            }
        }
        
        const chat = dbSyncData.chat;
        if (chat && chat.length > 0) {
            setChatHistory(chat);
            sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(chat));
        }
    }, [dbSyncData]);

    return {
        isLoggedIn,
        userName,
        pastProducts,
        pastOrders,
        restockCandidates,
        savedPrefs,
        chatHistory,
        allChatSessions,
        isHistoryLoading,
        isLoading,
        savePrefs,
        updatePrefs,
        removePref,
        saveChatHistory,
        fetchAllSessions,
        deleteSession,
        deleteAllSessions,
        logQuestion,
        clearChatHistory,
        clearPrefs,
        setActiveDbId,
        extractedInsights,
        setExtractedInsights,
        sessionId,
        loyaltyPoints: profile?.loyalty_points ?? 0,
    };
}
