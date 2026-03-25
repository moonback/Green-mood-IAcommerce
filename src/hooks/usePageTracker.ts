import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';

// Pages that should not be tracked (admin-only, internal screens)
const IGNORED_PREFIXES = ['/admin', '/pos', '/customer-display', '/store-display'];

/**
 * Tracks a `page_view` event every time the route pathname changes.
 * Must be called inside a component that lives within <BrowserRouter>.
 */
export function usePageTracker(): void {
  const location = useLocation();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix))) return;
    if (path === lastTracked.current) return;
    lastTracked.current = path;
    trackEvent('page_view', path);
  }, [location.pathname]);
}
