import axios from 'axios';
import { useCallback, useEffect, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore } from '../stores/useAppStore';
import type { PriorityLevel } from '../types';
import { useAnnounce } from './useAnnounce';
import { useUndoStack } from './useUndoStack';

/**
 * DOM events used by existing detail-panel listeners.
 */
export const KEYBOARD_SHORTCUT_EVENTS = {
    focusDueDate: 'focus-due-date-field',
    moveToTrash: 'todo-shortcut:move-to-trash',
    setPriority: 'todo-shortcut:set-priority',
} as const;

const TODO_CARD_SELECTOR = '[data-todo-card]';
const CREATE_INPUT_SELECTOR = '[data-add-task-input]';
const DETAIL_PANEL_SELECTOR = '[data-detail-panel]';

/**
 * Options accepted by the keyboard-shortcut hook.
 */
export interface UseKeyboardShortcutsOptions {
    /**
     * Optional callback fired when the create-task shortcut is used.
     */
    onFocusCreateInput?: () => void;
    /**
     * Optional ref to the create-task input element.
     */
    createInputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Return type of the keyboard-shortcut hook.
 */
export interface UseKeyboardShortcutsResult {
    /**
     * The index of the currently keyboard-focused todo card, if any.
     */
    focusedTodoIndex: number;
}

/**
 * Detects whether the user is currently typing in a text field.
 *
 * @param target Optional target element to inspect instead of `document.activeElement`.
 * @returns `true` when focus is inside a text-entry control.
 */
export function isTypingInField(target?: Element | null): boolean {
    const activeTarget =
        target ?? (typeof document === 'undefined' ? null : document.activeElement);

    if (!(activeTarget instanceof HTMLElement)) {
        return false;
    }

    const tagName = activeTarget.tagName;
    const contentEditable = activeTarget.getAttribute('contenteditable');

    return (
        tagName === 'INPUT'
        || tagName === 'TEXTAREA'
        || tagName === 'SELECT'
        || activeTarget.isContentEditable
        || contentEditable === ''
        || contentEditable === 'true'
    );
}

/**
 * Registers global keyboard shortcuts for the todo workspace.
 *
 * The listener is attached in the capture phase so app shortcuts run before
 * nested interactive components consume the same key combinations.
 *
 * @param options Optional create-input callback and ref.
 * @returns The current keyboard-focused todo-card index.
 */
export function useKeyboardShortcuts(
    options: UseKeyboardShortcutsOptions = {},
): UseKeyboardShortcutsResult {
    const [focusedTodoIndex, setFocusedTodoIndex] = useState(-1);
    const { announce } = useAnnounce();
    const { canUndo, undo } = useUndoStack();
    const {
        closeDetailPanel,
        closeSearch,
        confirmBeforeDeleting,
        exitSelectionMode,
        hoveredTodoId,
        isSearchOpen,
        isSelectionMode,
        openDetailPanel,
        openSearch,
        selectedTodoId,
    } = useAppStore(
        useShallow((state) => ({
            closeDetailPanel: state.closeDetailPanel,
            closeSearch: state.closeSearch,
            confirmBeforeDeleting: state.settings.confirmBeforeDeleting,
            exitSelectionMode: state.exitSelectionMode,
            hoveredTodoId: state.hoveredTodoId,
            isSearchOpen: state.isSearchOpen,
            isSelectionMode: state.isSelectionMode,
            openDetailPanel: state.openDetailPanel,
            openSearch: state.openSearch,
            selectedTodoId: state.selectedTodoId,
        })),
    );

    const focusCreateInput = useCallback(() => {
        options.onFocusCreateInput?.();

        const input =
            options.createInputRef?.current
            ?? document.querySelector<HTMLInputElement>(CREATE_INPUT_SELECTOR);

        if (!input) {
            return;
        }

        input.focus();
        input.select?.();
    }, [options]);

    const updatePriorityShortcut = useCallback(async (
        priority: Exclude<PriorityLevel, 'none'>,
    ) => {
        if (selectedTodoId === null) {
            return;
        }

        const detailPanel = document.querySelector(DETAIL_PANEL_SELECTOR);

        if (detailPanel) {
            window.dispatchEvent(
                new CustomEvent(KEYBOARD_SHORTCUT_EVENTS.setPriority, {
                    detail: { priority },
                }),
            );

            return;
        }

        try {
            await axios.patch(`/api/todos/${selectedTodoId}`, { priority });
            useAppStore.getState().bumpTodosVersion();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to update task priority.'));
        }
    }, [selectedTodoId]);

    const moveSelectedTodoToTrash = useCallback(async () => {
        if (selectedTodoId === null) {
            return;
        }

        if (
            confirmBeforeDeleting
            && typeof window !== 'undefined'
            && !window.confirm('Move this task to Trash?')
        ) {
            return;
        }

        const detailPanel = document.querySelector(DETAIL_PANEL_SELECTOR);

        if (detailPanel) {
            window.dispatchEvent(
                new CustomEvent(KEYBOARD_SHORTCUT_EVENTS.moveToTrash),
            );

            return;
        }

        try {
            await axios.delete(`/api/todos/${selectedTodoId}`);
            useAppStore.getState().closeDetailPanel();
            useAppStore.getState().bumpTodosVersion();
            announce('Task moved to trash');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to move task to Trash.'));
        }
    }, [announce, confirmBeforeDeleting, selectedTodoId]);

    const focusAdjacentTodo = useCallback((step: -1 | 1) => {
        const todoCards = Array.from(
            document.querySelectorAll<HTMLElement>(TODO_CARD_SELECTOR),
        );

        if (todoCards.length === 0) {
            return;
        }

        const activeElement = document.activeElement;
        const currentIndex = todoCards.findIndex(
            (todoCard) =>
                todoCard === activeElement || todoCard.contains(activeElement),
        );

        const nextIndex =
            currentIndex === -1
                ? step === 1
                    ? 0
                    : todoCards.length - 1
                : (currentIndex + step + todoCards.length) % todoCards.length;

        todoCards[nextIndex]?.focus();
        setFocusedTodoIndex(nextIndex);
    }, []);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const key = event.key;
            const normalizedKey = key.toLowerCase();
            const typing = isTypingInField();
            const hasCommandModifier = event.ctrlKey || event.metaKey;

            if (hasCommandModifier && normalizedKey === 'k') {
                event.preventDefault();
                openSearch();
                return;
            }

            if (key === 'Escape') {
                if (isSearchOpen) {
                    event.preventDefault();
                    closeSearch();
                    return;
                }

                if (isSelectionMode) {
                    event.preventDefault();
                    exitSelectionMode();
                    return;
                }

                if (selectedTodoId !== null) {
                    event.preventDefault();
                    closeDetailPanel();
                }

                return;
            }

            if (typing) {
                return;
            }

            if (hasCommandModifier && normalizedKey === 'z' && canUndo) {
                event.preventDefault();
                void undo();
                return;
            }

            if (normalizedKey === 'n') {
                event.preventDefault();
                focusCreateInput();
                return;
            }

            if (normalizedKey === 'e' && hoveredTodoId !== null) {
                event.preventDefault();
                openDetailPanel(hoveredTodoId);
                return;
            }

            if (key === '1') {
                event.preventDefault();
                void updatePriorityShortcut('high');
                return;
            }

            if (key === '2') {
                event.preventDefault();
                void updatePriorityShortcut('medium');
                return;
            }

            if (key === '3') {
                event.preventDefault();
                void updatePriorityShortcut('low');
                return;
            }

            if (normalizedKey === 'd' && selectedTodoId !== null) {
                event.preventDefault();
                window.dispatchEvent(
                    new CustomEvent(KEYBOARD_SHORTCUT_EVENTS.focusDueDate),
                );
                return;
            }

            if (key === 'Backspace' && selectedTodoId !== null) {
                event.preventDefault();
                void moveSelectedTodoToTrash();
                return;
            }

            if (key === 'Tab') {
                const activeElement = document.activeElement;
                const isFocusedTodoCard =
                    activeElement instanceof HTMLElement
                    && activeElement.closest(TODO_CARD_SELECTOR);

                if (isFocusedTodoCard) {
                    event.preventDefault();
                    focusAdjacentTodo(event.shiftKey ? -1 : 1);
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown, { capture: true });

        return () => {
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [
        canUndo,
        closeDetailPanel,
        closeSearch,
        exitSelectionMode,
        focusAdjacentTodo,
        focusCreateInput,
        hoveredTodoId,
        isSearchOpen,
        isSelectionMode,
        moveSelectedTodoToTrash,
        openDetailPanel,
        openSearch,
        selectedTodoId,
        undo,
        updatePriorityShortcut,
    ]);

    return { focusedTodoIndex };
}

/**
 * Extracts a readable message from an unknown shortcut/API error.
 *
 * @param error The thrown error value.
 * @param fallback A safe fallback message.
 * @returns A user-friendly error string.
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
