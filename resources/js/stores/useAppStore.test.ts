import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
    beforeEach(() => {
        window.localStorage.clear();
        useAppStore.setState(useAppStore.getInitialState(), true);
    });

    it('closes search and clears the query', () => {
        useAppStore.getState().openSearch();
        useAppStore.getState().setSearchQuery('inbox');

        useAppStore.getState().closeSearch();

        const state = useAppStore.getState();

        expect(state.isSearchOpen).toBe(false);
        expect(state.searchQuery).toBe('');
    });

    it('caps undo history at ten items and pops the latest item', () => {
        for (let index = 1; index <= 12; index += 1) {
            useAppStore.getState().pushUndo({
                action: 'complete',
                previousIsCompleted: index % 2 === 0,
                todoId: index,
            });
        }

        const poppedItem = useAppStore.getState().popUndo();
        const { canUndo, undoStack } = useAppStore.getState();

        expect(poppedItem).toEqual({
            action: 'complete',
            previousIsCompleted: true,
            todoId: 12,
        });
        expect(undoStack).toHaveLength(9);
        expect(undoStack[0]).toEqual({
            action: 'complete',
            previousIsCompleted: false,
            todoId: 3,
        });
        expect(canUndo).toBe(true);
    });

    it('persists the sidebar and settings slices to the requested localStorage keys', () => {
        useAppStore.getState().setSidebarCollapsed(true);
        useAppStore.getState().updateSetting({
            accentColor: 'teal',
            defaultSort: 'priority',
            theme: 'dark',
        });

        expect(window.localStorage.getItem('sidebar_collapsed')).toBe('true');
        expect(
            JSON.parse(window.localStorage.getItem('app_settings') ?? 'null'),
        ).toEqual({
            accentColor: 'teal',
            autoCollapseCompleted: false,
            confirmBeforeDeleting: true,
            defaultFilter: 'all',
            defaultSort: 'priority',
            fontSize: 'medium',
            moveCompletedToBottom: true,
            theme: 'dark',
        });
    });
});
