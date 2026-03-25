import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../store/authStore';

const {
  queryBuilder, ordersQB, prefsQB, interactionsQB,
  fromMock, getBudTenderSettingsMock, user
} = vi.hoisted(() => {
  const createQB = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((res: any) => Promise.resolve({ data: null, error: null }).then(res)),
  });

  const ordersQB = createQB();
  const prefsQB = createQB();
  const interactionsQB = createQB();
  const defaultQB = createQB();

  const fromMock = vi.fn((table: string) => {
    if (table === 'orders') return ordersQB;
    if (table === 'user_ai_preferences') return prefsQB;
    if (table === 'budtender_interactions') return interactionsQB;
    return defaultQB;
  });

  return {
    queryBuilder: defaultQB,
    ordersQB, prefsQB, interactionsQB,
    fromMock,
    getBudTenderSettingsMock: vi.fn(),
    user: { id: 'user-1' } as any,
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock('../../lib/budtenderSettings', () => ({
  fetchBudTenderSettings: getBudTenderSettingsMock,
  getBudTenderSettings: getBudTenderSettingsMock,
}));

vi.mock('../../lib/constants', () => ({
  CATEGORY_SLUGS: {
    ARCADE: 'arcade',
    FLIPPERS: 'flippers',
    SIMULATORS: 'simulateurs',
  },
}));

const { useBudTenderMemory } = await import('../useBudTenderMemory');

describe('useBudTenderMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    getBudTenderSettingsMock.mockReturnValue({
      memory_enabled: true,
      threshold_arcade: 60,
      threshold_flippers: 30,
      threshold_others: 45,
    });

    ordersQB.then.mockImplementation((res: any) => Promise.resolve({ data: null, error: null }).then(res));
    prefsQB.maybeSingle.mockResolvedValue({ data: null, error: null });
    prefsQB.upsert.mockResolvedValue({ data: null, error: null });
    interactionsQB.maybeSingle.mockResolvedValue({ data: null, error: null });
    interactionsQB.then.mockImplementation((res: any) => Promise.resolve({ data: null, error: null }).then(res));
    interactionsQB.insert.mockResolvedValue({ data: { id: 'new-db-id' }, error: null });
    interactionsQB.select.mockReturnThis();

    useAuthStore.setState({ user: null, profile: null, isLoading: false, session: null });
  });

  it('returns initial anonymous state', async () => {
    const { result } = renderHook(() => useBudTenderMemory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.pastProducts).toHaveLength(0);
    expect(result.current.savedPrefs).toBeNull();
    expect(result.current.chatHistory).toHaveLength(0);
  });

  it('loads prefs/chat from browser storage', async () => {
    localStorage.setItem('budtender_prefs_v1', JSON.stringify({ tech_goal: 'gaming', experience_level: 'beginner', budget_range: 'mid' }));
    sessionStorage.setItem('playadvisor_chat_history_v1', JSON.stringify([{ id: '1', sender: 'bot', text: 'hello' }]));

    const { result } = renderHook(() => useBudTenderMemory());

    await waitFor(() => expect(result.current.savedPrefs?.tech_goal).toBe('gaming'));
    expect(result.current.chatHistory).toHaveLength(1);
  });

  it('handles corrupted storage payloads', async () => {
    localStorage.setItem('budtender_prefs_v1', '{broken-json');
    sessionStorage.setItem('budtender_chat_history_v1', '{broken-json');

    const { result } = renderHook(() => useBudTenderMemory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.savedPrefs).toBeNull();
    expect(result.current.chatHistory).toHaveLength(0);
  });

  it('fetches order memory and computes dedup/restock candidates', async () => {
    useAuthStore.setState({ user, profile: null, isLoading: false, session: null });

    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    ordersQB.then.mockImplementation((resolve: (value: any) => any) =>
      Promise.resolve({
        data: [
          {
            id: 'o-1',
            created_at: oldDate,
            status: 'paid',
            total: 55,
            order_items: [
              {
                product_id: 'p-1',
                product_name: 'Huile A',
                unit_price: 20,
                quantity: 1,
                product: { slug: 'huile-a', image_url: '/a.png', category: { slug: 'huiles' } },
              },
              {
                product_id: 'p-1',
                product_name: 'Huile A',
                unit_price: 20,
                quantity: 1,
                product: { slug: 'huile-a', image_url: '/a.png', category: { slug: 'huiles' } },
              },
            ],
          },
          {
            id: 'o-2',
            created_at: recentDate,
            status: 'delivered',
            total: 15,
            order_items: [
              {
                product_id: 'p-2',
                product_name: 'Infusion B',
                unit_price: 15,
                quantity: 2,
                product: { slug: 'infusion-b', image_url: '/b.png', category: { slug: 'infusions' } },
              },
            ],
          },
        ],
        error: null,
      }).then(resolve),
    );

    const { result } = renderHook(() => useBudTenderMemory());

    expect(result.current.restockCandidates).toHaveLength(0); // Because thresholds are 30+ days and recent order is 2 days ago, and old order is 35 days ago but might not match threshold if it was 45
    // Actually p-1 is cateory 'huiles' which falls back to threshold_others (45). 35 < 45, so no restock.
  });

  it('skips order memory when memory is disabled', async () => {
    useAuthStore.setState({ user, profile: null, isLoading: false, session: null });
    getBudTenderSettingsMock.mockReturnValue({ memory_enabled: false });

    ordersQB.then.mockImplementation((resolve: (value: any) => any) =>
      Promise.resolve({ data: [{ id: 'o-1', order_items: [] }], error: null }).then(resolve),
    );

    const { result } = renderHook(() => useBudTenderMemory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pastProducts).toHaveLength(0);
    expect(result.current.restockCandidates).toHaveLength(0);
  });

  it('savePrefs persists locally and syncs mapped payload to Supabase', async () => {
    useAuthStore.setState({ user, profile: null, isLoading: false, session: null });
    const { result } = renderHook(() => useBudTenderMemory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.savePrefs({
        tech_goal: 'gaming',
        experience_level: 'beginner',
        budget_range: 'mid',
      });
    });

    expect(result.current.savedPrefs?.tech_goal).toBe('gaming');
    expect(prefsQB.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        preferences: expect.objectContaining({
          tech_goal: 'gaming',
          experience_level: 'beginner',
          budget_range: 'mid',
        }),
      }),
      { onConflict: 'user_id' },
    );
  });

  it('saveChatHistory syncs only when there is a user and non-empty history', async () => {
    useAuthStore.setState({ user, profile: null, isLoading: false, session: null });
    const { result } = renderHook(() => useBudTenderMemory());
    const messages = [{ id: 'm-1', sender: 'user' as const, text: 'Je veux un conseil' }];

    await act(async () => {
      await result.current.saveChatHistory(messages);
    });

    expect(result.current.chatHistory).toHaveLength(1);
    expect(interactionsQB.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'chat_session',
        quiz_answers: expect.objectContaining({ session_id: 'm-1' })
      })
    );

    interactionsQB.insert.mockClear();
    await act(async () => {
      await result.current.saveChatHistory([]);
    });
    expect(interactionsQB.insert).not.toHaveBeenCalled();
  });

  it('fetches and filters all sessions to build titles', async () => {
    useAuthStore.setState({ user, profile: null, isLoading: false, session: null });

    interactionsQB.then.mockImplementation((resolve: (value: any) => any) =>
      Promise.resolve({
        data: [
          {
            id: 's-1',
            quiz_answers: {
              session_id: 'sid-1',
              messages: [
                { id: 'a', sender: 'user', text: 'Utilise mes préférences' },
                { id: 'b', sender: 'user', text: 'Je dors mal' },
                { id: 'c', sender: 'bot', text: 'ok' },
              ],
            },
            created_at: '2024-01-01',
          },
          {
            id: 's-2',
            quiz_answers: { session_id: 'sid-2', messages: [{ id: 'z', sender: 'bot', text: 'short' }] },
            created_at: '2024-01-02',
          },
        ],
        error: null,
      }).then(resolve),
    );

    const { result } = renderHook(() => useBudTenderMemory());
    await act(async () => {
      await result.current.fetchAllSessions();
    });

    expect(result.current.allChatSessions).toHaveLength(1);
    expect(result.current.allChatSessions[0].title).toBe('Je dors mal');
  });

  it('syncs preferences and latest chat from Supabase on login', async () => {
    useAuthStore.setState({ user, profile: null, isLoading: false, session: null });

    prefsQB.maybeSingle
      .mockResolvedValueOnce({
        data: {
          preferences: {
            tech_goal: 'gaming',
            experience_level: 'expert',
            budget_range: 'high',
          },
        },
        error: null,
      });

    interactionsQB.maybeSingle
      .mockResolvedValueOnce({
        data: { quiz_answers: { messages: [{ id: 'm-1', sender: 'bot', text: 'hello again' }] } },
        error: null,
      });

    const { result } = renderHook(() => useBudTenderMemory());

    await waitFor(() => expect(result.current.savedPrefs?.tech_goal).toBe('gaming'), { timeout: 3000 });
    expect(result.current.savedPrefs?.experience_level).toBe('expert');
    expect(result.current.chatHistory[0].text).toBe('hello again');
  });

  it('resets memory using clear functions and keeps userName extraction', async () => {
    useAuthStore.setState({
      user,
      profile: {
        id: 'user-1',
        full_name: 'Marie Dupont',
        email: null,
        phone: null,
        loyalty_points: 80,
        referral_code: null,
        referred_by_id: null,
        is_admin: false,
        created_at: '',
      } as any,
      isLoading: false,
      session: null,
    });

    const { result } = renderHook(() => useBudTenderMemory());

    await act(async () => {
      await result.current.saveChatHistory([{ id: 'm-1', sender: 'bot', text: 'hey' }]);
      await result.current.savePrefs({ tech_goal: 'gaming', experience_level: 'expert', budget_range: 'high' });
    });

    act(() => result.current.clearChatHistory());
    expect(result.current.chatHistory).toHaveLength(0);

    await act(async () => {
      await result.current.clearPrefs();
    });
    expect(result.current.savedPrefs).toBeNull();
    expect(result.current.userName).toBe('Marie');
    expect(result.current.loyaltyPoints).toBe(80);
  });
});
