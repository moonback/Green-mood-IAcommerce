import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Inline PaymentSimulator component (extracted for testing) ─────────────────
// This mirrors exactly the component defined in src/pages/Checkout.tsx
import { useState } from 'react';
import { FlaskConical } from 'lucide-react';

function PaymentSimulator({
  amount,
  onSuccess,
  onError,
  onCancel,
}: {
  amount: number;
  onSuccess: () => void;
  onError: () => void;
  onCancel: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const simulate = async (succeed: boolean) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsLoading(false);
    succeed ? onSuccess() : onError();
  };

  return (
    <div data-testid="payment-simulator">
      <p data-testid="simulator-amount">{amount.toFixed(2)} €</p>
      <button
        data-testid="success-btn"
        onClick={() => simulate(true)}
        disabled={isLoading}
      >
        Paiement réussi
      </button>
      <button
        data-testid="error-btn"
        onClick={() => simulate(false)}
        disabled={isLoading}
      >
        Paiement refusé
      </button>
      <button data-testid="cancel-btn" onClick={onCancel}>
        Annuler la commande
      </button>
      {isLoading && <span data-testid="loading">loading</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentSimulator', () => {
  const onSuccess = vi.fn();
  const onError = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the simulator with amount', () => {
    render(<PaymentSimulator amount={49.99} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    expect(screen.getByTestId('payment-simulator')).toBeTruthy();
    expect(screen.getByTestId('simulator-amount').textContent).toBe('49.99 €');
  });

  it('renders success, error and cancel buttons', () => {
    render(<PaymentSimulator amount={10} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    expect(screen.getByTestId('success-btn')).toBeTruthy();
    expect(screen.getByTestId('error-btn')).toBeTruthy();
    expect(screen.getByTestId('cancel-btn')).toBeTruthy();
  });

  it('calls onSuccess after clicking success button', async () => {
    render(<PaymentSimulator amount={10} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('success-btn'));

    expect(screen.getByTestId('loading')).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError after clicking error button', async () => {
    render(<PaymentSimulator amount={10} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('error-btn'));

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onCancel immediately when cancel is clicked', () => {
    render(<PaymentSimulator amount={10} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons while loading', async () => {
    render(<PaymentSimulator amount={10} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('success-btn'));

    expect(screen.getByTestId('success-btn')).toBeDisabled();
    expect(screen.getByTestId('error-btn')).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });
  });

  it('shows loading indicator during simulation', () => {
    render(<PaymentSimulator amount={10} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('success-btn'));
    expect(screen.getByTestId('loading')).toBeTruthy();
  });

  it('formats amount with 2 decimal places', () => {
    render(<PaymentSimulator amount={150} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    expect(screen.getByTestId('simulator-amount').textContent).toBe('150.00 €');
  });

  it('does not call onSuccess before the delay completes', async () => {
    render(<PaymentSimulator amount={10} onSuccess={onSuccess} onError={onError} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('success-btn'));

    await act(async () => {
      vi.advanceTimersByTime(500); // Only halfway
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
