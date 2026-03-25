import { vi } from 'vitest';

// ─── Supabase Mock ────────────────────────────────────────────────────────────
// This mock intercepts all calls to src/lib/supabase.ts in unit tests.
// Use vi.mocked(supabase.from(...).select).mockResolvedValueOnce(...) to override.

const mockAuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
};

const mockSession = {
  user: mockAuthUser,
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  token_type: 'bearer',
  expires_in: 3600,
};

// Builder for chainable query responses
function createQueryBuilder(defaultReturn: { data: any; error: null }) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue(defaultReturn),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(defaultReturn),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(defaultReturn),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: (value: any) => any) => Promise.resolve(defaultReturn).then(resolve),
  };
  return builder;
}

export const mockSupabase = {
  from: vi.fn().mockImplementation(() =>
    createQueryBuilder({ data: [], error: null })
  ),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: mockAuthUser }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser }, error: null }),
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
  },
};

// Factory to re-create fresh mock for each test
export function createMockSupabase() {
  return { ...mockSupabase };
}

// Helper: mock an authenticated user state
export { mockAuthUser, mockSession };
