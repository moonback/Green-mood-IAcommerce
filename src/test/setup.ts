import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock motion/react: AnimatePresence must synchronously remove children in jsdom
// (exit animations never fire → elements stay in DOM without this mock)
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: { children?: any }) => children ?? null,
  };
});

// Reset localStorage and sessionStorage between tests
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// Mock ResizeObserver (not available in jsdom) — must be a class
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_callback: ResizeObserverCallback) {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock IntersectionObserver (not available in jsdom) — must be a class for framer-motion
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
