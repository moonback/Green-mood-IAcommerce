import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mocks for internal dependencies
const mockAutoFill = vi.fn();
const mockAutoCategorize = vi.fn();
vi.mock('../../lib/productAI', () => ({
  autoFillProductSync: (...args: any[]) => mockAutoFill(...args),
  autoCategorizeProduct: (...args: any[]) => mockAutoCategorize(...args),
}));

const mockGenerateEmbedding = vi.fn();
vi.mock('../../lib/embeddings', () => ({
  generateEmbedding: (...args: any[]) => mockGenerateEmbedding(...args),
}));

const mockIsQuotaError = vi.fn();
vi.mock('../../lib/utils', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  isQuotaError: (err: any) => mockIsQuotaError(err),
}));

const mockAddToast = vi.fn();
vi.mock('../toastStore', () => ({
  useToastStore: {
    getState: () => ({ addToast: mockAddToast }),
  },
}));

const mockSupabaseQuery = {
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null }),
};
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => mockSupabaseQuery),
  },
}));

// Import store after mocks
const { useBackgroundTaskStore } = await import('../backgroundTaskStore');

function resetStore() {
  act(() => {
    useBackgroundTaskStore.setState({
      isSyncingAI: false,
      aiSyncProgress: null,
      isSyncingVectors: false,
      vectorSyncProgress: null,
      isAutoCategorizing: false,
      autoCategorizeProgress: null,
    });
  });
}

describe('backgroundTaskStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe('startMassAIFill', () => {
    it('calls autoFillProductSync for each product and updates state', async () => {
      mockAutoFill.mockResolvedValue(true);
      const products = [{ id: 'p1' } as any, { id: 'p2' } as any];
      await act(async () => {
        await useBackgroundTaskStore.getState().startMassAIFill(products, false);
      });
      expect(mockAutoFill).toHaveBeenCalledTimes(2);
      expect(useBackgroundTaskStore.getState().isSyncingAI).toBe(false);
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });

    it('handles failures and shows error toast if everything fails', async () => {
        mockAutoFill.mockResolvedValue(false);
        const products = [{ id: 'p1' } as any];
        await act(async () => {
          await useBackgroundTaskStore.getState().startMassAIFill(products, false);
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('handles exceptions during autoFillProductSync', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockAutoFill.mockRejectedValue(new Error('API Down'));
        await act(async () => {
          await useBackgroundTaskStore.getState().startMassAIFill([{ id: 'p1' } as any], false);
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
  });

  describe('startVectorSync', () => {
    it('does nothing if already syncing or empty list', async () => {
      act(() => useBackgroundTaskStore.setState({ isSyncingVectors: true }));
      await useBackgroundTaskStore.getState().startVectorSync([{ id: '1' } as any]);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
      
      resetStore();
      await useBackgroundTaskStore.getState().startVectorSync([]);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it('generates embeddings and updates supabase for each product', async () => {
      const mockVector = [0.1, 0.2];
      mockGenerateEmbedding.mockResolvedValue(mockVector);
      
      const product = { 
        id: 'p1', 
        name: 'Fleur CBD', 
        attributes: { 
            effects: ['relax'], 
            productSpecs: [{name: 'Taste', description: 'Lemon'}] 
        } 
      } as any;
      
      await act(async () => {
        await useBackgroundTaskStore.getState().startVectorSync([product]);
      });

      expect(mockGenerateEmbedding).toHaveBeenCalled();
      // Check that the text sent to embedding generator includes attributes
      const textSent = mockGenerateEmbedding.mock.calls[0][0];
      expect(textSent).toContain('Fleur CBD');
      expect(textSent).toContain('relax');
      expect(textSent).toContain('Taste: Lemon');

      expect(mockSupabaseQuery.update).toHaveBeenCalledWith({ embedding: mockVector });
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', 'p1');
      expect(useBackgroundTaskStore.getState().isSyncingVectors).toBe(false);
    });

    it('stops if a quota error is encountered', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('Rate limit'));
      mockIsQuotaError.mockReturnValue(true);
      
      const products = [{ id: 'p1', name: 'P1' } as any, { id: 'p2', name: 'P2' } as any];
      await act(async () => {
        await useBackgroundTaskStore.getState().startVectorSync(products);
      });

      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(1); // Stopped after first
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ 
          message: expect.stringContaining('Quota OpenRouter atteint'),
          type: 'error'
      }));
    });

    it('handles generic errors by continuing to next product', async () => {
        mockGenerateEmbedding
            .mockRejectedValueOnce(new Error('Random error'))
            .mockResolvedValueOnce([0.5, 0.6]);
        mockIsQuotaError.mockReturnValue(false);

        const products = [{ id: 'p1', name: 'P1' } as any, { id: 'p2', name: 'P2' } as any];
        await act(async () => {
          await useBackgroundTaskStore.getState().startVectorSync(products);
        });

        expect(mockGenerateEmbedding).toHaveBeenCalledTimes(2);
        expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ 
            message: expect.stringContaining('Sync vecteurs terminée: 1/2'),
            type: 'success'
        }));
    });
  });

  describe('startMassAutoCategorize', () => {
    it('guards against invalid inputs or state', async () => {
        await useBackgroundTaskStore.getState().startMassAutoCategorize([], []);
        expect(mockAutoCategorize).not.toHaveBeenCalled();

        act(() => useBackgroundTaskStore.setState({ isAutoCategorizing: true }));
        await useBackgroundTaskStore.getState().startMassAutoCategorize([{ id: '1' } as any], [{ id: 'c1', name: 'C1' }]);
        expect(mockAutoCategorize).not.toHaveBeenCalled();
    });

    it('performs auto-categorization and updates database', async () => {
        mockAutoCategorize.mockResolvedValue('cat-99');
        const products = [{ id: 'p1' } as any];
        const categories = [{ id: 'cat-99', name: 'Fleurs' }];
        
        await act(async () => {
          await useBackgroundTaskStore.getState().startMassAutoCategorize(products, categories);
        });

        expect(mockAutoCategorize).toHaveBeenCalledWith(products[0], categories);
        expect(mockSupabaseQuery.update).toHaveBeenCalledWith({ category_id: 'cat-99' });
        expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    });

    it('handles cases where AI returns no category', async () => {
        mockAutoCategorize.mockResolvedValue(null);
        await act(async () => {
          await useBackgroundTaskStore.getState().startMassAutoCategorize([{ id: 'p1' } as any], [{ id: 'c1', name: 'C1' }]);
        });
        expect(mockSupabaseQuery.update).not.toHaveBeenCalled();
        expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('handles database update failure', async () => {
        mockAutoCategorize.mockResolvedValue('cat-99');
        mockSupabaseQuery.eq.mockResolvedValueOnce({ error: { message: 'DB Error' } });
        
        await act(async () => {
          await useBackgroundTaskStore.getState().startMassAutoCategorize([{ id: 'p1' } as any], [{ id: 'c1', name: 'C1' }]);
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('handles unexpected errors in categorization loop', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockAutoCategorize.mockRejectedValue(new Error('Crash'));
        
        await act(async () => {
          await useBackgroundTaskStore.getState().startMassAutoCategorize([{ id: 'p1' } as any], [{ id: 'c1', name: 'C1' }]);
        });
        expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
  });
});
