import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useToastStore } from '../../store/toastStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { makeProduct } from '../../test/utils';
import ProductCard from '../ProductCardLegacy';

// Mock settingsStore — ProductCard calls useSettingsStore() with no selector
vi.mock('../../store/settingsStore', () => {
  const _settings = { delivery_fee: 5.90, delivery_free_threshold: 50, loyalty_currency_name: 'CARATS' };
  const _state = { settings: _settings };
  // Zustand stores are callable: with selector → selector(state), without → state
  const useSettingsStore = (selector?: (s: any) => any) =>
    selector ? selector(_state) : _state;
  useSettingsStore.getState = () => _state;
  return { useSettingsStore };
});

// Mock CATEGORY_SLUGS to avoid constants import issues
vi.mock('../../lib/constants', () => ({
  CATEGORY_SLUGS: {
    FLOWERS: 'fleurs',
    RESINS: 'resines',
  },
}));

function renderCard(product = makeProduct()) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>
  );
}

describe('ProductCard', () => {
  beforeEach(() => {
    act(() => {
      useCartStore.setState({ items: [], isOpen: false, deliveryType: 'click_collect' });
      useToastStore.setState({ toasts: [] });
      useWishlistStore.setState({ items: [] });
    });
  });

  it('renders the product name', () => {
    renderCard(makeProduct({ name: 'CBD Amnesia' }));
    expect(screen.getByText('CBD Amnesia')).toBeInTheDocument();
  });

  it('renders the product price', () => {
    renderCard(makeProduct({ price: 14.99 }));
    expect(screen.getByText(/14\.99/)).toBeInTheDocument();
  });

  it('renders a link to the product detail page', () => {
    renderCard(makeProduct({ slug: 'cbd-amnesia' }));
    const links = screen.getAllByRole('link');
    const productLinks = links.filter((l) =>
      l.getAttribute('href')?.includes('cbd-amnesia')
    );
    expect(productLinks.length).toBeGreaterThan(0);
  });

  it('shows "Stock Limité" sales tag when stock is low', () => {
    renderCard(makeProduct({ stock_quantity: 5, avg_rating: 0, review_count: 0, is_featured: false }));
    expect(screen.getByText(/Stock Limité/i)).toBeInTheDocument();
  });

  it('shows brand tag from attributes when available', () => {
    renderCard(makeProduct({ attributes: { brand: 'Stern Pinball', specs: [] }, stock_quantity: 100, is_featured: false }));
    expect(screen.getByText('Stern Pinball')).toBeInTheDocument();
  });

  it('renders "Pack" badge for bundle products', () => {
    renderCard(makeProduct({ is_bundle: true }));
    expect(screen.getByText('Pack')).toBeInTheDocument();
  });

  it('renders "Elite" badge for featured non-bundle products', () => {
    renderCard(makeProduct({ is_featured: true, is_bundle: false }));
    expect(screen.getByText('Elite')).toBeInTheDocument();
  });

  it('add to cart button is disabled when product is unavailable', () => {
    renderCard(makeProduct({ is_available: false }));
    const addBtn = screen.getByRole('button', { name: /acheter/i });
    expect(addBtn).toBeDisabled();
  });

  it('add to cart button is disabled when stock is 0', () => {
    renderCard(makeProduct({ stock_quantity: 0 }));
    const addBtn = screen.getByRole('button', { name: /acheter/i });
    expect(addBtn).toBeDisabled();
  });

  it('adds product to cart when add button is clicked', () => {
    renderCard(makeProduct({ id: 'prod-1', is_available: true, stock_quantity: 10 }));
    const addBtn = screen.getByRole('button', { name: /acheter/i });
    fireEvent.click(addBtn);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].product.id).toBe('prod-1');
  });

  it('shows a success toast after adding to cart', () => {
    renderCard(makeProduct({ name: 'Test Flower', is_available: true, stock_quantity: 5 }));
    const addBtn = screen.getByRole('button', { name: /acheter/i });
    fireEvent.click(addBtn);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].type).toBe('success');
  });

  it('toggles wishlist when heart button is clicked', () => {
    renderCard(makeProduct({ id: 'prod-1' }));
    const wishlistBtn = screen.getAllByRole('button')[0]; // first button = wishlist heart
    fireEvent.click(wishlistBtn);
    expect(useWishlistStore.getState().hasItem('prod-1')).toBe(true);
  });
});
