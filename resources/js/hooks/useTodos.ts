import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    showTaskAddedToast,
    showTaskCompletedToast,
    showTaskRestoredToast,
    showTasksUpdatedToast,
    showUndoDeleteToast,
} from '../lib/notifications';
import { useAppStore } from '../stores/useAppStore';
import type {
    DueDateFilter,
    FilterStatus,
    PaginatedResponse,
    PriorityLevel,
    SelectedListId,
    SortOption,
    Todo,
    UndoAction,
} from '../types';
import { useAnnounce } from './useAnnounce';
import { useDebounce } from './useDebounce';
import { useUndoStack } from './useUndoStack';

/**
 * Event emitted when list-level shared data should be refreshed.
 */
export const LISTS_INVALIDATED_EVENT = 'todoapp:lists-invalidated';

/**
 * Parameters accepted by the todo data hook.
 */
export interface UseTodosParams {
    /**
     * The active selected list identifier.
     */
    listId: SelectedListId;
    /**
     * Completion filter applied to the query.
     */
    filterStatus: FilterStatus;
    /**
     * Due-date filter applied to the query.
     */
    dueDateFilter: DueDateFilter;
    /**
     * Priority filter applied to the query.
     */
    priorityFilter: PriorityLevel | 'any';
    /**
     * Sort option applied to the query.
     */
    sortOption: SortOption;
    /**
     * Raw search query entered by the user.
     */
    searchQuery: string;
}

/**
 * Return value exposed by the todo data hook.
 */
export interface UseTodosResult {
    /**
     * The currently loaded todo items for the active view.
     */
    todos: Todo[];
    /**
     * Whether the first fetch is still in progress.
     */
    isLoading: boolean;
    /**
     * Whether a background refetch is currently running.
     */
    isRefetching: boolean;
    /**
     * Fetch-level error message, if any.
     */
    error: string | null;
    /**
     * Creates a new todo.
     */
    createTodo: (data: Partial<Todo>) => Promise<Todo>;
    /**
     * Updates an existing todo with optimistic local state.
     */
    updateTodo: (id: number, data: Partial<Todo>) => Promise<Todo>;
    /**
     * Moves a todo to trash with optimistic local state and undo support.
     */
    deleteTodo: (id: number) => Promise<Todo>;
    /**
     * Marks a todo as completed.
     */
    completeTodo: (id: number) => Promise<Todo>;
    /**
     * Marks a todo as active again.
     */
    uncompleteTodo: (id: number) => Promise<Todo>;
    /**
     * Persists a new manual ordering.
     */
    reorderTodos: (newOrder: Array<{ id: number; sort_order: number }>) => Promise<Todo[]>;
    /**
     * Executes a bulk todo action.
     */
    bulkAction: (
        action: string,
        todoIds: number[],
        extra?: Record<string, unknown>,
    ) => Promise<Todo[]>;
}

/**
 * Core todo data hook used by the list workspace.
 *
 * It manages fetching, debounced search, optimistic mutations, undo wiring,
 * and screen-reader announcements.
 *
 * @param params The current todo query parameters.
 * @returns The loaded todos plus mutation helpers.
 */
export function useTodos({
    listId,
    filterStatus,
    dueDateFilter,
    priorityFilter,
    sortOption,
    searchQuery,
}: UseTodosParams): UseTodosResult {
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const { announce } = useAnnounce();
    const { push } = useUndoStack();
    const isSearchOpen = useAppStore((state) => state.isSearchOpen);
    const todosVersion = useAppStore((state) => state.todosVersion);

    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasFetchedRef = useRef(false);
    const fetchAbortRef = useRef<AbortController | null>(null);
    const todosRef = useRef<Todo[]>([]);

    todosRef.current = todos;

    const queryParams = useMemo(
        () => ({
            due_date_filter: dueDateFilter,
            list_id: listId,
            priority_filter: priorityFilter,
            search: debouncedSearchQuery,
            sort: sortOption,
            status: filterStatus,
        }),
        [
            debouncedSearchQuery,
            dueDateFilter,
            filterStatus,
            listId,
            priorityFilter,
            sortOption,
        ],
    );

    const fetchTodos = useCallback(async () => {
        fetchAbortRef.current?.abort();

        const controller = new AbortController();
        fetchAbortRef.current = controller;

        if (hasFetchedRef.current) {
            setIsRefetching(true);
        } else {
            setIsLoading(true);
        }

        setError(null);

        try {
            const response = await axios.get<PaginatedResponse<Todo>>('/api/todos', {
                params: queryParams,
                signal: controller.signal,
            });

            if (controller.signal.aborted) {
                return;
            }

            const nextTodos = Array.isArray(response.data.data) ? response.data.data : [];

            setTodos(nextTodos);
            hasFetchedRef.current = true;

            if (debouncedSearchQuery.trim() !== '' && !isSearchOpen) {
                announce(
                    `Found ${nextTodos.length} tasks matching '${debouncedSearchQuery}'`,
                );
            }
        } catch (error) {
            if (!isAbortError(error)) {
                setError(getErrorMessage(error, 'Failed to load tasks.'));
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                setIsRefetching(false);
            }
        }
    }, [announce, debouncedSearchQuery, isSearchOpen, queryParams, todosVersion]);

    useEffect(() => {
        void fetchTodos();

        return () => {
            fetchAbortRef.current?.abort();
        };
    }, [fetchTodos]);

    const createTodo = useCallback(async (data: Partial<Todo>) => {
        try {
            const response = await axios.post<{ data: Todo }>('/api/todos', data);
            const createdTodo = extractTodo(response.data);

            if (!createdTodo) {
                throw new Error('The server did not return the created task.');
            }

            setTodos((currentTodos) => [createdTodo, ...currentTodos]);
            useAppStore.getState().bumpTodosVersion();
            dispatchListsInvalidated();
            showTaskAddedToast();
            announce('Task added');

            return createdTodo;
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to create task.'));
            throw error;
        }
    }, [announce]);

    const commitTodoUpdate = useCallback(async (
        id: number,
        data: Partial<Todo>,
        announceMessage: string | null = 'Task updated',
    ) => {
        const previousTodos = todosRef.current;

        setTodos((currentTodos) =>
            currentTodos.map((todo) =>
                todo.id === id
                    ? {
                        ...todo,
                        ...data,
                    }
                    : todo,
            ),
        );

        try {
            const response = await axios.patch<{ data: Todo }>(`/api/todos/${id}`, data);
            const updatedTodo = extractTodo(response.data);

            if (!updatedTodo) {
                throw new Error('The server did not return the updated task.');
            }

            setTodos((currentTodos) =>
                currentTodos.map((todo) =>
                    todo.id === id ? updatedTodo : todo,
                ),
            );
            useAppStore.getState().bumpTodosVersion();
            dispatchListsInvalidated();

            if (announceMessage) {
                announce(announceMessage);
            }

            return updatedTodo;
        } catch (error) {
            setTodos(previousTodos);
            toast.error(getErrorMessage(error, 'Failed to update task.'));
            throw error;
        }
    }, [announce]);

    const updateTodo = useCallback(async (id: number, data: Partial<Todo>) => (
        commitTodoUpdate(id, data)
    ), [commitTodoUpdate]);

    const deleteTodo = useCallback(async (id: number) => {
        const previousTodos = todosRef.current;
        const todoToDelete = previousTodos.find((todo) => todo.id === id);

        if (!todoToDelete) {
            throw new Error(`Unable to find task ${id}.`);
        }

        setTodos((currentTodos) =>
            currentTodos.filter((todo) => todo.id !== id),
        );

        try {
            const response = await axios.delete<{ data: Todo }>(`/api/todos/${id}`);
            const deletedTodo = extractTodo(response.data) ?? {
                ...todoToDelete,
                is_deleted: true,
                deleted_at: new Date().toISOString(),
            };

            const undoAction: UndoAction = {
                action: 'move_to_trash',
                todo: todoToDelete,
            };

            push(undoAction);
            useAppStore.getState().bumpTodosVersion();
            dispatchListsInvalidated();
            announce('Task moved to trash');

            showUndoDeleteToast(async () => {
                try {
                    const restoreResponse = await axios.post<{ data: Todo }>(
                        `/api/todos/${id}/restore`,
                    );
                    const restoredTodo = extractTodo(restoreResponse.data) ?? {
                        ...todoToDelete,
                        is_deleted: false,
                        deleted_at: null,
                    };

                    setTodos((currentTodos) => [restoredTodo, ...currentTodos]);
                    useAppStore.getState().popUndo();
                    useAppStore.getState().bumpTodosVersion();
                    dispatchListsInvalidated();
                    showTaskRestoredToast();
                    announce('Task restored');
                } catch (error) {
                    toast.error(getErrorMessage(error, 'Failed to restore task.'));
                }
            });

            return deletedTodo;
        } catch (error) {
            setTodos(previousTodos);
            toast.error(getErrorMessage(error, 'Failed to move task to Trash.'));
            throw error;
        }
    }, [announce, push]);

    const completeTodo = useCallback(async (id: number) => {
        const currentTodo = todosRef.current.find((todo) => todo.id === id);

        if (!currentTodo) {
            throw new Error(`Unable to find task ${id}.`);
        }

        const updatedTodo = await commitTodoUpdate(
            id,
            { is_completed: true },
            null,
        );

        push({
            action: 'complete',
            todoId: id,
            previousIsCompleted: currentTodo.is_completed,
        });
        showTaskCompletedToast();
        announce('Task marked as complete');

        return updatedTodo;
    }, [announce, commitTodoUpdate, push]);

    const uncompleteTodo = useCallback(async (id: number) => {
        const updatedTodo = await commitTodoUpdate(
            id,
            { is_completed: false },
            null,
        );

        announce('Task marked as incomplete');

        return updatedTodo;
    }, [announce, commitTodoUpdate]);

    const reorderTodos = useCallback(async (
        newOrder: Array<{ id: number; sort_order: number }>,
    ) => {
        const previousTodos = todosRef.current;
        const orderMap = new Map(newOrder.map((item) => [item.id, item.sort_order]));

        setTodos((currentTodos) =>
            [...currentTodos]
                .map((todo) => ({
                    ...todo,
                    sort_order: orderMap.get(todo.id) ?? todo.sort_order,
                }))
                .sort((left, right) => left.sort_order - right.sort_order),
        );

        try {
            await axios.post('/api/todos/reorder', {
                items: newOrder,
            });
            useAppStore.getState().bumpTodosVersion();
            announce('Tasks reordered');

            return [...todosRef.current];
        } catch (error) {
            setTodos(previousTodos);
            toast.error(getErrorMessage(error, 'Failed to reorder tasks.'));
            throw error;
        }
    }, [announce]);

    const bulkAction = useCallback(async (
        action: string,
        todoIds: number[],
        extra: Record<string, unknown> = {},
    ) => {
        const previousTodos = todosRef.current;
        const affectedTodos = previousTodos.filter((todo) => todoIds.includes(todo.id));

        try {
            const response = await axios.post<{ data: Todo[] }>('/api/todos/bulk', {
                action,
                todo_ids: todoIds,
                ...extra,
            });
            const updatedTodos = Array.isArray(response.data.data) ? response.data.data : [];

            if (action === 'delete' && affectedTodos.length > 0) {
                push({
                    action: 'bulk_delete',
                    todos: affectedTodos,
                });
                setTodos((currentTodos) =>
                    currentTodos.filter((todo) => !todoIds.includes(todo.id)),
                );
            } else if (action === 'restore' && listId === 'trash') {
                setTodos((currentTodos) =>
                    currentTodos.filter((todo) => !todoIds.includes(todo.id)),
                );
            } else if (action === 'permanent_delete') {
                setTodos((currentTodos) =>
                    currentTodos.filter((todo) => !todoIds.includes(todo.id)),
                );
            } else if (
                action === 'move'
                && typeof listId === 'number'
                && typeof extra.list_id === 'number'
                && extra.list_id !== listId
            ) {
                setTodos((currentTodos) =>
                    currentTodos.filter((todo) => !todoIds.includes(todo.id)),
                );
            } else {
                const updatedMap = new Map(updatedTodos.map((todo) => [todo.id, todo]));

                setTodos((currentTodos) =>
                    currentTodos.map((todo) => updatedMap.get(todo.id) ?? todo),
                );
            }

            if (action === 'complete' && affectedTodos.length > 0) {
                push({
                    action: 'bulk_complete',
                    todos: affectedTodos.map((todo) => ({
                        todoId: todo.id,
                        was_completed: todo.is_completed,
                    })),
                });
            }

            useAppStore.getState().bumpTodosVersion();
            dispatchListsInvalidated();
            showTasksUpdatedToast(todoIds.length);
            announce(getBulkActionAnnouncement(todoIds.length, action));

            return updatedTodos;
        } catch (error) {
            setTodos(previousTodos);
            toast.error(getErrorMessage(error, 'Failed to update tasks.'));
            throw error;
        }
    }, [announce, listId, push]);

    return {
        todos,
        isLoading,
        isRefetching,
        error,
        createTodo,
        updateTodo,
        deleteTodo,
        completeTodo,
        uncompleteTodo,
        reorderTodos,
        bulkAction,
    };
}

function getBulkActionAnnouncement(count: number, action: string) {
    if (action === 'complete') {
        return `${count} tasks marked as complete`;
    }

    if (action === 'uncomplete') {
        return `${count} tasks marked as incomplete`;
    }

    if (action === 'delete') {
        return `${count} tasks moved to trash`;
    }

    if (action === 'restore') {
        return `${count} tasks restored`;
    }

    if (action === 'move') {
        return `${count} tasks moved`;
    }

    if (action === 'set_priority') {
        return `${count} tasks updated`;
    }

    if (action === 'permanent_delete') {
        return `${count} tasks deleted permanently`;
    }

    return `${count} tasks ${action}`;
}

/**
 * Extracts the todo payload from a resource response.
 *
 * @param payload The raw API payload.
 * @returns The todo when present.
 */
function extractTodo(payload: unknown): Todo | null {
    if (
        payload
        && typeof payload === 'object'
        && 'data' in payload
        && payload.data
    ) {
        return payload.data as Todo;
    }

    return null;
}

/**
 * Dispatches a shared event so the sidebar list state can refetch its counts.
 */
function dispatchListsInvalidated() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(LISTS_INVALIDATED_EVENT));
    }
}

/**
 * Determines whether an error represents a cancelled request.
 *
 * @param error The thrown error value.
 * @returns `true` when the request was cancelled.
 */
function isAbortError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        return error.code === 'ERR_CANCELED';
    }

    return (
        error instanceof Error
        && (error.name === 'AbortError' || error.name === 'CanceledError')
    );
}

/**
 * Extracts a readable message from an unknown API error.
 *
 * @param error The thrown error value.
 * @param fallback A safe fallback message.
 * @returns A user-facing error string.
 */
function getErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;

        if (typeof responseData?.message === 'string') {
            return responseData.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}
