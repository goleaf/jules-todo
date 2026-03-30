import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
    default: {
        isAxiosError: vi.fn(() => false),
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

import { useAppStore } from '../stores/useAppStore';
import type { Todo } from '../types';
import { useUndoStack } from './useUndoStack';

describe('useUndoStack', () => {
    beforeEach(() => {
        useAppStore.setState({
            canUndo: false,
            undoStack: [],
        });
        vi.clearAllMocks();
    });

    it('keeps only the latest ten undo items', () => {
        const { result } = renderHook(() => useUndoStack());

        act(() => {
            Array.from({ length: 12 }).forEach((_, index) => {
                result.current.push({
                    action: 'move_to_trash',
                    todo: {
                        id: index + 1,
                        todo_list_id: null,
                        title: `Todo ${index + 1}`,
                        description: null,
                        is_completed: false,
                        completed_at: null,
                        priority: 'none',
                        due_date: null,
                        sort_order: index,
                        is_deleted: true,
                        deleted_at: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                });
            });
        });

        expect(result.current.stack).toHaveLength(10);
        expect(result.current.stack[0]).toMatchObject({
            action: 'move_to_trash',
            todo: { id: 3 },
        });
    });

    it('restores trashed todos on undo', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: {} });

        const { result } = renderHook(() => useUndoStack());

        act(() => {
            result.current.push({
                action: 'move_to_trash',
                todo: {
                    id: 44,
                    todo_list_id: null,
                    title: 'Task',
                    description: null,
                    is_completed: false,
                    completed_at: null,
                    priority: 'none',
                    due_date: null,
                    sort_order: 0,
                    is_deleted: true,
                    deleted_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            });
        });

        await act(async () => {
            await result.current.undo();
        });

        expect(axios.post).toHaveBeenCalledWith('/api/todos/44/restore');
        expect(useAppStore.getState().undoStack).toHaveLength(0);
    });

    it('supports legacy complete and move actions for current components', async () => {
        vi.mocked(axios.patch).mockResolvedValue({ data: {} });

        const { result } = renderHook(() => useUndoStack());

        act(() => {
            result.current.push({
                action: 'move',
                todoId: 12,
                previousState: {
                    todo_list_id: 7,
                    sort_order: 2,
                },
            });
        });

        await act(async () => {
            await result.current.undo();
        });

        expect(axios.patch).toHaveBeenCalledWith('/api/todos/12', {
            todo_list_id: 7,
            sort_order: 2,
        });
    });

    it('restores bulk-deleted items through the bulk restore endpoint', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: {} });

        const todos: Todo[] = [
            {
                id: 5,
                todo_list_id: null,
                title: 'A',
                description: null,
                is_completed: false,
                completed_at: null,
                priority: 'none',
                due_date: null,
                sort_order: 0,
                is_deleted: true,
                deleted_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: 6,
                todo_list_id: null,
                title: 'B',
                description: null,
                is_completed: false,
                completed_at: null,
                priority: 'none',
                due_date: null,
                sort_order: 1,
                is_deleted: true,
                deleted_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        ];

        const { result } = renderHook(() => useUndoStack());

        act(() => {
            result.current.push({
                action: 'bulk_delete',
                todos,
            });
        });

        await act(async () => {
            await result.current.undo();
        });

        expect(axios.post).toHaveBeenCalledWith('/api/todos/bulk', {
            action: 'restore',
            todo_ids: [5, 6],
        });
    });
});
