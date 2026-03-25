import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSingle = vi.fn();
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: (...args: any[]) => mockSingle(...args),
    })),
  },
}));

import PromoCodeInput from '../PromoCodeInput';
import type { AppliedPromo } from '../PromoCodeInput';

const validPromo = {
  code: 'PROMO10',
  description: 'Réduction 10%',
  discount_type: 'percent',
  discount_value: '10',
  min_order_value: 0,
  max_uses: null,
  uses_count: 0,
  expires_at: null,
};

function setup(subtotal = 50, applied: AppliedPromo | null = null) {
  const onApply = vi.fn();
  render(
    <PromoCodeInput subtotal={subtotal} onApply={onApply} applied={applied} />
  );
  return { onApply };
}

describe('PromoCodeInput', () => {
  beforeEach(() => mockSingle.mockReset());

  it('renders the code input field', () => {
    setup();
    expect(screen.getByPlaceholderText(/EX : WEEDKEND-20/i)).toBeTruthy();
  });

  it('apply button is disabled when input is empty', () => {
    setup();
    const btn = screen.getByRole('button', { name: /Appliquer/i });
    expect(btn).toBeDisabled();
  });

  it('apply button enables when code is typed', async () => {
    setup();
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'PROMO10');
    expect(screen.getByRole('button', { name: /Appliquer/i })).not.toBeDisabled();
  });

  it('uppercases typed input', async () => {
    setup();
    const input = screen.getByPlaceholderText(/EX :/i);
    await userEvent.type(input, 'hello');
    expect((input as HTMLInputElement).value).toBe('HELLO');
  });

  it('shows error for invalid/missing promo code', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    setup();
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'INVALID');
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    await waitFor(() => {
      expect(screen.getByText(/Code promo invalide/i)).toBeTruthy();
    });
  });

  it('shows error for expired promo code', async () => {
    mockSingle.mockResolvedValue({
      data: { ...validPromo, expires_at: '2020-01-01T00:00:00Z' },
      error: null,
    });
    setup();
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'EXPIRED');
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    await waitFor(() => {
      expect(screen.getByText(/expiré/i)).toBeTruthy();
    });
  });

  it('shows error when max uses reached', async () => {
    mockSingle.mockResolvedValue({
      data: { ...validPromo, max_uses: 10, uses_count: 10 },
      error: null,
    });
    setup();
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'MAXED');
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    await waitFor(() => {
      expect(screen.getByText(/nombre maximum/i)).toBeTruthy();
    });
  });

  it('shows error when order is below minimum', async () => {
    mockSingle.mockResolvedValue({
      data: { ...validPromo, min_order_value: 100 },
      error: null,
    });
    setup(30);
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'MINORDER');
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    await waitFor(() => {
      expect(screen.getByText(/minimum de commande/i)).toBeTruthy();
    });
  });

  it('calls onApply with correct percent discount data', async () => {
    mockSingle.mockResolvedValue({ data: validPromo, error: null });
    const { onApply } = setup(100);
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'PROMO10');
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PROMO10',
          discount_type: 'percent',
          discount_value: 10,
          discount_amount: 10, // 10% of 100
        })
      );
    });
  });

  it('calls onApply with correct fixed discount data', async () => {
    mockSingle.mockResolvedValue({
      data: { ...validPromo, discount_type: 'fixed', discount_value: '15' },
      error: null,
    });
    const { onApply } = setup(100);
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'FIXED15');
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ discount_type: 'fixed', discount_amount: 15 })
      );
    });
  });

  it('caps discount at subtotal for fixed type', async () => {
    mockSingle.mockResolvedValue({
      data: { ...validPromo, discount_type: 'fixed', discount_value: '200' },
      error: null,
    });
    const { onApply } = setup(50);
    await userEvent.type(screen.getByPlaceholderText(/EX :/i), 'BIG');
    await userEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    await waitFor(() => {
      expect(onApply).toHaveBeenCalledWith(
        expect.objectContaining({ discount_amount: 50 })
      );
    });
  });

  it('shows applied state when promo is passed as prop', () => {
    const applied: AppliedPromo = {
      code: 'SUMMER',
      description: 'Soldes été',
      discount_type: 'percent',
      discount_value: 20,
      discount_amount: 10,
    };
    setup(50, applied);
    expect(screen.getByText('SUMMER')).toBeTruthy();
    expect(screen.getByText('−10.00 €')).toBeTruthy();
  });

  it('calls onApply(null) when removing applied code', async () => {
    const applied: AppliedPromo = {
      code: 'SUMMER',
      description: null,
      discount_type: 'percent',
      discount_value: 20,
      discount_amount: 10,
    };
    const { onApply } = setup(50, applied);
    await userEvent.click(screen.getByRole('button', { name: /Retirer le code promo/i }));
    expect(onApply).toHaveBeenCalledWith(null);
  });

  it('applies promo on Enter key press', async () => {
    mockSingle.mockResolvedValue({ data: validPromo, error: null });
    const { onApply } = setup(100);
    const input = screen.getByPlaceholderText(/EX :/i);
    await userEvent.type(input, 'PROMO10{enter}');
    await waitFor(() => {
      expect(onApply).toHaveBeenCalled();
    });
  });
});
