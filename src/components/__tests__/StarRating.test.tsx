import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StarRating from '../StarRating';

describe('StarRating', () => {
  it('renders 5 star buttons', () => {
    render(<StarRating rating={3} />);
    // Each star is a button (disabled when not interactive)
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('renders the correct number of filled stars', () => {
    const { container } = render(<StarRating rating={3} />);
    // Stars with fill-yellow-400 class = filled
    const filledStars = container.querySelectorAll('.fill-yellow-400');
    expect(filledStars).toHaveLength(3);
  });

  it('rounds rating to nearest integer', () => {
    const { container } = render(<StarRating rating={3.7} />);
    const filledStars = container.querySelectorAll('.fill-yellow-400');
    expect(filledStars).toHaveLength(4); // Math.round(3.7) = 4
  });

  it('renders 0 filled stars for rating=0', () => {
    const { container } = render(<StarRating rating={0} />);
    const filledStars = container.querySelectorAll('.fill-yellow-400');
    expect(filledStars).toHaveLength(0);
  });

  it('renders 5 filled stars for rating=5', () => {
    const { container } = render(<StarRating rating={5} />);
    const filledStars = container.querySelectorAll('.fill-yellow-400');
    expect(filledStars).toHaveLength(5);
  });

  it('buttons are disabled when not interactive (default)', () => {
    render(<StarRating rating={3} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('buttons are enabled when interactive=true', () => {
    render(<StarRating rating={3} interactive />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeEnabled());
  });

  it('calls onRate with the correct value when a star is clicked', () => {
    const onRate = vi.fn();
    render(<StarRating rating={0} interactive onRate={onRate} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // 3rd star = rating 3
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('shows count when showCount=true and count is provided', () => {
    render(<StarRating rating={4} showCount count={42} />);
    expect(screen.getByText('(42)')).toBeInTheDocument();
  });

  it('does not show count when showCount is false', () => {
    render(<StarRating rating={4} showCount={false} count={42} />);
    expect(screen.queryByText('(42)')).not.toBeInTheDocument();
  });
});
