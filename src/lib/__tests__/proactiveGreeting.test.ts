// Feature: budtender-ai-enhancements, Property 6: Proactive greeting contains product name
// Validates: Requirements 3.2
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { buildProactiveGreeting } from '../proactiveGreeting';

describe('buildProactiveGreeting', () => {
  it('greeting contains the product name', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1 }),
          price: fc.float({ min: Math.fround(0.01), max: Math.fround(999) }),
          cbd_percentage: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(30) })),
        }),
        (product) => {
          const greeting = buildProactiveGreeting(product, null);
          expect(greeting).toContain(product.name);
        }
      ),
      { numRuns: 100 }
    );
  });
});
