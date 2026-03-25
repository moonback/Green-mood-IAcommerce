import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockBadge from '../StockBadge';

describe('StockBadge', () => {
  it('shows "Archives Épuisées" when stock is 0', () => {
    render(<StockBadge stock={0} />);
    expect(screen.getByText(/Archives Épuisées/i)).toBeInTheDocument();
  });

  it('shows "Édition Limitée" when stock is between 1 and 5', () => {
    render(<StockBadge stock={3} />);
    expect(screen.getByText(/Édition Limitée/i)).toBeInTheDocument();
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
  });

  it('shows stock count in limited badge', () => {
    render(<StockBadge stock={5} />);
    expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
  });

  it('shows "Disponibilité Totale" when stock is above 5', () => {
    render(<StockBadge stock={6} />);
    expect(screen.getByText(/Disponibilité Totale/i)).toBeInTheDocument();
  });

  it('shows "Disponibilité Totale" for high stock values', () => {
    render(<StockBadge stock={100} />);
    expect(screen.getByText(/Disponibilité Totale/i)).toBeInTheDocument();
  });

  it('shows "Archives Épuisées" (not limited) for stock=0', () => {
    render(<StockBadge stock={0} />);
    expect(screen.queryByText(/Édition Limitée/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Disponibilité Totale/i)).not.toBeInTheDocument();
  });

  it('shows "Édition Limitée" for stock=1', () => {
    render(<StockBadge stock={1} />);
    expect(screen.getByText(/Édition Limitée/i)).toBeInTheDocument();
  });
});
