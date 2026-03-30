import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceProvider, useAnnounce } from './useAnnounce';

describe('useAnnounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('announces a message and clears it after 2 seconds', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AnnounceProvider>{children}</AnnounceProvider>
        );

        const { result } = renderHook(() => useAnnounce(), { wrapper });

        act(() => {
            result.current.announce('Task restored');
        });

        expect(result.current.message).toBe('Task restored');

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.message).toBe('');
    });
});
