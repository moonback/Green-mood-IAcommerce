// Feature: budtender-ai-enhancements, Property 4: Session duration guard
// Validates: Requirements 2.5
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { shouldSendSummary } from '../sessionGuard';

describe('shouldSendSummary', () => {
  it('returns false for sessions shorter than 10 seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9 }),
        fc.string({ minLength: 1 }),
        (durationSec, userId) => {
          expect(shouldSendSummary(durationSec, userId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns true for sessions >= 10 seconds with authenticated user', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 3600 }),
        fc.uuid(),
        (durationSec, userId) => {
          expect(shouldSendSummary(durationSec, userId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns false when userId is null regardless of duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3600 }),
        (durationSec) => {
          expect(shouldSendSummary(durationSec, null)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
