import {
    createContext,
    useContext,
    useCallback,
    useMemo,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type PropsWithChildren,
    type ReactNode,
} from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router, usePage } from '@inertiajs/react';
import {
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Layers,
    Monitor,
    Moon,
    Plus,
    Settings,
    Sun,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { useLists } from '../../hooks/useLists';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import type { PageProps, SelectedListId, Theme, TodoList } from '../../types';
import ListCreateInput from '../lists/ListCreateInput';
import ListOptionsMenu from '../lists/ListOptionsMenu';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import SidebarListItem from './SidebarListItem';

/**
 * Shared presentation flags used to render the sidebar in the desktop shell or
 * the mobile drawer without adding props to the public Sidebar API.
 */
export interface SidebarPresentationContextValue {
    /**
     * Forces the sidebar into its expanded presentation.
     */
    forceExpanded: boolean;
    /**
     * Optional callback fired after navigation inside a drawer context.
     */
    onNavigate?: () => void;
}

/**
 * Presentation context for the prop-free Sidebar component.
 */
export const SidebarPresentationContext =
    createContext<SidebarPresentationContextValue>({
        forceExpanded: false,
    });

/**
 * Helper provider used by the mobile drawer.
 *
 * @param props The presentation flags and children.
 * @returns The provider wrapper.
 */
export function SidebarPresentationProvider({
    children,
    value,
}: PropsWithChildren<{ value: SidebarPresentationContextValue }>) {
    return (
        <SidebarPresentationContext.Provider value={value}>
            {children}
        </SidebarPresentationContext.Provider>
    );
}

/**
 * Default navigation item metadata.
 */
interface DefaultSidebarList {
    /**
     * Stable list identifier.
     */
    id: SelectedListId;
    /**
     * The icon rendered beside the label.
     */
    icon: LucideIcon;
    /**
     * Visible label text.
     */
    label: string;
    /**
     * Optional badge count.
     */
    badge: number | null;
}

/**
 * Editing state for an inline sidebar list rename flow.
 */
interface EditingListState {
    /**
     * The list identifier currently being edited.
     */
    id: number;
    /**
     * The editable list name draft.
     */
    value: string;
    /**
     * Optional validation or API error message.
     */
    error: string | null;
}

/**
 * DnD wrapper props for a sortable user list item.
 */
interface SortableSidebarListItemProps {
    /**
     * Whether the sidebar is collapsed.
     */
    isCollapsed: boolean;
    /**
     * Whether the current list is selected.
     */
    isActive: boolean;
    /**
     * The list being rendered.
     */
    list: TodoList;
    /**
     * Callback when the row should navigate to its list.
     */
    onClick: () => void;
    /**
     * Callback when inline editing should start.
     */
    onEdit: () => void;
    /**
     * Callback when the list should be deleted.
     */
    onDelete: () => void;
    /**
     * Optional custom actions rendered for the list row.
     */
    actions?: ReactNode;
}

/**
 * Returns the next theme in the footer cycle light → dark → system → light.
 *
 * @param theme The current theme mode.
 * @returns The next theme mode.
 */
export function getNextTheme(theme: Theme): Theme {
    if (theme === 'light') {
        return 'dark';
    }

    if (theme === 'dark') {
        return 'system';
    }

    return 'light';
}

/**
 * Returns the tooltip shown for the theme toggle button.
 *
 * @param theme The current theme mode.
 * @returns The next-theme tooltip label.
 */
export function getThemeToggleTooltip(theme: Theme): string {
    const nextTheme = getNextTheme(theme);

    if (nextTheme === 'dark') {
        return 'Switch to Dark Mode';
    }

    if (nextTheme === 'light') {
        return 'Switch to Light Mode';
    }

    return 'Switch to System';
}

/**
 * Determines whether a sidebar badge should be rendered.
 *
 * @param badge The badge count for a list item.
 * @returns `true` when the badge should be visible.
 */
export function shouldShowSidebarBadge(badge: number | null): boolean {
    return typeof badge === 'number' && badge > 0;
}

/**
 * Returns the footer icon for the active theme mode.
 *
 * @param theme The current theme mode.
 * @returns The icon component to render.
 */
function getThemeIcon(theme: Theme): LucideIcon {
    if (theme === 'dark') {
        return Moon;
    }

    if (theme === 'light') {
        return Sun;
    }

    return Monitor;
}

/**
 * Extracts a user-facing message from an unknown sidebar API error.
 *
 * @param error The thrown error value.
 * @param fallback A safe fallback message.
 * @returns A readable message for UI feedback.
 */
function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}

/**
 * Sortable wrapper for user-defined lists.
 *
 * @param props The sortable row props.
 * @returns The sortable sidebar item.
 */
function SortableSidebarListItem({
    actions,
    isActive,
    isCollapsed,
    list,
    onClick,
    onDelete,
    onEdit,
}: SortableSidebarListItemProps) {
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: list.id,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <SidebarListItem
                id={list.id}
                badge={shouldShowSidebarBadge(list.active_todos_count)
                    ? list.active_todos_count
                    : null}
                colorDot={list.color}
                dragHandleProps={
                    !isCollapsed
                        ? {
                            ...attributes,
                            ...listeners,
                            ref: setActivatorNodeRef,
                        }
                        : null
                }
                icon={null}
                isActive={isActive}
                isCollapsed={isCollapsed}
                isDragHandle
                label={list.name}
                actions={actions}
                onClick={onClick}
                onDelete={onDelete}
                onEdit={onEdit}
                showActions={false}
            />
        </div>
    );
}

/**
 * Sidebar navigation rail for default lists, user lists, and footer actions.
 *
 * @returns The rendered sidebar.
 */
export default function Sidebar() {
    const { forceExpanded, onNavigate } = useContext(SidebarPresentationContext);
    const page = usePage<PageProps>();
    const { lists, createList, deleteList, reorderLists, updateList } = useLists();
    const {
        selectedListId,
        settings,
        setSelectedListId,
        setSidebarCollapsed,
        sidebarCollapsed,
        toggleSidebar,
        updateSetting,
    } = useAppStore(
        useShallow((state) => ({
            selectedListId: state.selectedListId,
            settings: state.settings,
            setSelectedListId: state.setSelectedListId,
            setSidebarCollapsed: state.setSidebarCollapsed,
            sidebarCollapsed: state.sidebarCollapsed,
            toggleSidebar: state.toggleSidebar,
            updateSetting: state.updateSetting,
        })),
    );

    const [activeDragId, setActiveDragId] = useState<number | null>(null);
    const [editingList, setEditingList] = useState<EditingListState | null>(null);
    const [isCreatingList, setIsCreatingList] = useState(false);

    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    });
    const sensors = useMemo(
        () => [pointerSensor],
        [pointerSensor],
    );
    const isCollapsed = forceExpanded ? false : sidebarCollapsed;
    const todayCount =
        typeof page.props.today_count === 'number' ? page.props.today_count : 0;
    const trashCount =
        typeof page.props.trash_count === 'number' ? page.props.trash_count : 0;
    const themeTooltip = getThemeToggleTooltip(settings.theme);
    const ThemeIcon = getThemeIcon(settings.theme);
    const activeDragList = useMemo(
        () => (
            activeDragId === null
                ? null
                : lists.find((list) => list.id === activeDragId) ?? null
        ),
        [activeDragId, lists],
    );
    const sortableListIds = useMemo(
        () => lists.map((list) => list.id),
        [lists],
    );

    const defaultLists = useMemo<DefaultSidebarList[]>(
        () => [
            {
                badge: null,
                icon: Layers,
                id: 'all',
                label: 'All Tasks',
            },
            {
                badge: shouldShowSidebarBadge(todayCount) ? todayCount : null,
                icon: Sun,
                id: 'today',
                label: 'Today',
            },
            {
                badge: shouldShowSidebarBadge(trashCount) ? trashCount : null,
                icon: Trash2,
                id: 'trash',
                label: 'Trash',
            },
        ],
        [todayCount, trashCount],
    );

    const handleNavigate = useCallback((listId: SelectedListId) => {
        setSelectedListId(listId);
        router.visit('/tasks', {
            data: { list_id: listId },
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
        onNavigate?.();
    }, [onNavigate, setSelectedListId]);

    const handleCreateList = useCallback(async (name: string, color: string) => {
        try {
            await createList(name, color);
            setIsCreatingList(false);
        } catch (error) {
            throw new Error(getErrorMessage(error, 'Failed to create list.'));
        }
    }, [createList]);

    const handleRenameList = useCallback(async () => {
        if (!editingList) {
            return;
        }

        const trimmedName = editingList.value.trim();

        if (!trimmedName) {
            setEditingList((currentState) =>
                currentState
                    ? { ...currentState, error: 'List name is required.' }
                    : currentState,
            );
            return;
        }

        try {
            await updateList(editingList.id, { name: trimmedName });
            setEditingList(null);
        } catch (error) {
            setEditingList((currentState) =>
                currentState
                    ? {
                        ...currentState,
                        error: getErrorMessage(error, 'Failed to rename list.'),
                    }
                    : currentState,
            );
        }
    }, [editingList, updateList]);

    const handleDeleteList = useCallback(async (listId: number) => {
        await deleteList(listId);
        onNavigate?.();
    }, [deleteList, onNavigate]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveDragId(null);

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = lists.findIndex((list) => list.id === active.id);
        const newIndex = lists.findIndex((list) => list.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const reorderedLists = arrayMove(lists, oldIndex, newIndex);
        const payload = reorderedLists.map((list, index) => ({
            id: list.id,
            sort_order: index + 1,
        }));

        await reorderLists(payload);
    }, [lists, reorderLists]);

    return (
        <TooltipProvider delayDuration={150}>
            <aside
                role="navigation"
                aria-label="Sidebar navigation"
                className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border/60 bg-[hsl(var(--accent)/0.08)] backdrop-blur-xl dark:bg-[hsl(var(--accent)/0.12)]"
            >
                <div className="relative flex h-14 items-center px-4">
                    <div
                        className={cn(
                            'flex min-w-0 flex-1 items-center gap-3',
                            isCollapsed && 'justify-center',
                        )}
                    >
                        <CheckSquare className="h-5 w-5 shrink-0 text-primary" />
                        {!isCollapsed ? (
                            <span className="truncate text-sm font-semibold">
                                TodoApp
                            </span>
                        ) : null}
                    </div>

                    {!forceExpanded ? (
                        <Button
                            aria-label={
                                isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
                            }
                            className="absolute -right-4 top-1/2 hidden h-8 w-8 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm md:inline-flex"
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={toggleSidebar}
                        >
                            {isCollapsed ? (
                                <ChevronRight className="h-4 w-4" />
                            ) : (
                                <ChevronLeft className="h-4 w-4" />
                            )}
                        </Button>
                    ) : null}
                </div>

                <Separator />

                <div className="flex min-h-0 flex-1 flex-col px-2 py-3">
                    <nav aria-label="Task lists" className="space-y-1">
                        {defaultLists.map((list) => (
                            <SidebarListItem
                                key={String(list.id)}
                                id={list.id}
                                badge={list.badge}
                                colorDot={null}
                                dragHandleProps={null}
                                icon={list.icon}
                                isActive={selectedListId === list.id}
                                isCollapsed={isCollapsed}
                                isDragHandle={false}
                                label={list.label}
                                onClick={() => handleNavigate(list.id)}
                                onDelete={null}
                                onEdit={null}
                                showActions={false}
                            />
                        ))}
                    </nav>

                    <Separator className="my-3" />

                    {!isCollapsed ? (
                        <div className="px-2 pb-2">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                My Lists
                            </p>
                        </div>
                    ) : null}

                    <div className="min-h-0 flex-1">
                        <ScrollArea className="h-full">
                            <div className="space-y-1 pr-2">
                                <DndContext
                                    collisionDetection={closestCenter}
                                    sensors={sensors}
                                    onDragEnd={(event) => {
                                        void handleDragEnd(event);
                                    }}
                                    onDragStart={(event: DragStartEvent) => {
                                        setActiveDragId(Number(event.active.id));
                                    }}
                                >
                                    <SortableContext
                                        items={sortableListIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {lists.map((list) => {
                                            const isEditing = editingList?.id === list.id;

                                            if (isEditing) {
                                                return (
                                                    <div
                                                        key={list.id}
                                                        className="rounded-md border border-border bg-background p-2"
                                                    >
                                                        <Label
                                                            htmlFor={`rename-list-${list.id}`}
                                                            className="sr-only"
                                                        >
                                                            Rename list
                                                        </Label>
                                                        <Input
                                                            id={`rename-list-${list.id}`}
                                                            autoFocus
                                                            value={editingList.value}
                                                            onChange={(event) => {
                                                                setEditingList({
                                                                    ...editingList,
                                                                    error: null,
                                                                    value: event.target.value,
                                                                });
                                                            }}
                                                            onKeyDown={(
                                                                event: KeyboardEvent<HTMLInputElement>,
                                                            ) => {
                                                                if (event.key === 'Enter') {
                                                                    event.preventDefault();
                                                                    void handleRenameList();
                                                                }

                                                                if (event.key === 'Escape') {
                                                                    event.preventDefault();
                                                                    setEditingList(null);
                                                                }
                                                            }}
                                                        />
                                                        {editingList.error ? (
                                                            <p className="mt-2 text-xs text-destructive">
                                                                {editingList.error}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                );
                                            }

                                            return (
                                                <SortableSidebarListItem
                                                    key={list.id}
                                                    actions={
                                                        <ListOptionsMenu
                                                            list={list}
                                                            onDelete={() => {
                                                                void handleDeleteList(list.id);
                                                            }}
                                                            onEdit={() => {
                                                                setEditingList({
                                                                    error: null,
                                                                    id: list.id,
                                                                    value: list.name,
                                                                });
                                                            }}
                                                        />
                                                    }
                                                    isActive={selectedListId === list.id}
                                                    isCollapsed={isCollapsed}
                                                    list={list}
                                                    onClick={() => handleNavigate(list.id)}
                                                    onDelete={() => undefined}
                                                    onEdit={() => undefined}
                                                />
                                            );
                                        })}
                                    </SortableContext>

                                    <DragOverlay>
                                        {activeDragList ? (
                                            <div className="w-56 opacity-80 shadow-xl">
                                                <SidebarListItem
                                                    id={activeDragList.id}
                                                    badge={shouldShowSidebarBadge(
                                                        activeDragList.active_todos_count,
                                                    )
                                                        ? activeDragList.active_todos_count
                                                        : null}
                                                    colorDot={activeDragList.color}
                                                    dragHandleProps={null}
                                                    icon={null}
                                                    isActive={selectedListId === activeDragList.id}
                                                    isCollapsed={false}
                                                    isDragHandle={false}
                                                    label={activeDragList.name}
                                                    onClick={() => undefined}
                                                    onDelete={null}
                                                    onEdit={null}
                                                    showActions={false}
                                                />
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>

                                {isCreatingList ? (
                                    <ListCreateInput
                                        onCancel={() => {
                                            setIsCreatingList(false);
                                        }}
                                        onSubmit={handleCreateList}
                                    />
                                ) : null}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="pt-3">
                        {isCollapsed ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        aria-label="New List"
                                        className="h-11 w-full justify-center rounded-md md:h-9"
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setSidebarCollapsed(false);
                                            setIsCreatingList(true);
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>
                                    New List
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Button
                                className="h-11 w-full justify-start gap-3 rounded-md md:h-9"
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setIsCreatingList(true);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                <span>New List</span>
                            </Button>
                        )}
                    </div>
                </div>

                <Separator />

                <div className="flex h-14 items-center gap-2 px-2">
                    <SidebarListItem
                        id="all"
                        badge={null}
                        colorDot={null}
                        dragHandleProps={null}
                        icon={Settings}
                        isActive={false}
                        isCollapsed={isCollapsed}
                        isDragHandle={false}
                        label="Settings"
                        onClick={() => {
                            router.visit('/settings');
                            onNavigate?.();
                        }}
                        onDelete={null}
                        onEdit={null}
                        showActions={false}
                    />

                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    aria-label={themeTooltip}
                                    className="h-11 w-11 shrink-0 rounded-md md:h-9 md:w-9"
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        updateSetting({
                                            theme: getNextTheme(settings.theme),
                                        });
                                    }}
                                >
                                    <ThemeIcon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8}>
                                {themeTooltip}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    aria-label={themeTooltip}
                                    className="h-11 shrink-0 gap-2 rounded-md px-3 md:h-9"
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        updateSetting({
                                            theme: getNextTheme(settings.theme),
                                        });
                                    }}
                                >
                                    <ThemeIcon className="h-4 w-4" />
                                    <span>Theme</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={8}>
                                {themeTooltip}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </aside>
        </TooltipProvider>
    );
}
