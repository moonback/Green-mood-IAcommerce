import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useCartStore } from '../../store/cartStore';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../store/settingsStore';
import { makeProduct } from '../../test/utils';
import FreeShippingGauge from '../FreeShippingGauge';

// Mock supabase — FreeShippingGauge fetches product suggestions
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: (resolve: (v: any) => any) => Promise.resolve({ data: [] }).then(resolve),
    })),
  },
}));

// Mock authStore — FreeShippingGauge uses useAuthStore for tier logic
vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(() => ({ profile: null })),
}));

describe('FreeShippingGauge', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.setState({ items: [], isOpen: false, deliveryType: 'click_collect' });
      useSettingsStore.setState({
        settings: { ...DEFAULT_SETTINGS, delivery_free_threshold: 50 },
        isLoading: false,
      });
    });
  });

  it('renders nothing when deliveryType is click_collect', () => {
    const { container } = render(<FreeShippingGauge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the gauge when deliveryType is delivery', () => {
    act(() => useCartStore.setState({ deliveryType: 'delivery' }));
    render(<FreeShippingGauge />);
    expect(screen.getByText(/livraison gratuite/i)).toBeInTheDocument();
  });

  it('shows remaining amount to unlock free shipping', async () => {
    await act(async () => {
      useCartStore.setState({ deliveryType: 'delivery' });
    });
    await act(async () => {
      render(<FreeShippingGauge />);
    });
    // subtotal = 0, threshold = 50 → "Plus que 50.00 € pour la livraison gratuite !"
    expect(screen.getByText(/50.00 €/)).toBeInTheDocument();
  });

  it('shows "Livraison offerte débloquée" when subtotal >= threshold', async () => {
    await act(async () => {
      useCartStore.setState({
        deliveryType: 'delivery',
        items: [{ product: makeProduct({ id: 'p1', price: 50 }), quantity: 1 }],
      });
    });
    await act(async () => {
      render(<FreeShippingGauge />);
    });
    expect(screen.getByText(/Livraison offerte débloquée/i)).toBeInTheDocument();
  });
});
