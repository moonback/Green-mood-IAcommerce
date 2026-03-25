import { useCallback, useEffect, useRef } from 'react';

export const CUSTOMER_DISPLAY_CHANNEL = 'green-mood-customer-display';
export const CUSTOMER_DISPLAY_STORAGE_KEY = 'green-mood-customer-display:last-cart';

interface CartUpdatePayload {
  type: 'CART_UPDATE';
  cart: unknown[];
  sentAt: number;
  [key: string]: unknown;
}

interface UseCustomerDisplayChannelOptions {
  onMessage?: (data: CartUpdatePayload | unknown) => void;
}

interface UseCustomerDisplayChannelReturn {
  isSupported: boolean;
  broadcastMessage: (payload: unknown) => void;
  broadcastCartUpdate: (cart: unknown[], metadata?: Record<string, unknown>) => void;
}

/**
 * Shared hook used by both POS and customer display windows.
 * - POS window calls `broadcastCartUpdate(cart, metadata)` whenever the cart changes.
 * - Customer display subscribes through `onMessage` to render updates in real-time.
 */
export function useCustomerDisplayChannel(
  { onMessage }: UseCustomerDisplayChannelOptions = {}
): UseCustomerDisplayChannelReturn {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSupported = typeof window !== 'undefined' && 'BroadcastChannel' in window;

  useEffect(() => {
    if (!isSupported) {
      return undefined;
    }

    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    channelRef.current = channel;

    if (onMessage) {
      channel.onmessage = (event: MessageEvent) => {
        onMessage(event.data);
      };
    }

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [isSupported, onMessage]);

  const broadcastMessage = useCallback((payload: unknown) => {
    if (!channelRef.current || !payload) {
      return;
    }

    channelRef.current.postMessage(payload);
  }, []);

  const broadcastCartUpdate = useCallback((cart: unknown[], metadata: Record<string, unknown> = {}) => {
    const payload: CartUpdatePayload = {
      type: 'CART_UPDATE',
      cart,
      ...metadata,
      sentAt: Date.now(),
    };

    try {
      window.localStorage.setItem(CUSTOMER_DISPLAY_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures (private browsing / quota / SSR).
    }

    broadcastMessage(payload);
  }, [broadcastMessage]);

  return {
    isSupported,
    broadcastMessage,
    broadcastCartUpdate,
  };
}
