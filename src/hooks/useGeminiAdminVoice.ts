import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { GoogleGenAI, type FunctionResponse, type LiveServerMessage, type Session } from '@google/genai';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import { getAdminVoicePrompt } from '../lib/adminVoicePrompts';
import { useSettingsStore } from '../store/settingsStore';
// Shared audio utilities (Axe 5: deduplicated core)
import {
  toBase64, wait, classifyError, getAdaptiveScheduleAhead,
  NON_RETRYABLE_CODES, INPUT_SAMPLE_RATE, OUTPUT_SAMPLE_RATE,
} from './audio/audioHelpers';
import type { VoiceState } from './audio/types';
export type { VoiceState } from './audio/types';
import { usePlaybackWorklet } from './audio';

// Stable GA model — the preview model has a known 1008 bug with function calling
const LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';
const ADMIN_VOICE_NAME = 'Aoede';

const CONNECTION_TIMEOUT_MS = 18000;
const MAX_AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const TOKEN_MAX_RETRIES = 2;
const TOKEN_RETRY_DELAY_MS = 1200;

// ── Hook ─────────────────────────────────────────────────────────────────────

interface Options {
  adminName: string;
  storeName: string;
  onNavigate?: (tab: string) => void;
  onCloseSession?: () => void;
}

export function useGeminiAdminVoice({ adminName, storeName, onNavigate, onCloseSession }: Options) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const settings = useSettingsStore(s => s.settings);

  const [compatibilityError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    if (!window.isSecureContext) return 'HTTPS requis pour le microphone.';
    if (!navigator.mediaDevices?.getUserMedia) return 'Microphone non supporté sur ce navigateur.';
    if (!('audioWorklet' in AudioContext.prototype)) return 'AudioWorklet non supporté sur ce navigateur.';
    return null;
  });

  // Stable refs for callbacks
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;
  const onCloseSessionRef = useRef(onCloseSession);
  onCloseSessionRef.current = onCloseSession;

  // Audio / session refs
  const sessionRef = useRef<Session | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const playback = usePlaybackWorklet();
  const interruptedRef = useRef(false);
  const setupTimeoutRef = useRef<number | null>(null);
  const startInFlightRef = useRef(false);
  const sessionIdRef = useRef(0);
  const isManualCloseRef = useRef(false);
  const canStreamInputRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const startSessionRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const buildSystemPrompt = useCallback((): string => {
    return getAdminVoicePrompt(adminName, storeName, settings.budtender_name || 'Manon');
  }, [adminName, storeName, settings.budtender_name]);

  const canSendRealtimeInput = useCallback(() => {
    if (!sessionRef.current || !canStreamInputRef.current || isManualCloseRef.current) return false;
    const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
    if (!ws || typeof ws.readyState !== 'number') return true;
    return typeof WebSocket === 'undefined' || ws.readyState === WebSocket.OPEN;
  }, []);

  const stopAllPlayback = useCallback(() => {
    interruptedRef.current = true;
    playback.clear();
  }, [playback]);

  const cleanup = useCallback(() => {
    isManualCloseRef.current = true;
    canStreamInputRef.current = false;
    wsRef.current = null;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
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
    playback.dispose();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    isMutedRef.current = false;
    interruptedRef.current = false;
    startInFlightRef.current = false;
    sessionIdRef.current += 1;
  }, [stopAllPlayback]);

  useEffect(() => cleanup, [cleanup]);

  const stopSession = useCallback(() => {
    retryCountRef.current = 0;
    cleanup();
    setVoiceState('idle');
    setIsMuted(false);
  }, [cleanup]);

  const playPcmChunk = useCallback((base64: string) => {
    if (interruptedRef.current) return;
    if (playback.isInitialized.current) {
      playback.feedChunk(base64);
      setVoiceState('speaking');
    }
  }, [playback]);

  const startMicCapture = useCallback(async (stream: MediaStream) => {
    const ctx = new AudioContext();
    captureCtxRef.current = ctx;
    await ctx.audioWorklet.addModule('/audio-processor.js');
    const source = ctx.createMediaStreamSource(stream);
    const worklet = new AudioWorkletNode(ctx, 'mic-processor');
    processorRef.current = worklet;

    // The AudioWorklet now handles downsample + RMS + Int16 conversion inline,
    // so we receive ready-to-send { rms, pcm } directly — no extra Worker needed.
    worklet.port.onmessage = (e) => {
      if (isMutedRef.current || !canSendRealtimeInput()) return;
      try {
        const ws = wsRef.current ?? (sessionRef.current as any)?._ws;
        if (ws && ws.readyState !== WebSocket.OPEN) return;
      } catch { /* ignore */ }
      try {
        const { pcm } = e.data;
        const audioData = new Uint8Array(pcm.buffer);
        if (audioData.length === 0) return;
        sessionRef.current?.sendRealtimeInput({
          audio: { mimeType: 'audio/pcm', data: toBase64(audioData) }
        });
      } catch (err: any) {
        const msg = String(err?.message ?? err).toLowerCase();
        if (msg.includes('closed') || msg.includes('closing') || msg.includes('invalid state')) return;
        console.warn('[AdminVoice] Mic capture error:', err);
      }
    };

    const silent = ctx.createGain();
    silent.gain.value = 0;
    source.connect(worklet);
    worklet.connect(silent);
    silent.connect(ctx.destination);
  }, [canSendRealtimeInput]);

  // ── Tool handlers ─────────────────────────────────────────────────────────

  const handleToolCall = useCallback(async (
    name: string,
    id: string | undefined,
    args: Record<string, any>
  ): Promise<FunctionResponse> => {

    // ── query_dashboard ───────────────────────────────────────────────────
    if (name === 'query_dashboard') {
      try {
        const period = (args.period || 'today') as string;
        const now = new Date();
        let startDate: string;
        if (period === 'week') {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          startDate = d.toISOString();
        } else if (period === 'month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        }

        const [
          { data: periodOrders },
          { data: pendingOrders },
          { data: lowStock },
          { data: outOfStock },
          { data: customers },
        ] = await Promise.all([
          supabase.from('orders').select('total, payment_status').gte('created_at', startDate),
          supabase.from('orders').select('id').in('status', ['pending', 'paid', 'processing']),
          supabase.from('products').select('name, stock_quantity').gt('stock_quantity', 0).lte('stock_quantity', 5),
          supabase.from('products').select('name').eq('stock_quantity', 0).limit(5),
          supabase.from('profiles').select('id').gte('created_at', startDate),
        ]);

        const paidOrders = (periodOrders ?? []).filter(o => o.payment_status === 'paid');
        const revenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
        const periodLabel = period === 'week' ? '7 derniers jours' : period === 'month' ? 'ce mois' : "aujourd'hui";

        const result = [
          `Période : ${periodLabel}`,
          `CA : ${revenue.toFixed(2)} €`,
          `Commandes (payées) : ${paidOrders.length}`,
          `En attente de traitement : ${pendingOrders?.length ?? 0}`,
          `Nouveaux clients : ${customers?.length ?? 0}`,
          lowStock && lowStock.length > 0 ? `Stock faible (≤5) : ${lowStock.map(p => p.name).join(', ')}` : 'Aucun stock critique',
          outOfStock && outOfStock.length > 0 ? `Ruptures : ${outOfStock.map(p => p.name).join(', ')}` : 'Aucune rupture',
        ].join(' | ');

        return { name, id, response: { result } };
      } catch (e) {
        console.error('[AdminVoice] query_dashboard error:', e);
        return { name, id, response: { error: 'Impossible de récupérer les statistiques.' } };
      }
    }

    // ── search_orders ─────────────────────────────────────────────────────
    if (name === 'search_orders') {
      try {
        const status = (args.status || '').trim();
        const search = (args.search || '').trim();
        const customerName = (args.customer_name || '').trim();
        const limit = Number(args.limit) || 8;

        // If filtering by customer name, find matching user IDs first
        let userIds: string[] | null = null;
        if (customerName) {
          const { data: matchedProfiles } = await supabase
            .from('profiles')
            .select('id')
            .ilike('full_name', `%${customerName}%`)
            .limit(20);
          userIds = matchedProfiles?.map(p => p.id) ?? [];
          if (userIds.length === 0) {
            return { name, id, response: { result: `Aucun client trouvé avec le nom "${customerName}".` } };
          }
        }

        let query = supabase
          .from('orders')
          .select('id, created_at, status, total, payment_status, delivery_type, notes, profile:profiles!user_id(full_name, email, phone), order_items(product_name, quantity, unit_price), address:addresses(street, city, postal_code)')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (status) query = query.eq('status', status);
        if (search) query = query.ilike('id', `%${search}%`);
        if (userIds) query = query.in('user_id', userIds);

        const { data, error: err } = await query;
        if (err) throw err;

        if (!data || data.length === 0) {
          return { name, id, response: { result: 'Aucune commande trouvée avec ces critères.' } };
        }

        const result = data.map(o => {
          const profile = o.profile as any;
          const customer = profile?.full_name || profile?.email || 'Client inconnu';
          const phone = profile?.phone ? ` (${profile.phone})` : '';
          const items = (o.order_items as any[] ?? []);
          const itemsSummary = items.length > 0
            ? items.map((i: any) => `${i.product_name} x${i.quantity} (${Number(i.unit_price).toFixed(2)} €)`).join(', ')
            : 'aucun article';
          const deliveryLabel = o.delivery_type === 'click_collect' ? 'click & collect'
            : o.delivery_type === 'in_store' ? 'en boutique' : 'livraison';
          const addr = o.address as any;
          const addrStr = addr ? ` — livraison: ${addr.street}, ${addr.postal_code} ${addr.city}` : '';
          return `#${o.id.slice(0, 8)} | Client: ${customer}${phone} | ${new Date(o.created_at).toLocaleDateString('fr-FR')} | statut: ${o.status} | ${Number(o.total).toFixed(2)} € | ${deliveryLabel}${addrStr} | articles: ${itemsSummary}${o.notes ? ` | note: ${o.notes}` : ''}`;
        }).join(' || ');

        return { name, id, response: { result: `${data.length} commande(s) : ${result}` } };
      } catch (e) {
        console.error('[AdminVoice] search_orders error:', e);
        return { name, id, response: { error: 'Impossible de récupérer les commandes.' } };
      }
    }

    // ── search_customers ──────────────────────────────────────────────────
    if (name === 'search_customers') {
      try {
        const search = (args.search || '').trim();
        const limit = Number(args.limit) || 5;
        if (!search) {
          return { name, id, response: { error: 'Paramètre "search" requis pour cette recherche.' } };
        }

        const { data: profiles, error: err } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, loyalty_points, created_at, birthday')
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
          .limit(limit);

        if (err) throw err;

        if (!profiles || profiles.length === 0) {
          return { name, id, response: { result: `Aucun client trouvé pour "${search}".` } };
        }

        const profileIds = profiles.map(p => p.id);

        // Fetch default addresses + recent orders in parallel
        const [{ data: addresses }, { data: recentOrders }] = await Promise.all([
          supabase
            .from('addresses')
            .select('user_id, street, city, postal_code, is_default')
            .in('user_id', profileIds)
            .eq('is_default', true),
          supabase
            .from('orders')
            .select('id, user_id, created_at, total, status, order_items(product_name, quantity)')
            .in('user_id', profileIds)
            .order('created_at', { ascending: false })
            .limit(profileIds.length * 3),
        ]);

        const addressMap = new Map((addresses ?? []).map(a => [a.user_id, a]));
        const ordersByUser = new Map<string, any[]>();
        for (const o of (recentOrders ?? [])) {
          if (!ordersByUser.has(o.user_id)) ordersByUser.set(o.user_id, []);
          if (ordersByUser.get(o.user_id)!.length < 3) ordersByUser.get(o.user_id)!.push(o);
        }

        const result = profiles.map(c => {
          const addr = addressMap.get(c.id);
          const orders = ordersByUser.get(c.id) ?? [];
          const memberSince = new Date(c.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          const lastOrder = orders[0];
          const lastOrderStr = lastOrder
            ? `dernière commande ${new Date(lastOrder.created_at).toLocaleDateString('fr-FR')} — ${Number(lastOrder.total).toFixed(2)} €`
            : 'aucune commande';
          const recentItems = lastOrder?.order_items?.slice(0, 2).map((i: any) => i.product_name).join(', ') || '';
          const addrStr = addr ? `${addr.city} (${addr.postal_code})` : 'adresse non renseignée';
          return [
            `${c.full_name || 'Sans nom'}`,
            c.email ? `email: ${c.email}` : null,
            c.phone ? `tél: ${c.phone}` : null,
            `${c.loyalty_points ?? 0} ${settings.loyalty_currency_name}`,
            `membre depuis ${memberSince}`,
            `ville: ${addrStr}`,
            `${orders.length} commande(s)`,
            lastOrderStr,
            recentItems ? `articles récents: ${recentItems}` : null,
            c.birthday ? `anniversaire: ${new Date(c.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : null,
          ].filter(Boolean).join(' — ');
        }).join(' || ');

        return { name, id, response: { result: `${profiles.length} client(s) : ${result}` } };
      } catch (e) {
        console.error('[AdminVoice] search_customers error:', e);
        return { name, id, response: { error: 'Impossible de récupérer les clients.' } };
      }
    }

    // ── check_stock ───────────────────────────────────────────────────────
    if (name === 'check_stock') {
      try {
        const productName = (args.product_name || '').trim();

        let query = supabase
          .from('products')
          .select('name, stock_quantity, is_available')
          .order('stock_quantity');

        if (productName) {
          query = query.ilike('name', `%${productName}%`).limit(10);
        } else {
          query = query.lte('stock_quantity', 5).limit(15);
        }

        const { data, error: err } = await query;
        if (err) throw err;

        if (!data || data.length === 0) {
          return { name, id, response: { result: productName ? `Produit "${productName}" non trouvé.` : 'Aucun produit en stock faible.' } };
        }

        const result = data.map(p =>
          `${p.name} : ${p.stock_quantity} unité(s)${!p.is_available ? ' [désactivé]' : ''}`
        ).join(' | ');

        return { name, id, response: { result } };
      } catch (e) {
        console.error('[AdminVoice] check_stock error:', e);
        return { name, id, response: { error: 'Impossible de vérifier le stock.' } };
      }
    }

    // ── search_products ───────────────────────────────────────────────────
    if (name === 'search_products') {
      try {
        const queryStr = (args.query || '').trim();
        const limit = Number(args.limit) || 8;
        if (!queryStr) {
          return { name, id, response: { error: 'Paramètre "query" requis pour la recherche produit.' } };
        }

        const { data, error: err } = await supabase
          .from('products')
          .select('name, price, stock_quantity, is_active, category:categories(name)')
          .ilike('name', `%${queryStr}%`)
          .limit(limit);

        if (err) throw err;

        if (!data || data.length === 0) {
          return { name, id, response: { result: `Aucun produit trouvé pour "${queryStr}".` } };
        }

        const result = data.map(p => {
          const cat = (p.category as any)?.name || '';
          return `${p.name}${cat ? ` (${cat})` : ''} — ${Number(p.price).toFixed(2)} € — Stock : ${p.stock_quantity}${!p.is_active ? ' [inactif]' : ''}`;
        }).join(' | ');

        return { name, id, response: { result } };
      } catch (e) {
        console.error('[AdminVoice] search_products error:', e);
        return { name, id, response: { error: 'Impossible de rechercher les produits.' } };
      }
    }

    // ── update_order_status ───────────────────────────────────────────────
    if (name === 'update_order_status') {
      try {
        const orderId = (args.order_id || '').trim();
        const newStatus = (args.status || '').trim();
        const notes = (args.notes || '').trim();

        if (!orderId || !newStatus) {
          return { name, id, response: { error: 'order_id et status sont requis.' } };
        }

        // Support partial ID — find the matching order first
        const { data: found, error: findErr } = await supabase
          .from('orders')
          .select('id, status')
          .ilike('id', `%${orderId}%`)
          .limit(1)
          .single();

        if (findErr || !found) {
          return { name, id, response: { result: `Aucune commande trouvée pour l'identifiant "${orderId}".` } };
        }

        const updateData: Record<string, string> = { status: newStatus };
        if (notes) updateData.notes = notes;

        const { error: updateErr } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', found.id);

        if (updateErr) throw updateErr;

        return {
          name, id, response: {
            result: `Commande #${found.id.slice(0, 8)} mise à jour : ${found.status} → ${newStatus}${notes ? ` — note: "${notes}"` : ''}.`,
          },
        };
      } catch (e) {
        console.error('[AdminVoice] update_order_status error:', e);
        return { name, id, response: { error: 'Impossible de mettre à jour la commande.' } };
      }
    }

    // ── update_customer_points ────────────────────────────────────────────
    if (name === 'update_customer_points') {
      try {
        const search = (args.customer_name || '').trim();
        const points = Number(args.points);
        const mode = (args.mode || 'add') as 'add' | 'set';

        if (!search || isNaN(points)) {
          return { name, id, response: { error: 'customer_name et points sont requis.' } };
        }

        const { data: profiles, error: findErr } = await supabase
          .from('profiles')
          .select('id, full_name, loyalty_points')
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
          .limit(1);

        if (findErr || !profiles || profiles.length === 0) {
          return { name, id, response: { result: `Aucun client trouvé pour "${search}".` } };
        }

        const customer = profiles[0];
        const newPoints = mode === 'set' ? points : (customer.loyalty_points ?? 0) + points;

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ loyalty_points: newPoints })
          .eq('id', customer.id);

        if (updateErr) throw updateErr;

        const direction = mode === 'set' ? `fixés à` : points >= 0 ? `+${points} →` : `${points} →`;
        return {
          name, id, response: {
            result: `${settings.loyalty_currency_name} de ${customer.full_name} : ${direction} ${newPoints}.`,
          },
        };
      } catch (e) {
        console.error('[AdminVoice] update_customer_points error:', e);
        return { name, id, response: { error: 'Impossible de mettre à jour les points.' } };
      }
    }

    // ── navigate_admin ────────────────────────────────────────────────────
    if (name === 'navigate_admin') {
      const tab = (args.tab || '').trim();
      if (tab && onNavigateRef.current) {
        onNavigateRef.current(tab);
        return { name, id, response: { result: `Navigation vers "${tab}" effectuée.` } };
      }
      return { name, id, response: { error: `Onglet "${tab}" non reconnu.` } };
    }

    // ── close_session ─────────────────────────────────────────────────────
    if (name === 'close_session') {
      setTimeout(() => {
        stopSession();
        onCloseSessionRef.current?.();
      }, 2500);
      return { name, id, response: { result: 'Session vocale en cours de fermeture.' } };
    }

    console.warn('[AdminVoice] Unknown tool call:', name);
    return { name, id, response: { error: `Outil "${name}" inconnu.` } };
  }, [stopSession]);

  // ── startSession ──────────────────────────────────────────────────────────

  const startSession = useCallback(async () => {
    if (startInFlightRef.current) return;
    cleanup();
    isManualCloseRef.current = false;
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

    setupTimeoutRef.current = window.setTimeout(() => {
      if (sessionIdRef.current === sid && startInFlightRef.current) {
        setError('Délai de connexion dépassé. Vérifiez votre connexion internet.');
        stopSession();
      }
    }, CONNECTION_TIMEOUT_MS);

    try {
      let tokenData: { token?: string } | null = null;
      let tokenErrorMessage = '';
      const voiceSystemPrompt = buildSystemPrompt();

      for (let attempt = 0; attempt <= TOKEN_MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              model: LIVE_MODEL,
              systemInstruction: voiceSystemPrompt,
              voiceName: ADMIN_VOICE_NAME,
              assistantType: 'admin',
            })
          });

          if (!response.ok) {
            const raw = await response.text();
            tokenErrorMessage = `Status ${response.status}: ${raw}`;
            throw new Error(`Erreur réseau (${response.status})`);
          }

          const data = await response.json();
          if (data?.token) {
            tokenData = data;
            break;
          } else {
            tokenErrorMessage = 'Token introuvable dans la réponse JSON';
            throw new Error(tokenErrorMessage);
          }
        } catch (err: any) {
          tokenErrorMessage = err.message || 'Token Gemini manquant';
        }

        if (attempt < TOKEN_MAX_RETRIES) {
          const delay = TOKEN_RETRY_DELAY_MS * (attempt + 1);
          console.warn(`[AdminVoice] Token retry ${attempt + 1}/${TOKEN_MAX_RETRIES} in ${delay}ms`);
          await wait(delay);
        }
      }

      if (!tokenData?.token) {
        throw new Error(`gemini-token failed: ${tokenErrorMessage}`);
      }

      // Axe 3: AEC + noise suppression for superior audio quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: INPUT_SAMPLE_RATE },
        }
      });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: tokenData.token, httpOptions: { apiVersion: 'v1alpha' } });

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        callbacks: {
          onopen: async () => {
            if (sessionIdRef.current !== sid) return;
            if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
            canStreamInputRef.current = true;
            const isRetry = retryCountRef.current > 0;
            retryCountRef.current = 0;
            setVoiceState('listening');
            await startMicCapture(stream);
            startInFlightRef.current = false;
            await playback.init(() => {
              if (!interruptedRef.current) {
                setVoiceState('listening');
              }
            });

            if (!isRetry) {
              const greeting = adminName
                ? `[START SESSION] Salue brièvement ${adminName} et demande en quoi tu peux l'aider aujourd'hui.`
                : '[START SESSION] Salue et demande en quoi tu peux aider.';
              sessionRef.current?.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: greeting }] }],
                turnComplete: true,
              });
            }
          },

          onerror: (e: ErrorEvent) => {
            if (sessionIdRef.current !== sid) return;
            canStreamInputRef.current = false;
            console.error('[AdminVoice] Live error:', e);
            startInFlightRef.current = false;
          },

          onclose: (e: CloseEvent) => {
            if (sessionIdRef.current !== sid || isManualCloseRef.current) return;
            canStreamInputRef.current = false;
            startInFlightRef.current = false;

            // Code 1000: Gemini closed cleanly after completing a turn (normal behavior).
            // Silently reconnect so the admin can keep talking without restarting manually.
            // Code 1001: browser/tab unloaded — do not reconnect.
            if (e.code === 1001) {
              stopSession();
              return;
            }

            const canRetry =
              (e.code === 1000 || !NON_RETRYABLE_CODES.has(e.code)) &&
              retryCountRef.current < MAX_AUTO_RETRIES;

            if (canRetry) {
              retryCountRef.current += 1;
              const attempt = retryCountRef.current;
              // Code 1000 reconnects are silent (no error banner, short delay)
              const delay = e.code === 1000 ? 600 : RETRY_DELAY_MS * attempt;
              if (e.code !== 1000) {
                setError(`Reconnexion automatique (${attempt}/${MAX_AUTO_RETRIES})…`);
              }
              setVoiceState('connecting');

              retryTimerRef.current = window.setTimeout(() => {
                if (isManualCloseRef.current) return;
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
                playback.dispose();
                interruptedRef.current = false;
                startSessionRef.current?.();
              }, delay);
            } else {
              const reason = e.reason ? `(${e.reason})` : `(code ${e.code})`;
              setError(`Session interrompue ${reason}. Appuyez sur "Réessayer".`);
              setVoiceState('error');
              cleanup();
            }
          },

          onmessage: async (msg: LiveServerMessage) => {
            if (sessionIdRef.current !== sid) return;

            const setupTurn = () => {
              setVoiceState('listening');
            };

            if (msg.serverContent) {
              if (msg.serverContent.interrupted) {
                stopAllPlayback();
                setupTurn();
                return;
              }
              if (msg.serverContent.turnComplete) {
                setupTurn();
                return;
              }
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

            const responses = await Promise.all(
              calls.map(c => handleToolCall(c.name ?? '', c.id, (c.args || {}) as Record<string, any>))
            );

            const valid = responses.filter(Boolean) as FunctionResponse[];
            if (valid.length > 0) {
              sessionRef.current?.sendToolResponse({ functionResponses: valid });
            }
          },
        },
      });

      sessionRef.current = session;
      wsRef.current = (session as any)?._ws ?? null;
    } catch (err) {
      if (setupTimeoutRef.current) clearTimeout(setupTimeoutRef.current);
      startInFlightRef.current = false;
      if (sessionIdRef.current !== sid) return;
      const userMessage = classifyError(err);
      console.error('[AdminVoice] Session setup failed:', err);
      setError(userMessage);
      setVoiceState('error');
    }
  }, [cleanup, buildSystemPrompt, compatibilityError, playPcmChunk, startMicCapture, stopAllPlayback, stopSession, handleToolCall, adminName]);

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
