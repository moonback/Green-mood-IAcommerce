import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../lib/utils', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

const mockAutoFill = vi.fn();
vi.mock('../../lib/productAI', () => ({
  autoFillProductSync: (...args: any[]) => mockAutoFill(...args),
}));

vi.mock('../toastStore', () => ({
  useToastStore: {
    getState: () => ({ addToast: vi.fn() }),
  },
}));

const { useBackgroundTaskStore } = await import('../backgroundTaskStore');

function resetStore() {
  act(() => {
    useBackgroundTaskStore.setState({ isSyncingAI: false, aiSyncProgress: null });
  });
}

describe('backgroundTaskStore', () => {
  beforeEach(() => {
    resetStore();
    mockAutoFill.mockReset();
  });

  it('starts with isSyncingAI false and no progress', () => {
    expect(useBackgroundTaskStore.getState().isSyncingAI).toBe(false);
    expect(useBackgroundTaskStore.getState().aiSyncProgress).toBeNull();
  });

  it('does nothing when products array is empty', async () => {
    await act(async () => {
      await useBackgroundTaskStore.getState().startMassAIFill([], false);
    });
    expect(mockAutoFill).not.toHaveBeenCalled();
    expect(useBackgroundTaskStore.getState().isSyncingAI).toBe(false);
  });

  it('does nothing when already syncing', async () => {
    act(() => {
      useBackgroundTaskStore.setState({ isSyncingAI: true });
    });
    const products = [{ id: 'p1', name: 'Test' } as any];
    await act(async () => {
      await useBackgroundTaskStore.getState().startMassAIFill(products, false);
    });
    expect(mockAutoFill).not.toHaveBeenCalled();
  });

  it('calls autoFillProductSync for each product', async () => {
    mockAutoFill.mockResolvedValue(true);
    const products = [
      { id: 'p1', name: 'Product 1' } as any,
      { id: 'p2', name: 'Product 2' } as any,
    ];
    await act(async () => {
      await useBackgroundTaskStore.getState().startMassAIFill(products, false);
    });
    expect(mockAutoFill).toHaveBeenCalledTimes(2);
  });

  it('resets isSyncingAI to false after completion', async () => {
    mockAutoFill.mockResolvedValue(true);
    const products = [{ id: 'p1', name: 'P1' } as any];
    await act(async () => {
      await useBackgroundTaskStore.getState().startMassAIFill(products, false);
    });
    expect(useBackgroundTaskStore.getState().isSyncingAI).toBe(false);
    expect(useBackgroundTaskStore.getState().aiSyncProgress).toBeNull();
  });

  it('handles autoFillProductSync failures gracefully', async () => {
    mockAutoFill.mockRejectedValue(new Error('AI error'));
    const products = [{ id: 'p1', name: 'P1' } as any];
    await act(async () => {
      await useBackgroundTaskStore.getState().startMassAIFill(products, false);
    });
    // Should still reset state
    expect(useBackgroundTaskStore.getState().isSyncingAI).toBe(false);
  });

  it('calls onRefresh callback on success', async () => {
    mockAutoFill.mockResolvedValue(true);
    const onRefresh = vi.fn();
    const products = [{ id: 'p1', name: 'P1' } as any];
    await act(async () => {
      await useBackgroundTaskStore.getState().startMassAIFill(products, false, onRefresh);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not call onRefresh when autoFill returns false', async () => {
    mockAutoFill.mockResolvedValue(false);
    const onRefresh = vi.fn();
    const products = [{ id: 'p1', name: 'P1' } as any];
    await act(async () => {
      await useBackgroundTaskStore.getState().startMassAIFill(products, false, onRefresh);
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
