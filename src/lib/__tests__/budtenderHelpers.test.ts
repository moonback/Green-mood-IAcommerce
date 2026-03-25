import { describe, it, expect, vi } from 'vitest';
import { makeProduct } from '../../test/utils';

vi.mock('../supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock('../budtenderPrompts', () => ({ getQuizPrompt: vi.fn(() => 'prompt'), getDynamicQuizPrompt: vi.fn(() => 'dynamic') }));
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ settings: { budtender_name: 'BudTender' } }) },
}));

import { scoreProduct, scoreTechFeatures, generateAdvice } from '../budtenderHelpers';
import type { Answers } from '../budtenderHelpers';

// ─── scoreProduct ────────────────────────────────────────────────────────────

describe('scoreProduct — goal', () => {
  it('gives bonus for gaming goal', () => {
    const pc = makeProduct({ price: 1000, name: 'PC Gaming RTX', description: 'haute performance rtx 4080', category: { slug: 'pc-gaming', name: 'PC Gaming' } as any });
    const answers: Answers = { tech_goal: 'gaming' };
    expect(scoreProduct(pc, answers)).toBeGreaterThan(0);
  });

  it('gives bonus for work goal', () => {
    const laptop = makeProduct({ price: 1200, name: 'ThinkPad', description: 'productivité ergonomique autonomie', category: { slug: 'laptops', name: 'Laptops' } as any });
    const answers: Answers = { tech_goal: 'work' };
    expect(scoreProduct(laptop, answers)).toBeGreaterThan(0);
  });

  it('gives bonus for creation goal', () => {
    const station = makeProduct({ price: 2500, name: 'Mac Studio', description: 'rendu adobe photo puissance', category: { slug: 'stations-de-travail', name: 'Stations' } as any });
    const answers: Answers = { tech_goal: 'creation' };
    expect(scoreProduct(station, answers)).toBeGreaterThan(0);
  });

  it('gives bonus for smart_home goal', () => {
    const iot = makeProduct({ price: 150, name: 'Capteur', description: 'connecté domotique wifi', category: { slug: 'iot', name: 'IoT' } as any });
    const answers: Answers = { tech_goal: 'smart_home' };
    expect(scoreProduct(iot, answers)).toBeGreaterThan(0);
  });
});

describe('scoreProduct — experience', () => {
  it('beginner gets bonus for bundles', () => {
    const bundle = makeProduct({ price: 1000, is_bundle: true, description: 'pack complet facile' });
    const answers: Answers = { experience_level: 'beginner' };
    expect(scoreProduct(bundle, answers)).toBeGreaterThan(0);
  });

  it('expert gets bonus for premium/custom products', () => {
    const custom = makeProduct({ price: 6000, description: 'custom premium overclocking' });
    const answers: Answers = { experience_level: 'expert' };
    expect(scoreProduct(custom, answers)).toBeGreaterThan(0);
  });
});

describe('scoreProduct — budget', () => {
  it('entry budget matches cheap products', () => {
    const low = makeProduct({ price: 300 });
    const high = makeProduct({ price: 4000 });
    expect(scoreProduct(low, { budget_range: 'entry' })).toBeGreaterThan(
      scoreProduct(high, { budget_range: 'entry' })
    );
  });

  it('ultra budget matches expensive products', () => {
    const low = makeProduct({ price: 300 });
    const high = makeProduct({ price: 4000 });
    expect(scoreProduct(high, { budget_range: 'ultra' })).toBeGreaterThan(
      scoreProduct(low, { budget_range: 'ultra' })
    );
  });
});

// ─── scoreTechFeatures ───────────────────────────────────────────────────────────

describe('scoreTechFeatures', () => {
  it('returns 0 when no features selected', () => {
    const p = makeProduct({ attributes: { specs: ['4k', 'wifi'] } as any });
    expect(scoreTechFeatures(p, [])).toBe(0);
  });

  it('gives bonus for spec match', () => {
    const p = makeProduct({ attributes: { specs: ['écran 4k', 'wi-fi'] } as any });
    expect(scoreTechFeatures(p, ['4K'])).toBeGreaterThanOrEqual(6);
  });

  it('gives bonus for benefit match', () => {
    const p = makeProduct({ attributes: { benefits: ['immersion totale'] } as any });
    expect(scoreTechFeatures(p, ['Immersion'])).toBeGreaterThan(0);
  });

  it('gives bonus for description text match', () => {
    const p = makeProduct({ description: 'un feeling vintage 80s', attributes: { specs: [], benefits: [] } as any });
    expect(scoreTechFeatures(p, ['Vintage 80s'])).toBeGreaterThan(0);
  });

  it('accumulates bonus for multiple matches', () => {
    const p = makeProduct({ attributes: { specs: ['multijoueur'], benefits: ['compétition'] } as any });
    const single = scoreTechFeatures(p, ['Multijoueur']);
    const multi = scoreTechFeatures(p, ['Multijoueur', 'Compétition']);
    expect(multi).toBeGreaterThan(single);
  });
});

// ─── generateAdvice ──────────────────────────────────────────────────────────

describe('generateAdvice', () => {
  it('returns advice for gaming goal', () => {
    expect(generateAdvice({ tech_goal: 'gaming' }).toLowerCase()).toContain('gaming');
  });

  it('returns advice for work goal', () => {
    expect(generateAdvice({ tech_goal: 'work' }).toLowerCase()).toContain('productivité');
  });

  it('returns advice for creation goal', () => {
    expect(generateAdvice({ tech_goal: 'creation' }).toLowerCase()).toContain('création');
  });

  it('returns advice for smart_home goal', () => {
    expect(generateAdvice({ tech_goal: 'smart_home' }).toLowerCase()).toContain('maison connectée');
  });

  it('includes beginner tip for beginner experience', () => {
    expect(generateAdvice({ experience_level: 'beginner' }).toLowerCase()).toContain('débuter');
  });

  it('includes tech info when tech features are provided', () => {
    const advice = generateAdvice({}, ['4K', 'Wi-Fi']);
    expect(advice.toLowerCase()).toContain('critères prioritaires');
    expect(advice.toLowerCase()).toContain('4k');
  });

  it('returns empty string when no answers match', () => {
    const advice = generateAdvice({});
    expect(advice).toBe('');
  });
});
