import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { createMockSupabase, mockAuthUser, mockSession } from '../../test/mocks/supabase';

const mockSupabase = createMockSupabase();
const authStateSubscribers: Array<(event: string, session: any) => void> = [];

mockSupabase.auth.onAuthStateChange.mockImplementation((cb: (event: string, session: any) => void) => {
  authStateSubscribers.push(cb);
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

const { useAuthStore, DEVICE_ID_STORAGE_KEY, getDeviceId, __resetAuthStoreInitializationForTests } = await import('../authStore');

function emitAuthEvent(event: string, session: any) {
  for (const cb of authStateSubscribers) {
    cb(event, session);
  }
}

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateSubscribers.length = 0;
    localStorage.clear();
    __resetAuthStoreInitializationForTests();

    act(() => {
      useAuthStore.setState({ user: null, profile: null, session: null, isLoading: true });
    });
  });

  it('creates and reuses a device id', () => {
    const id = getDeviceId();
    expect(id).toBeTruthy();
    expect(localStorage.getItem(DEVICE_ID_STORAGE_KEY)).toBe(id);

    localStorage.setItem(DEVICE_ID_STORAGE_KEY, 'persisted-device-id');
    expect(getDeviceId()).toBe('persisted-device-id');
  });

  it('signIn succeeds and throws on auth error', async () => {
    await useAuthStore.getState().signIn('test@example.com', 'password123');
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });

    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' },
    });

    await expect(useAuthStore.getState().signIn('x@y.z', 'bad')).rejects.toMatchObject({
      message: 'Invalid credentials',
    });
  });

  it('signOut removes active session and resets client state', async () => {
    act(() => {
      useAuthStore.setState({
        user: mockAuthUser as any,
        profile: { id: 'user-1' } as any,
        session: mockSession as any,
      });
    });
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, 'device-123');

    await useAuthStore.getState().signOut();

    expect(mockSupabase.from).toHaveBeenCalledWith('user_active_sessions');
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('initialize handles session persistence and invalid token events', async () => {
    vi.useFakeTimers();

    const profileBuilder = mockSupabase.from();
    profileBuilder.single.mockResolvedValueOnce({
      data: { id: 'user-1', full_name: 'Marie Dupont', loyalty_points: 42 },
      error: null,
    });

    const activeSessionBuilder = mockSupabase.from();
    activeSessionBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: 'session-row' }, error: null });

    act(() => {
      useAuthStore.getState().initialize();
    });

    await act(async () => {
      emitAuthEvent('INITIAL_SESSION', { user: mockAuthUser });
    });

    expect(useAuthStore.getState().user?.id).toBe('user-1');
    expect(useAuthStore.getState().isLoading).toBe(false);

    await act(async () => {
      emitAuthEvent('TOKEN_REFRESHED', null);
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().profile).toBeNull();

    vi.useRealTimers();
  });

  it('logs out when periodic validation finds revoked session', async () => {
    vi.useFakeTimers();
    act(() => {
      useAuthStore.setState({ user: mockAuthUser as any, isLoading: false });
    });

    const revokedCheckBuilder = mockSupabase.from();
    revokedCheckBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    act(() => {
      useAuthStore.getState().initialize();
    });

    await act(async () => {
      vi.advanceTimersByTime(31000);
    });

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
