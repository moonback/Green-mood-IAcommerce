// Feature: budtender-ai-enhancements, Property 5: Session data persistence completeness
// Validates: Requirements 2.10
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { buildSessionRecord } from '../sessionPersistence';

describe('buildSessionRecord', () => {
  it('returns a record with all required fields non-null', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          transcript: fc.array(fc.record({
            role: fc.constantFrom('user' as const, 'assistant' as const),
            text: fc.string({ minLength: 1 }),
            timestamp: fc.integer({ min: 0 }),
          })),
          recommendedProducts: fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1 }),
            price: fc.float({ min: Math.fround(0.01), max: Math.fround(999) }),
            slug: fc.string({ minLength: 1 }),
          })),
          durationSec: fc.integer({ min: 10, max: 3600 }),
          startedAt: fc.date({ noInvalidDate: true }),
          endedAt: fc.date({ noInvalidDate: true }),
        }),
        (payload) => {
          const record = buildSessionRecord(payload);
          expect(record.user_id).toBe(payload.userId);
          expect(record.user_id).not.toBeNull();
          expect(record.started_at).not.toBeNull();
          expect(record.ended_at).not.toBeNull();
          expect(record.duration_sec).toBe(payload.durationSec);
          expect(record.transcript).toEqual(payload.transcript);
          expect(record.recommended_products).toEqual(payload.recommendedProducts);
          expect(record.email_sent).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
