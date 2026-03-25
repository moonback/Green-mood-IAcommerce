import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import POSCategoryGrid from '../admin/pos/POSCategoryGrid';
import type { Category } from '../../lib/types';

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Fleurs',
    slug: 'fleurs',
    description: null,
    icon_name: null,
    image_url: null,
    sort_order: 0,
    parent_id: null,
    depth: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('POSCategoryGrid', () => {
  it('renders "Tous les produits" button', () => {
    render(<POSCategoryGrid categories={[]} onSelectCategory={vi.fn()} />);
    expect(screen.getByText('Tous les produits')).toBeTruthy();
  });

  it('renders "Favoris" button', () => {
    render(<POSCategoryGrid categories={[]} onSelectCategory={vi.fn()} />);
    expect(screen.getByText('Favoris')).toBeTruthy();
  });

  it('renders dynamic categories', () => {
    const cats = [
      makeCategory({ id: 'c1', name: 'Fleurs' }),
      makeCategory({ id: 'c2', name: 'Huiles' }),
    ];
    render(<POSCategoryGrid categories={cats} onSelectCategory={vi.fn()} />);
    expect(screen.getByText('Fleurs')).toBeTruthy();
    expect(screen.getByText('Huiles')).toBeTruthy();
  });

  it('calls onSelectCategory("all") for "Tous les produits"', async () => {
    const onSelect = vi.fn();
    render(<POSCategoryGrid categories={[]} onSelectCategory={onSelect} />);
    await userEvent.click(screen.getByText('Tous les produits').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('all');
  });

  it('calls onSelectCategory("favorites") for "Favoris"', async () => {
    const onSelect = vi.fn();
    render(<POSCategoryGrid categories={[]} onSelectCategory={onSelect} />);
    await userEvent.click(screen.getByText('Favoris').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('favorites');
  });

  it('calls onSelectCategory with category id when a dynamic category is clicked', async () => {
    const onSelect = vi.fn();
    const cats = [makeCategory({ id: 'cat-42', name: 'Résines' })];
    render(<POSCategoryGrid categories={cats} onSelectCategory={onSelect} />);
    await userEvent.click(screen.getByText('Résines').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('cat-42');
  });

  it('renders back button when onBack is provided', () => {
    render(
      <POSCategoryGrid
        categories={[]}
        onSelectCategory={vi.fn()}
        onBack={vi.fn()}
      />
    );
    // ArrowLeft icon button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // back + all + favorites
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    render(
      <POSCategoryGrid
        categories={[]}
        onSelectCategory={vi.fn()}
        onBack={onBack}
      />
    );
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[0]); // First button is the back arrow
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does NOT render back button when onBack is not provided', () => {
    render(<POSCategoryGrid categories={[]} onSelectCategory={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    // Without back button: only "Tous les produits" and "Favoris" = 2
    expect(buttons).toHaveLength(2);
  });

  it('renders section heading', () => {
    render(<POSCategoryGrid categories={[]} onSelectCategory={vi.fn()} />);
    expect(screen.getByText('Catégories')).toBeTruthy();
  });

  it('shows first letter of category name as icon', () => {
    const cats = [makeCategory({ name: 'Infusions' })];
    render(<POSCategoryGrid categories={cats} onSelectCategory={vi.fn()} />);
    expect(screen.getByText('I')).toBeTruthy();
  });
});
