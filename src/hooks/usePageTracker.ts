import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';

// Pages that should not be tracked (admin-only, internal screens)
const IGNORED_PREFIXES = ['/admin', '/pos', '/customer-display', '/store-display'];
const TRACK_DEDUP_MS = 1500;
let lastGlobalTrackedPath: string | null = null;
let lastGlobalTrackedAt = 0;

/**
 * Tracks a `page_view` event every time the route pathname changes.
 * Must be called inside a component that lives within <BrowserRouter>.
 */
export function usePageTracker(): void {
  const location = useLocation();
  const lastTracked = useRef<string | null>(null);
  const trackPageView = useCallback((path: string) => {
    trackEvent('page_view', path);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix))) return;
    if (path === lastTracked.current) return;
    const now = Date.now();
    if (path === lastGlobalTrackedPath && now - lastGlobalTrackedAt < TRACK_DEDUP_MS) return;
    lastTracked.current = path;
    lastGlobalTrackedPath = path;
    lastGlobalTrackedAt = now;
    trackPageView(path);
  }, [location.pathname, trackPageView]);
}
