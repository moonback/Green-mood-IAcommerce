import { describe, it, expect, beforeEach, vi } from 'vitest';

const { maybeSingleMock, eqMock, selectMock, fromMock } = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const selectMock = vi.fn(() => ({ eq: eqMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { maybeSingleMock, eqMock, selectMock, fromMock };
});

vi.mock('../supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  TECH_ADVISOR_DEFAULTS,
  TECH_ADVISOR_DEFAULT_QUIZ,
  getBudTenderSettings,
  fetchBudTenderSettings,
} from '../budtenderSettings';

describe('TECH_ADVISOR_DEFAULTS', () => {
  it('is enabled by default', () => {
    expect(TECH_ADVISOR_DEFAULTS.enabled).toBe(true);
    expect(TECH_ADVISOR_DEFAULTS.ai_enabled).toBe(true);
  });

  it('has a valid default AI model', () => {
    expect(TECH_ADVISOR_DEFAULTS.ai_model).toBeTruthy();
    expect(typeof TECH_ADVISOR_DEFAULTS.ai_model).toBe('string');
  });

  it('has a welcome message', () => {
    expect(TECH_ADVISOR_DEFAULTS.welcome_message.length).toBeGreaterThan(0);
  });

  it('has 7 default quiz steps', () => {
    expect(TECH_ADVISOR_DEFAULT_QUIZ).toHaveLength(7);
  });
});

describe('budtender settings data source', () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockReset();
  });

  it('returns defaults synchronously when no in-memory cache yet', () => {
    const result = getBudTenderSettings();
    expect(result.ai_model).toBe(TECH_ADVISOR_DEFAULTS.ai_model);
  });

  it('loads from Supabase and updates in-memory cache', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { value: { ai_temperature: 0.4, gemini_enabled: false } },
      error: null,
    });

    const fetched = await fetchBudTenderSettings(true);
    expect(fetched.ai_temperature).toBe(0.4);
    expect(fetched.ai_enabled).toBe(false);

    const cached = getBudTenderSettings();
    expect(cached.ai_temperature).toBe(0.4);
    expect(cached.ai_enabled).toBe(false);
  });

  it('falls back to defaults when Supabase call fails', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: new Error('db down') });

    const fetched = await fetchBudTenderSettings(true);
    expect(fetched.enabled).toBe(TECH_ADVISOR_DEFAULTS.enabled);
    expect(fetched.ai_model).toBe(TECH_ADVISOR_DEFAULTS.ai_model);
  });
});
