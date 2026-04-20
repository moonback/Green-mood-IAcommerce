// Feature: budtender-ai-enhancements, Property 3: Email template completeness
// Validates: Requirements 2.2, 2.7
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { renderEmailTemplate } from '../emailTemplate';

describe('renderEmailTemplate', () => {
  it('email template contains all required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          userName: fc.string({ minLength: 1 }),
          storeName: fc.string({ minLength: 1 }),
          budtenderName: fc.string({ minLength: 1 }),
          startedAt: fc.date(),
          durationSec: fc.integer({ min: 10, max: 3600 }),
          products: fc.array(fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1 }),
            price: fc.float({ min: Math.fround(0.01), max: Math.fround(999) }),
            slug: fc.string({ minLength: 1 }),
          })),
        }),
        ({ userName, storeName, budtenderName, startedAt, durationSec, products }) => {
          const html = renderEmailTemplate({
            userName,
            userEmail: 'test@example.com',
            storeName,
            budtenderName,
            startedAt,
            durationSec,
            products,
          });
          expect(html).toContain(userName);
          expect(html).toContain(storeName);
          expect(html).toContain(budtenderName);
        }
      ),
      { numRuns: 100 }
    );
  });
});
