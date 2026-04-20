// Feature: budtender-ai-enhancements, Property 1: Transcript message rendering
import fc from 'fast-check';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import TranscriptPanel from '../TranscriptPanel';
import type { TranscriptMessage } from '../../../types/budtenderSession';

afterEach(() => {
  cleanup();
});

describe('TranscriptPanel', () => {
  /**
   * Property 1: Transcript message rendering
   * Validates: Requirements 1.2, 1.3
   *
   * For any non-empty, non-whitespace-only string and any role ('user' | 'assistant'),
   * the TranscriptPanel should render the text content and apply the correct
   * role-based alignment class.
   */
  it('renders non-empty transcript messages with correct role', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.constantFrom('user' as const, 'assistant' as const),
        (text, role) => {
          cleanup();
          const messages: TranscriptMessage[] = [{ role, text, timestamp: Date.now() }];
          const { container } = render(<TranscriptPanel messages={messages} />);

          // The text content must be present in the DOM
          expect(container.textContent).toContain(text);

          // Role-based alignment: user → justify-end (right), assistant → justify-start (left)
          if (role === 'user') {
            const el = container.querySelector('[class*="justify-end"]');
            expect(el).not.toBeNull();
          } else {
            const el = container.querySelector('[class*="justify-start"]');
            expect(el).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Whitespace messages are filtered
  // Feature: budtender-ai-enhancements, Property 2: Whitespace messages are filtered
  it('does not render whitespace-only messages', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[ \t\n\r]*$/),
        fc.constantFrom('user' as const, 'assistant' as const),
        (whitespace, role) => {
          cleanup();
          const messages: TranscriptMessage[] = [{ role, text: whitespace, timestamp: Date.now() }];
          const { container } = render(<TranscriptPanel messages={messages} />);
          // No message bubble should be rendered for whitespace-only text
          const bubbles = container.querySelectorAll('[class*="rounded-lg"]');
          expect(bubbles.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
