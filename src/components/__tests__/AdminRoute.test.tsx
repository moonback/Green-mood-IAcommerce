import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import AdminRoute from '../AdminRoute';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

// Mock supabase — authStore imports it
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    functions: {
      invoke: invokeMock,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  verifyServerAdmin: vi.fn(async () => {
    const { data, error } = await invokeMock();
    if (error) return false;
    return Boolean(data?.is_admin);
  }),
}));

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>Admin Content</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    useAuthStore.setState({ user: null, profile: null, isLoading: false, session: null });
  });

  it('redirects to / when user is not authenticated', async () => {
    renderAdminRoute();
    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument());
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to / when user is authenticated but not admin on server check', async () => {
    invokeMock.mockResolvedValue({ data: { is_admin: false }, error: null });
    useAuthStore.setState({
      user: { id: 'user-1', email: 'test@test.com' } as any,
      isLoading: false,
    });

    renderAdminRoute();

    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument());
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders children when server-side admin check passes', async () => {
    invokeMock.mockResolvedValue({ data: { is_admin: true }, error: null });
    useAuthStore.setState({
      user: { id: 'user-1', email: 'admin@test.com' } as any,
      isLoading: false,
    });

    renderAdminRoute();

    await waitFor(() => expect(screen.getByText('Admin Content')).toBeInTheDocument());
  });

  it('shows loading spinner while auth is loading', () => {
    useAuthStore.setState({ user: null, profile: null, isLoading: true });
    const { container } = renderAdminRoute();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
