import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { slugify, sleep, isQuotaError } from '../utils';

describe('slugify', () => {
  it('lowercases the string', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes accented characters', () => {
    expect(slugify('Fleur Été')).toBe('fleur-ete');
    expect(slugify('Côté')).toBe('cote');
    expect(slugify('Résine')).toBe('resine');
  });

  it('replaces spaces with dashes', () => {
    expect(slugify('huile cbd 10%')).toBe('huile-cbd-10');
  });

  it('replaces multiple non-alphanumeric chars with a single dash', () => {
    expect(slugify('abc  --  def')).toBe('abc-def');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('--hello--')).toBe('hello');
  });

  it('handles an empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('handles a string that is already a valid slug', () => {
    expect(slugify('already-a-slug')).toBe('already-a-slug');
  });

  it('removes special characters', () => {
    expect(slugify('CBD Oil & Flowers!')).toBe('cbd-oil-flowers');
  });
});

describe('sleep', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves after the given delay', async () => {
    const promise = sleep(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });

  it('does not resolve before the delay', () => {
    let resolved = false;
    sleep(200).then(() => { resolved = true; });
    vi.advanceTimersByTime(100);
    expect(resolved).toBe(false);
  });
});

describe('isQuotaError', () => {
  it('detects "quota exceeded" in message', () => {
    expect(isQuotaError(new Error('quota exceeded'))).toBe(true);
  });

  it('detects "resource_exhausted"', () => {
    expect(isQuotaError(new Error('resource_exhausted'))).toBe(true);
  });

  it('detects "too many requests"', () => {
    expect(isQuotaError(new Error('too many requests'))).toBe(true);
  });

  it('detects "rate limit"', () => {
    expect(isQuotaError(new Error('rate limit exceeded'))).toBe(true);
  });

  it('detects code 429 in JSON-like string', () => {
    expect(isQuotaError({ message: 'code":429' })).toBe(true);
  });

  it('returns false for non-quota errors', () => {
    expect(isQuotaError(new Error('network error'))).toBe(false);
    expect(isQuotaError(new Error('not found'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
    expect(isQuotaError(undefined)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isQuotaError(new Error('QUOTA EXCEEDED'))).toBe(true);
    expect(isQuotaError(new Error('Rate Limit'))).toBe(true);
  });
});
