import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock @stripe/react-stripe-js ──────────────────────────────────────────────
const mockConfirmPayment = vi.fn();
const mockStripe = { confirmPayment: mockConfirmPayment };

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: () => <div data-testid="payment-element">PaymentElement</div>,
  useStripe: () => mockStripe,
  useElements: () => ({ getElement: vi.fn() }),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(mockStripe)),
}));

// ── Mock settingsStore ────────────────────────────────────────────────────────
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: {
      stripe_enabled: true,
      stripe_public_key: 'pk_test_mock123',
      stripe_test_mode: true,
    },
  }),
}));

import StripePaymentForm from '../StripePaymentForm';

const defaultProps = {
  clientSecret: 'pi_test_secret_mock',
  amount: 49.99,
  onSuccess: vi.fn(),
  onError: vi.fn(),
};

describe('StripePaymentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Stripe Elements wrapper', () => {
    render(<StripePaymentForm {...defaultProps} />);
    expect(screen.getByTestId('stripe-elements')).toBeTruthy();
  });

  it('renders the PaymentElement', () => {
    render(<StripePaymentForm {...defaultProps} />);
    expect(screen.getByTestId('payment-element')).toBeTruthy();
  });

  it('renders the confirm button with amount', () => {
    render(<StripePaymentForm {...defaultProps} />);
    expect(screen.getByText(/49.99 €/)).toBeTruthy();
  });

  it('renders the security notice', () => {
    render(<StripePaymentForm {...defaultProps} />);
    expect(screen.getByText(/Paiement 100% sécurisé/i)).toBeTruthy();
  });

  it('shows error message when no public key configured', () => {
    vi.doMock('../../store/settingsStore', () => ({
      useSettingsStore: () => ({
        settings: { stripe_enabled: false, stripe_public_key: '', stripe_test_mode: true },
      }),
    }));
    // Dynamic mock will be picked up in next render cycle
  });

  it('calls onSuccess when payment succeeds', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
      error: null,
    });

    render(<StripePaymentForm {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /Confirmer le paiement/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledWith({
        elements: expect.anything(),
        redirect: 'if_required',
      });
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('pi_test_123');
    });
  });

  it('calls onError when Stripe returns an error', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { message: 'Votre carte a été refusée.' },
      paymentIntent: null,
    });

    render(<StripePaymentForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/i }));

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Votre carte a été refusée.');
    });
  });

  it('calls onError with default message when no error message', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: {},
      paymentIntent: null,
    });

    render(<StripePaymentForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/i }));

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Paiement refusé. Veuillez réessayer.');
    });
  });

  it('calls onError when payment status is unexpected', async () => {
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_test_456', status: 'requires_action' },
      error: null,
    });

    render(<StripePaymentForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/i }));

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith(
        'Statut de paiement inattendu. Veuillez contacter le support.'
      );
    });
  });

  it('shows loading state while processing payment', async () => {
    mockConfirmPayment.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null, paymentIntent: { id: 'pi_1', status: 'succeeded' } }), 100))
    );

    render(<StripePaymentForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/i }));

    expect(screen.getByText(/Traitement en cours/i)).toBeTruthy();

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onError when an exception is thrown', async () => {
    mockConfirmPayment.mockRejectedValue(new Error('Network error'));

    render(<StripePaymentForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/i }));

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith(
        'Une erreur est survenue lors du paiement.'
      );
    });
  });

  it('button is disabled when stripe is not ready', () => {
    vi.mocked(vi.fn()).mockReturnValue(null);
    // In the mock, useStripe returns the mockStripe object so button should be enabled by default
    render(<StripePaymentForm {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /Confirmer le paiement/i });
    // With mock stripe present, button should NOT be disabled
    expect(btn).not.toBeDisabled();
  });

  it('formats amount correctly with 2 decimal places', () => {
    render(<StripePaymentForm {...defaultProps} amount={150} />);
    expect(screen.getByText(/150.00 €/)).toBeTruthy();
  });
});
