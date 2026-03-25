import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCardV2 from '../ProductCardV2';

const baseProduct = {
  id: 'p-1',
  slug: 'test-produit',
  name: 'Produit Test',
  price: 99,
  stock_quantity: 12,
  is_available: true,
  is_featured: false,
  is_bundle: false,
  is_subscribable: false,
  avg_rating: 4.2,
  review_count: 12,
  attributes: { brand: 'TestBrand' },
  image_url: null,
};

describe('ProductCardV2 stock badges', () => {
  it('shows "X restants" badge when stock is low (<=5)', () => {
    render(
      <MemoryRouter>
        <ProductCardV2 product={{ ...baseProduct, stock_quantity: 3 } as any} />
      </MemoryRouter>
    );

    expect(screen.getByText(/3 restants/i)).toBeInTheDocument();
  });

  it('shows "X en stock" badge when stock is moderate (<=10)', () => {
    render(
      <MemoryRouter>
        <ProductCardV2 product={{ ...baseProduct, stock_quantity: 8 } as any} />
      </MemoryRouter>
    );

    expect(screen.getByText(/8 en stock/i)).toBeInTheDocument();
  });
});
