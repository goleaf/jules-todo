import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
    default: {
        delete: vi.fn(),
        get: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

import axios from 'axios';

import { AnnounceProvider } from './useAnnounce';
import { useTodos } from './useTodos';

describe('useTodos', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    it('fetches todos and debounces search changes', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                data: [
                    {
                        id: 1,
                        todo_list_id: null,
                        title: 'Call Mom',
                        description: null,
                        is_completed: false,
                        completed_at: null,
                        priority: 'none',
                        due_date: null,
                        sort_order: 0,
                        is_deleted: false,
                        deleted_at: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ],
            },
        });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AnnounceProvider>{children}</AnnounceProvider>
        );

        const { result, rerender } = renderHook(
            ({ searchQuery }) =>
                useTodos({
                    listId: 'all',
                    filterStatus: 'all',
                    dueDateFilter: 'any',
                    priorityFilter: 'any',
                    sortOption: 'manual',
                    searchQuery,
                }),
            {
                initialProps: { searchQuery: '' },
                wrapper,
            },
        );

        await act(async () => {
            await Promise.resolve();
        });

        expect(result.current.todos).toHaveLength(1);

        rerender({ searchQuery: 'call' });

        expect(axios.get).toHaveBeenCalledTimes(1);

        await act(async () => {
            vi.advanceTimersByTime(300);
            await Promise.resolve();
        });

        expect(axios.get).toHaveBeenCalledTimes(2);
    });
});
