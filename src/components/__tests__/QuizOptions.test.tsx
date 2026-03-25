import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizOptions from '../budtender/QuizOptions';

const options = [
  { label: 'Sommeil', value: 'sleep', emoji: '🌙' },
  { label: 'Stress', value: 'stress', emoji: '🧘' },
  { label: 'Douleurs', value: 'pain', emoji: '💪' },
];

describe('QuizOptions', () => {
  it('renders all options', () => {
    render(
      <QuizOptions
        options={options}
        stepId="goal"
        hasAnsweredNext={false}
        isDisabled={false}
        onAnswer={vi.fn()}
      />
    );
    expect(screen.getByText('Sommeil')).toBeTruthy();
    expect(screen.getByText('Stress')).toBeTruthy();
    expect(screen.getByText('Douleurs')).toBeTruthy();
  });

  it('renders emojis', () => {
    render(
      <QuizOptions
        options={options}
        stepId="goal"
        hasAnsweredNext={false}
        isDisabled={false}
        onAnswer={vi.fn()}
      />
    );
    expect(screen.getByText('🌙')).toBeTruthy();
  });

  it('calls onAnswer with option and stepId when clicked', async () => {
    const onAnswer = vi.fn();
    render(
      <QuizOptions
        options={options}
        stepId="goal"
        hasAnsweredNext={false}
        isDisabled={false}
        onAnswer={onAnswer}
      />
    );
    await userEvent.click(screen.getByText('Sommeil').closest('button')!);
    expect(onAnswer).toHaveBeenCalledWith(options[0], 'goal');
  });

  it('disables all buttons when isDisabled is true', () => {
    render(
      <QuizOptions
        options={options}
        stepId="goal"
        hasAnsweredNext={false}
        isDisabled={true}
        onAnswer={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('does not call onAnswer when disabled', async () => {
    const onAnswer = vi.fn();
    render(
      <QuizOptions
        options={options}
        stepId="goal"
        hasAnsweredNext={false}
        isDisabled={true}
        onAnswer={onAnswer}
      />
    );
    await userEvent.click(screen.getByText('Sommeil').closest('button')!);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('visually marks selected answer', () => {
    const { container } = render(
      <QuizOptions
        options={options}
        stepId="goal"
        selectedAnswer="sleep"
        hasAnsweredNext={false}
        isDisabled={false}
        onAnswer={vi.fn()}
      />
    );
    // Selected button should have emerald-500 classes
    const buttons = container.querySelectorAll('button');
    const sleepBtn = Array.from(buttons).find(b => b.textContent?.includes('Sommeil'));
    expect(sleepBtn?.className).toMatch(/emerald-500/);
  });

  it('renders empty when options array is empty', () => {
    const { container } = render(
      <QuizOptions
        options={[]}
        stepId="goal"
        hasAnsweredNext={false}
        isDisabled={false}
        onAnswer={vi.fn()}
      />
    );
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
