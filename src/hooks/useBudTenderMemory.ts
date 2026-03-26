import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../lib/types';
import { useAuthStore } from '../store/authStore';
import { fetchBudTenderSettings, QuizOption, BudTenderSettings, TECH_ADVISOR_DEFAULT_QUIZ } from '../lib/budtenderSettings';
import { CATEGORY_SLUGS } from '../lib/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SavedPrefs {
    [key: string]: any;
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
    [CATEGORY_SLUGS.ARCADE]: 'threshold_arcade',
    [CATEGORY_SLUGS.FLIPPERS]: 'threshold_flippers',
    [CATEGORY_SLUGS.SIMULATORS]: 'threshold_others',
};

// Fallback defaults if settings fail
const FALLBACK_THRESHOLDS: Record<string, number> = {
    [CATEGORY_SLUGS.ARCADE]: 60,
    [CATEGORY_SLUGS.FLIPPERS]: 30,
    [CATEGORY_SLUGS.SIMULATORS]: 45,
};
const FALLBACK_DEFAULT = 45;

const LS_KEY = 'budtender_prefs_v1';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBudTenderMemory() {
    const { user, profile } = useAuthStore();

    const [pastProducts, setPastProducts] = useState<PastProduct[]>([]);
    const [pastOrders, setPastOrders] = useState<PastOrderSummary[]>([]);
    const [restockCandidates, setRestockCandidates] = useState<RestockCandidate[]>([]);
    const [savedPrefs, setSavedPrefs] = useState<SavedPrefs | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [allChatSessions, setAllChatSessions] = useState<{ id: string, messages: ChatMessage[], title: string, created_at: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [activeDbId, setActiveDbId] = useState<string | null>(null);

    const isLoggedIn = !!user;
    const userName = profile?.full_name
        ? profile.full_name.split(' ')[0]
        : null;

    // ── Load saved prefs and chat history ────────────────────────────────────
    // Prefs (non-sensitive): localStorage for cross-session persistence.
    // Chat history (health-adjacent PII): sessionStorage so it never persists
    // beyond the current browser tab (clears on tab close / session end).
    useEffect(() => {
        try {
            const rawPrefs = localStorage.getItem(LS_KEY);
            if (rawPrefs) setSavedPrefs(JSON.parse(rawPrefs) as SavedPrefs);

            const rawChat = sessionStorage.getItem('playadvisor_chat_history_v1');
            if (rawChat) setChatHistory(JSON.parse(rawChat));
        } catch {
            // ignore corrupt data
        }
    }, []);

    // ── Fetch order history for logged-in users ──────────────────────────────
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, created_at, status, total, order_items(product_id, product_name, unit_price, quantity, product:products(slug, image_url, category:categories(slug)))')
                    .eq('user_id', user.id)
                    .in('status', ['paid', 'processing', 'ready', 'shipped', 'delivered'])
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!orders) return;

                const settings = await fetchBudTenderSettings();
                if (!settings.memory_enabled) {
                    setIsLoading(false);
                    return;
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

                        // Restock check — map category slug to its threshold setting key
                        const thresholdKey = (catSlug && CATEGORY_THRESHOLD_KEYS[catSlug]) ?? 'threshold_others';
                        const threshold = settings[thresholdKey] as number;

                        if (daysSince >= threshold && !restock.find(r => r.product_id === item.product_id)) {
                            restock.push({ ...candidate, daysSince: Math.round(daysSince), threshold });
                        }
                    }
                }

                setPastProducts(past.slice(0, 5));
                setPastOrders(pastOrds.slice(0, 3));
                setRestockCandidates(restock.slice(0, 2)); // max 2 restock suggestions
            } catch (err) {
                if (import.meta.env.DEV) console.error('[BudTenderMemory]', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

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
                    preferences: prefs,
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
            let merged = { ...(savedPrefs || {}), ...newPrefs };

            if (user) {
                // Fetch latest from DB to prevent race conditions & overriding
                const { data } = await supabase
                    .from('user_ai_preferences')
                    .select('preferences')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data?.preferences) {
                    merged = { ...data.preferences, ...newPrefs };
                }
            }

            await savePrefs(merged);
        } catch (err) {
            if (import.meta.env.DEV) console.error('[BudTenderMemory] Error updating prefs:', err);
        }
    };

    const saveChatHistory = async (history: ChatMessage[]) => {
        try {
            // Session-only storage — clears on tab close (health-adjacent data)
            sessionStorage.setItem('playadvisor_chat_history_v1', JSON.stringify(history));
            setChatHistory(history);

            if (user && history.length > 0) {
                const sessionId = history[0].id || new Date().toISOString();
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
        sessionStorage.removeItem('playadvisor_chat_history_v1');
        setChatHistory([]);
    };

    const clearPrefs = async () => {
        localStorage.removeItem(LS_KEY);
        sessionStorage.removeItem('playadvisor_chat_history_v1');
        setSavedPrefs(null);
        setChatHistory([]);

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
    useEffect(() => {
        if (!user) return;

        const syncWithSupabase = async () => {
            try {
                // 1. Fetch AI Preferences
                const { data: prefsData } = await supabase
                    .from('user_ai_preferences')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (prefsData) {
                    const syncedPrefs: SavedPrefs = prefsData.preferences || {};
                    if (import.meta.env.DEV) {
                        console.log('[BudTenderMemory] Found preferences in DB:', syncedPrefs);
                        console.log('[BudTenderMemory] Available keys:', Object.keys(syncedPrefs));
                    }
                    setSavedPrefs(syncedPrefs);
                    localStorage.setItem(LS_KEY, JSON.stringify(syncedPrefs));
                } else if (import.meta.env.DEV) {
                    console.log('[BudTenderMemory] No record found in user_ai_preferences for user:', user.id);
                }

                // 2. Fetch Latest Chat Session
                const { data: interactionData } = await supabase
                    .from('budtender_interactions')
                    .select('quiz_answers')
                    .eq('user_id', user.id)
                    .eq('interaction_type', 'chat_session')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (interactionData && interactionData.quiz_answers?.messages) {
                    const history = interactionData.quiz_answers.messages as ChatMessage[];
                    setChatHistory(history);
                    sessionStorage.setItem('playadvisor_chat_history_v1', JSON.stringify(history));
                }
            } catch {
                // Likely no data yet or single() error, normal
            }
        };

        syncWithSupabase();
    }, [user]);

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
        saveChatHistory,
        fetchAllSessions,
        deleteSession,
        deleteAllSessions,
        logQuestion,
        clearChatHistory,
        clearPrefs,
        setActiveDbId,
        loyaltyPoints: profile?.loyalty_points ?? 0,
    };
}
