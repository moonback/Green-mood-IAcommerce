import { ReactElement } from 'react';
import { render, RenderOptions, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../components/ThemeProvider';
import { Product, Profile } from '../lib/types';

// ─── Test Providers Wrapper ──────────────────────────────────────────────────

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </MemoryRouter>
  );
}

// ─── Custom Render Helper ────────────────────────────────────────────────────

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] }
) {
  const { initialEntries = ['/'], ...rest } = options ?? {};
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    ),
    ...rest,
  });
}

export { renderWithProviders as render, screen, waitFor, fireEvent };

// ─── Mock Data Factories ──────────────────────────────────────────────────────

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    category_id: 'cat-1',
    slug: 'test-product',
    name: 'Test CBD Flower',
    sku: 'SKU-001',
    description: 'A test product',
    weight_grams: 3,
    price: 12.99,
    original_value: null,
    image_url: null,
    stock_quantity: 10,
    is_available: true,
    is_featured: false,
    is_active: true,
    is_bundle: false,
    is_subscribable: false,
    attributes: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    full_name: 'Test User',
    email: 'test@example.com',
    phone: null,
    loyalty_points: 0,
    referral_code: null,
    referred_by_id: null,
    is_admin: false,
    birthday: null,
    last_birthday_gift_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
