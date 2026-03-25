import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileTabBar from '../layout/MobileTabBar';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

describe('MobileTabBar', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    useCartStore.setState({ items: [], deliveryType: 'click_collect', isOpen: false });
  });

  it('redirects guest account and assistant tabs to login with redirect params', () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /ouvrir compte/i })).toHaveAttribute(
      'href',
      '/connexion?redirect=%2Fcompte'
    );

    expect(screen.getByRole('link', { name: /ouvrir ia/i })).toHaveAttribute(
      'href',
      '/connexion?redirect=%2Fassistant'
    );
  });

  it('keeps direct account and assistant routes for authenticated users', () => {
    useAuthStore.setState({ user: { id: 'u-1' } as any });

    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /ouvrir compte/i })).toHaveAttribute('href', '/compte');
    expect(screen.getByRole('link', { name: /ouvrir ia/i })).toHaveAttribute('href', '/assistant');
  });

  it('exposes explicit accessibility labels for each tab', () => {
    render(
      <MemoryRouter>
        <MobileTabBar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /ouvrir accueil/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ouvrir catalogue/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ouvrir panier/i })).toBeInTheDocument();
  });
});
