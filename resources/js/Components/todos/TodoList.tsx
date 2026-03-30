import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Info,
} from 'lucide-react';
import {
    memo,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type RefObject,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useLists } from '../../hooks/useLists';
import { useTodos } from '../../hooks/useTodos';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import type {
    DefaultListDefinition,
    DueDateFilter,
    FilterStatus,
    PageProps,
    PriorityLevel,
    SelectedListId,
    SortOption,
    Todo,
    TodoList as TodoListType,
} from '../../types';
import { Button } from '../ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Separator } from '../ui/separator';
import { CreateInputRefContext } from '../layout/AppLayout';
import TodoBulkToolbar from './TodoBulkToolbar';
import TodoCard from './TodoCard';
import TodoCreateInput from './TodoCreateInput';
import TodoEmptyState, {
    getTodoEmptyStateContent,
} from './TodoEmptyState';
import TodoFilterBar from './TodoFilterBar';
import TodoSkeletonCard from './TodoSkeletonCard';

/**
 * Inertia page props used to initialize the list store state from the server.
 */
type TodoPageProps = PageProps<{
    filters?: {
        due_date_filter?: DueDateFilter | null;
        list_id?: SelectedListId | null;
        priority_filter?: PriorityLevel | 'any' | null;
        search?: string | null;
        sort?: SortOption | null;
        status?: FilterStatus | null;
    };
}>;

/**
 * Grouped todo sections for the active list view.
 */
export interface TodoSections {
    /**
     * Visible active todos.
     */
    activeTodos: Todo[];
    /**
     * Visible completed todos.
     */
    completedTodos: Todo[];
    /**
     * Visible trashed todos.
     */
    trashedTodos: Todo[];
}

interface SortableTodoCardProps {
    todo: Todo;
    isSelected: boolean;
    isSelectionMode: boolean;
    onToggleComplete: (id: number) => void;
    onToggleSelect: (id: number) => void;
    onOpenDetail: (id: number) => void;
    onDeleteTodo: (id: number) => void;
    onUpdateTitle: (id: number, title: string) => Promise<void>;
    isRemoving: boolean;
}

const SORT_OPTION_LABELS: Record<SortOption, string> = {
    completed_at: 'Date Completed',
    created_at: 'Date Created',
    due_date: 'Due Date',
    manual: 'Manual',
    priority: 'Priority',
    title_asc: 'Title A→Z',
    title_desc: 'Title Z→A',
};

/**
 * Splits the loaded todos into the sections used by the main list UI.
 *
 * @param todos The full todo array returned by the hook.
 * @param listId The active list identifier.
 * @returns The grouped todo sections.
 */
export function getTodoSections(
    todos: Todo[],
    listId: SelectedListId,
): TodoSections {
    if (listId === 'trash') {
        return {
            activeTodos: [],
            completedTodos: [],
            trashedTodos: todos.filter((todo) => todo.is_deleted),
        };
    }

    return {
        activeTodos: todos.filter(
            (todo) => !todo.is_deleted && !todo.is_completed,
        ),
        completedTodos: todos.filter(
            (todo) => !todo.is_deleted && todo.is_completed,
        ),
        trashedTodos: [],
    };
}

export { getTodoEmptyStateContent as getEmptyStateContent };

function resolveListMeta(
    listId: SelectedListId,
    lists: TodoListType[],
    virtualLists: DefaultListDefinition[],
) {
    if (typeof listId === 'number') {
        const list = lists.find((item) => item.id === listId);

        return {
            color: list?.color ?? null,
            name: list?.name ?? 'List',
        };
    }

    const fallbackNames: Record<'all' | 'today' | 'trash', string> = {
        all: 'All Tasks',
        today: 'Today',
        trash: 'Trash',
    };
    const virtualList = virtualLists.find((item) => item.id === listId);

    return {
        color: null,
        name: virtualList?.name ?? fallbackNames[listId],
    };
}

function SortableTodoCard({
    isRemoving,
    ...props
}: SortableTodoCardProps) {
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: props.todo.id,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(isRemoving && 'animate-fade-slide-up')}
        >
            <TodoCard
                {...props}
                dragHandleProps={{
                    ...attributes,
                    ...listeners,
                    ref: setActivatorNodeRef,
                }}
                isDragging={Boolean(transform)}
            />
        </div>
    );
}

function TodoListComponent() {
    const page = usePage<TodoPageProps>();
    const createInputRef = useContext(CreateInputRefContext);
    const { lists } = useLists();
    const pageFilters = page.props.filters ?? {};
    const virtualLists =
        page.props.virtual_lists ?? page.props.default_lists ?? [];

    const {
        dueDateFilter,
        enterSelectionMode,
        exitSelectionMode,
        filterStatus,
        isSelectionMode,
        openDetailPanel,
        priorityFilter,
        resetFilters,
        searchQuery,
        selectedListId,
        selectedTodoIds,
        setDueDateFilter,
        setFilterStatus,
        setPriorityFilter,
        setSearchQuery,
        setSelectedListId,
        setSortOption,
        settings,
        sortOption,
        toggleTodoSelection,
        updateSetting: _updateSetting,
    } = useAppStore(
        useShallow((state) => ({
            dueDateFilter: state.dueDateFilter,
            enterSelectionMode: state.enterSelectionMode,
            exitSelectionMode: state.exitSelectionMode,
            filterStatus: state.filterStatus,
            isSelectionMode: state.isSelectionMode,
            openDetailPanel: state.openDetailPanel,
            priorityFilter: state.priorityFilter,
            resetFilters: state.resetFilters,
            searchQuery: state.searchQuery,
            selectedListId: state.selectedListId,
            selectedTodoIds: state.selectedTodoIds,
            setDueDateFilter: state.setDueDateFilter,
            setFilterStatus: state.setFilterStatus,
            setPriorityFilter: state.setPriorityFilter,
            setSearchQuery: state.setSearchQuery,
            setSelectedListId: state.setSelectedListId,
            setSortOption: state.setSortOption,
            settings: state.settings,
            sortOption: state.sortOption,
            toggleTodoSelection: state.toggleTodoSelection,
            updateSetting: state.updateSetting,
        })),
    );

    const {
        bulkAction,
        completeTodo,
        createTodo,
        deleteTodo,
        error,
        isLoading,
        isRefetching,
        reorderTodos,
        todos,
        uncompleteTodo,
        updateTodo,
    } = useTodos({
        dueDateFilter,
        filterStatus,
        listId: selectedListId,
        priorityFilter,
        searchQuery,
        sortOption,
    });

    const [activeDragId, setActiveDragId] = useState<number | null>(null);
    const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(
        () => settings.autoCollapseCompleted,
    );
    const [showCompletedContent, setShowCompletedContent] = useState(
        () => !settings.autoCollapseCompleted,
    );
    const [removingTodoIds, setRemovingTodoIds] = useState<number[]>([]);

    const removalTimeoutsRef = useRef<Map<number, number>>(new Map());
    const completedCollapseTimeoutRef = useRef<number | null>(null);
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    });
    const keyboardSensor = useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    });
    const sensors = useMemo(
        () => [pointerSensor, keyboardSensor],
        [keyboardSensor, pointerSensor],
    );

    useEffect(() => {
        return () => {
            removalTimeoutsRef.current.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
            removalTimeoutsRef.current.clear();
            if (completedCollapseTimeoutRef.current !== null) {
                window.clearTimeout(completedCollapseTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const routeListId =
            pageFilters.list_id === null || pageFilters.list_id === undefined
                ? 'all'
                : pageFilters.list_id;

        setSelectedListId(routeListId);
        setFilterStatus(pageFilters.status ?? 'all');
        setDueDateFilter(pageFilters.due_date_filter ?? 'any');
        setPriorityFilter(pageFilters.priority_filter ?? 'any');
        setSortOption(pageFilters.sort ?? 'manual');
        setSearchQuery(pageFilters.search ?? '');
    }, [
        pageFilters.due_date_filter,
        pageFilters.list_id,
        pageFilters.priority_filter,
        pageFilters.search,
        pageFilters.sort,
        pageFilters.status,
        setDueDateFilter,
        setFilterStatus,
        setPriorityFilter,
        setSearchQuery,
        setSelectedListId,
        setSortOption,
    ]);

    const sections = useMemo(
        () => getTodoSections(todos, selectedListId),
        [selectedListId, todos],
    );
    const activeTodos = useMemo(() => {
        if (sortOption !== 'manual') {
            return sections.activeTodos;
        }

        return [...sections.activeTodos].sort(
            (left, right) => left.sort_order - right.sort_order,
        );
    }, [sections.activeTodos, sortOption]);
    const completedTodos = useMemo(
        () => sections.completedTodos,
        [sections.completedTodos],
    );
    const trashedTodos = useMemo(
        () => (selectedListId === 'trash' ? sections.trashedTodos : []),
        [sections.trashedTodos, selectedListId],
    );
    const hasActiveFilters = useMemo(
        () =>
            filterStatus !== 'all'
            || dueDateFilter !== 'any'
            || priorityFilter !== 'any'
            || searchQuery.trim() !== '',
        [dueDateFilter, filterStatus, priorityFilter, searchQuery],
    );
    const listMeta = useMemo(
        () => resolveListMeta(selectedListId, lists, virtualLists),
        [lists, selectedListId, virtualLists],
    );
    const visibleTodoIds = useMemo(() => {
        if (selectedListId === 'trash') {
            return trashedTodos.map((todo) => todo.id);
        }

        return [...activeTodos, ...completedTodos].map((todo) => todo.id);
    }, [activeTodos, completedTodos, selectedListId, trashedTodos]);
    const selectedVisibleTodoIds = useMemo(
        () =>
            selectedTodoIds.filter((todoId) => visibleTodoIds.includes(todoId)),
        [selectedTodoIds, visibleTodoIds],
    );
    const selectedCount = selectedVisibleTodoIds.length;
    const activeDragTodo =
        activeDragId === null
            ? null
            : activeTodos.find((todo) => todo.id === activeDragId) ?? null;
    const isTrashView = selectedListId === 'trash';
    const dndEnabled = !isTrashView && sortOption === 'manual' && !isSelectionMode;
    const totalVisibleTodos = isTrashView
        ? trashedTodos.length
        : activeTodos.length + completedTodos.length;

    useEffect(() => {
        if (completedTodos.length === 0) {
            setShowCompletedContent(false);
            return;
        }

        if (!isCompletedCollapsed) {
            setShowCompletedContent(true);
        }
    }, [completedTodos.length, isCompletedCollapsed]);

    const handleCreateTodo = useCallback(async (nextTodo: Partial<Todo>) => {
        await createTodo(nextTodo);
    }, [createTodo]);

    const handleToggleComplete = useCallback(async (todoId: number) => {
        const todo = todos.find((item) => item.id === todoId);

        if (!todo) {
            return;
        }

        if (todo.is_completed) {
            await uncompleteTodo(todoId);
            return;
        }

        await completeTodo(todoId);
    }, [completeTodo, todos, uncompleteTodo]);

    const handleUpdateTitle = useCallback(async (
        todoId: number,
        nextTitle: string,
    ) => {
        await updateTodo(todoId, { title: nextTitle });
    }, [updateTodo]);

    const handleDeleteTodo = useCallback((todoId: number) => {
        if (removingTodoIds.includes(todoId)) {
            return;
        }

        setRemovingTodoIds((currentIds) => [...currentIds, todoId]);

        const timeoutId = window.setTimeout(() => {
            void deleteTodo(todoId).finally(() => {
                setRemovingTodoIds((currentIds) =>
                    currentIds.filter((id) => id !== todoId),
                );
                removalTimeoutsRef.current.delete(todoId);
            });
        }, 150);

        removalTimeoutsRef.current.set(todoId, timeoutId);
    }, [deleteTodo, removingTodoIds]);

    const handleRestoreTodo = useCallback(async (todoId: number) => {
        await bulkAction('restore', [todoId]);
    }, [bulkAction]);

    const handleDeletePermanently = useCallback(async (todoId: number) => {
        await bulkAction('permanent_delete', [todoId]);
    }, [bulkAction]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveDragId(null);

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = activeTodos.findIndex((todo) => todo.id === active.id);
        const newIndex = activeTodos.findIndex((todo) => todo.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const reorderedTodos = arrayMove(activeTodos, oldIndex, newIndex);
        const payload = reorderedTodos.map((todo, index) => ({
            id: todo.id,
            sort_order: index,
        }));

        await reorderTodos(payload);
    }, [activeTodos, reorderTodos]);

    const handleBulkAction = useCallback(async (
        action: string,
        extra: Record<string, unknown> = {},
    ) => {
        if (selectedVisibleTodoIds.length === 0) {
            return;
        }

        await bulkAction(action, selectedVisibleTodoIds, extra);
        exitSelectionMode();
    }, [bulkAction, exitSelectionMode, selectedVisibleTodoIds]);

    const handleEmptyTrash = useCallback(async () => {
        if (trashedTodos.length === 0) {
            return;
        }

        await bulkAction(
            'permanent_delete',
            trashedTodos.map((todo) => todo.id),
        );
    }, [bulkAction, trashedTodos]);

    const headerStats = isTrashView
        ? `${trashedTodos.length} tasks in Trash`
        : `${totalVisibleTodos} tasks · ${activeTodos.length} remaining`;

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            {listMeta.color ? (
                                <span
                                    aria-hidden="true"
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: listMeta.color }}
                                />
                            ) : null}

                            <h1 className="text-xl font-semibold tracking-tight text-foreground">
                                {listMeta.name}
                            </h1>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            {headerStats}
                            {isRefetching ? ' · Refreshing…' : ''}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {isTrashView && trashedTodos.length > 0 ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="outline">
                                        Empty Trash
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Permanently delete all trashed tasks?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => {
                                                void handleEmptyTrash();
                                            }}
                                        >
                                            Empty Trash
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : null}

                        {!isTrashView ? (
                            <Button
                                type="button"
                                variant={isSelectionMode ? 'ghost' : 'outline'}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        exitSelectionMode();
                                        return;
                                    }

                                    enterSelectionMode();
                                }}
                            >
                                {isSelectionMode ? 'Cancel' : 'Select'}
                            </Button>
                        ) : null}
                    </div>
                </div>

                {isTrashView ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            Items in Trash are permanently deleted after 30 days.
                        </span>
                    </div>
                ) : null}

                {!isTrashView ? (
                    <TodoCreateInput
                        ref={createInputRef as RefObject<HTMLInputElement> | null}
                        listId={selectedListId}
                        onCreateTodo={handleCreateTodo}
                    />
                ) : null}

                {!isTrashView && sortOption !== 'manual' ? (
                    <div className="sticky top-0 z-10 rounded-lg border border-border bg-background/95 px-3 py-2 text-sm text-muted-foreground backdrop-blur">
                        Sorted by {SORT_OPTION_LABELS[sortOption]}. Switch to Manual sort
                        to reorder.
                    </div>
                ) : null}

                {!isTrashView ? (
                    <TodoFilterBar
                        completedCount={completedTodos.length}
                        dueDateFilter={dueDateFilter}
                        filterStatus={filterStatus}
                        listId={selectedListId}
                        priorityFilter={priorityFilter}
                        setDueDateFilter={setDueDateFilter}
                        setFilterStatus={setFilterStatus}
                        setPriorityFilter={setPriorityFilter}
                        setSortOption={setSortOption}
                        sortOption={sortOption}
                    />
                ) : null}
            </div>

            {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            ) : null}

            {isLoading ? (
                <TodoSkeletonCard count={5} />
            ) : totalVisibleTodos === 0 ? (
                <TodoEmptyState
                    hasActiveFilters={hasActiveFilters}
                    listId={selectedListId}
                />
            ) : isTrashView ? (
                <div role="list" className="space-y-1">
                    {trashedTodos.map((todo) => (
                        <TodoCard
                            key={todo.id}
                            actionMode="trash"
                            dragHandleProps={null}
                            isDragging={false}
                            isSelected={selectedVisibleTodoIds.includes(todo.id)}
                            isSelectionMode={false}
                            todo={todo}
                            onDeletePermanently={handleDeletePermanently}
                            onDeleteTodo={undefined}
                            onOpenDetail={openDetailPanel}
                            onRestoreTodo={handleRestoreTodo}
                            onToggleComplete={() => undefined}
                            onToggleSelect={() => undefined}
                            onUpdateTitle={handleUpdateTitle}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {dndEnabled ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => {
                                void handleDragEnd(event);
                            }}
                            onDragStart={(event: DragStartEvent) => {
                                setActiveDragId(Number(event.active.id));
                            }}
                        >
                            <SortableContext
                                items={activeTodos.map((todo) => todo.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div role="list" className="space-y-1">
                                    {activeTodos.map((todo) => (
                                        <SortableTodoCard
                                            key={todo.id}
                                            isRemoving={removingTodoIds.includes(todo.id)}
                                            isSelected={selectedVisibleTodoIds.includes(todo.id)}
                                            isSelectionMode={isSelectionMode}
                                            todo={todo}
                                            onDeleteTodo={handleDeleteTodo}
                                            onOpenDetail={openDetailPanel}
                                            onToggleComplete={handleToggleComplete}
                                            onToggleSelect={toggleTodoSelection}
                                            onUpdateTitle={handleUpdateTitle}
                                        />
                                    ))}
                                </div>
                            </SortableContext>

                            <DragOverlay>
                                {activeDragTodo ? (
                                    <div className="w-full max-w-3xl opacity-90">
                                        <TodoCard
                                            dragHandleProps={null}
                                            isDragging
                                            isSelected={false}
                                            isSelectionMode={false}
                                            todo={activeDragTodo}
                                            onDeleteTodo={handleDeleteTodo}
                                            onOpenDetail={openDetailPanel}
                                            onToggleComplete={handleToggleComplete}
                                            onToggleSelect={toggleTodoSelection}
                                            onUpdateTitle={handleUpdateTitle}
                                        />
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    ) : (
                        <div role="list" className="space-y-1">
                            {activeTodos.map((todo) => (
                                <div
                                    key={todo.id}
                                    className={cn(
                                        removingTodoIds.includes(todo.id)
                                            && 'animate-fade-slide-up',
                                    )}
                                >
                                    <TodoCard
                                        dragHandleProps={null}
                                        isDragging={false}
                                        isSelected={selectedVisibleTodoIds.includes(todo.id)}
                                        isSelectionMode={isSelectionMode}
                                        todo={todo}
                                        onDeleteTodo={handleDeleteTodo}
                                        onOpenDetail={openDetailPanel}
                                        onToggleComplete={handleToggleComplete}
                                        onToggleSelect={toggleTodoSelection}
                                        onUpdateTitle={handleUpdateTitle}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {completedTodos.length > 0 ? (
                        <div className="space-y-2">
                            <Separator />
                            <button
                                type="button"
                                aria-controls="completed-todos-section"
                                aria-expanded={!isCompletedCollapsed}
                                className="flex min-h-11 w-full items-center gap-2 rounded-md px-1 text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:min-h-0"
                                onClick={() => {
                                    if (isCompletedCollapsed) {
                                        if (completedCollapseTimeoutRef.current !== null) {
                                            window.clearTimeout(completedCollapseTimeoutRef.current);
                                            completedCollapseTimeoutRef.current = null;
                                        }
                                        setShowCompletedContent(true);
                                        setIsCompletedCollapsed(false);
                                        return;
                                    }

                                    setIsCompletedCollapsed(true);
                                    completedCollapseTimeoutRef.current = window.setTimeout(() => {
                                        setShowCompletedContent(false);
                                        completedCollapseTimeoutRef.current = null;
                                    }, 200);
                                }}
                            >
                                {isCompletedCollapsed ? (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span>{`Completed (${completedTodos.length})`}</span>
                            </button>

                            {showCompletedContent ? (
                                <div
                                    id="completed-todos-section"
                                    role="list"
                                    aria-hidden={isCompletedCollapsed}
                                    className={cn(
                                        'space-y-1 overflow-hidden',
                                        isCompletedCollapsed
                                            ? 'motion-safe:animate-[collapseHeight_200ms_ease-in-out_both]'
                                            : 'motion-safe:animate-[collapseHeight_200ms_ease-in-out_reverse_both]',
                                    )}
                                >
                                    {completedTodos.map((todo) => (
                                        <TodoCard
                                            key={todo.id}
                                            dragHandleProps={null}
                                            isDragging={false}
                                            isSelected={selectedVisibleTodoIds.includes(todo.id)}
                                            isSelectionMode={isSelectionMode}
                                            todo={todo}
                                            onDeleteTodo={handleDeleteTodo}
                                            onOpenDetail={openDetailPanel}
                                            onToggleComplete={handleToggleComplete}
                                            onToggleSelect={toggleTodoSelection}
                                            onUpdateTitle={handleUpdateTitle}
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}

            {!isTrashView ? (
                <TodoBulkToolbar
                    selectedCount={selectedCount}
                    onBulkAction={handleBulkAction}
                />
            ) : null}
        </div>
    );
}

const TodoList = memo(TodoListComponent);

TodoList.displayName = 'TodoList';

export default TodoList;
