import axios from 'axios';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore } from '../stores/useAppStore';
import type { Todo, UndoAction } from '../types';

/**
 * Legacy undo action shape still emitted by the current component layer.
 */
type LegacyUndoAction = {
    /**
     * The legacy action discriminator.
     */
    action: 'delete' | 'complete' | 'move';
    /**
     * The todo identifier affected by the original action.
     */
    todoId: number;
    /**
     * The previous todo state needed to reverse the action.
     */
    previousState: Partial<Todo>;
};

/**
 * Legacy completion action shape emitted by older components.
 */
type LegacyCompleteUndoAction = LegacyUndoAction & {
    /**
     * Legacy completion discriminator.
     */
    action: 'complete';
};

/**
 * New store-backed completion action shape.
 */
type CurrentCompleteUndoAction = Extract<UndoAction, { action: 'complete' }>;

/**
 * Runtime union supported by the undo hook while the app transitions to the
 * newer store-level `UndoAction` contract.
 */
type UndoStackItem = UndoAction | LegacyUndoAction;

/**
 * Public API returned by the undo stack hook.
 */
export interface UseUndoStackResult {
    /**
     * Adds a new action to the global undo stack.
     */
    push: (action: UndoAction | LegacyUndoAction) => void;
    /**
     * Executes the most recent undo action.
     */
    undo: () => Promise<boolean>;
    /**
     * Whether an undo operation is currently available.
     */
    canUndo: boolean;
    /**
     * The current undo stack contents.
     */
    stack: UndoStackItem[];
}

/**
 * Provides read/write access to the global undo stack and executes undo API
 * calls for todo mutations.
 */
export function useUndoStack(): UseUndoStackResult {
    const {
        bumpTodosVersion,
        canUndo,
        popUndo,
        pushUndo,
        stack,
    } = useAppStore(
        useShallow((state) => ({
            bumpTodosVersion: state.bumpTodosVersion,
            canUndo: state.canUndo,
            popUndo: state.popUndo,
            pushUndo: state.pushUndo,
            stack: state.undoStack as unknown as UndoStackItem[],
        })),
    );

    const push = useCallback((action: UndoAction | LegacyUndoAction) => {
        pushUndo(normalizeUndoAction(action) as UndoAction);
    }, [pushUndo]);

    const undo = useCallback(async () => {
        const currentStack = useAppStore.getState().undoStack as unknown as UndoStackItem[];
        const nextAction = currentStack.at(-1);

        if (!nextAction) {
            return false;
        }

        try {
            await executeUndo(nextAction);

            popUndo();
            bumpTodosVersion();

            return true;
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to undo action.'));

            return false;
        }
    }, [bumpTodosVersion, popUndo]);

    return {
        push,
        undo,
        canUndo,
        stack,
    };
}

/**
 * Executes the undo API call for the provided stack item.
 *
 * @param action The action to reverse.
 */
async function executeUndo(action: UndoStackItem) {
    switch (action.action) {
        case 'move_to_trash':
            await axios.post(`/api/todos/${action.todo.id}/restore`);
            toast.success('Task restored');
            return;

        case 'complete':
            if (isCurrentCompleteUndoAction(action)) {
                await axios.patch(`/api/todos/${action.todoId}`, {
                    is_completed: action.previousIsCompleted,
                });
                return;
            }

            await axios.patch(`/api/todos/${action.todoId}`, {
                is_completed: Boolean(action.previousState.is_completed),
            });
            return;

        case 'bulk_delete':
            await axios.post('/api/todos/bulk', {
                action: 'restore',
                todo_ids: action.todos.map((todo) => todo.id),
            });
            return;

        case 'bulk_complete':
            await axios.post('/api/todos/bulk', {
                action: 'uncomplete',
                todo_ids: action.todos.map((todo) => todo.todoId),
            });
            return;

        case 'delete':
            await axios.post(`/api/todos/${action.todoId}/restore`);
            toast.success('Task restored');
            return;

        case 'move':
            await axios.patch(`/api/todos/${action.todoId}`, action.previousState);
            return;
    }
}

/**
 * Normalizes legacy component actions into the newer store contract where
 * possible while still preserving backward compatibility for move undo.
 *
 * @param action The caller-provided undo action.
 * @returns A normalized action ready for the Zustand store.
 */
function normalizeUndoAction(action: UndoAction | LegacyUndoAction): UndoStackItem {
    if (action.action === 'delete') {
        return {
            action: 'move_to_trash',
            todo: createTodoSnapshot(action.todoId, action.previousState),
        };
    }

    if (isLegacyCompleteUndoAction(action)) {
        return {
            action: 'complete',
            todoId: action.todoId,
            previousIsCompleted: Boolean(action.previousState.is_completed),
        };
    }

    return action;
}

/**
 * Determines whether the provided action is a legacy completion undo payload.
 *
 * @param action The undo action being normalized.
 * @returns `true` when the action still uses the legacy `previousState` shape.
 */
function isLegacyCompleteUndoAction(
    action: UndoAction | LegacyUndoAction,
): action is LegacyCompleteUndoAction {
    return action.action === 'complete' && 'previousState' in action;
}

/**
 * Determines whether the provided completion action already matches the new
 * store-level undo contract.
 *
 * @param action The undo action being executed.
 * @returns `true` when the action exposes `previousIsCompleted`.
 */
function isCurrentCompleteUndoAction(
    action: UndoStackItem,
): action is CurrentCompleteUndoAction {
    return action.action === 'complete' && 'previousIsCompleted' in action;
}

/**
 * Creates a safe todo snapshot from a partial legacy payload.
 *
 * @param todoId The todo identifier.
 * @param previousState The legacy partial state.
 * @returns A full todo snapshot used for restore-style undo actions.
 */
function createTodoSnapshot(todoId: number, previousState: Partial<Todo>): Todo {
    const timestamp = new Date().toISOString();

    return {
        id: todoId,
        todo_list_id: previousState.todo_list_id ?? null,
        title: previousState.title ?? '',
        description: previousState.description ?? null,
        is_completed: previousState.is_completed ?? false,
        completed_at: previousState.completed_at ?? null,
        priority: previousState.priority ?? 'none',
        due_date: previousState.due_date ?? null,
        sort_order: previousState.sort_order ?? 0,
        is_deleted: previousState.is_deleted ?? true,
        deleted_at: previousState.deleted_at ?? null,
        created_at: previousState.created_at ?? timestamp,
        updated_at: previousState.updated_at ?? timestamp,
        list: previousState.list,
    };
}

/**
 * Extracts a readable message from an unknown undo failure.
 *
 * @param error The thrown error value.
 * @param fallback A fallback message when no better detail exists.
 * @returns A user-friendly message.
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
