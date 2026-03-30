import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
    default: {
        delete: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('@inertiajs/react', async () => {
    const actual = await vi.importActual<typeof import('@inertiajs/react')>('@inertiajs/react');

    return {
        ...actual,
        router: {
            reload: vi.fn(),
        },
        usePage: () => ({
            props: {
                lists: [
                    {
                        id: 1,
                        name: 'Personal',
                        color: '#6366f1',
                        sort_order: 1,
                        todos_count: 2,
                        active_todos_count: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ],
            },
        }),
    };
});

import axios from 'axios';
import { router } from '@inertiajs/react';

import { useLists } from './useLists';

describe('useLists', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('hydrates from Inertia shared props and reloads after create', async () => {
        vi.mocked(axios.post).mockResolvedValue({
            data: {
                data: {
                    id: 2,
                    name: 'Work',
                    color: '#f59e0b',
                    sort_order: 2,
                    todos_count: 0,
                    active_todos_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            },
        });

        const { result } = renderHook(() => useLists());

        expect(result.current.lists).toHaveLength(1);

        await result.current.createList('Work', '#f59e0b');

        await waitFor(() => {
            expect(router.reload).toHaveBeenCalled();
        });
    });
});
