import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TechFeatureSelector from '../budtender/TechFeatureSelector';
import { TECH_CHIPS } from '../../lib/budtenderHelpers';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../lib/budtenderPrompts', () => ({}));
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ settings: {} }) },
}));

describe('TechFeatureSelector', () => {
  it('renders all tech feature chips', () => {
    render(
      <TechFeatureSelector
        selectedFeatures={[]}
        onToggleFeature={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    for (const chip of TECH_CHIPS) {
      expect(screen.getByText(chip.label)).toBeTruthy();
    }
  });

  it('shows "Passer cette étape" when nothing selected', () => {
    render(
      <TechFeatureSelector
        selectedFeatures={[]}
        onToggleFeature={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText(/Passer cette étape/i)).toBeTruthy();
  });

  it('shows "Confirmer la sélection (N)" when chips are selected', () => {
    render(
      <TechFeatureSelector
        selectedFeatures={['Écran 4K', 'Multijoueur']}
        onToggleFeature={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText(/Confirmer la sélection \(2\)/i)).toBeTruthy();
  });

  it('calls onToggleFeature with chip label when clicked', async () => {
    const onToggle = vi.fn();
    render(
      <TechFeatureSelector
        selectedFeatures={[]}
        onToggleFeature={onToggle}
        onConfirm={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText('Écran 4K').closest('button')!);
    expect(onToggle).toHaveBeenCalledWith('Écran 4K');
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <TechFeatureSelector
        selectedFeatures={[]}
        onToggleFeature={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    await userEvent.click(screen.getByText(/Passer cette étape/i).closest('button')!);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('marks selected chips visually', () => {
    const { container } = render(
      <TechFeatureSelector
        selectedFeatures={['Écran 4K']}
        onToggleFeature={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Écran 4K')
    );
    expect(btn?.className).toMatch(/emerald-500/);
  });

  it('does not mark unselected chips', () => {
    const { container } = render(
      <TechFeatureSelector
        selectedFeatures={[]}
        onToggleFeature={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Écran 4K')
    );
    expect(btn?.className).not.toMatch(/bg-emerald-500\b/);
  });
});
