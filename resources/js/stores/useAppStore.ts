import { create, useStore } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

import type {
    AppSettings,
    DueDateFilter,
    FilterStatus,
    PriorityLevel,
    SelectedListId,
    SortOption,
    Theme,
    UndoAction,
} from '../types';

export type SidebarListId = SelectedListId;
export type ThemeMode = Theme;
export type PriorityFilterValue = PriorityLevel | 'any';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar_collapsed';
const APP_SETTINGS_STORAGE_KEY = 'app_settings';
const MAX_UNDO_STACK_ITEMS = 10;
const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

export const DEFAULT_SETTINGS: AppSettings = {
    theme: 'system',
    accentColor: 'indigo',
    fontSize: 'medium',
    defaultSort: 'manual',
    defaultFilter: 'all',
    moveCompletedToBottom: true,
    confirmBeforeDeleting: true,
    autoCollapseCompleted: false,
};

type PersistedAppStoreState = Pick<AppStore, 'sidebarCollapsed' | 'settings'>;

export interface AppStore {
    selectedListId: SelectedListId;
    selectedTodoId: number | null;
    isDetailPanelOpen: boolean;
    filterStatus: FilterStatus;
    dueDateFilter: DueDateFilter;
    priorityFilter: PriorityFilterValue;
    sortOption: SortOption;
    isSearchOpen: boolean;
    searchQuery: string;
    isSelectionMode: boolean;
    selectedTodoIds: number[];
    sidebarCollapsed: boolean;
    undoStack: UndoAction[];
    canUndo: boolean;
    settings: AppSettings;
    theme: ThemeMode;
    hoveredTodoId: number | null;
    todosVersion: number;
    setSelectedListId: (selectedListId: SelectedListId) => void;
    openDetailPanel: (todoId: number) => void;
    closeDetailPanel: () => void;
    setFilterStatus: (filterStatus: FilterStatus) => void;
    setDueDateFilter: (dueDateFilter: DueDateFilter) => void;
    setPriorityFilter: (priorityFilter: PriorityFilterValue) => void;
    resetFilters: () => void;
    setSortOption: (sortOption: SortOption) => void;
    openSearch: () => void;
    closeSearch: () => void;
    setSearchQuery: (searchQuery: string) => void;
    enterSelectionMode: () => void;
    exitSelectionMode: () => void;
    toggleTodoSelection: (todoId: number) => void;
    selectAllTodos: (todoIds: number[]) => void;
    clearSelection: () => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (sidebarCollapsed: boolean) => void;
    pushUndo: (undoAction: UndoAction) => void;
    popUndo: () => UndoAction | undefined;
    clearUndoStack: () => void;
    updateSetting: (nextSettings: Partial<AppSettings>) => void;
    setHoveredTodoId: (hoveredTodoId: number | null) => void;
    setSelectedTodoId: (selectedTodoId: number | null) => void;
    setIsDetailPanelOpen: (isDetailPanelOpen: boolean) => void;
    setIsSearchOpen: (isSearchOpen: boolean) => void;
    setIsSelectionMode: (isSelectionMode: boolean) => void;
    setSelectedTodoIds: (selectedTodoIds: number[]) => void;
    toggleSelectedTodo: (todoId: number) => void;
    toggleSidebarCollapsed: () => void;
    setTheme: (theme: ThemeMode) => void;
    cycleTheme: () => void;
    bumpTodosVersion: () => void;
}

function isBrowser() {
    return typeof window !== 'undefined';
}

function readSidebarCollapsed() {
    if (!isBrowser()) {
        return undefined;
    }

    const storedValue = window.localStorage.getItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
    );

    if (storedValue === null) {
        return undefined;
    }

    return storedValue === 'true';
}

function readSettings() {
    if (!isBrowser()) {
        return undefined;
    }

    const storedValue = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);

    if (storedValue === null) {
        return undefined;
    }

    try {
        const parsedValue = JSON.parse(storedValue) as Partial<AppSettings>;

        return {
            ...DEFAULT_SETTINGS,
            ...parsedValue,
        };
    } catch {
        return undefined;
    }
}

const appStorePersistStorage: PersistStorage<PersistedAppStoreState> = {
    getItem: () => {
        const sidebarCollapsed = readSidebarCollapsed();
        const settings = readSettings();

        if (
            typeof sidebarCollapsed === 'undefined' &&
            typeof settings === 'undefined'
        ) {
            return null;
        }

        return {
            state: {
                sidebarCollapsed: sidebarCollapsed ?? false,
                settings: settings ?? DEFAULT_SETTINGS,
            },
            version: 0,
        };
    },
    setItem: (_name, value: StorageValue<PersistedAppStoreState>) => {
        if (!isBrowser()) {
            return;
        }

        window.localStorage.setItem(
            SIDEBAR_COLLAPSED_STORAGE_KEY,
            String(value.state.sidebarCollapsed),
        );
        window.localStorage.setItem(
            APP_SETTINGS_STORAGE_KEY,
            JSON.stringify(value.state.settings),
        );
    },
    removeItem: () => {
        if (!isBrowser()) {
            return;
        }

        window.localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
        window.localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
    },
};

function withUndoStackState(undoStack: UndoAction[]) {
    return {
        undoStack,
        canUndo: undoStack.length > 0,
    };
}

export const useAppStore = create<AppStore>()(
    devtools(
        persist(
            (set, get) => ({
                selectedListId: 'all',
                selectedTodoId: null,
                isDetailPanelOpen: false,
                filterStatus: 'all',
                dueDateFilter: 'any',
                priorityFilter: 'any',
                sortOption: 'manual',
                isSearchOpen: false,
                searchQuery: '',
                isSelectionMode: false,
                selectedTodoIds: [],
                sidebarCollapsed: false,
                undoStack: [],
                canUndo: false,
                settings: DEFAULT_SETTINGS,
                theme: DEFAULT_SETTINGS.theme,
                hoveredTodoId: null,
                todosVersion: 0,
                setSelectedListId: (selectedListId) =>
                    set(
                        { selectedListId },
                        false,
                        'navigation/setSelectedListId',
                    ),
                openDetailPanel: (todoId) =>
                    set(
                        {
                            selectedTodoId: todoId,
                            isDetailPanelOpen: true,
                        },
                        false,
                        'detail/openDetailPanel',
                    ),
                closeDetailPanel: () =>
                    set(
                        {
                            selectedTodoId: null,
                            isDetailPanelOpen: false,
                        },
                        false,
                        'detail/closeDetailPanel',
                    ),
                setFilterStatus: (filterStatus) =>
                    set({ filterStatus }, false, 'filters/setFilterStatus'),
                setDueDateFilter: (dueDateFilter) =>
                    set(
                        { dueDateFilter },
                        false,
                        'filters/setDueDateFilter',
                    ),
                setPriorityFilter: (priorityFilter) =>
                    set(
                        { priorityFilter },
                        false,
                        'filters/setPriorityFilter',
                    ),
                resetFilters: () =>
                    set(
                        {
                            filterStatus: 'all',
                            dueDateFilter: 'any',
                            priorityFilter: 'any',
                        },
                        false,
                        'filters/resetFilters',
                    ),
                setSortOption: (sortOption) =>
                    set({ sortOption }, false, 'sort/setSortOption'),
                openSearch: () =>
                    set({ isSearchOpen: true }, false, 'search/openSearch'),
                closeSearch: () =>
                    set(
                        {
                            isSearchOpen: false,
                            searchQuery: '',
                        },
                        false,
                        'search/closeSearch',
                    ),
                setSearchQuery: (searchQuery) =>
                    set({ searchQuery }, false, 'search/setSearchQuery'),
                enterSelectionMode: () =>
                    set(
                        { isSelectionMode: true },
                        false,
                        'selection/enterSelectionMode',
                    ),
                exitSelectionMode: () =>
                    set(
                        {
                            isSelectionMode: false,
                            selectedTodoIds: [],
                        },
                        false,
                        'selection/exitSelectionMode',
                    ),
                toggleTodoSelection: (todoId) =>
                    set(
                        (state) => ({
                            isSelectionMode: true,
                            selectedTodoIds: state.selectedTodoIds.includes(todoId)
                                ? state.selectedTodoIds.filter(
                                      (selectedId) => selectedId !== todoId,
                                  )
                                : [...state.selectedTodoIds, todoId],
                        }),
                        false,
                        'selection/toggleTodoSelection',
                    ),
                selectAllTodos: (selectedTodoIds) =>
                    set(
                        {
                            isSelectionMode: true,
                            selectedTodoIds: [...selectedTodoIds],
                        },
                        false,
                        'selection/selectAllTodos',
                    ),
                clearSelection: () =>
                    set(
                        { selectedTodoIds: [] },
                        false,
                        'selection/clearSelection',
                    ),
                toggleSidebar: () =>
                    set(
                        (state) => ({
                            sidebarCollapsed: !state.sidebarCollapsed,
                        }),
                        false,
                        'sidebar/toggleSidebar',
                    ),
                setSidebarCollapsed: (sidebarCollapsed) =>
                    set(
                        { sidebarCollapsed },
                        false,
                        'sidebar/setSidebarCollapsed',
                    ),
                pushUndo: (undoAction) =>
                    set(
                        (state) => {
                            const undoStack = [
                                ...state.undoStack,
                                undoAction,
                            ].slice(-MAX_UNDO_STACK_ITEMS);

                            return withUndoStackState(undoStack);
                        },
                        false,
                        'undo/pushUndo',
                    ),
                popUndo: () => {
                    let poppedUndoAction: UndoAction | undefined;

                    set(
                        (state) => {
                            if (state.undoStack.length === 0) {
                                return state;
                            }

                            poppedUndoAction =
                                state.undoStack[state.undoStack.length - 1];

                            return withUndoStackState(
                                state.undoStack.slice(0, -1),
                            );
                        },
                        false,
                        'undo/popUndo',
                    );

                    return poppedUndoAction;
                },
                clearUndoStack: () =>
                    set(
                        withUndoStackState([]),
                        false,
                        'undo/clearUndoStack',
                    ),
                updateSetting: (nextSettings) =>
                    set(
                        (state) => {
                            const settings = {
                                ...state.settings,
                                ...nextSettings,
                            };

                            return {
                                settings,
                                theme: settings.theme,
                            };
                        },
                        false,
                        'settings/updateSetting',
                    ),
                setHoveredTodoId: (hoveredTodoId) =>
                    set(
                        { hoveredTodoId },
                        false,
                        'hovering/setHoveredTodoId',
                    ),
                setSelectedTodoId: (selectedTodoId) =>
                    set(
                        {
                            selectedTodoId,
                            isDetailPanelOpen: selectedTodoId !== null,
                        },
                        false,
                        'legacy/setSelectedTodoId',
                    ),
                setIsDetailPanelOpen: (isDetailPanelOpen) =>
                    set(
                        (state) => ({
                            isDetailPanelOpen,
                            selectedTodoId: isDetailPanelOpen
                                ? state.selectedTodoId
                                : null,
                        }),
                        false,
                        'legacy/setIsDetailPanelOpen',
                    ),
                setIsSearchOpen: (isSearchOpen) =>
                    set(
                        (state) => ({
                            isSearchOpen,
                            searchQuery: isSearchOpen ? state.searchQuery : '',
                        }),
                        false,
                        'legacy/setIsSearchOpen',
                    ),
                setIsSelectionMode: (isSelectionMode) =>
                    set(
                        (state) => ({
                            isSelectionMode,
                            selectedTodoIds: isSelectionMode
                                ? state.selectedTodoIds
                                : [],
                        }),
                        false,
                        'legacy/setIsSelectionMode',
                    ),
                setSelectedTodoIds: (selectedTodoIds) =>
                    set(
                        (state) => ({
                            selectedTodoIds: [...selectedTodoIds],
                            isSelectionMode:
                                selectedTodoIds.length > 0
                                    ? true
                                    : state.isSelectionMode,
                        }),
                        false,
                        'legacy/setSelectedTodoIds',
                    ),
                toggleSelectedTodo: (todoId) => {
                    get().toggleTodoSelection(todoId);
                },
                toggleSidebarCollapsed: () => {
                    get().toggleSidebar();
                },
                setTheme: (theme) => {
                    get().updateSetting({ theme });
                },
                cycleTheme: () => {
                    const currentTheme = get().settings.theme;
                    const nextTheme =
                        THEME_CYCLE[
                            (THEME_CYCLE.indexOf(currentTheme) + 1) %
                                THEME_CYCLE.length
                        ];

                    get().updateSetting({ theme: nextTheme });
                },
                bumpTodosVersion: () =>
                    set(
                        (state) => ({
                            todosVersion: state.todosVersion + 1,
                        }),
                        false,
                        'system/bumpTodosVersion',
                    ),
            }),
            {
                name: 'app-store',
                storage: appStorePersistStorage,
                partialize: (state) => ({
                    sidebarCollapsed: state.sidebarCollapsed,
                    settings: state.settings,
                }),
                merge: (persistedState, currentState) => {
                    const nextPersistedState =
                        (persistedState as Partial<PersistedAppStoreState>) ?? {};
                    const settings = {
                        ...currentState.settings,
                        ...nextPersistedState.settings,
                    };

                    return {
                        ...currentState,
                        ...nextPersistedState,
                        settings,
                        theme: settings.theme,
                    };
                },
            },
        ),
        { name: 'app-store' },
    ),
);

const selectedListIdSelector = (state: AppStore) => state.selectedListId;
const selectedTodoIdSelector = (state: AppStore) => state.selectedTodoId;
const filterStatusSelector = (state: AppStore) => state.filterStatus;
const dueDateFilterSelector = (state: AppStore) => state.dueDateFilter;
const priorityFilterSelector = (state: AppStore) => state.priorityFilter;
const sortOptionSelector = (state: AppStore) => state.sortOption;
const isSearchOpenSelector = (state: AppStore) => state.isSearchOpen;
const searchQuerySelector = (state: AppStore) => state.searchQuery;
const isSelectionModeSelector = (state: AppStore) => state.isSelectionMode;
const selectedTodoIdsSelector = (state: AppStore) => state.selectedTodoIds;
const sidebarCollapsedSelector = (state: AppStore) => state.sidebarCollapsed;
const undoStackSelector = (state: AppStore) => state.undoStack;
const settingsSelector = (state: AppStore) => state.settings;
const hoveredTodoIdSelector = (state: AppStore) => state.hoveredTodoId;

export const useSelectedListId = () =>
    useStore(useAppStore, selectedListIdSelector);
export const useSelectedTodoId = () =>
    useStore(useAppStore, selectedTodoIdSelector);
export const useFilterStatus = () =>
    useStore(useAppStore, filterStatusSelector);
export const useDueDateFilter = () =>
    useStore(useAppStore, dueDateFilterSelector);
export const usePriorityFilter = () =>
    useStore(useAppStore, priorityFilterSelector);
export const useSortOption = () => useStore(useAppStore, sortOptionSelector);
export const useIsSearchOpen = () =>
    useStore(useAppStore, isSearchOpenSelector);
export const useSearchQuery = () =>
    useStore(useAppStore, searchQuerySelector);
export const useIsSelectionMode = () =>
    useStore(useAppStore, isSelectionModeSelector);
export const useSelectedTodoIds = () =>
    useStore(useAppStore, selectedTodoIdsSelector);
export const useSidebarCollapsed = () =>
    useStore(useAppStore, sidebarCollapsedSelector);
export const useUndoStack = () => useStore(useAppStore, undoStackSelector);
export const useSettings = () => useStore(useAppStore, settingsSelector);
export const useHoveredTodoId = () =>
    useStore(useAppStore, hoveredTodoIdSelector);
