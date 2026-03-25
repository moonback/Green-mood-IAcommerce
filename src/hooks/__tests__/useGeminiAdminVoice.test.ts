/**
 * Tests for useGeminiAdminVoice tool handlers.
 *
 * Strategy: mock GoogleGenAI.live.connect to capture session callbacks,
 * then trigger onmessage with synthetic toolCall messages to verify each
 * Supabase tool handler produces the correct response and DB calls.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// vi.hoisted() values are available inside vi.mock() factories.

const { state } = vi.hoisted(() => {
  const state = {
    // Mutable ref so beforeEach can update connectMock's implementation
    callbacks: {} as Record<string, (...a: any[]) => any>,

    sessionMock: {
      sendRealtimeInput: vi.fn(),
      sendClientContent: vi.fn(),
      sendToolResponse: vi.fn(),
      close: vi.fn(),
    },

    connectMock: vi.fn(),
    fetchMock: vi.fn(),
    fromMock: vi.fn(),

    // Chainable Supabase query builder
    queryBuilder: {} as Record<string, any>,
  };

  const chainMethods = [
    'select', 'eq', 'neq', 'in', 'ilike', 'or', 'gte', 'lte', 'gt', 'lt',
    'order', 'limit', 'update', 'upsert',
  ];
  for (const m of chainMethods) state.queryBuilder[m] = vi.fn().mockReturnValue(state.queryBuilder);
  state.queryBuilder.single = vi.fn().mockResolvedValue({ data: null, error: null });
  state.queryBuilder.then = vi.fn();

  state.fromMock.mockReturnValue(state.queryBuilder);

  return { state };
});

// ── Module mocks ──────────────────────────────────────────────────────────────

// GoogleGenAI MUST be a class (not vi.fn(arrowFn)) so `new GoogleGenAI()` works.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    live = { connect: state.connectMock };
  },
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { from: state.fromMock },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

vi.mock('../../lib/adminVoicePrompts', () => ({
  getAdminVoicePrompt: vi.fn(() => 'mock-system-prompt'),
}));

vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: (fn: any) => fn({
    settings: {
      store_name: 'Eco CBD',
      budtender_name: 'Jean',
      loyalty_currency_name: 'TOKENS',
    }
  }),
}));

// ── Browser API mocks ─────────────────────────────────────────────────────────

Object.defineProperty(window, 'isSecureContext', {
  get: () => true,
  configurable: true,
});

const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
} as unknown as MediaStream);

Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true,
});

// audioWorklet MUST be a getter (on prototype) so
// `'audioWorklet' in AudioContext.prototype` is true in the compatibility check.
class MockAudioContext {
  get audioWorklet() {
    return { addModule: vi.fn().mockResolvedValue(undefined) };
  }
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  createGain = vi.fn(() => ({ gain: { value: 0 }, connect: vi.fn() }));
  destination = {};
  sampleRate = 48000;
  currentTime = 0;
  close = vi.fn().mockResolvedValue(undefined);
}
global.AudioContext = MockAudioContext as unknown as typeof AudioContext;

class MockAudioWorkletNode {
  port = { onmessage: null as any };
  connect = vi.fn();
  disconnect = vi.fn();
}
global.AudioWorkletNode = MockAudioWorkletNode as unknown as typeof AudioWorkletNode;

global.fetch = state.fetchMock;

// ── Import hook (after all mocks are applied) ──────────────────────────────────

const { useGeminiAdminVoice } = await import('../useGeminiAdminVoice');

// ── Test helpers ──────────────────────────────────────────────────────────────

function mockToken() {
  state.fetchMock.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ token: 'ephemeral-test-token' }),
  } as Response);
}

function defaultThen() {
  state.queryBuilder.then.mockImplementation((resolve: (v: any) => any) =>
    Promise.resolve({ data: [], error: null }).then(resolve),
  );
}

async function startHook(opts: {
  onNavigate?: (tab: string) => void;
  onCloseSession?: () => void;
} = {}) {
  mockToken();
  const onNavigate = opts.onNavigate ?? vi.fn();
  const onCloseSession = opts.onCloseSession ?? vi.fn();

  const { result } = renderHook(() =>
    useGeminiAdminVoice({
      adminName: 'Jean',
      storeName: 'Eco CBD',
      onNavigate,
      onCloseSession,
    }),
  );

  await act(async () => { result.current.startSession(); });
  await waitFor(() => expect(result.current.voiceState).toBe('listening'), { timeout: 3000 });

  return { result, onNavigate, onCloseSession };
}

async function fireToolCall(name: string, args: Record<string, any> = {}) {
  await act(async () => {
    await state.callbacks.onmessage?.({
      toolCall: { functionCalls: [{ name, id: 'tid-1', args }] },
    });
  });
  const lastCall = state.sessionMock.sendToolResponse.mock.calls.at(-1);
  return (lastCall?.[0]?.functionResponses ?? []) as Array<{
    name: string;
    id: string;
    response: { result?: string; error?: string };
  }>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useGeminiAdminVoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-apply connectMock implementation (vi.clearAllMocks may clear it in Vitest 4.x)
    state.connectMock.mockImplementation(async ({ callbacks }: any) => {
      state.callbacks = callbacks ?? {};
      setTimeout(() => callbacks?.onopen?.(), 0);
      return state.sessionMock;
    });

    // Re-apply fromMock
    state.fromMock.mockReturnValue(state.queryBuilder);

    // Re-apply queryBuilder chain methods
    const chainMethods = [
      'select', 'eq', 'neq', 'in', 'ilike', 'or', 'gte', 'lte', 'gt', 'lt',
      'order', 'limit', 'update', 'upsert',
    ];
    for (const m of chainMethods) state.queryBuilder[m].mockReturnValue(state.queryBuilder);
    state.queryBuilder.single.mockResolvedValue({ data: null, error: null });
    defaultThen();

    // Re-apply getUserMedia
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ────────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts idle with no error and mute off', () => {
      const { result } = renderHook(() =>
        useGeminiAdminVoice({ adminName: 'Admin', storeName: 'Shop' }),
      );
      expect(result.current.voiceState).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.isMuted).toBe(false);
    });

    it('isSupported is true when all browser APIs are present', () => {
      const { result } = renderHook(() =>
        useGeminiAdminVoice({ adminName: 'Admin', storeName: 'Shop' }),
      );
      expect(result.current.isSupported).toBe(true);
      expect(result.current.compatibilityError).toBeNull();
    });

    it('isSupported is false when mediaDevices is missing', () => {
      const saved = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined, configurable: true, writable: true,
      });

      const { result } = renderHook(() =>
        useGeminiAdminVoice({ adminName: 'Admin', storeName: 'Shop' }),
      );
      expect(result.current.isSupported).toBe(false);

      if (saved) Object.defineProperty(navigator, 'mediaDevices', saved);
    });

    it('toggleMute flips isMuted state', () => {
      const { result } = renderHook(() =>
        useGeminiAdminVoice({ adminName: 'Admin', storeName: 'Shop' }),
      );
      act(() => result.current.toggleMute());
      expect(result.current.isMuted).toBe(true);
      act(() => result.current.toggleMute());
      expect(result.current.isMuted).toBe(false);
    });
  });

  // ── Session lifecycle ────────────────────────────────────────────────────────

  describe('session lifecycle', () => {
    it('transitions to listening on successful start', async () => {
      const { result } = await startHook();
      expect(result.current.voiceState).toBe('listening');
    });

    it('stopSession resets voiceState to idle', async () => {
      const { result } = await startHook();
      act(() => result.current.stopSession());
      expect(result.current.voiceState).toBe('idle');
      expect(result.current.error).toBeNull();
    });

    it('sets error state when token fetch fails', async () => {
      state.fetchMock.mockResolvedValue({ ok: false, status: 502, text: () => Promise.resolve('err') } as Response);

      const { result } = renderHook(() =>
        useGeminiAdminVoice({ adminName: 'Admin', storeName: 'Shop' }),
      );
      await act(async () => { result.current.startSession(); });
      await waitFor(() => expect(result.current.voiceState).toBe('error'), { timeout: 12000 });
      expect(result.current.error).toBeTruthy();
    });
  });

  // ── Tool: navigate_admin ─────────────────────────────────────────────────────

  describe('tool: navigate_admin', () => {
    it('calls onNavigate callback with the tab name', async () => {
      const onNavigate = vi.fn();
      await startHook({ onNavigate });

      const responses = await fireToolCall('navigate_admin', { tab: 'orders' });

      expect(onNavigate).toHaveBeenCalledWith('orders');
      expect(responses[0].response.result).toContain('orders');
    });
  });

  // ── Tool: close_session ──────────────────────────────────────────────────────

  describe('tool: close_session', () => {
    it('schedules session stop and fires onCloseSession callback', async () => {
      const onCloseSession = vi.fn();
      // startHook reaches 'listening' with real timers — safe to switch to fake after
      const { result } = await startHook({ onCloseSession });
      expect(result.current.voiceState).toBe('listening');

      // Switch to fake timers only AFTER the session is already open
      vi.useFakeTimers();

      const responses = await fireToolCall('close_session');
      expect(responses[0].response.result).toContain('fermeture');

      // The hook uses setTimeout(stopSession, 2500) — advance past it
      await act(async () => { vi.advanceTimersByTime(3000); });
      expect(result.current.voiceState).toBe('idle');
      expect(onCloseSession).toHaveBeenCalled();
    });
  });

  // ── Tool: query_dashboard ────────────────────────────────────────────────────

  describe('tool: query_dashboard', () => {
    it('returns CA, order count and stock summary for today', async () => {
      await startHook();

      let callCount = 0;
      const datasets = [
        { data: [{ total: 60, payment_status: 'paid' }, { total: 40, payment_status: 'pending' }], error: null },
        { data: [{ id: 'o1' }], error: null },
        { data: [{ name: 'Fleur OG', stock_quantity: 2 }], error: null },
        { data: [], error: null },
        { data: [{ id: 'c1' }], error: null },
      ];
      state.queryBuilder.then.mockImplementation((resolve: (v: any) => any) =>
        Promise.resolve(datasets[callCount++ % datasets.length]).then(resolve),
      );

      const responses = await fireToolCall('query_dashboard', { period: 'today' });
      const text = responses[0].response.result as string;

      expect(text).toContain('CA');
      expect(text).toContain('60.00');
      expect(text).toContain("aujourd'hui");
      expect(text).toContain('Fleur OG');
    });

    it('labels period correctly for "week"', async () => {
      await startHook();
      const responses = await fireToolCall('query_dashboard', { period: 'week' });
      expect(responses[0].response.result).toContain('7 derniers jours');
    });

    it('returns error response on Supabase failure', async () => {
      await startHook();
      // A thenable's .then(resolve, reject) must call reject — returning a rejected promise
      // is NOT enough because Promise ignores the thenable's return value.
      state.queryBuilder.then.mockImplementation((_resolve: any, reject: any) => {
        reject(new Error('db down'));
      });

      const responses = await fireToolCall('query_dashboard');
      expect(responses[0].response.error).toBeTruthy();
    });
  });

  // ── Tool: search_orders ──────────────────────────────────────────────────────

  describe('tool: search_orders', () => {
    const makeOrder = (overrides: Record<string, any> = {}) => ({
      id: 'abc-def-ghi-123',
      created_at: '2025-03-01T10:00:00Z',
      status: 'pending',
      total: 89.90,
      payment_status: 'pending',
      delivery_type: 'delivery',
      notes: null,
      profile: { full_name: 'Marie Dupont', email: 'marie@test.com', phone: '0601020304' },
      order_items: [{ product_name: 'CBD Oil 10%', quantity: 2, unit_price: 35 }],
      address: { street: '10 rue de la Paix', city: 'Paris', postal_code: '75001' },
      ...overrides,
    });

    it('returns full order details: customer, items, address', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({ data: [makeOrder()], error: null }).then(resolve),
      );

      const responses = await fireToolCall('search_orders', { status: 'pending' });
      const text = responses[0].response.result as string;

      expect(text).toContain('Marie Dupont');
      expect(text).toContain('89.90');
      expect(text).toContain('CBD Oil 10%');
      expect(text).toContain('Paris');
      expect(state.queryBuilder.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('performs two-step query when customer_name is provided', async () => {
      await startHook();
      state.queryBuilder.then
        .mockImplementationOnce((resolve: (v: any) => any) =>
          Promise.resolve({ data: [{ id: 'user-99' }], error: null }).then(resolve),
        )
        .mockImplementationOnce((resolve: (v: any) => any) =>
          Promise.resolve({ data: [makeOrder()], error: null }).then(resolve),
        );

      await fireToolCall('search_orders', { customer_name: 'Dupont' });

      expect(state.queryBuilder.ilike).toHaveBeenCalledWith('full_name', '%Dupont%');
      expect(state.queryBuilder.in).toHaveBeenCalledWith('user_id', ['user-99']);
    });

    it('returns not-found when customer_name matches no profiles', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
      );

      const responses = await fireToolCall('search_orders', { customer_name: 'Inexistant' });
      expect(responses[0].response.result).toContain('Aucun client');
    });

    it('returns not-found when no orders match filters', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
      );

      const responses = await fireToolCall('search_orders', { status: 'shipped' });
      expect(responses[0].response.result).toContain('Aucune commande');
    });
  });

  // ── Tool: search_customers ───────────────────────────────────────────────────

  describe('tool: search_customers', () => {
    const mockProfile = {
      id: 'user-1',
      full_name: 'Paul Martin',
      email: 'paul@test.com',
      phone: '0601020304',
      loyalty_points: 250,
      created_at: '2024-01-15T00:00:00Z',
      birthday: '1985-06-20',
    };

    it('returns full profile with address, loyalty points and recent orders', async () => {
      await startHook();

      let callCount = 0;
      const datasets = [
        { data: [mockProfile], error: null },
        { data: [{ user_id: 'user-1', city: 'Lyon', postal_code: '69001', street: '5 r Hugo', is_default: true }], error: null },
        { data: [{ id: 'o-1', user_id: 'user-1', created_at: '2025-02-10T00:00:00Z', total: 59.90, status: 'delivered', order_items: [{ product_name: 'CBD Fleur', quantity: 1 }] }], error: null },
      ];
      state.queryBuilder.then.mockImplementation((resolve: (v: any) => any) =>
        Promise.resolve(datasets[callCount++ % datasets.length]).then(resolve),
      );

      const responses = await fireToolCall('search_customers', { search: 'Paul' });
      const text = responses[0].response.result as string;

      expect(text).toContain('Paul Martin');
      expect(text).toContain('paul@test.com');
      expect(text).toContain('250 TOKENS');
      expect(text).toContain('Lyon');
      expect(text).toContain('59.90');
    });

    it('returns error when search param is empty', async () => {
      await startHook();
      const responses = await fireToolCall('search_customers', { search: '' });
      expect(responses[0].response.error).toContain('requis');
    });

    it('returns not-found when no profiles match', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
      );

      const responses = await fireToolCall('search_customers', { search: 'Inconnu' });
      expect(responses[0].response.result).toContain('Aucun client');
    });
  });

  // ── Tool: update_order_status ────────────────────────────────────────────────

  describe('tool: update_order_status', () => {
    it('finds order by partial ID and updates status', async () => {
      await startHook();

      state.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'full-uuid-order-abc', status: 'pending' },
        error: null,
      });
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
      );

      const responses = await fireToolCall('update_order_status', {
        order_id: 'order-abc',
        status: 'shipped',
      });
      const text = responses[0].response.result as string;

      expect(text).toContain('pending');
      expect(text).toContain('shipped');
      expect(state.queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'shipped' }),
      );
    });

    it('includes note in update when provided', async () => {
      await startHook();

      state.queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'abc', status: 'processing' },
        error: null,
      });
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
      );

      await fireToolCall('update_order_status', {
        order_id: 'abc',
        status: 'ready',
        notes: 'Colis prêt en caisse',
      });

      expect(state.queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready', notes: 'Colis prêt en caisse' }),
      );
    });

    it('returns not-found when order ID has no match', async () => {
      await startHook();
      state.queryBuilder.single.mockResolvedValueOnce({ data: null, error: new Error('not found') });

      const responses = await fireToolCall('update_order_status', {
        order_id: 'zzz999',
        status: 'shipped',
      });
      expect(responses[0].response.result).toContain('Aucune commande');
    });

    it('returns error when required params are missing', async () => {
      await startHook();
      const responses = await fireToolCall('update_order_status', { order_id: '' });
      expect(responses[0].response.error).toContain('requis');
    });
  });

  // ── Tool: update_customer_points ─────────────────────────────────────────────

  describe('tool: update_customer_points', () => {
    const mockCustomer = { id: 'user-1', full_name: 'Marie Dupont', loyalty_points: 100 };

    beforeEach(() => {
      state.queryBuilder.then.mockImplementation((resolve: (v: any) => any) =>
        Promise.resolve({ data: [mockCustomer], error: null }).then(resolve),
      );
    });

    it('adds points in default add mode', async () => {
      await startHook();

      const responses = await fireToolCall('update_customer_points', {
        customer_name: 'Marie',
        points: 50,
      });
      const text = responses[0].response.result as string;

      expect(text).toContain('Marie Dupont');
      expect(text).toContain('150');
      expect(state.queryBuilder.update).toHaveBeenCalledWith({ loyalty_points: 150 });
    });

    it('subtracts points when value is negative', async () => {
      await startHook();

      const responses = await fireToolCall('update_customer_points', {
        customer_name: 'Marie',
        points: -30,
      });
      expect(responses[0].response.result).toContain('70');
      expect(state.queryBuilder.update).toHaveBeenCalledWith({ loyalty_points: 70 });
    });

    it('fixes points to exact value in set mode', async () => {
      await startHook();

      const responses = await fireToolCall('update_customer_points', {
        customer_name: 'Marie',
        points: 200,
        mode: 'set',
      });
      expect(responses[0].response.result).toContain('200');
      expect(state.queryBuilder.update).toHaveBeenCalledWith({ loyalty_points: 200 });
    });

    it('returns not-found when customer does not exist', async () => {
      state.queryBuilder.then.mockImplementation((resolve: (v: any) => any) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
      );
      await startHook();

      const responses = await fireToolCall('update_customer_points', {
        customer_name: 'Ghost',
        points: 50,
      });
      expect(responses[0].response.result).toContain('Aucun client');
    });

    it('returns error when required params are missing', async () => {
      await startHook();
      const responses = await fireToolCall('update_customer_points', { customer_name: '' });
      expect(responses[0].response.error).toContain('requis');
    });
  });

  // ── Tool: check_stock ────────────────────────────────────────────────────────

  describe('tool: check_stock', () => {
    it('returns low-stock products with disabled flag', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({
          data: [
            { name: 'Fleur OG', stock_quantity: 2, is_available: true },
            { name: 'Résine Hash', stock_quantity: 0, is_available: false },
          ],
          error: null,
        }).then(resolve),
      );

      const responses = await fireToolCall('check_stock', {});
      const text = responses[0].response.result as string;

      expect(text).toContain('Fleur OG : 2');
      expect(text).toContain('[désactivé]');
    });

    it('returns not-found when all stock is healthy', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
      );

      const responses = await fireToolCall('check_stock', {});
      expect(responses[0].response.result).toContain('Aucun produit');
    });

    it('filters by product_name when provided', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({
          data: [{ name: 'OG Kush', stock_quantity: 8, is_available: true }],
          error: null,
        }).then(resolve),
      );

      const responses = await fireToolCall('check_stock', { product_name: 'kush' });
      expect(responses[0].response.result).toContain('OG Kush : 8');
      expect(state.queryBuilder.ilike).toHaveBeenCalledWith('name', '%kush%');
    });
  });

  // ── Tool: search_products ────────────────────────────────────────────────────

  describe('tool: search_products', () => {
    it('returns name, category, price and stock count', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({
          data: [{ name: 'CBD Oil 15%', price: 39.90, stock_quantity: 12, is_active: true, category: { name: 'Huiles' } }],
          error: null,
        }).then(resolve),
      );

      const responses = await fireToolCall('search_products', { query: 'oil' });
      const text = responses[0].response.result as string;

      expect(text).toContain('CBD Oil 15%');
      expect(text).toContain('Huiles');
      expect(text).toContain('39.90');
      expect(text).toContain('Stock : 12');
    });

    it('marks inactive products', async () => {
      await startHook();
      state.queryBuilder.then.mockImplementationOnce((resolve: (v: any) => any) =>
        Promise.resolve({
          data: [{ name: 'Old Product', price: 10, stock_quantity: 5, is_active: false, category: null }],
          error: null,
        }).then(resolve),
      );

      const responses = await fireToolCall('search_products', { query: 'old' });
      expect(responses[0].response.result).toContain('[inactif]');
    });

    it('returns error when query param is empty', async () => {
      await startHook();
      const responses = await fireToolCall('search_products', { query: '' });
      expect(responses[0].response.error).toContain('requis');
    });
  });
});
