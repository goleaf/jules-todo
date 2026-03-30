import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { showListDeletedToast } from '../lib/notifications';
import { useAppStore } from '../stores/useAppStore';
import type { PageProps, TodoList } from '../types';
import { useAnnounce } from './useAnnounce';
import { LISTS_INVALIDATED_EVENT } from './useTodos';

/**
 * Return value of the sidebar list hook.
 */
export interface UseListsResult {
    /**
     * Current sidebar lists, hydrated from shared Inertia props.
     */
    lists: TodoList[];
    /**
     * Creates a new list and reloads shared props.
     */
    createList: (name: string, color: string) => Promise<TodoList>;
    /**
     * Updates an existing list optimistically.
     */
    updateList: (id: number, data: Partial<TodoList>) => Promise<TodoList>;
    /**
     * Deletes a list and refreshes shared props.
     */
    deleteList: (id: number) => Promise<void>;
    /**
     * Persists a new sidebar order.
     */
    reorderLists: (newOrder: Array<{ id: number; sort_order: number }>) => Promise<TodoList[]>;
}

/**
 * Sidebar list management hook backed by Inertia shared props.
 *
 * The hook does not fetch on mount because the server already provides the
 * initial list collection through shared data.
 *
 * @returns The list collection plus mutation helpers.
 */
export function useLists(): UseListsResult {
    const page = usePage<PageProps>();
    const { announce } = useAnnounce();
    const initialLists = useMemo(() => page.props.lists ?? [], [page.props.lists]);
    const [lists, setLists] = useState<TodoList[]>(initialLists);
    const {
        confirmBeforeDeleting,
        selectedListId,
        setSelectedListId,
    } = useAppStore(
        useShallow((state) => ({
            confirmBeforeDeleting: state.settings.confirmBeforeDeleting,
            selectedListId: state.selectedListId,
            setSelectedListId: state.setSelectedListId,
        })),
    );

    useEffect(() => {
        setLists(initialLists);
    }, [initialLists]);

    useEffect(() => {
        function handleInvalidated() {
            router.reload({
                only: ['lists', 'virtual_lists', 'default_lists', 'today_count', 'trash_count'],
            });
        }

        window.addEventListener(LISTS_INVALIDATED_EVENT, handleInvalidated);

        return () => {
            window.removeEventListener(LISTS_INVALIDATED_EVENT, handleInvalidated);
        };
    }, []);

    const createList = useCallback(async (name: string, color: string) => {
        try {
            const response = await axios.post<{ data: TodoList }>('/api/lists', {
                color,
                name,
            });
            const list = response.data.data;

            router.reload({
                only: ['lists', 'virtual_lists', 'default_lists', 'today_count', 'trash_count'],
            });
            announce(`List '${list.name}' created`);

            return list;
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to create list.'));
            throw error;
        }
    }, [announce]);

    const updateList = useCallback(async (id: number, data: Partial<TodoList>) => {
        const previousLists = lists;

        setLists((currentLists) =>
            currentLists.map((list) =>
                list.id === id ? { ...list, ...data } : list,
            ),
        );

        try {
            const response = await axios.patch<{ data: TodoList }>(`/api/lists/${id}`, data);
            const updatedList = response.data.data;

            router.reload({
                only: ['lists', 'virtual_lists', 'default_lists', 'today_count', 'trash_count'],
            });

            return updatedList;
        } catch (error) {
            setLists(previousLists);
            toast.error(getErrorMessage(error, 'Failed to update list.'));
            throw error;
        }
    }, [lists]);

    const deleteList = useCallback(async (id: number) => {
        if (
            confirmBeforeDeleting
            && typeof window !== 'undefined'
            && !window.confirm('Delete this list and all tasks inside it?')
        ) {
            return;
        }

        try {
            await axios.delete(`/api/lists/${id}`);

            if (selectedListId === id) {
                setSelectedListId('all');
            }

            router.reload({
                only: ['lists', 'virtual_lists', 'default_lists', 'today_count', 'trash_count'],
            });
            showListDeletedToast();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to delete list.'));
            throw error;
        }
    }, [confirmBeforeDeleting, selectedListId, setSelectedListId]);

    const reorderLists = useCallback(async (
        newOrder: Array<{ id: number; sort_order: number }>,
    ) => {
        const previousLists = lists;
        const orderMap = new Map(newOrder.map((item) => [item.id, item.sort_order]));

        setLists((currentLists) =>
            [...currentLists]
                .map((list) => ({
                    ...list,
                    sort_order: orderMap.get(list.id) ?? list.sort_order,
                }))
                .sort((left, right) => left.sort_order - right.sort_order),
        );

        try {
            await axios.post('/api/lists/reorder', {
                items: newOrder,
            });

            router.reload({
                only: ['lists', 'virtual_lists', 'default_lists', 'today_count', 'trash_count'],
            });

            return [...lists];
        } catch (error) {
            setLists(previousLists);
            toast.error(getErrorMessage(error, 'Failed to reorder lists.'));
            throw error;
        }
    }, [lists]);

    return {
        lists,
        createList,
        updateList,
        deleteList,
        reorderLists,
    };
}

/**
 * Extracts a readable message from an unknown list API error.
 *
 * @param error The thrown error value.
 * @param fallback A safe fallback message.
 * @returns A user-facing message.
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
