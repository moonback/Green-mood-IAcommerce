/**
 * useDebounce — Delays updating a value until after a specified delay.
 *
 * Use this in search inputs, filter panels, and any input that triggers
 * expensive operations (API calls, heavy filtering) to prevent firing on
 * every keystroke.
 *
 * @example
 * const [query, setQuery] = useState('');
 * const debouncedQuery = useDebounce(query, 300);
 *
 * useEffect(() => {
 *   if (debouncedQuery) fetchResults(debouncedQuery);
 * }, [debouncedQuery]);
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * useDebouncedCallback — Returns a debounced version of a callback.
 *
 * @example
 * const debouncedSearch = useDebouncedCallback((q: string) => search(q), 300);
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number = 300,
): (...args: Parameters<T>) => void {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const callbackRef = useRef(callback);

    // Keep callback ref up to date (avoids stale closure)
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback(
        (...args: Parameters<T>) => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
        },
        [delay],
    );
}

// ─── Missing imports ─────────────────────────────────────────────────────────
import { useCallback, useRef } from 'react';