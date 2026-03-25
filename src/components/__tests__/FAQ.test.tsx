import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FAQ from '../FAQ';

// Helper: get a FAQ button by partial question text
function getFaqButton(partialText: string) {
  return screen.getAllByRole('button').find((btn) =>
    btn.textContent?.includes(partialText)
  )!;
}

describe('FAQ', () => {
  it('renders the section heading', () => {
    render(<FAQ />);
    expect(screen.getByText(/Questions Fréquentes/i)).toBeTruthy();
  });

  it('renders all FAQ questions', () => {
    render(<FAQ />);
    const buttons = screen.getAllByRole('button');
    // 6 FAQ questions should produce 6 accordion buttons
    expect(buttons).toHaveLength(6);
  });

  it('answers are not visible initially', () => {
    render(<FAQ />);
    expect(screen.queryByText(/nos propres techniciens/i)).toBeNull();
  });

  it('opens an answer when clicking a question button', async () => {
    render(<FAQ />);
    const firstBtn = screen.getAllByRole('button')[0];
    await userEvent.click(firstBtn);
    expect(screen.getByText(/nos propres techniciens/i)).toBeTruthy();
  });

  it('closes an open answer when clicking the same question again', async () => {
    render(<FAQ />);
    const firstBtn = screen.getAllByRole('button')[0];
    await userEvent.click(firstBtn);
    expect(screen.getByText(/nos propres techniciens/i)).toBeTruthy();
    await userEvent.click(firstBtn);
    expect(screen.queryByText(/nos propres techniciens/i)).toBeNull();
  });

  it('only one answer is open at a time', async () => {
    render(<FAQ />);
    const buttons = screen.getAllByRole('button');
    const q1 = buttons[0]; // livraison & installation
    const q2 = buttons[1]; // garantie

    await userEvent.click(q1);
    expect(screen.getByText(/nos propres techniciens/i)).toBeTruthy();

    await userEvent.click(q2);
    // First answer should close
    expect(screen.queryByText(/nos propres techniciens/i)).toBeNull();
    // Second answer should open
    expect(screen.getByText(/garantie constructeur de 2 ans/i)).toBeTruthy();
  });

  it('renders the delivery delays answer', async () => {
    render(<FAQ />);
    const buttons = screen.getAllByRole('button');
    // 5th button is "Quels sont les délais de livraison ?"
    await userEvent.click(buttons[4]);
    expect(screen.getByText(/jours ouvrés/i)).toBeTruthy();
  });
});
