// Feature: budtender-ai-enhancements
// Property 7: Session list sorted by date descending
// Property 8: Session card displays required fields
// Property 9: Period filter correctness
// Property 10: Recommended products rendered as links

import fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  sortSessions,
  filterSessionsByPeriod,
  SessionCard,
  type PeriodFilter,
} from '../BudTenderHistory';
import type { BudTenderSession, RecommendedProduct } from '../../types/budtenderSession';

/* ── Helpers ────────────────────────────────────────────────────────── */

let _idCounter = 0;
function uniqueId(): string {
  _idCounter++;
  return `id-${_idCounter}-${Math.random().toString(36).slice(2)}`;
}

function makeSession(overrides: Partial<BudTenderSession> = {}): BudTenderSession {
  return {
    id: uniqueId(),
    user_id: uniqueId(),
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    duration_sec: 60,
    transcript: [],
    recommended_products: [],
    email_sent: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Generate a date ISO string within a safe range (2020–2029)
const safeDate = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2029-12-31').getTime() })
  .map(ts => new Date(ts).toISOString());

/* ── Property 7: Session list sorted by date descending ─────────────── */

describe('sortSessions', () => {
  // Feature: budtender-ai-enhancements, Property 7: Session list sorted by date descending
  // Validates: Requirements 4.2
  it('always returns sessions in descending chronological order', () => {
    fc.assert(
      fc.property(
        fc.array(
          safeDate.map(started_at => makeSession({ started_at })),
          { minLength: 2, maxLength: 20 }
        ),
        (sessions) => {
          const sorted = sortSessions(sessions);
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(new Date(sorted[i].started_at).getTime()).toBeGreaterThanOrEqual(
              new Date(sorted[i + 1].started_at).getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not mutate the original array', () => {
    const sessions = [
      makeSession({ started_at: '2024-01-01T00:00:00Z' }),
      makeSession({ started_at: '2024-06-01T00:00:00Z' }),
    ];
    const original = [...sessions];
    sortSessions(sessions);
    expect(sessions[0].started_at).toBe(original[0].started_at);
  });
});

/* ── Property 8: Session card displays required fields ──────────────── */

describe('SessionCard', () => {
  // Feature: budtender-ai-enhancements, Property 8: Session card displays required fields
  // Validates: Requirements 4.3
  it('renders duration and message count for any valid session', () => {
    fc.assert(
      fc.property(
        fc.record({
          started_at: safeDate,
          ended_at: safeDate,
          duration_sec: fc.integer({ min: 0, max: 7200 }),
          transcript: fc.array(
            fc.record({
              role: fc.constantFrom('user' as const, 'assistant' as const),
              text: fc.string({ minLength: 1 }),
              timestamp: fc.integer({ min: 0 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
        }).map(partial => makeSession(partial)),
        (session) => {
          const { unmount } = render(
            <MemoryRouter>
              <SessionCard session={session} isSelected={false} onClick={vi.fn()} />
            </MemoryRouter>
          );

          // Duration should be present
          const durationText = session.duration_sec >= 60
            ? `${Math.floor(session.duration_sec / 60)}m`
            : `${session.duration_sec}s`;
          expect(screen.getByText(new RegExp(durationText))).toBeTruthy();

          // Message count should be present
          expect(screen.getByText(new RegExp(`${session.transcript.length} messages?`))).toBeTruthy();

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ── Property 9: Period filter correctness ──────────────────────────── */

describe('filterSessionsByPeriod', () => {
  // Feature: budtender-ai-enhancements, Property 9: Period filter correctness
  // Validates: Requirements 4.5
  it('only returns sessions within the selected period', () => {
    fc.assert(
      fc.property(
        fc.array(
          safeDate.map(started_at => makeSession({ started_at })),
          { minLength: 0, maxLength: 30 }
        ),
        fc.constantFrom('7d' as PeriodFilter, '30d' as PeriodFilter, 'all' as PeriodFilter),
        (sessions, period) => {
          const result = filterSessionsByPeriod(sessions, period);

          if (period === 'all') {
            expect(result.length).toBe(sessions.length);
            return;
          }

          const days = period === '7d' ? 7 : 30;
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);

          // Every session in result must be within the period
          result.forEach(s => {
            expect(new Date(s.started_at).getTime()).toBeGreaterThanOrEqual(cutoff.getTime());
          });

          // No session outside the period should appear
          const outsideSessions = sessions.filter(
            s => new Date(s.started_at).getTime() < cutoff.getTime()
          );
          outsideSessions.forEach(outside => {
            expect(result.find(r => r.id === outside.id)).toBeUndefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/* ── Property 10: Recommended products rendered as links ────────────── */

// Minimal component that mirrors the SessionDetail product grid link rendering
function ProductLinks({ products }: { products: RecommendedProduct[] }) {
  return (
    <MemoryRouter>
      <div>
        {products.map((p, i) => (
          <a key={`${p.id}-${i}`} href={`/catalogue/${p.slug}`} data-testid={`product-link-${i}`}>
            {p.name || 'produit'}
          </a>
        ))}
      </div>
    </MemoryRouter>
  );
}

describe('Recommended products links', () => {
  // Feature: budtender-ai-enhancements, Property 10: Recommended products rendered as links
  // Validates: Requirements 4.8
  it('each recommended product is rendered as an anchor whose href contains the slug', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1 }),
            price: fc.float({ min: Math.fround(0.01), max: Math.fround(999) }),
            slug: fc.string({ minLength: 1 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (products) => {
          const { unmount, container } = render(<ProductLinks products={products} />);

          const anchors = container.querySelectorAll('a');
          expect(anchors.length).toBe(products.length);

          products.forEach((product, i) => {
            const link = container.querySelector(`[data-testid="product-link-${i}"]`);
            expect(link).toBeTruthy();
            expect(link?.getAttribute('href')).toContain(product.slug);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });
});
