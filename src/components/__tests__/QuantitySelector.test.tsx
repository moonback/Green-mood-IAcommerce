import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuantitySelector from '../QuantitySelector';

describe('QuantitySelector', () => {
  it('renders the current quantity', () => {
    render(<QuantitySelector quantity={3} onChange={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders decrement and increment buttons', () => {
    render(<QuantitySelector quantity={3} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Diminuer la quantité')).toBeInTheDocument();
    expect(screen.getByLabelText('Augmenter la quantité')).toBeInTheDocument();
  });

  it('calls onChange with quantity-1 when decrement is clicked', () => {
    const onChange = vi.fn();
    render(<QuantitySelector quantity={3} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Diminuer la quantité'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange with quantity+1 when increment is clicked', () => {
    const onChange = vi.fn();
    render(<QuantitySelector quantity={3} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Augmenter la quantité'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('disables decrement button when quantity equals min (default min=1)', () => {
    render(<QuantitySelector quantity={1} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Diminuer la quantité')).toBeDisabled();
  });

  it('disables increment button when quantity equals max (default max=99)', () => {
    render(<QuantitySelector quantity={99} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Augmenter la quantité')).toBeDisabled();
  });

  it('disables decrement at custom min', () => {
    render(<QuantitySelector quantity={2} onChange={vi.fn()} min={2} />);
    expect(screen.getByLabelText('Diminuer la quantité')).toBeDisabled();
  });

  it('disables increment at custom max', () => {
    render(<QuantitySelector quantity={10} onChange={vi.fn()} max={10} />);
    expect(screen.getByLabelText('Augmenter la quantité')).toBeDisabled();
  });

  it('enables both buttons when quantity is between min and max', () => {
    render(<QuantitySelector quantity={5} onChange={vi.fn()} min={1} max={10} />);
    expect(screen.getByLabelText('Diminuer la quantité')).toBeEnabled();
    expect(screen.getByLabelText('Augmenter la quantité')).toBeEnabled();
  });
});
