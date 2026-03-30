import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce, useDebouncedCallback } from './useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('returns the latest value after the debounce delay', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            {
                initialProps: { value: 'a' },
            },
        );

        expect(result.current).toBe('a');

        rerender({ value: 'ab' });
        expect(result.current).toBe('a');

        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(result.current).toBe('ab');
    });

    it('provides a debounced callback that can be cancelled', () => {
        const spy = vi.fn();
        const { result } = renderHook(() =>
            useDebouncedCallback(spy, 250),
        );

        act(() => {
            result.current('first');
            result.current.cancel();
            vi.advanceTimersByTime(250);
        });

        expect(spy).not.toHaveBeenCalled();

        act(() => {
            result.current('second');
            vi.advanceTimersByTime(250);
        });

        expect(spy).toHaveBeenCalledWith('second');
    });
});
