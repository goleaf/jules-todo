import axios from 'axios';
import { router } from '@inertiajs/react';
import {
    Clock3,
    Flag,
    Loader2,
    Search,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAnnounce } from '../../hooks/useAnnounce';
import { useDebounce } from '../../hooks/useDebounce';
import { highlightMatch } from '../../lib/highlightMatch';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import type { PaginatedResponse, PriorityLevel, Todo } from '../../types';
import { Button } from '../ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandLoading,
} from '../ui/command';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '../ui/dialog';
import { getTodoDateMeta } from '../todos/TodoCard';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

interface SearchResultGroup {
    color: string;
    id: string;
    items: Todo[];
    name: string;
}

/**
 * Upserts a recent search term while keeping the list unique and capped.
 *
 * @param searches The current recent-search array.
 * @param nextSearch The new search term.
 * @returns The updated recent-search array.
 */
export function upsertRecentSearches(
    searches: string[],
    nextSearch: string,
): string[] {
    const trimmedSearch = nextSearch.trim();

    if (!trimmedSearch) {
        return searches;
    }

    return [
        trimmedSearch,
        ...searches.filter(
            (search) => search.toLowerCase() !== trimmedSearch.toLowerCase(),
        ),
    ].slice(0, MAX_RECENT_SEARCHES);
}

function removeRecentSearch(searches: string[], searchToRemove: string): string[] {
    return searches.filter(
        (search) => search.toLowerCase() !== searchToRemove.toLowerCase(),
    );
}

function readRecentSearches(): string[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const storedValue = window.localStorage.getItem(RECENT_SEARCHES_KEY);

        if (!storedValue) {
            return [];
        }

        const parsedValue = JSON.parse(storedValue);

        if (!Array.isArray(parsedValue)) {
            return [];
        }

        return parsedValue.filter(
            (value): value is string =>
                typeof value === 'string' && value.trim().length > 0,
        );
    } catch {
        return [];
    }
}

function writeRecentSearches(searches: string[]) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
}

function getPriorityClassName(priority: PriorityLevel) {
    return {
        high: 'text-red-700 dark:text-red-400',
        low: 'text-blue-700 dark:text-blue-400',
        medium: 'text-amber-700 dark:text-amber-400',
        none: 'text-slate-500 dark:text-slate-400',
    }[priority];
}

function groupResultsByList(results: Todo[]): SearchResultGroup[] {
    const groups = new Map<string, SearchResultGroup>();

    results.forEach((todo) => {
        const groupId = todo.list ? `list-${todo.list.id}` : 'list-none';
        const existingGroup = groups.get(groupId);

        if (existingGroup) {
            existingGroup.items.push(todo);
            return;
        }

        groups.set(groupId, {
            color: todo.list?.color ?? '#94a3b8',
            id: groupId,
            items: [todo],
            name: todo.list?.name ?? 'No List',
        });
    });

    return Array.from(groups.values());
}

/**
 * Global command-style search overlay for tasks.
 *
 * @returns The rendered search dialog.
 */
export default function SearchOverlay() {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const { announce } = useAnnounce();
    const {
        closeSearch,
        isSearchOpen,
        openDetailPanel,
        searchQuery,
        selectedListId,
        setSearchQuery,
    } = useAppStore(
        useShallow((state) => ({
            closeSearch: state.closeSearch,
            isSearchOpen: state.isSearchOpen,
            openDetailPanel: state.openDetailPanel,
            searchQuery: state.searchQuery,
            selectedListId: state.selectedListId,
            setSearchQuery: state.setSearchQuery,
        })),
    );

    const [isFetching, setIsFetching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [results, setResults] = useState<Todo[]>([]);

    const trimmedQuery = searchQuery.trim();
    const debouncedQuery = useDebounce(trimmedQuery, 300);
    const groupedResults = useMemo(
        () => groupResultsByList(results),
        [results],
    );
    const isLoading =
        trimmedQuery.length > 0
        && (debouncedQuery !== trimmedQuery || isFetching);

    useEffect(() => {
        setRecentSearches(readRecentSearches());
    }, []);

    useEffect(() => {
        if (!isSearchOpen) {
            return;
        }

        const frameId = window.requestAnimationFrame(() => {
            inputRef.current?.focus();
        });

        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [isSearchOpen]);

    useEffect(() => {
        if (!isSearchOpen || debouncedQuery.length === 0) {
            setIsFetching(false);
            setResults([]);
            return;
        }

        const controller = new AbortController();

        async function fetchSearchResults() {
            setIsFetching(true);

            try {
                const response = await axios.get<PaginatedResponse<Todo>>('/api/todos', {
                    params: {
                        per_page: 100,
                        search: debouncedQuery,
                    },
                    signal: controller.signal,
                });

                if (controller.signal.aborted) {
                    return;
                }

                setResults(Array.isArray(response.data.data) ? response.data.data : []);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsFetching(false);
                }
            }
        }

        void fetchSearchResults();

        return () => {
            controller.abort();
        };
    }, [debouncedQuery, isSearchOpen]);

    useEffect(() => {
        if (!isSearchOpen || debouncedQuery.length === 0 || isLoading) {
            return;
        }

        announce(`Found ${results.length} tasks matching '${debouncedQuery}'`);
    }, [announce, debouncedQuery, isLoading, isSearchOpen, results.length]);

    function resetSearchOverlay() {
        setSearchQuery('');
        setResults([]);
        setIsFetching(false);
    }

    function persistRecentSearch(nextSearch: string) {
        const nextSearches = upsertRecentSearches(recentSearches, nextSearch);

        setRecentSearches(nextSearches);
        writeRecentSearches(nextSearches);
    }

    function handleClose() {
        closeSearch();
        resetSearchOverlay();
    }

    function handleRecentSearchRemove(searchToRemove: string) {
        const nextSearches = removeRecentSearch(recentSearches, searchToRemove);

        setRecentSearches(nextSearches);
        writeRecentSearches(nextSearches);
    }

    function handleResultSelect(todo: Todo) {
        persistRecentSearch(trimmedQuery);
        handleClose();

        if (typeof window !== 'undefined' && window.location.pathname !== '/tasks') {
            router.visit('/tasks', {
                preserveScroll: true,
                preserveState: true,
            });
        }

        openDetailPanel(todo.id);
    }

    return (
        <Dialog
            open={isSearchOpen}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    handleClose();
                }
            }}
        >
            <DialogContent
                className="max-w-[560px] overflow-hidden border-border bg-background p-0"
                showCloseButton={false}
            >
                <DialogTitle className="sr-only">Search tasks</DialogTitle>

                <Command shouldFilter={false} className="relative rounded-xl">
                    <div className="relative">
                        <CommandInput
                            ref={inputRef}
                            aria-label="Search tasks"
                            className="pr-12"
                            value={searchQuery}
                            placeholder="Search tasks…"
                            onValueChange={setSearchQuery}
                        />

                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Close search"
                            className="absolute right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 md:h-8 md:w-8"
                            onClick={handleClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <CommandList className="max-h-[400px]">
                        {trimmedQuery.length === 0 && recentSearches.length > 0 ? (
                            <CommandGroup heading="Recent Searches">
                                {recentSearches.map((search) => (
                                    <CommandItem
                                        key={search}
                                        value={search}
                                        className="group"
                                        onSelect={() => {
                                            setSearchQuery(search);
                                        }}
                                    >
                                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                                        <span className="min-w-0 flex-1 truncate">
                                            {search}
                                        </span>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-11 w-11 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:h-6 md:w-6"
                                            aria-label={`Remove ${search} from recent searches`}
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                            }}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                handleRecentSearchRemove(search);
                                            }}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ) : null}

                        {trimmedQuery.length > 0 && isLoading ? (
                            <CommandLoading>
                                <div className="flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Searching…</span>
                                </div>
                            </CommandLoading>
                        ) : null}

                        {trimmedQuery.length > 0 && !isLoading
                            ? groupedResults.map((group) => (
                                <CommandGroup key={group.id}>
                                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: group.color }}
                                        />
                                        <span>{group.name}</span>
                                    </div>

                                    {group.items.map((todo) => {
                                        const dueDateMeta = getTodoDateMeta(todo);

                                        return (
                                            <CommandItem
                                                key={todo.id}
                                                value={`${todo.id}-${todo.title}`}
                                                className="items-start py-2.5"
                                                onSelect={() => {
                                                    handleResultSelect(todo);
                                                }}
                                            >
                                                {todo.priority !== 'none' ? (
                                                    <Flag
                                                        className={cn(
                                                            'mt-0.5 h-4 w-4 shrink-0 fill-current',
                                                            getPriorityClassName(todo.priority),
                                                        )}
                                                    />
                                                ) : (
                                                    <span className="w-4 shrink-0" />
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium text-foreground">
                                                        {highlightMatch(todo.title, trimmedQuery)}
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-2 text-xs">
                                                    {dueDateMeta ? (
                                                        <span className={cn(dueDateMeta.className)}>
                                                            {dueDateMeta.label}
                                                        </span>
                                                    ) : null}

                                                    {selectedListId === 'all' && todo.list ? (
                                                        <span className="inline-flex max-w-[120px] items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                                            <span
                                                                className="h-2 w-2 rounded-full"
                                                                style={{
                                                                    backgroundColor: todo.list.color,
                                                                }}
                                                            />
                                                            <span className="truncate">
                                                                {todo.list.name}
                                                            </span>
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            ))
                            : null}

                        {trimmedQuery.length > 0
                        && !isLoading
                        && groupedResults.length === 0 ? (
                            <CommandEmpty>
                                <div className="flex flex-col items-center gap-2 py-2">
                                    <Search className="h-5 w-5 text-muted-foreground" />
                                    <span>{`No tasks match '${searchQuery}'`}</span>
                                </div>
                            </CommandEmpty>
                        ) : null}
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
