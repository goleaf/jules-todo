import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

/**
 * Debounced function type with an attached `cancel` helper.
 */
export type DebouncedCallback<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
    /**
     * Clears any pending invocation scheduled by the debounced callback.
     */
    cancel: () => void;
};

/**
 * Returns a debounced copy of the provided value.
 *
 * @template T The value type being debounced.
 * @param value The latest value produced by the calling component.
 * @param delay The debounce delay in milliseconds.
 * @returns The last value that remained stable for the full debounce delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [delay, value]);

    return debouncedValue;
}

/**
 * Returns a debounced version of the provided callback.
 *
 * The callback reference is kept fresh through refs so callers do not need to
 * rebuild the debounced function on every render to avoid stale closures.
 *
 * @template TArgs The callback argument tuple.
 * @param callback The callback to invoke after the debounce delay.
 * @param delay The debounce delay in milliseconds.
 * @returns A debounced callback with an attached `cancel()` method.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number,
): DebouncedCallback<TArgs> {
    const callbackRef = useRef(callback);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const cancel = useCallback(() => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    useEffect(() => cancel, [cancel]);

    return useMemo(() => {
        const debounced = ((...args: TArgs) => {
            cancel();

            timeoutRef.current = window.setTimeout(() => {
                timeoutRef.current = null;
                callbackRef.current(...args);
            }, delay);
        }) as DebouncedCallback<TArgs>;

        debounced.cancel = cancel;

        return debounced;
    }, [cancel, delay]);
}
