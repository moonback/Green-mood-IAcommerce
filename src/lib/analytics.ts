/**
 * analytics.ts — Fire-and-forget event tracking for the analytics_events table.
 *
 * Used by:
 *  - usePageTracker (page_view on route change)
 *  - cartStore.addItem (cart_add)
 *  - Checkout.handlePrepareOrder (checkout_start)
 *  - Checkout.handlePaymentSuccess (purchase)
 *  - Checkout.handleCancelOrder (cart_abandon)
 */

import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

export type AnalyticsEventType =
  | 'page_view'
  | 'cart_add'
  | 'checkout_start'
  | 'purchase'
  | 'cart_abandon';

const SESSION_KEY = 'esil_analytics_sid';
const EVENT_DEDUP_WINDOW_MS = 1500;
let lastEventKey: string | null = null;
let lastEventTs = 0;

// ─── Session ID ───────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// ─── UTM params (cached for the session) ─────────────────────────────────────

let _utmCache: { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null } | null = null;

function getUtm() {
  if (_utmCache) return _utmCache;
  if (typeof window === 'undefined') return { utm_source: null, utm_medium: null, utm_campaign: null };
  const p = new URLSearchParams(window.location.search);
  _utmCache = {
    utm_source: p.get('utm_source'),
    utm_medium: p.get('utm_medium'),
    utm_campaign: p.get('utm_campaign'),
  };
  return _utmCache;
}

// ─── Referrer → source label ──────────────────────────────────────────────────

export function parseReferrerSource(referrer: string | null): string {
  if (!referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace('www.', '');
    if (host.includes('google'))    return 'google';
    if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('tiktok'))    return 'tiktok';
    if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
    if (host.includes('youtube'))   return 'youtube';
    if (host.includes('bing'))      return 'bing';
    return host || 'other';
  } catch {
    return 'other';
  }
}

// ─── Main track function ──────────────────────────────────────────────────────

export function trackEvent(
  eventType: AnalyticsEventType,
  page?: string,
  payload?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;

  const { user } = useAuthStore.getState();
  const utm = getUtm();
  const resolvedPage = page ?? window.location.pathname;
  const eventKey = `${eventType}:${resolvedPage}`;
  const now = Date.now();

  if (eventKey === lastEventKey && now - lastEventTs < EVENT_DEDUP_WINDOW_MS) {
    return;
  }
  lastEventKey = eventKey;
  lastEventTs = now;

  const record = {
    session_id:   getSessionId(),
    user_id:      user?.id ?? null,
    event_type:   eventType,
    page:         resolvedPage,
    referrer:     document.referrer || null,
    utm_source:   utm.utm_source,
    utm_medium:   utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    payload:      payload ?? {},
  };

  // Intentionally fire-and-forget — never block UI interactions
  supabase
    .from('analytics_events')
    .insert(record)
    .then(({ error }) => {
      if (error) console.warn('[Analytics]', error.message);
    });
}
