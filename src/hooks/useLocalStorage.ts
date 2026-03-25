/**
 * useLocalStorage — React state backed by localStorage.
 *
 * Improvements over plain localStorage access:
 * 1. SSR-safe (no window reference during hydration)
 * 2. Type-safe with generics
 * 3. Handles JSON parse errors gracefully
 * 4. Syncs across browser tabs via the 'storage' event
 *
 * @example
 * const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'dark');
 */

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // Lazy initial state — reads from localStorage only once
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item !== null ? (JSON.parse(item) as T) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                const newValue = value instanceof Function ? value(storedValue) : value;
                setStoredValue(newValue);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(newValue));
                }
            } catch (error) {
                console.warn(`useLocalStorage: Could not set key "${key}"`, error);
            }
        },
        [key, storedValue],
    );

    const removeValue = useCallback(() => {
        setStoredValue(initialValue);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
        }
    }, [key, initialValue]);

    // Sync across tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key !== key || e.storageArea !== window.localStorage) return;
            try {
                setStoredValue(e.newValue !== null ? JSON.parse(e.newValue) : initialValue);
            } catch {
                // Ignore parse errors from other tabs
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue];
}