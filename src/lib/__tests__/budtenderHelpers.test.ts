import { describe, it, expect, vi } from 'vitest';
import { makeProduct } from '../../test/utils';
import { CATEGORY_SLUGS } from '../constants';

vi.mock('../supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock('../budtenderPrompts', () => ({ getQuizPrompt: vi.fn(() => 'prompt'), getDynamicQuizPrompt: vi.fn(() => 'dynamic') }));
vi.mock('../../store/settingsStore', () => ({
  useSettingsStore: { getState: () => ({ settings: { budtender_name: 'BudTender' } }) },
}));

import { scoreProduct, scoreTechFeatures, generateAdvice } from '../budtenderHelpers';
import type { Answers } from '../budtenderHelpers';

// ─── scoreProduct ────────────────────────────────────────────────────────────

describe('scoreProduct — goal', () => {
  it('gives bonus for relaxation goal', () => {
    const flower = makeProduct({ 
      name: 'Amnesia Relax', 
      description: 'parfait pour la détente et le calme', 
      category: { slug: CATEGORY_SLUGS.FLEURS, name: 'Fleurs' } as any 
    });
    const answers: Answers = { effect_goal: 'relaxation' };
    expect(scoreProduct(flower, answers)).toBeGreaterThan(0);
  });

  it('gives bonus for sleep goal', () => {
    const oil = makeProduct({ 
      name: 'Huile Sommeil', 
      description: 'aide à dormir profondément toute la nuit', 
      category: { slug: CATEGORY_SLUGS.HUILES, name: 'Huiles' } as any 
    });
    const answers: Answers = { effect_goal: 'sleep' };
    expect(scoreProduct(oil, answers)).toBeGreaterThan(0);
  });

  it('gives bonus for relief goal', () => {
    const oil = makeProduct({ 
      name: 'Huile Relief', 
      description: 'soulagement du stress et des douleurs', 
      category: { slug: CATEGORY_SLUGS.HUILES, name: 'Huiles' } as any 
    });
    const answers: Answers = { effect_goal: 'relief' };
    expect(scoreProduct(oil, answers)).toBeGreaterThan(0);
  });

  it('gives bonus for energy goal', () => {
    const flower = makeProduct({ 
      name: 'Super Silver Haze', 
      description: 'boost d\'énergie et vitalité pour le jour', 
      category: { slug: CATEGORY_SLUGS.FLEURS, name: 'Fleurs' } as any 
    });
    const answers: Answers = { effect_goal: 'energy' };
    expect(scoreProduct(flower, answers)).toBeGreaterThan(0);
  });
});

describe('scoreProduct — experience', () => {
  it('beginner gets bonus for oils/gummies', () => {
    const oil = makeProduct({ category: { slug: CATEGORY_SLUGS.HUILES } as any });
    const answers: Answers = { experience_level: 'beginner' };
    expect(scoreProduct(oil, answers)).toBeGreaterThan(0);
  });

  it('expert gets bonus for resins/strong products', () => {
    const resin = makeProduct({ 
      category: { slug: CATEGORY_SLUGS.RESINES } as any,
      description: 'un hash puissant et intense' 
    });
    const answers: Answers = { experience_level: 'expert' };
    expect(scoreProduct(resin, answers)).toBeGreaterThan(0);
  });
});

// ─── scoreTechFeatures (Renamed to match helper but domain is CBD) ───────────

describe('scoreTechFeatures', () => {
  it('returns 0 when no features selected', () => {
    const p = makeProduct({ attributes: { specs: ['bio', 'indoor'] } as any });
    expect(scoreTechFeatures(p, [])).toBe(0);
  });

  it('gives bonus for spec match', () => {
    const p = makeProduct({ attributes: { specs: ['Culture Indoor', 'Bio'] } as any });
    expect(scoreTechFeatures(p, ['Indoor'])).toBeGreaterThanOrEqual(6);
  });

  it('gives bonus for description text match', () => {
    const p = makeProduct({ description: 'un arôme terreux et boisé', attributes: { specs: [], benefits: [] } as any });
    expect(scoreTechFeatures(p, ['Terreux'])).toBeGreaterThan(0);
  });
});

// ─── generateAdvice ──────────────────────────────────────────────────────────

describe('generateAdvice', () => {
  it('returns advice for relaxation goal', () => {
    expect(generateAdvice({ effect_goal: 'relaxation' }).toLowerCase()).toContain('détente');
  });

  it('returns advice for sleep goal', () => {
    expect(generateAdvice({ effect_goal: 'sleep' }).toLowerCase()).toContain('sommeil');
  });

  it('returns advice for relief goal', () => {
    expect(generateAdvice({ effect_goal: 'relief' }).toLowerCase()).toContain('soulagement');
  });

  it('returns advice for energy goal', () => {
    expect(generateAdvice({ effect_goal: 'energy' }).toLowerCase()).toContain('boost');
  });

  it('includes beginner tip for beginner experience', () => {
    expect(generateAdvice({ experience_level: 'beginner' }).toLowerCase()).toContain('débutez');
  });

  it('returns empty string when no answers match', () => {
    const advice = generateAdvice({});
    expect(advice).toBe('');
  });
});
