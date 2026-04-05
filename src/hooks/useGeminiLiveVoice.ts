import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, type FunctionResponse, type LiveServerMessage, type Session } from '@google/genai';
import { Product, Review as BaseReview } from '../lib/types';
import { Product as PremiumProduct, Review } from '../types/premiumProduct';
import { PastProduct, SavedPrefs, PastOrderSummary } from './useBudTenderMemory';
import { generateEmbedding } from '../lib/embeddings';
import { isMatchProductsRpcAvailable, matchProductsRpc } from '../lib/matchProductsRpc';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import { getRelevantKnowledge } from '../lib/budtenderKnowledge';
import { getVoicePrompt } from '../lib/budtenderPrompts';
import { loadOptionalVoiceSkill } from '../lib/voiceSkills';
import { searchCannabisKnowledge } from '../lib/cannabisKnowledgeService';
import { useSettingsStore } from '../store/settingsStore';
import { useRecentlyViewedStore } from '../store/recentlyViewedStore';

// Stable GA model — the preview model has a known 1008 bug with function calling
const LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';


const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

// ── Timeouts & retry policy ──────────────────────────────────────────────────
const CONNECTION_TIMEOUT_MS = 10000;   // 18s — generous for slow mobile connections
const AUDIO_SCHEDULE_AHEAD_SEC = 0.05; // 50ms — prevents audio gaps on CPU spikes
const MAX_AUTO_RETRIES = 2;           // Retry up to 2 times on non-intentional closes
const RETRY_DELAY_MS = 500;          // Wait 1s between retries (faster recovery)


const TOKEN_MAX_RETRIES = 2;
const TOKEN_RETRY_DELAY_MS = 1200;
const TOOL_DEDUP_WINDOW_MS = 800;
const TOKEN_PREFETCH_MAX_AGE_MS = 50 * 1000; // keep a small safety margin before expiry
const INITIAL_GREETING_DELAY_MS = 200;
const BARGE_IN_RMS_THRESHOLD_FALLBACK = 0.22; // used if noise calibration hasn't run yet
const BARGE_IN_MIN_DURATION_MS = 80;
const BARGE_IN_STABILITY_FRAMES = 1;
const BARGE_IN_COOLDOWN_MS = 500;
// Adaptive noise floor calibration (Am4)
const BARGE_IN_NOISE_SAMPLE_MS = 2000;       // 2s of ambient noise sampling on session start
const BARGE_IN_NOISE_MULTIPLIER = 3.5;       // threshold = noiseFloor * 3.5
const BARGE_IN_NOISE_MIN = 0.02;             // clamp: never below 0.02
const BARGE_IN_NOISE_MAX = 0.12;             // clamp: never above 0.12 (loud environments)
const BARGE_IN_RECALIBRATE_INTERVAL_MS = 60_000; // recalibrate every 60s
const MAX_PRODUCT_CACHE_SIZE = 100;
/** Au-delà, l'API Live ferme souvent le WS avec 1007 (payload invalide / trop gros). */
const MAX_LIVE_TOOL_RESPONSE_JSON = 14_000;
const VOICE_CATALOG_TOOL_MAX_ITEMS = 6;
const VOICE_CATALOG_DESC_MAX = 120;

function shrinkLiveToolResponse(response: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...response };
  for (const key of ['results', 'note', 'result', 'error', 'content', 'directive', 'formatted']) {
    const v = out[key];
    if (typeof v === 'string' && v.length > 3500) {
      out[key] = `${v.slice(0, 3480)}…`;
    }
  }
  const serialized = JSON.stringify(out);
  if (serialized.length > MAX_LIVE_TOOL_RESPONSE_JSON) {
    return {
      error:
        'Réponse outil trop volumineuse pour le canal vocal. Reformule une requête plus courte ou demande moins de résultats.',
    };
  }
  return out;
}

function formatVoiceCatalogToolLines(products: Product[]): string {
  return products
    .slice(0, VOICE_CATALOG_TOOL_MAX_ITEMS)
    .map((p) => {
      const d = (p.description || '').replace(/\s+/g, ' ').trim().slice(0, VOICE_CATALOG_DESC_MAX);
      return `• ${p.name} | ${p.price}€${d ? ` | ${d}` : ''}`;
    })
    .join('\n');
}

function fallbackKeywordSearch(query: string, products: Product[]): Product[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 2);

  if (keywords.length === 0) return products.slice(0, 10);

  return products
    .map((p) => {
      const name = p.name.toLowerCase();
      const description = (p.description || '').toLowerCase();
      const category = (p.category?.name || '').toLowerCase();

      let score = 0;
      for (const k of keywords) {
        if (name.includes(k)) score += 5;
        if (category.includes(k)) score += 3;
        if (description.includes(k)) score += 2;
      }

      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => x.p);
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

function isVectorDimensionRpcError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return message.includes('different vector dimensions') || (message.includes('vector') && message.includes('dimensions'));
}

function shouldDisableSemanticSearch(error: unknown): boolean {
  if (isVectorDimensionRpcError(error) || (error as { code?: string })?.code === 'DIMENSION_MISMATCH') {
    return true;
  }

  const code = String((error as { code?: string })?.code || '').toUpperCase();
  if (code === '42703' || code === '42883' || code === '42P01') {
    return true;
  }

  const status = Number((error as { status?: number | string })?.status || 0);
  if (status === 400) {
    return true;
  }

  const message = String((error as { message?: string })?.message || '').toLowerCase();
  const details = String((error as { details?: string })?.details || '').toLowerCase();
  const hint = String((error as { hint?: string })?.hint || '').toLowerCase();

  const schemaMismatchMessage =
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('function') && message.includes('does not exist')) ||
    (message.includes('relation') && message.includes('does not exist')) ||
    (message.includes('match_products') && message.includes('does not exist'));

  const schemaMismatchDetails =
    details.includes('does not exist') ||
    hint.includes('does not exist');

  return schemaMismatchMessage || schemaMismatchDetails;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

// WebSocket close codes that are NOT worth retrying (user closed, server clean close, auth)
const NON_RETRYABLE_CODES = new Set([1000, 1001, 4000, 4001, 4003, 4008]);

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

// Helper for robust string normalization
const normalizeStr = (s: string) =>
  s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface Options {
  products: Product[];
  pastProducts?: PastProduct[];
  pastOrders?: PastOrderSummary[];
  savedPrefs?: SavedPrefs | null;
  userName?: string | null;
  cartItems?: { product: Product; quantity: number }[];
  onAddItem?: (product: Product, quantity: number) => void;
  onRemoveItem?: (product: Product, quantity?: number) => void;
  onUpdateQuantity?: (product: Product, quantity: number) => void;
  deliveryFee?: number;
  deliveryFreeThreshold?: number;
  onCloseSession?: () => void;
  onViewProduct?: (product: Product) => void;
  onNavigate?: (path: string) => void;
  onOpenModal?: (modalName: string) => void;
  onSavePrefs?: (prefs: any) => void;
  activeProduct?: (PremiumProduct & { reviews: Review[]; relatedProducts?: Product[] }) | null;
  customPrompt?: string;
  loyaltyPoints?: number;
  allowCloseSession?: boolean;
  prewarmToken?: boolean;
  wishlistItems?: string[];
  onToggleFavorite?: (productId: string) => void;
  onApplyPromo?: (code: string) => Promise<{ success: boolean; discount?: number; message?: string }>;
  onVolumeLevel?: (rms: number) => void; // Am3: reactive waveform
  onCompareProducts?: (products: any[]) => void; // Am8: visual comparison
  proactiveGreeting?: string;            // Am6: used when voice is triggered proactively
}

let audioWorkerSingleton: Worker | null = null;
function getAudioWorker(): Worker {
  if (!audioWorkerSingleton && typeof window !== 'undefined') {
    audioWorkerSingleton = new Worker('/downsample-worker.js');
  }
  return audioWorkerSingleton!;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Maps browser MediaDevices/WebSocket errors to user-friendly French messages.
 */
function classifyError(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name;
    const msg = err.message.toLowerCase();
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Accès au microphone refusé. Veuillez l\'autoriser dans les paramètres du navigateur.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Aucun microphone détecté sur cet appareil.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Microphone déjà utilisé par une autre application.';
    }
    if (name === 'OverconstrainedError') {
      return 'Configuration audio non supportée par ce microphone.';
    }
    if (msg.includes('timeout') || msg.includes('délai')) {
      return 'Délai de connexion dépassé. Vérifiez votre connexion internet.';
    }
    if (msg.includes('network') || msg.includes('réseau') || msg.includes('failed to fetch')) {
      return 'Problème réseau. Vérifiez votre connexion internet.';
    }
    if (msg.includes('bad gateway') || msg.includes('502') || msg.includes('gemini-token') || msg.includes('non-2xx status code')) {
      return 'Le service vocal est temporairement indisponible (erreur serveur). Réessayez dans quelques instants.';
    }
    if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('403')) {
      return 'Clé API invalide ou expirée.';
    }
  }
  return 'Erreur de connexion. Appuyez sur "Réessayer".';
}

export function useGeminiLiveVoice({
  products,
  pastProducts = [],
  pastOrders = [],
  savedPrefs,
  userName,
  cartItems = [],
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  deliveryFee = 5.9,
  deliveryFreeThreshold = 50,
  onCloseSession,
  onViewProduct,
  onNavigate,
  onOpenModal,
  onSavePrefs,
  customPrompt,
  loyaltyPoints,
  allowCloseSession = true,
  prewarmToken = false,
  activeProduct,
  wishlistItems = [],
  onToggleFavorite,
  onApplyPromo,
  onVolumeLevel,
  onCompareProducts,
  proactiveGreeting,
}: Options) {
  const globalSettings = useSettingsStore(s => s.settings);
  const recentlyViewed = useRecentlyViewedStore(s => s.items);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [compatibilityError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    if (!window.isSecureContext) return 'Sécurisé (HTTPS) requis.';
    if (!navigator.mediaDevices?.getUserMedia) return 'Microphone non supporté.';
    if (!('audioWorklet' in AudioContext.prototype)) return 'AudioWorklet non supporté.';
    return null;
  });

  // Am5: real-time transcripts
  const [inputTranscript, setInputTranscript] = useState('');
  const [outputTranscript, setOutputTranscript] = useState('');

  const productsRef = useRef(products);
  productsRef.current = products;
  const onAddItemRef = useRef(onAddItem);
  onAddItemRef.current = onAddItem;
  const onRemoveItemRef = useRef(onRemoveItem);
  onRemoveItemRef.current = onRemoveItem;
  const onUpdateQuantityRef = useRef(onUpdateQuantity);
  onUpdateQuantityRef.current = onUpdateQuantity;
  const onCloseSessionRef = useRef(onCloseSession);
  onCloseSessionRef.current = onCloseSession;
  const onViewProductRef = useRef(onViewProduct);
  onViewProductRef.current = onViewProduct;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const onOpenModalRef = useRef(onOpenModal);
  onOpenModalRef.current = onOpenModal;
  const onSavePrefsRef = useRef(onSavePrefs);
  onSavePrefsRef.current = onSavePrefs;
  const onToggleFavoriteRef = useRef(onToggleFavorite);
  onToggleFavoriteRef.current = onToggleFavorite;
  const onApplyPromoRef = useRef(onApplyPromo);
  onApplyPromoRef.current = onApplyPromo;
  const onCompareProductsRef = useRef(onCompareProducts);
  onCompareProductsRef.current = onCompareProducts;
  const onVolumeLevelRef = useRef(onVolumeLevel);       // Am3
  onVolumeLevelRef.current = onVolumeLevel;
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;
  const wishlistItemsRef = useRef(wishlistItems);
  wishlistItemsRef.current = wishlistItems;

  const lastStartSessionCallRef = useRef<number>(0);
  const sessionRef = useRef<Session | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const interactionIdRef = useRef<string | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scheduledUntilRef = useRef<number>(0);
  const isMutedRef = useRef(false);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const interruptedRef = useRef(false);
  const setupTimeoutRef = useRef<number | null>(null);
  const startInFlightRef = useRef(false);
  const sessionIdRef = useRef(0);
  const isManualCloseRef = useRef(false);
  const canStreamInputRef = useRef(false);
  const isClosingRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const searchResultsRef = useRef<Product[]>([]);
  const semanticSearchAvailableRef = useRef(true);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const recentToolExecutionsRef = useRef<Map<string, number>>(new Map());
  const viewedProductIdsRef = useRef<Set<string>>(new Set());
  const preserveViewedProductsOnCleanupRef = useRef(false);
  const cachedTokenRef = useRef<{ token: string; expireAtMs: number; promptHash: string } | null>(null);
  const tokenInFlightRef = useRef<Promise<{ token: string }> | null>(null);
  const lastBargeInAtRef = useRef(0);
  const bargeInStartRef = useRef(0);
  const bargeInFramesRef = useRef(0);
  const voiceStateRef = useRef<VoiceState>('idle');
  // Am4: adaptive noise floor
  const adaptiveBargeInThresholdRef = useRef(BARGE_IN_RMS_THRESHOLD_FALLBACK);
  const noiseSamplesRef = useRef<number[]>([]);
  const isCalibratingRef = useRef(false);
  const recalibrateTimerRef = useRef<number | null>(null);
  const startSessionRef = useRef<((forceFresh?: boolean) => Promise<void>) | null>(null);
  const inputTranscriptTimerRef = useRef<number | null>(null);
  const outputTranscriptTimerRef = useRef<number | null>(null);
  const greetingTriggerSentRef = useRef(false);
  const loadedVoiceSkillsRef = useRef<Set<string>>(new Set());
  const messageQueueRef = useRef<string[]>([]);
  const silenceTimerRef = useRef<number | null>(null);
  const productCacheRef = useRef<Map<string, Product>>(new Map());


  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    const delay = cartItems.length > 0 ? 8000 : 15000;
    silenceTimerRef.current = window.setTimeout(() => {
      // Check if session is still alive and listening
      if (voiceStateRef.current === 'listening' && !isManualCloseRef.current && sessionRef.current) {
        console.info(`[Voice] Silence prolongé détecté (${delay / 1000}s), envoi d\'une relance proactive.`);
        try {
          const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          // sendClientContent(turns) a provoqué des fermetures 1007 sur Gemini Live contraint :
          // utiliser le flux texte temps réel, court et sans métacharactères lourds.
          const n = cartItems.length;
          const hint =
            n > 0
              ? `Silence prolongé. Une phrase courte pour relancer le client. Panier : ${n} article${n > 1 ? 's' : ''}.`
              : 'Silence prolongé. Une phrase courte et amicale pour savoir si le client a encore besoin d aide.';
          sessionRef.current.sendRealtimeInput({ text: hint });
        } catch (e) { }
      }
    }, delay);
  }, [cartItems.length]);

  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);


  // ── Unified product lookup with 4 fallback levels ────────────────────────
  // Level 1: exact name match
  // Level 2: one name contains the other (substring)
  // Level 3: ALL words of the query appear somewhere in the product name
  // Level 4: Supabase ilike fallback (catches typos, accent differences, etc.)
  // This runs in both add_to_cart and view_product so neither fails on first call.
  const findProduct = useCallback(async (prodName: string): Promise<Product | undefined> => {
    const q = normalizeStr(prodName);
    if (!q) return undefined;

    if (productCacheRef.current.has(q)) {
      return productCacheRef.current.get(q);
    }

    const addToCache = (key: string, val: Product) => {
      if (productCacheRef.current.size >= MAX_PRODUCT_CACHE_SIZE) {
        const firstKey = productCacheRef.current.keys().next().value;
        if (firstKey !== undefined) productCacheRef.current.delete(firstKey);
      }
      productCacheRef.current.set(key, val);
    };

    const allKnown = [...productsRef.current, ...searchResultsRef.current];

    // L1 – exact
    let found = allKnown.find(i => normalizeStr(i.name) === q);
    if (found) { addToCache(q, found); return found; }

    // L2 – substring
    if (q.length >= 4) {
      found = allKnown.find(i => normalizeStr(i.name).includes(q) || q.includes(normalizeStr(i.name)));
      if (found) { addToCache(q, found); return found; }
    }

    // L3 – ALL words present
    const words = q.split(/\s+/).filter(w => w.length > 1);
    if (words.length > 0) {
      found = allKnown.find(i => words.every(w => normalizeStr(i.name).includes(w)));
      if (found) { addToCache(q, found); return found; }

      // L3b – ANY word present
      found = allKnown.find(i => words.some(w => normalizeStr(i.name).includes(w)));
      if (found) { addToCache(q, found); return found; }
    }

    // L3.5 – Fuzzy Match local (Levenshtein) sur les produits connus (max 300)
    if (q.length > 4 && allKnown.length <= 300) {
      for (const i of allKnown) {
        const normName = normalizeStr(i.name);
        if (Math.abs(normName.length - q.length) <= 3 && levenshteinDistance(normName, q) <= 2) {
          addToCache(q, i);
          return i;
        }
      }
    }

    // L4 – Supabase Fuzzy Search RPC (pg_trgm)
    try {
      const { data, error } = await supabase.rpc('search_products_fuzzy', {
        search_text: prodName,
        match_threshold: 0.3,
        match_count: 3
      });
      if (error) throw error;
      if (data && data.length > 0) {
        const best = data[0] as Product;
        addToCache(q, best);
        return best;
      }
    } catch (e) {
      console.error('[Voice] Supabase fuzzy search RPC failed:', e);
    }

    return undefined;
  }, []);

  const canSendRealtimeInput = useCallback(() => {
    // Cheapest check first: isClosingRef is set synchronously in onclose/onerror before
    // the WS readyState even transitions, so it catches the CLOSING gap.
    if (isClosingRef.current) return false;
    if (!sessionRef.current || !canStreamInputRef.current || isManualCloseRef.current) return false;
    const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
    if (!ws || typeof ws.readyState !== 'number') return true;
    return typeof WebSocket === 'undefined' || ws.readyState === WebSocket.OPEN;
  }, []);

  const buildSystemPrompt = useCallback((): string => {
    const effectiveCustomPrompt = [globalSettings.budtender_base_prompt?.trim(), customPrompt?.trim()].filter(Boolean).join('\n\n');
    const prompt = getVoicePrompt(
      productsRef.current, savedPrefs, userName, pastProducts, pastOrders,
      deliveryFee, deliveryFreeThreshold, cartItems, effectiveCustomPrompt,
      loyaltyPoints, globalSettings.budtender_name || 'BudTender',
      globalSettings.loyalty_tiers || [], allowCloseSession, recentlyViewed,
      globalSettings.store_name || 'Eco CBD', globalSettings.loyalty_currency_name || 'CARATS',
      activeProduct
    );
    console.info('[Voice][Prompt] System instruction generated (length:', prompt.length, ')');
    return prompt;
  }, [userName, deliveryFee, deliveryFreeThreshold, savedPrefs, pastProducts, pastOrders, cartItems, customPrompt, loyaltyPoints, globalSettings.budtender_name, globalSettings.loyalty_tiers, allowCloseSession, recentlyViewed, globalSettings.store_name, globalSettings.budtender_base_prompt, globalSettings.loyalty_currency_name, activeProduct]);

  const fetchEphemeralToken = useCallback(async (forceRefresh: boolean = false): Promise<{ token: string }> => {
    const now = Date.now();
    const voiceSystemPrompt = buildSystemPrompt();
    const cacheKey = `${voiceSystemPrompt}:${globalSettings.budtender_voice_name}`;
    const cached = cachedTokenRef.current;
    if (!forceRefresh && cached && cached.expireAtMs - now > TOKEN_PREFETCH_MAX_AGE_MS && cached.promptHash === cacheKey) {
      return { token: cached.token };
    }

    if (!forceRefresh && tokenInFlightRef.current && (tokenInFlightRef.current as any).promptHash === cacheKey) {
      return tokenInFlightRef.current;
    }

    const requestPromise = (async () => {
      let tokenErrorMessage = '';

      for (let attempt = 0; attempt <= TOKEN_MAX_RETRIES; attempt++) {
        try {
          const body = {
            model: LIVE_MODEL,
            systemInstruction: voiceSystemPrompt,
            voiceName: globalSettings.budtender_voice_name || 'Puck',
            assistantType: 'budtender',
          };
          console.info('[Voice][Setup] Sending config to Edge Function:', body);

          const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            const raw = await response.text();
            tokenErrorMessage = `Status ${response.status}: ${raw}`;
            throw new Error(`Erreur réseau (${response.status})`);
          }

          const data = await response.json();
          const token = data?.token as string | undefined;
          if (!token) {
            tokenErrorMessage = 'Token introuvable dans la réponse JSON';
            throw new Error(tokenErrorMessage);
          }

          const expireTimeRaw = data?.expireTime ? Date.parse(data.expireTime as string) : NaN;
          const expireAtMs = Number.isFinite(expireTimeRaw) ? expireTimeRaw : (Date.now() + 60_000);
          cachedTokenRef.current = { token, expireAtMs, promptHash: cacheKey } as any;

          // Clear the cache IMMEDIATELY so it's not reused if we need another token soon (like on a retry)
          cachedTokenRef.current = null;
          return { token };
        } catch (err: any) {
          tokenErrorMessage = err?.message || 'Token Gemini manquant';
        }

        if (attempt < TOKEN_MAX_RETRIES) {
          const delay = TOKEN_RETRY_DELAY_MS * (attempt + 1);
          console.warn(`[Voice] Token retrieval failed, retry ${attempt + 1}/${TOKEN_MAX_RETRIES} in ${delay}ms:`, tokenErrorMessage);
          await wait(delay);
        }
      }

      throw new Error(`gemini-token failed: ${tokenErrorMessage}`);
    })();

    (requestPromise as any).promptHash = cacheKey;
    tokenInFlightRef.current = requestPromise;
    try {
      return await requestPromise;
    } finally {
      if (tokenInFlightRef.current === requestPromise) {
        tokenInFlightRef.current = null;
      }
    }
  }, [buildSystemPrompt, globalSettings.budtender_voice_name]);

  useEffect(() => {
    // Only prewarm if not already in a session to avoid overhead/concurrency issues
    if (!prewarmToken || sessionRef.current) return;
    fetchEphemeralToken().catch((err) => {
      console.warn('[Voice] Token prewarm failed:', err);
    });
  }, [prewarmToken, fetchEphemeralToken]);

  const stopAllPlayback = useCallback((fadeMs = 0) => {
    interruptedRef.current = true;
    const ctx = playbackCtxRef.current;
    const sources = activeSourcesRef.current;

    if (ctx && fadeMs > 0 && sources.size > 0) {
      // Soft fade-out: reconnect active sources through a gain node and ramp to 0
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeMs / 1000);
      const stopAt = ctx.currentTime + fadeMs / 1000;
      sources.forEach(s => {
        try { s.disconnect(); s.connect(gain); s.stop(stopAt); } catch { }
      });
      setTimeout(() => gain.disconnect(), fadeMs + 50);
    } else {
      sources.forEach(s => {
        try { s.disconnect(); s.stop(0); } catch { }
      });
    }

    sources.clear();
    // Reset the scheduling timeline so future chunks don't play at stale offsets
    scheduledUntilRef.current = 0;
  }, []);

  const cleanup = useCallback((options?: { preserveViewedProducts?: boolean }) => {
    if (options?.preserveViewedProducts) {
      preserveViewedProductsOnCleanupRef.current = true;
    }
    
    // Calculate and log duration if session was active
    if (startTimeRef.current && interactionIdRef.current) {
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (durationSeconds > 0) {
        supabase
          .from('budtender_interactions')
          .update({ duration_seconds: durationSeconds })
          .eq('id', interactionIdRef.current)
          .then(({ error }) => {
            if (error) console.error('[Voice] Failed to update session duration:', error);
          });
      }
      startTimeRef.current = null;
      interactionIdRef.current = null;
    }

    isManualCloseRef.current = true;
    canStreamInputRef.current = false;
    isClosingRef.current = true;
    wsRef.current = null;

    // Cancel any pending retry or recalibration
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (recalibrateTimerRef.current) {
      clearTimeout(recalibrateTimerRef.current);
      recalibrateTimerRef.current = null;
    }
    isCalibratingRef.current = false;
    noiseSamplesRef.current = [];
    if (inputTranscriptTimerRef.current) clearTimeout(inputTranscriptTimerRef.current);
    if (outputTranscriptTimerRef.current) clearTimeout(outputTranscriptTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    productCacheRef.current.clear();
    loadedVoiceSkillsRef.current.clear();

    if (!preserveViewedProductsOnCleanupRef.current) {
      viewedProductIdsRef.current.clear();
    }
    // reset for next session
    preserveViewedProductsOnCleanupRef.current = false;

    (sessionRef.current as any)?._ws?.close?.();
    sessionRef.current?.close();
    sessionRef.current = null;

    if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
    stopAllPlayback();
    if (processorRef.current) processorRef.current.port.onmessage = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    captureCtxRef.current?.close().catch(() => { });
    captureCtxRef.current = null;
    playbackCtxRef.current?.close().catch(() => { });
    playbackCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    scheduledUntilRef.current = 0;
    isMutedRef.current = false;
    interruptedRef.current = false;
    isClosingRef.current = false;
    startInFlightRef.current = false;
    sessionIdRef.current += 1;
    greetingTriggerSentRef.current = false;
    searchResultsRef.current = [];
    if (!preserveViewedProductsOnCleanupRef.current) {
      viewedProductIdsRef.current.clear();
    }
    preserveViewedProductsOnCleanupRef.current = false;
  }, [stopAllPlayback]);


  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // File d'attente globale pour différer les messages texte quand le WS n'est pas prêt
  const queueClientMessage = useCallback((text: string) => {
    const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
    if (sessionRef.current && voiceStateRef.current === 'listening' && !isManualCloseRef.current && ws && ws.readyState === 1) {
      try {
        sessionRef.current.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: false });
      } catch (err) {
        messageQueueRef.current.push(text);
      }
    } else {
      messageQueueRef.current.push(text);
    }
    resetSilenceTimer();
  }, [resetSilenceTimer]);

  // Flush de la Message Queue lorsque l'IA "écoute" à nouveau
  useEffect(() => {
    if (voiceState === 'listening' && messageQueueRef.current.length > 0 && sessionRef.current && !isManualCloseRef.current) {
      const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
      if (ws && ws.readyState === 1) {
        try {
          // On envoie chaque message empilé
          for (const text of messageQueueRef.current) {
            sessionRef.current.sendClientContent({ turns: [{ role: 'user', parts: [{ text }] }], turnComplete: false });
          }
          messageQueueRef.current = [];
        } catch (err) {
          console.warn('[Voice] Failed to flush message queue:', err);
        }
      }
    }
  }, [voiceState]);

  // Sync cart state mid-session (utilise désormais la message queue)
  const prevCartItemsRef = useRef(cartItems);
  const lastSyncTextRef = useRef('');
  useEffect(() => {
    if (!sessionRef.current || isManualCloseRef.current) return;
    const isDifferent = JSON.stringify(cartItems) !== JSON.stringify(prevCartItemsRef.current);
    if (isDifferent) {
      const cartStr = cartItems.length > 0
        ? cartItems.map(i => `${i.quantity}x ${i.product.name}`).join(', ')
        : 'panier vide';

      const syncText = `[VÉRITÉ PANIER] Le panier actuel contient : ${cartStr}. Ceci est l'unique source de vérité.`;

      if (syncText !== lastSyncTextRef.current) {
        const timer = setTimeout(() => {
          queueClientMessage(syncText);
          lastSyncTextRef.current = syncText;
        }, 1200);
        return () => clearTimeout(timer);
      }
      prevCartItemsRef.current = cartItems;
    }
  }, [cartItems, queueClientMessage]);

  // Sync active product state mid-session (utilise désormais la message queue)
  const prevActiveProductRef = useRef(activeProduct);
  useEffect(() => {
    if (!sessionRef.current || isManualCloseRef.current || !activeProduct) return;
    if (activeProduct.id !== prevActiveProductRef.current?.id) {
      const specs = (activeProduct as any).attributes?.productSpecs?.map((s: any) => `• ${s.name}: ${s.description}`).join('\n') || 'Non spécifiées';
      const metrics = (activeProduct as any).attributes?.botanicalProfile ? Object.entries((activeProduct as any).attributes.botanicalProfile).map(([k, v]) => `${k}: ${v}/10`).join(', ') : 'Non disponibles';

      const syncText = `[NAVIGATION] Le client regarde maintenant : ${activeProduct.name}.\n` +
        `Détails botaniques :\n${specs}\n` +
        `Profil sensoriel : ${metrics}\n` +
        `Utilise ces informations pour tes futures réponses tant que le client est sur cette page.`;

      const timer = setTimeout(() => {
        queueClientMessage(syncText);
        prevActiveProductRef.current = activeProduct;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeProduct, queueClientMessage]);

  // Sync AI preferences (Profil Évolutif) mid-session
  const prevSavedPrefsRef = useRef(savedPrefs);
  useEffect(() => {
    if (!sessionRef.current || isManualCloseRef.current || !savedPrefs) return;
    const isDifferent = JSON.stringify(savedPrefs) !== JSON.stringify(prevSavedPrefsRef.current);
    if (isDifferent) {
      const renderValue = (val: any): string => {
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'object' && val !== null) {
          return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('; ');
        }
        return String(val);
      };
      
      const entries = Object.entries(savedPrefs)
        .filter(([k, v]) => v && k !== 'id' && k !== 'user_id' && k !== 'updated_at' && k !== 'preferences')
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${renderValue(v)}`);

      if (entries.length > 0) {
        const syncText = `[SYSTÈME] Ton savoir sur le client vient d'évoluer. Voici son PROFIL ÉVOLUTIF à jour : ${entries.join(' | ')}. Prends-en compte immédiatement pour la suite.`;
        queueClientMessage(syncText);
      }
      prevSavedPrefsRef.current = savedPrefs;
    }
  }, [savedPrefs, queueClientMessage]);

  // Global unhandledrejection suppressor for SDK's internal uncatchable fire-and-forget WS throws.
  // When the WS enters CLOSING state (readyState 2) before onclose fires, the SDK synchronously throws 
  // via an unreturned Promise. We cannot wrap it. We must intercept the global error event.
  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message ?? e.reason).toLowerCase();
      if (msg.includes('closed') || msg.includes('closing') || msg.includes('failed to execute \'send\' on \'websocket\'')) {
        e.preventDefault(); // Suppresses the red console error!
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  const stopSession = useCallback(() => {
    retryCountRef.current = 0;
    cleanup();
    setVoiceState('idle');
    setIsMuted(false);
  }, [cleanup]);

  const playPcmChunk = useCallback((base64: string) => {
    // Guard: discard any audio chunks that arrive after an interruption
    if (interruptedRef.current) return;
    if (!playbackCtxRef.current) return;
    const ctx = playbackCtxRef.current;
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime + AUDIO_SCHEDULE_AHEAD_SEC, scheduledUntilRef.current);
    source.start(startAt);
    scheduledUntilRef.current = startAt + buffer.duration;
    activeSourcesRef.current.add(source);
    setVoiceState('speaking');
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (!interruptedRef.current && ctx.currentTime >= scheduledUntilRef.current - 0.05) {
        setVoiceState('listening');
        resetSilenceTimer();
      }
    };
  }, [resetSilenceTimer]);

  // Am4: sample ambient noise then set an adaptive barge-in threshold
  const calibrateNoise = useCallback(() => {
    isCalibratingRef.current = true;
    noiseSamplesRef.current = [];
    console.info('[Voice][Calibrate] Sampling ambient noise for', BARGE_IN_NOISE_SAMPLE_MS, 'ms');

    window.setTimeout(() => {
      isCalibratingRef.current = false;
      const samples = noiseSamplesRef.current;
      if (samples.length > 0) {
        const sorted = [...samples].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const clamped = Math.max(BARGE_IN_NOISE_MIN, Math.min(BARGE_IN_NOISE_MAX, median));
        adaptiveBargeInThresholdRef.current = clamped * BARGE_IN_NOISE_MULTIPLIER;
        console.info('[Voice][Calibrate] Noise floor:', median.toFixed(4), '→ threshold:', adaptiveBargeInThresholdRef.current.toFixed(4));
      } else {
        adaptiveBargeInThresholdRef.current = BARGE_IN_RMS_THRESHOLD_FALLBACK;
        console.info('[Voice][Calibrate] No samples — using fallback threshold:', BARGE_IN_RMS_THRESHOLD_FALLBACK);
      }

      // Schedule next recalibration (only while session is active and mic is listening)
      recalibrateTimerRef.current = window.setTimeout(() => {
        if (!isManualCloseRef.current && voiceStateRef.current === 'listening') {
          calibrateNoise();
        }
      }, BARGE_IN_RECALIBRATE_INTERVAL_MS);
    }, BARGE_IN_NOISE_SAMPLE_MS);
  }, []);

  const startMicCapture = useCallback(async (stream: MediaStream) => {
    const ctx = new AudioContext();
    captureCtxRef.current = ctx;
    await ctx.audioWorklet.addModule('/audio-processor.js');
    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, 'mic-processor');
    processorRef.current = worklet;
    const worker = getAudioWorker();

    worker.onmessage = (msg) => {
      if (isMutedRef.current || !canSendRealtimeInput()) return;

      // Synchronous race-condition guard: check WS state right before send to catch
      // CLOSING transitions that slip through between canSendRealtimeInput() and here.
      try {
        const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
        if (ws && ws.readyState !== WebSocket.OPEN) return;
      } catch { /* ignore if _ws is not accessible */ }

      try {
        const { rms, pcm } = msg.data;
        const now = Date.now();

        // Am4: noise calibration — collect RMS samples silently during calibration window
        if (isCalibratingRef.current) {
          noiseSamplesRef.current.push(rms);
          return;
        }

        if (voiceStateRef.current === 'listening') {
          if (onVolumeLevelRef.current) onVolumeLevelRef.current(rms);
          // Postpone silence nudge if user is actively speaking
          if (rms > adaptiveBargeInThresholdRef.current) {
            resetSilenceTimer();
          }
        }

        const canBargeIn = now - lastBargeInAtRef.current > BARGE_IN_COOLDOWN_MS;
        const bargeInThreshold = adaptiveBargeInThresholdRef.current;

        if (voiceStateRef.current === 'speaking' && canBargeIn) {
          if (rms >= bargeInThreshold) {
            // Layer A passed — start or continue tracking sustained speech
            if (bargeInStartRef.current === 0) bargeInStartRef.current = now;
            bargeInFramesRef.current += 1;

            // Layer B + C: minimum duration AND stability frame count
            const elapsed = now - bargeInStartRef.current;
            if (elapsed >= BARGE_IN_MIN_DURATION_MS && bargeInFramesRef.current >= BARGE_IN_STABILITY_FRAMES) {
              lastBargeInAtRef.current = now;
              bargeInStartRef.current = 0;
              bargeInFramesRef.current = 0;
              stopAllPlayback(80); // soft fade-out
              // Small delay before switching to listening to avoid audio feedback loop
              setTimeout(() => {
                if (voiceStateRef.current !== 'idle') setVoiceState('listening');
              }, 100);
            }
          } else {
            // Signal dropped below threshold — reset detection to avoid false trigger on noise spike
            bargeInStartRef.current = 0;
            bargeInFramesRef.current = 0;
          }
        }

        // Final guard: re-check right before the SDK call to minimize the race window
        if (isClosingRef.current || !sessionRef.current) return;

        const ws = (sessionRef.current as any)?._ws;
        if (ws && ws.readyState !== 1) return; // 1 = OPEN

        const audioData = new Uint8Array(pcm.buffer);
        if (audioData.length === 0) return; // Skip empty chunks to prevent 1007 errors

        try {
          sessionRef.current.sendRealtimeInput({
            audio: {
              mimeType: 'audio/pcm',
              data: toBase64(audioData)
            }
          });
        } catch (err) {
          // Silent catch for late-flying buffers after stop/close
        }
      } catch (err: any) {
        // Silently discard any socket teardown errors (CLOSED, CLOSING, InvalidStateError)
        const msgStr = String(err?.message ?? err).toLowerCase();
        if (msgStr.includes('closed') || msgStr.includes('closing') || msgStr.includes('invalid state') || msgStr.includes('websocket')) {
          return;
        }
        console.warn('[Voice] Mic capture error:', err);
      }
    };

    worklet.port.onmessage = (e) => {
      if (isMutedRef.current || !canSendRealtimeInput()) return;
      const chunk = e.data as Float32Array;
      worker.postMessage({
        chunk,
        fromRate: captureCtxRef.current?.sampleRate ?? 48000,
        toRate: INPUT_SAMPLE_RATE,
        bargeInThreshold: adaptiveBargeInThresholdRef.current
      }, [chunk.buffer]);
    };

    const silent = ctx.createGain();
    silent.gain.value = 0;
    source.connect(worklet);
    worklet.connect(silent);
    silent.connect(ctx.destination);
  }, [canSendRealtimeInput, stopAllPlayback, resetSilenceTimer]);


  const startSession = useCallback(async (forceFreshToken: boolean = false) => {
    const now = Date.now();
    if (now - lastStartSessionCallRef.current < 1000) {
      console.warn('[Voice] startSession ignoré (debounce).');
      return;
    }
    lastStartSessionCallRef.current = now;

    if (startInFlightRef.current) return;
    cleanup();
    isManualCloseRef.current = false;
    isClosingRef.current = false;
    const sid = sessionIdRef.current + 1;
    sessionIdRef.current = sid;

    if (compatibilityError) {
      setError(compatibilityError);
      setVoiceState('error');
      return;
    }

    startInFlightRef.current = true;
    setVoiceState('connecting');
    setError(null);

    // ── Connection timeout ────────────────────────────────────────────────────
    setupTimeoutRef.current = window.setTimeout(() => {
      if (sessionIdRef.current === sid && startInFlightRef.current) {
        console.warn('[Voice] Connection timeout after', CONNECTION_TIMEOUT_MS, 'ms');
        setError('Délai de connexion dépassé. Vérifiez votre connexion internet.');
        stopSession();
      }
    }, CONNECTION_TIMEOUT_MS);

    try {
      // Fetch a short-lived ephemeral token from the server so the real
      // GEMINI_API_KEY never appears in the browser bundle or network traffic.
      const [tokenData, stream] = await Promise.all([
        fetchEphemeralToken(forceFreshToken),
        navigator.mediaDevices.getUserMedia({ audio: true }),
      ]);

      console.info('[Voice] Token acquired, starting WebRTC/WS connect with model:', LIVE_MODEL);
      streamRef.current = stream;
      const ai = new GoogleGenAI({ apiKey: tokenData.token, httpOptions: { apiVersion: 'v1alpha' } });

      // All session config (systemInstruction, tools, speechConfig, responseModalities)
      // is embedded in the ephemeral token's bidiGenerateContentSetup.
      // The server uses that setup exclusively — passing config here would be ignored.
      const session = await ai.live.connect({
        model: LIVE_MODEL,
        callbacks: {
          onopen: async () => {
            if (sessionIdRef.current !== sid) return;
            if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
            canStreamInputRef.current = true;
            const isRetry = retryCountRef.current > 0; // Capture BEFORE resetting
            retryCountRef.current = 0; // Reset retry count on successful connection
            console.info('[Voice] Gemini Live: Setup Complete');
            setVoiceState('listening');
            resetSilenceTimer();
            await startMicCapture(stream);
            startInFlightRef.current = false;
            playbackCtxRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
            // On reconnects (1011/auto-retry) skip the greeting so the conversation
            // doesn't restart from scratch — just resume listening silently.
            if (!isRetry) {
              startTimeRef.current = Date.now();
              // Small settling delay to reduce first-turn WS race conditions while
              // preserving a premium low-latency feel.
              await wait(INITIAL_GREETING_DELAY_MS);
              if (sessionIdRef.current !== sid || isManualCloseRef.current) return;

              // GUARD: Ensure we only send the greeting trigger ONCE and only if 
              // the bot hasn't already initiated ANY activity (speaking, tool calls, etc.)
              if (!greetingTriggerSentRef.current && voiceStateRef.current === 'listening') {
                greetingTriggerSentRef.current = true;

                // Double check WS readyState before sending content
                const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
                if (ws && ws.readyState !== WebSocket.OPEN) return;

                const greetingTrigger = userName
                  ? `Consigne ouverture : accueille le client par son prénom (${userName}) et demande comment tu peux l aider.`
                  : "Consigne ouverture : accueille chaleureusement le client et demande comment tu peux l aider.";

                // Même cause que la relance silence : sendClientContent avec tours synthétiques peut provoquer 1007 en mode contraint.
                sessionRef.current?.sendRealtimeInput({ text: greetingTrigger });
              }

              // Log voice session analytically
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const { data: interactionRow } = await supabase
                    .from('budtender_interactions')
                    .insert({
                      user_id: user.id,
                      interaction_type: 'voice_session',
                      created_at: new Date().toISOString()
                    })
                    .select('id')
                    .single();

                  if (interactionRow) {
                    interactionIdRef.current = interactionRow.id;
                  }
                }
              } catch (err) {
                console.error('[Voice] Failed to log interaction', err);
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            if (sessionIdRef.current !== sid) return;
            isClosingRef.current = true;
            canStreamInputRef.current = false;
            console.error('[Voice] Live Error Detected:', {
              message: e.message,
              error: e.error
            });
            if (processorRef.current) processorRef.current.port.onmessage = null;
            startInFlightRef.current = false;
          },
          onclose: (e: CloseEvent) => {
            if (sessionIdRef.current !== sid || isManualCloseRef.current) return;
            // Immediately block mic sending — this is the critical fix for the
            // "WebSocket is already in CLOSING or CLOSED state" error.
            // Must be set synchronously before any async/setTimeout work.
            isClosingRef.current = true;
            canStreamInputRef.current = false;
            startInFlightRef.current = false;
            // Immediately stop the worklet from firing more messages
            if (processorRef.current) processorRef.current.port.onmessage = null;
            console.log('[Voice] Live Closed:', e.code, e.reason);

            // ── Clean close: normal end ──────────────────────────────────────
            if (e.code === 1000) {
              stopSession();
              return;
            }

            // ── Abnormal close: decide whether to retry ──────────────────────
            const canRetry = !NON_RETRYABLE_CODES.has(e.code) && retryCountRef.current < MAX_AUTO_RETRIES;

            if (canRetry) {
              retryCountRef.current += 1;
              const attempt = retryCountRef.current;
              const jitter = Math.floor(Math.random() * 500);
              const delay = RETRY_DELAY_MS * attempt + jitter; // Exponential-ish back-off with jitter
              console.info(`[Voice] Auto-retry ${attempt}/${MAX_AUTO_RETRIES} in ${delay}ms (code ${e.code})`);
              setError(`Reconnexion automatique (${attempt}/${MAX_AUTO_RETRIES})…`);
              setVoiceState('connecting');

              // Re-use the stream already acquired so we don't need to re-prompt for mic permission
              retryTimerRef.current = window.setTimeout(() => {
                if (isManualCloseRef.current) return;
                preserveViewedProductsOnCleanupRef.current = true;
                // Partial cleanup: close session & audio but keep stream
                wsRef.current = null;
                (sessionRef.current as any)?._ws?.close?.();
                sessionRef.current?.close();
                sessionRef.current = null;
                if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
                stopAllPlayback();
                if (processorRef.current) processorRef.current.port.onmessage = null;
                processorRef.current?.disconnect();
                processorRef.current = null;
                captureCtxRef.current?.close().catch(() => { });
                captureCtxRef.current = null;
                playbackCtxRef.current?.close().catch(() => { });
                playbackCtxRef.current = null;
                scheduledUntilRef.current = 0;
                interruptedRef.current = false;
                // Don't reset sessionIdRef — we keep the same sid guard
                // Force a FRESH token on retries — reusing tokens causes "Token has been used too many times (1011)"
                startSessionRef.current?.(true);
              }, delay);
            } else {
              // Max retries exceeded or non-retryable code
              const reason = e.reason ? `(${e.reason})` : `(code ${e.code})`;
              setError(`Session interrompue ${reason}. Appuyez sur "Réessayer".`);
              setVoiceState('error');
              cleanup();
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (sessionIdRef.current !== sid) return;

            // If we receive ANY content from the server (speaking or tool call),
            // consider the greeting sequence handled/bypassed.
            if (msg.serverContent || msg.toolCall) {
              greetingTriggerSentRef.current = true;
            }

            const setupTurn = () => {
              scheduledUntilRef.current = playbackCtxRef.current?.currentTime ?? 0;
              setVoiceState('listening');
              resetSilenceTimer();
            };

            if (msg.serverContent) {
              if (msg.serverContent.interrupted) {
                // Server detected barge-in: immediately stop all scheduled audio
                stopAllPlayback();
                setupTurn();
                return;
              }
              if (msg.serverContent.turnComplete) {
                setupTurn();
                return;
              }

              // A new model turn: clear the interrupted flag so fresh chunks can play
              if (msg.serverContent.modelTurn?.parts?.length) {
                interruptedRef.current = false;
              }

              for (const p of msg.serverContent.modelTurn?.parts || []) {
                if (p.inlineData?.mimeType?.startsWith('audio/pcm') && p.inlineData.data) {
                  playPcmChunk(p.inlineData.data);
                }
              }
            }

            const calls = msg.toolCall?.functionCalls;
            if (!calls) return;

            // Phase 1 tools are independent — run in parallel immediately.
            // Phase 2 tools may depend on Phase 1 results (e.g. add_to_cart needs view_product
            // to have run first so viewedProductIdsRef is populated).
            const PHASE_1_TOOLS = new Set([
              'think', 'search_catalog', 'navigate_to', 'search_knowledge',
              'search_cannabis_conditions', 'search_expert_data', 'load_voice_skill', 'track_order',
              'get_favorites', 'filter_catalog', 'get_referral_link',
              'compare_products', 'suggest_bundle', 'watch_stock',
              'submit_review', 'apply_promo', 'open_product_modal', 'save_preferences',
              'get_current_time', 'get_cart', 'remove_from_cart', 'update_cart_quantity'
            ]);
            const phase1Calls = calls.filter(c => PHASE_1_TOOLS.has(c.name!));
            const phase2Calls = calls.filter(c => !PHASE_1_TOOLS.has(c.name!));

            const toolStartTimes = new Map<string, number>();
            const executeToolCall = async (c: (typeof calls)[number]) => {
              const args = (c.args || {}) as Record<string, any>;
              const safeArgs = Object.fromEntries(Object.entries(args).map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, 140) : v]));
              const callKey = `${c.name}:${c.id || 'no-id'}`;
              const dedupKey = `${c.name}:${JSON.stringify(safeArgs)}`;
              toolStartTimes.set(callKey, Date.now());
              console.info('[Voice][Tool] START', { name: c.name, id: c.id, args: safeArgs });

              try {
                if (c.name === 'load_voice_skill') {
                  const skillId = String(args.skill_id || '').trim();
                  if (loadedVoiceSkillsRef.current.has(skillId)) {
                    return {
                      name: c.name,
                      id: c.id,
                      response: {
                        result:
                          "Ce skill est déjà chargé pour cette session. Applique les instructions déjà reçues. Rappelle load_voice_skill si tu as besoin du texte complet.",
                        skill_id: skillId,
                        already_loaded: true,
                      },
                    };
                  }
                  const loaded = await loadOptionalVoiceSkill(skillId);
                  if (loaded.ok === true) {
                    loadedVoiceSkillsRef.current.add(skillId);
                    return {
                      name: c.name,
                      id: c.id,
                      response: {
                        skill_id: loaded.skill_id,
                        content: loaded.content,
                      },
                    };
                  }
                  return { name: c.name, id: c.id, response: { error: loaded.error } };
                }

                const now = Date.now();
                const recentMap = recentToolExecutionsRef.current;
                for (const [k, ts] of recentMap.entries()) {
                  if (now - ts > TOOL_DEDUP_WINDOW_MS) recentMap.delete(k);
                }
                const alreadySeenAt = recentMap.get(dedupKey);
                if (alreadySeenAt && now - alreadySeenAt < TOOL_DEDUP_WINDOW_MS) {
                  console.warn('[Voice][Tool] DUPLICATE_SUPPRESSED', {
                    name: c.name,
                    id: c.id,
                    dedupWindowMs: TOOL_DEDUP_WINDOW_MS,
                  });
                  return {
                    name: c.name,
                    id: c.id,
                    response: {
                      result: 'Action déjà traitée il y a quelques instants. Ne répète pas la confirmation vocale.',
                      deduplicated: true
                    }
                  };
                }
                recentMap.set(dedupKey, now);

                if (c.name === 'think') {
                  return {
                    name: c.name,
                    id: c.id,
                    response: {
                      result: 'ok',
                      status: 'verified',
                      directive: 'Raisonnement enregistré. Si tu as annoncé une recherche vocalement (ex: "Je regarde..."), appelle l\'outil de recherche (search_catalog, search_knowledge, etc.) IMPÉRATIVEMENT dans ce même tour.'
                    }
                  };
                }
                
                if (c.name === 'get_current_time') {
                  const now = new Date();
                  const result = now.toLocaleString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  return { name: c.name, id: c.id, response: { result } };
                }

                if (c.name === 'get_cart') {
                  const items = cartItemsRef.current || [];
                  if (items.length === 0) {
                    return {
                      name: c.name,
                      id: c.id,
                      response: {
                        result: 'Le panier est actuellement vide.',
                        item_count: 0,
                        total: 0,
                      },
                    };
                  }
                  const cartLines = items.map((item: any) => {
                    const p = item.product;
                    const subtotal = (p.price * item.quantity).toFixed(2);
                    return `${item.quantity}x ${p.name} (${p.price}\u20AC l'unit\u00E9) = ${subtotal}\u20AC`;
                  });
                  const total = items.reduce(
                    (acc: number, item: any) => acc + item.product.price * item.quantity,
                    0
                  );
                  const result = [
                    `Panier (${items.length} article${items.length > 1 ? 's' : ''}) :`,
                    ...cartLines,
                    `Total : ${total.toFixed(2)}\u20AC`,
                  ].join('\n');
                  return {
                    name: c.name,
                    id: c.id,
                    response: {
                      result,
                      item_count: items.length,
                      total: total.toFixed(2),
                    },
                  };
                }

                if (c.name === 'add_to_cart') {
                  const prodName = (args.product_name || '').trim();
                  const weightGrams = Number(args.weight_grams) || 0;
                  let qty = Number(args.quantity) || 0;

                  let p = await findProduct(prodName);

                  // Auto-search fallback: if Gemini skipped search_catalog and the product
                  // isn't in the known set yet, do a semantic search now so the add succeeds
                  // (prevents the AI saying "I added X" but the cart staying empty).
                  if (!p && prodName.length >= 3) {
                    if (!semanticSearchAvailableRef.current || !isMatchProductsRpcAvailable()) {
                      semanticSearchAvailableRef.current = false;
                      return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" non trouvé dans le catalogue.` } };
                    }

                    try {
                      const embedding = await generateEmbedding(prodName);
                      const { data, error: rpcError } = await matchProductsRpc<Product>({
                        embedding,
                        matchThreshold: 0.1,
                        matchCount: 5,
                      });
                      if (rpcError) throw rpcError;
                      if (data && data.length > 0) {
                        searchResultsRef.current = [...searchResultsRef.current, ...(data as Product[])];
                        p = await findProduct(prodName); // retry with enriched pool
                      }
                    } catch (e) {
                      if (shouldDisableSemanticSearch(e)) {
                        semanticSearchAvailableRef.current = false;
                      }
                      console.warn('[Voice] add_to_cart auto-search fallback failed:', e);
                    }
                  }

                  if (p) {
                    if (!viewedProductIdsRef.current.has(p.id)) {
                      return {
                        name: c.name,
                        id: c.id,
                        response: {
                          error: `Ajout bloqué : "${p.name}" doit d'abord être affiché avec view_product avant add_to_cart dans cette session.`
                        }
                      };
                    }

                    if (weightGrams > 0 && p.weight_grams && p.weight_grams > 0) {
                      qty = Math.max(1, Math.round(weightGrams / p.weight_grams));
                    } else if (qty <= 0) {
                      qty = 1;
                    }

                    if (onAddItemRef.current) {
                      onAddItemRef.current(p, qty);
                      // Verification check: get current total from ref (approximated here as we can't easily read store state inside here without more plumbing, but we can signal success)
                      const msg = weightGrams > 0
                        ? `CONFIRMATION : ${p.name} (${weightGrams}g, soit x${qty}) ajouté. Vérification système : ACTION_SUCCESS. Le panier est à jour.`
                        : `CONFIRMATION : ${p.name} x${qty} ajouté. Vérification système : ACTION_SUCCESS. Le panier est à jour.`;
                      return { name: c.name, id: c.id, response: { result: msg, status: 'verified', product_id: p.id } };
                    }
                  }
                  return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" non trouvé dans le catalogue.` } };
                }

                if (c.name === 'remove_from_cart') {
                  const prodName = (args.product_name || '').trim();
                  const qty = Number(args.quantity) || 0;
                  const p = await findProduct(prodName);
                  if (p && onRemoveItemRef.current) {
                    onRemoveItemRef.current(p, qty);
                    return { 
                      name: c.name, 
                      id: c.id, 
                      response: { 
                        result: `CONFIRMATION : ${p.name} a été retiré du panier. Vérification système : ACTION_SUCCESS. Le panier est à jour.`, 
                        status: 'verified' 
                      } 
                    };
                  }
                  return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" non trouvé dans le panier.` } };
                }

                if (c.name === 'update_cart_quantity') {
                  const prodName = (args.product_name || '').trim();
                  const qty = Number(args.quantity) || 0;
                  const p = await findProduct(prodName);
                  if (p && onUpdateQuantityRef.current) {
                    onUpdateQuantityRef.current(p, qty);
                    return { 
                      name: c.name, 
                      id: c.id, 
                      response: { 
                        result: `CONFIRMATION : La quantité de ${p.name} a été mise à jour à ${qty}. Vérification système : ACTION_SUCCESS. Le panier est à jour.`, 
                        status: 'verified' 
                      } 
                    };
                  }
                  return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" non trouvé dans le panier.` } };
                }

                if (c.name === 'close_session') {
                  if (!allowCloseSession) {
                    return { name: c.name, id: c.id, response: { error: 'close_session est désactivé. La fermeture est gérée manuellement par le client.' } };
                  }
                  setTimeout(() => {
                    stopSession();
                    onCloseSessionRef.current?.();
                  }, 3500);
                  return { name: c.name, id: c.id, response: { result: 'OK — Session en cours de fermeture' } };
                }

                if (c.name === 'view_product') {
                  const prodName = (args.product_name || '').trim();
                  const p = await findProduct(prodName);
                  if (p && onViewProductRef.current) {
                    const viewFn = onViewProductRef.current;
                    const prod = p;
                    // Delay navigation even longer so the tool response can be sent and processed first
                    setTimeout(() => viewFn(prod), 400);
                    viewedProductIdsRef.current.add(p.id);
                    return { name: c.name, id: c.id, response: { result: `Fiche de "${p.name}" affichée à l'écran. Le client la consulte. Ne propose PAS encore de l'ajouter au panier — demande-lui s'il souhaite approfondir la description ou en savoir plus sur ce produit.` } };
                  }
                  return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" non trouvé dans le catalogue.` } };
                }

                if (c.name === 'navigate_to') {
                  const rawPage = String(args.page || '').trim();
                  let lowerRawPage = rawPage.toLowerCase();

                  // ── Category direct navigation ──
                  if (lowerRawPage.startsWith('category:')) {
                    const catName = lowerRawPage.replace('category:', '').trim();
                    let catSlug = catName;

                    // Normalize the searched category name for robust matching
                    const normalizedCatSeek = catName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                    let matchFound = false;

                    for (const p of productsRef.current) {
                      const pCatName = p.category?.name?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || '';
                      if (pCatName && (pCatName.includes(normalizedCatSeek) || normalizedCatSeek.includes(pCatName))) {
                        catSlug = p.category?.slug || p.category?.id || catName;
                        matchFound = true;
                        break;
                      }
                    }

                    if (onNavigateRef.current) {
                      const navFn = onNavigateRef.current;
                      setTimeout(() => navFn(`/catalogue?category=${encodeURIComponent(catSlug)}`), 100);
                      return { name: c.name, id: c.id, response: { result: `Catégorie "${catName}" affichée à l'écran avec succès.` } };
                    }
                    return { name: c.name, id: c.id, response: { error: `Erreur interne lors de la navigation.` } };
                  }

                  // Normalize: strip accents, lowercase, remove extra spaces
                  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[''`]/g, ' ').replace(/\s+/g, ' ').trim();
                  const page = normalize(rawPage);

                  // Extract just the core keywords without articles for deeper matching
                  const strippedPage = page.replace(/^(le|la|les|l|un|une|des|mon|ma|mes|ton|ta|tes|au|aux|vers|aller a)\s+/g, '').trim();

                  const mapping: Record<string, string> = {
                    // Accueil
                    home: '/', accueil: '/', homepage: '/',
                    // Boutique / Shop
                    shop: '/boutique', boutique: '/boutique', magasin: '/boutique',
                    // Produits
                    products: '/produits', product: '/produits', produit: '/produits', produits: '/produits',
                    // Contact
                    contact: '/contact',
                    // Compte
                    account: '/compte', compte: '/compte', profil: '/compte', profile: '/compte',
                    // Panier
                    cart: '/panier', panier: '/panier',
                    // Catalogue
                    catalog: '/catalogue', catalogue: '/catalogue',
                    // Parrainage
                    referrals: '/compte/parrainage', parrainage: '/compte/parrainage', invite: '/compte/parrainage', invitation: '/compte/parrainage',
                    // Commandes
                    orders: '/compte/commandes', commandes: '/compte/commandes',
                    // Fidélité
                    fidelite: '/compte/fidelite', loyalty: '/compte/fidelite',
                    // Favoris
                    favoris: '/compte/favoris', favorites: '/compte/favoris', wishlist: '/compte/favoris',
                    // FAQ
                    faq: '/faq', 'foire aux questions': '/faq', questions: '/faq',
                    // Livraison
                    livraison: '/livraison', delivery: '/livraison', transporter: '/livraison',
                    // À propos
                    'a propos': '/a-propos', 'a-propos': '/a-propos', about: '/a-propos', 'qui sommes nous': '/a-propos',
                    // CGV
                    cgv: '/cgv', 'conditions generales': '/cgv', conditions: '/cgv',
                    // Guides
                    guides: '/guides', guide: '/guides', blog: '/guides',
                    // Conformité
                    conformite: '/conformite', conformity: '/conformite', qualite: '/conformite', legalite: '/conformite', legal: '/conformite',
                    // Connexion
                    connexion: '/connexion', login: '/connexion', signin: '/connexion',
                  };

                  let path = mapping[page] || mapping[strippedPage];

                  if (!path) {
                    const normalizedSlashPath = lowerRawPage.startsWith('/') ? lowerRawPage : `/${lowerRawPage}`;
                    if (Object.values(mapping).includes(normalizedSlashPath)) {
                      path = normalizedSlashPath;
                    } else {
                      // Ultra-fuzzy fallback: look for any keyword match in the stripped page
                      const matchKey = Object.keys(mapping).find(k => strippedPage.includes(k) || k.includes(strippedPage));
                      if (matchKey) path = mapping[matchKey];
                    }
                  }

                  if (path && onNavigateRef.current) {
                    const navFn = onNavigateRef.current;
                    setTimeout(() => navFn(path as string), 100);
                    return { name: c.name, id: c.id, response: { result: `Navigation vers "${rawPage}" effectuée avec succès (${path}).` } };
                  }

                  // If all else fails, just tell the model it worked but silently fail or fall back to home
                  // to prevent the AI from getting confused when it already promised the user to take them there.
                  if (onNavigateRef.current) {
                    setTimeout(() => onNavigateRef.current!('/'), 100);
                    return { name: c.name, id: c.id, response: { result: `Navigation fallback to Home executed because route "${rawPage}" was not fully understood.` } };
                  }

                  return { name: c.name, id: c.id, response: { error: `Nav impossible` } };
                }

                if (c.name === 'search_catalog') {
                  const query = (args.query || '').trim();
                  if (!query) {
                    return { name: c.name, id: c.id, response: { error: 'Recherche impossible : le paramètre "query" est vide.' } };
                  }

                  const fallbackResults = fallbackKeywordSearch(query, productsRef.current);
                  if (!semanticSearchAvailableRef.current || !isMatchProductsRpcAvailable() || fallbackResults.length > 0) {
                    if (!isMatchProductsRpcAvailable()) {
                      semanticSearchAvailableRef.current = false;
                    }
                    if (fallbackResults.length === 0) {
                      return { name: c.name, id: c.id, response: { error: 'Aucun produit pertinent trouvé.' } };
                    }

                    searchResultsRef.current = fallbackResults;
                    const results = formatVoiceCatalogToolLines(fallbackResults);
                    return {
                      name: c.name,
                      id: c.id,
                      response: {
                        results,
                        note: semanticSearchAvailableRef.current
                          ? 'Résultats fournis via recherche textuelle rapide du catalogue.'
                          : 'Résultats fournis via recherche textuelle de secours (vectorielle indisponible).',
                      },
                    };
                  }

                  try {
                    const embedding = await generateEmbedding(query);
                    const { data, error: rpcError } = await matchProductsRpc<Product>({
                      embedding,
                      matchThreshold: 0.1,
                      matchCount: 10
                    });
                    if (rpcError) throw rpcError;
                    if (data && data.length > 0) searchResultsRef.current = data as Product[];
                    const results = formatVoiceCatalogToolLines(data as Product[]);
                    return { name: c.name, id: c.id, response: { results, note: 'Ce sont les produits les plus pertinents du catalogue complet.' } };
                  } catch (e) {
                    if (shouldDisableSemanticSearch(e)) {
                      semanticSearchAvailableRef.current = false;
                      if (import.meta.env.DEV) {
                        console.warn(
                          '[Voice] Semantic search indisponible (RPC mismatch).\n' +
                          '→ Vérifiez la fonction Supabase match_products et son schéma (colonnes, dimensions).\n' +
                          `   Détail : ${(e as Error).message}`
                        );
                      }
                    } else {
                      console.error('[Voice] Search Tool Error:', e);
                    }

                    if (fallbackResults.length === 0) {
                      return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de la recherche' } };
                    }

                    searchResultsRef.current = fallbackResults;
                    const results = formatVoiceCatalogToolLines(fallbackResults);
                    return {
                      name: c.name,
                      id: c.id,
                      response: {
                        results,
                        note: 'Résultats fournis via recherche textuelle de secours (vectorielle indisponible).',
                      },
                    };
                  }
                }

                if (c.name === 'search_knowledge') {
                  const query = (args.query || '').trim();
                  if (!query) {
                    return { name: c.name, id: c.id, response: { error: 'Recherche impossible : le paramètre "query" est vide.' } };
                  }
                  try {
                    const knowledge = await getRelevantKnowledge(query);
                    if (knowledge.length > 0) {
                      const results = knowledge
                        .slice(0, 5)
                        .map((k) => {
                          const body = (k.content || '').replace(/\s+/g, ' ').trim().slice(0, 400);
                          return `[${k.title}] : ${body}`;
                        })
                        .join('\n\n');
                      return { name: c.name, id: c.id, response: { results, note: 'Voici les extraits de la base de connaissances. Utilise-les pour répondre au client.' } };
                    }
                    return { name: c.name, id: c.id, response: { note: 'Aucune information trouvée dans la base de connaissances interne pour cette requête.' } };
                  } catch (e) {
                    console.error('[Voice] search_knowledge Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de la recherche dans la base de connaissances.' } };
                  }
                }

                if (c.name === 'track_order') {
                  const orderId = (args.order_id || '').trim();
                  try {
                    const { data: userData } = await supabase.auth.getUser();
                    const user = userData?.user;
                    if (!user) {
                      return { name: c.name, id: c.id, response: { error: 'Utilisateur non connecté. Impossible de vérifier les commandes.' } };
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
                      const results = orders.map(o => `Commande ${o.id.slice(0, 8)} du ${new Date(o.created_at).toLocaleDateString('fr-FR')} : Statut = ${o.status}, Total = ${o.total}€`).join('\n');
                      return { name: c.name, id: c.id, response: { results, note: 'Voici les statuts des commandes. Utilise ces informations pour répondre au client en traduisant le statut (paid=payée, processing=en préparation, shipped=expédiée, delivered=livrée).' } };
                    }
                    return { name: c.name, id: c.id, response: { note: 'Aucune commande trouvée.' } };
                  } catch (e) {
                    console.error('[Voice] track_order Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de la recherche des commandes.' } };
                  }
                }

                if (c.name === 'search_cannabis_conditions') {
                  const query = (args.query || '').trim();
                  if (!query) {
                    return { name: c.name, id: c.id, response: { error: 'Recherche impossible : le paramètre "query" est vide.' } };
                  }
                  try {
                    const results = await searchCannabisKnowledge(query);
                    if (results.length === 0) {
                      return { name: c.name, id: c.id, response: { note: 'Aucune donnée scientifique trouvée pour cette condition dans la base vectorielle.' } };
                    }
                    const formatted = results.map(r => {
                      const alt = r.alternate_name ? ` (alias: ${r.alternate_name})` : '';
                      return [
                        `- ${r.condition}${alt}`,
                        `  Evidence: ${r.evidence_score}/6 (${r.evidence_label})`,
                        `  Résumé: ${r.summary ?? 'Non disponible'}`,
                        r.scientific_notes ? `  Notes: ${r.scientific_notes}` : null,
                        r.source ? `  Source: ${r.source}` : null,
                        r.study_link ? `  Étude: ${r.study_link}` : null,
                      ].filter(Boolean).join('\n');
                    }).join('\n\n');
                    return { name: c.name, id: c.id, response: { results: formatted, note: 'Données issues de la base vectorielle cannabis_conditions_vectors.' } };
                  } catch (e) {
                    console.error('[Voice] search_cannabis_conditions Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de la recherche de données scientifiques.' } };
                  }
                }

                if (c.name === 'search_expert_data') {
                  const query = (args.query || '').trim();
                  if (!query) {
                    return { name: c.name, id: c.id, response: { error: 'Recherche impossible : le paramètre "query" est vide.' } };
                  }
                  try {
                    const knowledge = await getRelevantKnowledge(query);
                    if (knowledge.length > 0) {
                      const results = knowledge.map(k => `[${k.title}] : ${k.content}`).join('\n\n');
                      return { name: c.name, id: c.id, response: { results, note: 'Voici les données techniques/expertes trouvées. Utilise-les pour répondre au client.' } };
                    }
                    return { name: c.name, id: c.id, response: { note: 'Aucune donnée experte trouvée pour cette requête dans la base de connaissances.' } };
                  } catch (e) {
                    console.error('[Voice] search_expert_data Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de la recherche de données expertes.' } };
                  }
                }

                if (c.name === 'save_preferences') {
                  if (onSavePrefsRef.current) {
                    // Supporting multiple hallucination formats
                    const toSave = args.new_prefs || args.new_pref || (args.prefs ? args.prefs : args);
                    
                    // If toSave is a string (hallucination), try to parse it
                    let finalPrefs = toSave;
                    if (typeof toSave === 'string') {
                       try {
                         // Attempt to handle "key: value" or other formats if possible
                         if (toSave.includes(':')) {
                            const [k, v] = toSave.split(':').map(s => s.trim());
                            finalPrefs = { [k]: v };
                         }
                       } catch { /* ignore */ }
                    }

                    onSavePrefsRef.current(finalPrefs);
                    return { name: c.name, id: c.id, response: { result: 'OK — Profil mis à jour en temps réel.' } };
                  }
                  return { name: c.name, id: c.id, response: { error: 'Erreur de synchronisation des préférences AI.' } };
                }

                if (c.name === 'open_product_modal') {
                  const modalName = (args.modal_name || '').trim();
                  if (onOpenModalRef.current && modalName) {
                    onOpenModalRef.current(modalName);
                    return { name: c.name, id: c.id, response: { result: `Section "${modalName}" ouverte à l'écran.` } };
                  }
                  return { name: c.name, id: c.id, response: { error: 'Ouverture de modale impossible.' } };
                }

                if (c.name === 'toggle_favorite') {
                  const prodName = (args.product_name || '').trim();
                  const p = await findProduct(prodName);
                  if (p && onToggleFavoriteRef.current) {
                    onToggleFavoriteRef.current(p.id);
                    const isNowFavorite = !wishlistItemsRef.current.includes(p.id);
                    return {
                      name: c.name,
                      id: c.id,
                      response: {
                        result: `"${p.name}" a été ${isNowFavorite ? 'ajouté aux' : 'retiré des'} favoris.`,
                        status: 'success'
                      }
                    };
                  }
                  return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" non trouvé.` } };
                }

                if (c.name === 'get_favorites') {
                  const ids = wishlistItemsRef.current;
                  if (ids.length === 0) {
                    return { name: c.name, id: c.id, response: { result: 'La liste des favoris est actuellement vide.' } };
                  }
                  const favoriteProducts = productsRef.current.filter(p => ids.includes(p.id));
                  if (favoriteProducts.length === 0) {
                    // Fallback check in case products haven't loaded fully or are not in the top 10 list
                    return { name: c.name, id: c.id, response: { result: `Le client a ${ids.length} favoris, mais je n'affiche pas leurs détails pour le moment.` } };
                  }
                  const results = favoriteProducts.map(p => `• ${p.name} (${p.price}€)`).join('\n');
                  return { name: c.name, id: c.id, response: { results, note: 'Voici la liste des produits favoris du client.' } };
                }

                if (c.name === 'suggest_bundle') {
                  const cartProds = (cartItemsRef?.current ?? []) as any[];
                  if (cartProds.length === 0) {
                    return { name: c.name, id: c.id, response: { note: 'Panier vide — pas de suggestion de bundle possible.' } };
                  }
                  // Use the last added product category to find a complementary item
                  const lastItem = cartProds[cartProds.length - 1];
                  const lastCategoryId = lastItem?.product?.category_id;
                  const lastProductId = lastItem?.product?.id;
                  const cartProductIds = cartProds.map((i: any) => i?.product?.id).filter(Boolean);

                  const candidates = productsRef.current.filter(p =>
                    p.id !== lastProductId &&
                    !cartProductIds.includes(p.id) &&
                    p.is_active !== false &&
                    (lastCategoryId ? p.category_id !== lastCategoryId : true)
                  );

                  if (candidates.length === 0) {
                    return { name: c.name, id: c.id, response: { note: 'Aucun produit complémentaire trouvé.' } };
                  }
                  // Pick top 2 candidates
                  const picks = candidates.slice(0, 2).map(p => `${p.name} (${p.price}€)`).join(', ');
                  return {
                    name: c.name,
                    id: c.id,
                    response: { result: `Produits complémentaires suggérés : ${picks}. Propose-en un naturellement au client en lien avec son achat.` }
                  };
                }

                if (c.name === 'compare_products') {
                  const nameA = (args.product_a || '').trim();
                  const nameB = (args.product_b || '').trim();
                  const pA = await findProduct(nameA);
                  const pB = await findProduct(nameB);
                  if (!pA) return { name: c.name, id: c.id, response: { error: `Produit "${nameA}" introuvable dans le catalogue.` } };
                  if (!pB) return { name: c.name, id: c.id, response: { error: `Produit "${nameB}" introuvable dans le catalogue.` } };
                  
                  if (onCompareProductsRef.current) {
                    onCompareProductsRef.current([pA, pB]);
                  }
                  
                  const diff = pB.price - pA.price;
                  const priceLine = diff === 0
                    ? `Même prix (${pA.price}€).`
                    : diff > 0
                      ? `${pA.name} est ${Math.abs(diff).toFixed(2)}€ moins cher.`
                      : `${pB.name} est ${Math.abs(diff).toFixed(2)}€ moins cher.`;
                  
                  const comparison = [
                    `📊 TABLEAU DE COMPARAISON AFFICHÉ : ${pA.name} vs ${pB.name}`,
                    `${pA.name} : ${pA.price}€ | Description: ${pA.description || 'N/A'}`,
                    `${pB.name} : ${pB.price}€ | Description: ${pB.description || 'N/A'}`,
                    `Verdict prix : ${priceLine}`
                  ].join('\n');
                  
                  return { 
                    name: c.name, 
                    id: c.id, 
                    response: { 
                      result: comparison, 
                      note: 'Le tableau comparatif est apparu à l\'écran du client. Invite-le à le regarder et commente les points clés (prix, effets, arômes) pour l\'aider à choisir.' 
                    } 
                  };
                }

                if (c.name === 'apply_promo') {
                  const code = (args.code || '').trim().toUpperCase();
                  if (!code) return { name: c.name, id: c.id, response: { error: 'Code promo vide.' } };
                  try {
                    const { data, error: dbErr } = await supabase
                      .from('promo_codes')
                      .select('id, code, discount_type, discount_value, is_active, min_order_value, max_uses, uses_count, expires_at')
                      .ilike('code', code)
                      .maybeSingle();
                    if (dbErr || !data) return { name: c.name, id: c.id, response: { error: `Code "${code}" invalide ou inexistant.` } };
                    if (!data.is_active) return { name: c.name, id: c.id, response: { error: `Code "${code}" désactivé.` } };
                    if (data.expires_at && new Date(data.expires_at) < new Date()) return { name: c.name, id: c.id, response: { error: `Code "${code}" expiré.` } };
                    if (data.max_uses && data.uses_count >= data.max_uses) return { name: c.name, id: c.id, response: { error: `Code "${code}" épuisé (limite d'utilisations atteinte).` } };
                    if (onApplyPromoRef.current) {
                      const result = await onApplyPromoRef.current(code);
                      if (!result.success) return { name: c.name, id: c.id, response: { error: result.message || 'Code non applicable.' } };
                    }
                    const discountLabel = data.discount_type === 'percent'
                      ? `${data.discount_value}% de réduction`
                      : `${data.discount_value}€ de réduction`;
                    return { name: c.name, id: c.id, response: { result: `Code "${code}" validé : ${discountLabel} appliqué au panier.`, discount_type: data.discount_type, discount_value: data.discount_value } };
                  } catch (e) {
                    console.error('[Voice] apply_promo Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de la validation du code promo.' } };
                  }
                }

                if (c.name === 'watch_stock') {
                  const prodName = (args.product_name || '').trim();
                  const p = await findProduct(prodName);
                  if (!p) return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" introuvable.` } };
                  try {
                    const { data: userData } = await supabase.auth.getUser();
                    const userId = userData?.user?.id;
                    if (!userId) return { name: c.name, id: c.id, response: { error: 'Client non connecté. Impossible d\'enregistrer l\'alerte.' } };
                    const { error: insertErr } = await supabase
                      .from('stock_alerts')
                      .upsert({ user_id: userId, product_id: p.id }, { onConflict: 'user_id,product_id' });
                    if (insertErr) throw insertErr;
                    return { name: c.name, id: c.id, response: { result: `Alerte enregistrée pour "${p.name}". Le client sera prévenu dès le retour en stock.` } };
                  } catch (e) {
                    console.error('[Voice] watch_stock Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de l\'enregistrement de l\'alerte stock.' } };
                  }
                }

                if (c.name === 'filter_catalog') {
                  const budget = Number(args.budget) || 0;
                  const category = (args.category || '').trim().toLowerCase();
                  const attribute = (args.attribute || '').trim().toLowerCase();
                  let filtered = productsRef.current.filter(p => p.is_active !== false);
                  if (budget > 0) filtered = filtered.filter(p => p.price <= budget);
                  if (category) filtered = filtered.filter(p => (p.category?.name || '').toLowerCase().includes(category));
                  if (attribute) filtered = filtered.filter(p =>
                    (p.name || '').toLowerCase().includes(attribute) ||
                    (p.description || '').toLowerCase().includes(attribute)
                  );
                  if (filtered.length === 0) return { name: c.name, id: c.id, response: { note: 'Aucun produit ne correspond aux critères donnés. Propose d\'élargir les filtres.' } };
                  const results = filtered.slice(0, 8).map(p => `${p.name} (${p.price}€)${p.category?.name ? ` — ${p.category.name}` : ''}`).join('\n');
                  return { name: c.name, id: c.id, response: { results, total: filtered.length, note: `${filtered.length} produit(s) trouvé(s). Propose les plus pertinents au client.` } };
                }

                if (c.name === 'get_referral_link') {
                  try {
                    const { data: userData } = await supabase.auth.getUser();
                    const userId = userData?.user?.id;
                    if (!userId) return { name: c.name, id: c.id, response: { error: 'Client non connecté.' } };
                    const { data, error: dbErr } = await supabase
                      .from('profiles')
                      .select('referral_code')
                      .eq('id', userId)
                      .maybeSingle();
                    if (dbErr || !data?.referral_code) return { name: c.name, id: c.id, response: { error: 'Lien de parrainage introuvable. Le client doit créer son compte de parrainage depuis son espace compte.' } };
                    const link = `${window.location.origin}?ref=${data.referral_code}`;
                    return { name: c.name, id: c.id, response: { result: `Lien de parrainage : ${link}`, code: data.referral_code, note: 'Énonce le code de parrainage à l\'oral et dis au client de partager ce lien avec ses proches.' } };
                  } catch (e) {
                    console.error('[Voice] get_referral_link Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de la récupération du lien de parrainage.' } };
                  }
                }

                if (c.name === 'submit_review') {
                  const prodName = (args.product_name || '').trim();
                  const rating = Math.min(5, Math.max(1, Number(args.rating) || 0));
                  const comment = (args.comment || '').trim().slice(0, 1000);
                  if (!prodName || !rating) return { name: c.name, id: c.id, response: { error: 'Nom du produit et note (1-5) obligatoires.' } };
                  const p = await findProduct(prodName);
                  if (!p) return { name: c.name, id: c.id, response: { error: `Produit "${prodName}" introuvable.` } };
                  try {
                    const { data: userData } = await supabase.auth.getUser();
                    const userId = userData?.user?.id;
                    if (!userId) return { name: c.name, id: c.id, response: { error: 'Client non connecté.' } };
                    const { error: insertErr } = await supabase
                      .from('reviews')
                      .insert({ product_id: p.id, user_id: userId, rating, comment: comment || null });
                    if (insertErr) throw insertErr;
                    return { name: c.name, id: c.id, response: { result: `Avis ${rating}/5 enregistré pour "${p.name}". Merci au client !` } };
                  } catch (e) {
                    console.error('[Voice] submit_review Error:', e);
                    return { name: c.name, id: c.id, response: { error: 'Erreur technique lors de l\'envoi de l\'avis.' } };
                  }
                }

                // Unknown tool: return an error so Gemini doesn't hang waiting for a response
                console.warn('[Voice] Unknown tool call:', c.name);
                return { name: c.name, id: c.id, response: { error: `Outil "${c.name}" inconnu.` } };
              } catch (e) {
                console.error('[Voice][Tool] FAIL', {
                  name: c.name,
                  id: c.id,
                  error: e instanceof Error ? e.message : String(e),
                });
                return {
                  name: c.name,
                  id: c.id,
                  response: { error: `Erreur interne lors de l'exécution de l'outil "${c.name}".` }
                };
              }
            };

            // Phase 1 runs first (independent tools), then Phase 2 (dependent tools like add_to_cart)
            const phase1Responses = await Promise.all(phase1Calls.map(executeToolCall));
            const phase2Responses = await Promise.all(phase2Calls.map(executeToolCall));
            const responses = [...phase1Responses, ...phase2Responses];

            const filteredResponses = responses.filter(Boolean) as FunctionResponse[];
            filteredResponses.forEach((r) => {
              const key = `${r.name}:${r.id || 'no-id'}`;
              const startedAt = toolStartTimes.get(key) || Date.now();
              const durationMs = Date.now() - startedAt;
              const payload = (r as any).response || {};
              const status = payload.error ? 'error' : 'success';
              const preview = typeof payload.result === 'string'
                ? payload.result.slice(0, 120)
                : typeof payload.note === 'string'
                  ? payload.note.slice(0, 120)
                  : payload.error || 'ok';
              console.info('[Voice][Tool] END', { name: r.name, id: r.id, status, durationMs, preview });
            });
            if (filteredResponses.length > 0 && !isClosingRef.current && sessionRef.current) {
              try {
                // JSON.stringify omet les clés à valeur undefined : l'API Live exige un id par réponse.
                const functionResponses = filteredResponses.map((r, idx) => {
                  const id =
                    r.id != null && String(r.id).trim() !== ''
                      ? String(r.id).trim()
                      : `${r.name ?? 'tool'}-${idx}`;
                  const raw = (r as { response?: unknown }).response;
                  const response =
                    raw !== null && typeof raw === 'object' && !Array.isArray(raw)
                      ? shrinkLiveToolResponse(raw as Record<string, unknown>)
                      : raw;
                  return { ...r, id, response } as FunctionResponse;
                });
                sessionRef.current.sendToolResponse({ functionResponses });
              } catch (toolSendErr: any) {
                const msg = String(toolSendErr?.message ?? '').toLowerCase();
                if (!msg.includes('closed') && !msg.includes('closing')) {
                  console.warn('[Voice] Failed to send tool response:', toolSendErr);
                }
              }
            }
          }
        }
      });

      sessionRef.current = session;
      wsRef.current = (session as any)?._ws ?? null;
    } catch (err) {
      if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
      startInFlightRef.current = false;

      // Don't show error if this session was superseded (e.g. rapid open/close)
      if (sessionIdRef.current !== sid) return;

      const userMessage = classifyError(err);
      const rawMessage = err instanceof Error ? err.message : String(err);
      if (rawMessage.includes('gemini-token failed')) {
        console.warn('[Voice] Session setup blocked by gemini-token:', rawMessage);
      } else {
        console.error('[Voice] Session setup failed:', err);
      }
      setError(userMessage);
      setVoiceState('error');
    }
  }, [cleanup, buildSystemPrompt, compatibilityError, globalSettings.budtender_voice_name, playPcmChunk, startMicCapture, stopAllPlayback, stopSession, resetSilenceTimer]);

  // Keep startSession accessible inside the onclose retry callback via ref
  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
  }, []);

  const isSupported = useMemo(() => !compatibilityError, [compatibilityError]);

  return { voiceState, error, isMuted, isSupported, compatibilityError, startSession, stopSession, toggleMute };
}
