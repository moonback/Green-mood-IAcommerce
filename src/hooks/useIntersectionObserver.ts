/**
 * useIntersectionObserver — Efficient lazy visibility detection.
 *
 * Better than Framer's whileInView when:
 * - You have dozens of elements (one observer for all vs one per element)
 * - You need to trigger data fetching (not just animation)
 * - You want more control (rootMargin, threshold, once/repeat)
 *
 * @example
 * const [ref, isVisible] = useIntersectionObserver({ once: true });
 * return <div ref={ref}>{isVisible ? <HeavyComponent /> : <Skeleton />}</div>
 */

import { useEffect, useRef, useState } from 'react';

interface Options extends IntersectionObserverInit {
    /** If true, stop observing once the element is visible (default: false) */
    once?: boolean;
}

export function useIntersectionObserver<T extends Element = HTMLDivElement>(
    options: Options = {},
): [React.RefObject<T>, boolean] {
    const { once = false, threshold = 0.1, rootMargin = '0px', root } = options;
    const ref = useRef<T>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (once) observer.unobserve(el);
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { threshold, rootMargin, root },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [once, threshold, rootMargin, root]);

    return [ref, isVisible];
}