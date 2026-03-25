import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ProtectedRoute from '../ProtectedRoute';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/commande']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/commande" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/connexion" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, profile: null, isLoading: false, session: null });
  });

  it('redirects to /connexion when not authenticated', () => {
    renderProtectedRoute();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'user@test.com' } as any,
      isLoading: false,
    });
    renderProtectedRoute();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('shows loading spinner while auth is loading', () => {
    useAuthStore.setState({ user: null, isLoading: true });
    const { container } = renderProtectedRoute();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects non-authenticated user regardless of profile', () => {
    useAuthStore.setState({ user: null, profile: null, isLoading: false });
    renderProtectedRoute();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});
