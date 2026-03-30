import {
    format,
    isSameYear,
    isToday,
    isTomorrow,
    parseISO,
    startOfDay,
} from 'date-fns';
import {
    AlertCircle,
    AlignLeft,
    CalendarDays,
    Flag,
    GripVertical,
    Pencil,
    RotateCcw,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import {
    memo,
    useEffect,
    useMemo,
    useRef,
    useState,
    type AriaRole,
    type ComponentPropsWithoutRef,
    type FocusEvent,
    type HTMLAttributes,
    type KeyboardEvent,
    type PointerEvent,
    type Ref,
} from 'react';

import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import type { PriorityLevel, Todo } from '../../types';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '../ui/tooltip';

/**
 * Drag-handle props accepted from dnd-kit.
 */
type DragHandleProps = HTMLAttributes<HTMLButtonElement> & {
    /**
     * Optional role assigned by dnd-kit.
     */
    role?: AriaRole;
    /**
     * Optional forwarded drag activator ref.
     */
    ref?: Ref<HTMLButtonElement>;
};

/**
 * Card action mode.
 */
export type TodoCardActionMode = 'default' | 'trash';

/**
 * Due-date presentation tones.
 */
type DateTone = 'future' | 'overdue' | 'today' | 'tomorrow' | 'trash';

/**
 * Structured date metadata used by the card and tests.
 */
export interface TodoDateMeta {
    /**
     * The formatted date label.
     */
    label: string;
    /**
     * Visual tone for the date label.
     */
    tone: DateTone;
    /**
     * Tailwind classes applied to the date text.
     */
    className: string;
    /**
     * Whether the alert icon should be rendered.
     */
    showAlert: boolean;
    /**
     * Whether the metadata describes a due date or a deleted date.
     */
    kind: 'deleted' | 'due';
}

/**
 * Props accepted by the todo card row.
 */
export interface TodoCardProps {
    /**
     * The todo rendered by the card.
     */
    todo: Todo;
    /**
     * Whether the card is selected in bulk mode.
     */
    isSelected: boolean;
    /**
     * Whether the app is currently in bulk-selection mode.
     */
    isSelectionMode: boolean;
    /**
     * Callback that toggles completion.
     */
    onToggleComplete: (id: number) => void;
    /**
     * Callback that toggles bulk selection.
     */
    onToggleSelect: (id: number) => void;
    /**
     * Callback that opens the detail panel.
     */
    onOpenDetail: (id: number) => void;
    /**
     * Callback that moves the todo to trash.
     */
    onDeleteTodo?: (id: number) => void;
    /**
     * Callback that updates the title during inline editing.
     */
    onUpdateTitle?: (id: number, title: string) => Promise<void> | void;
    /**
     * Optional drag-handle props forwarded from dnd-kit.
     */
    dragHandleProps: DragHandleProps | null;
    /**
     * Whether the row is currently being dragged.
     */
    isDragging: boolean;
    /**
     * Optional action mode for special trash actions.
     */
    actionMode?: TodoCardActionMode;
    /**
     * Callback that restores a trashed todo.
     */
    onRestoreTodo?: (id: number) => void;
    /**
     * Callback that permanently deletes a trashed todo.
     */
    onDeletePermanently?: (id: number) => void;
}

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
    high: 'high',
    low: 'low',
    medium: 'medium',
    none: 'none',
};

/**
 * Returns the Tailwind class used for the priority flag color.
 *
 * @param priority The todo priority level.
 * @returns The CSS class for the flag icon.
 */
export function getPriorityFlagClassName(priority: PriorityLevel): string {
    if (priority === 'high') {
        return 'text-red-700 dark:text-red-400';
    }

    if (priority === 'medium') {
        return 'text-amber-700 dark:text-amber-400';
    }

    if (priority === 'low') {
        return 'text-blue-700 dark:text-blue-400';
    }

    return 'text-slate-500 dark:text-slate-400';
}

/**
 * Builds the card aria-label string.
 *
 * @param todo The todo row being rendered.
 * @returns The screen-reader label for the card.
 */
function getTodoAriaLabel(todo: Todo): string {
    const status = todo.is_deleted
        ? 'in trash'
        : todo.is_completed
            ? 'completed'
            : 'active';

    return `${todo.title}, ${PRIORITY_LABELS[todo.priority]} priority, ${status}`;
}

/**
 * Computes the due-date metadata used by the todo card.
 *
 * @param todo The todo being rendered.
 * @param now The current time for date comparisons.
 * @returns Structured date metadata or `null`.
 */
export function getTodoDateMeta(
    todo: Todo,
    now: Date = new Date(),
): TodoDateMeta | null {
    if (todo.is_deleted && todo.deleted_at) {
        return {
            className: 'text-muted-foreground',
            kind: 'deleted',
            label: `Deleted ${format(parseISO(todo.deleted_at), 'MMM d')}`,
            showAlert: false,
            tone: 'trash',
        };
    }

    if (!todo.due_date) {
        return null;
    }

    const today = startOfDay(now);
    const dueDate = startOfDay(parseISO(todo.due_date));
    const overdue = dueDate < today && !todo.is_completed;

    let label = isSameYear(dueDate, today)
        ? format(dueDate, 'MMM d')
        : format(dueDate, 'MMM d, yyyy');
    let tone: DateTone = 'future';
    let className = 'text-muted-foreground';
    let showAlert = false;

    if (isToday(dueDate)) {
        label = 'Today';
        tone = 'today';
        className = todo.is_completed
            ? 'text-muted-foreground'
            : 'font-medium text-orange-700 dark:text-orange-300';
    } else if (isTomorrow(dueDate)) {
        label = 'Tomorrow';
        tone = 'tomorrow';
        className = todo.is_completed
            ? 'text-muted-foreground'
            : 'text-orange-700 dark:text-orange-300';
    } else if (overdue) {
        tone = 'overdue';
        className = 'font-medium text-red-700 dark:text-red-400';
        showAlert = true;
    }

    if (todo.is_completed) {
        className = 'text-muted-foreground';
        showAlert = false;
    }

    return {
        className,
        kind: 'due',
        label,
        showAlert,
        tone,
    };
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Title could not be updated.';
}

function getDateIcon(meta: TodoDateMeta): LucideIcon {
    if (meta.kind === 'deleted') {
        return Trash2;
    }

    if (meta.showAlert) {
        return AlertCircle;
    }

    return CalendarDays;
}

function TodoCardComponent({
    actionMode = 'default',
    dragHandleProps,
    isDragging,
    isSelected,
    isSelectionMode,
    onDeletePermanently,
    onDeleteTodo,
    onOpenDetail,
    onRestoreTodo,
    onToggleComplete,
    onToggleSelect,
    onUpdateTitle,
    todo,
}: TodoCardProps) {
    const { enterSelectionMode, setHoveredTodoId } = useAppStore((state) => ({
        enterSelectionMode: state.enterSelectionMode,
        setHoveredTodoId: state.setHoveredTodoId,
    }));

    const [isHovered, setIsHovered] = useState(false);
    const [isFocusedWithin, setIsFocusedWithin] = useState(false);
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [inlineEditValue, setInlineEditValue] = useState(todo.title);
    const [inlineEditError, setInlineEditError] = useState<string | null>(null);
    const [shouldShake, setShouldShake] = useState(false);
    const [isSavingInlineEdit, setIsSavingInlineEdit] = useState(false);

    const inlineEditInputRef = useRef<HTMLInputElement | null>(null);
    const longPressTimeoutRef = useRef<number | null>(null);

    const priorityClassName = useMemo(
        () => getPriorityFlagClassName(todo.priority),
        [todo.priority],
    );
    const dateMeta = useMemo(() => getTodoDateMeta(todo), [todo]);

    useEffect(() => {
        setInlineEditValue(todo.title);
    }, [todo.title]);

    useEffect(() => {
        if (!isInlineEditing) {
            return;
        }

        inlineEditInputRef.current?.focus();
        inlineEditInputRef.current?.select();
    }, [isInlineEditing]);

    useEffect(() => {
        return () => {
            if (longPressTimeoutRef.current !== null) {
                window.clearTimeout(longPressTimeoutRef.current);
            }
        };
    }, []);

    const handleRef = dragHandleProps?.ref;
    const { ref: _ignoredRef, ...resolvedDragHandleProps } = dragHandleProps ?? {};
    const actionButtonsVisible = (isHovered || isFocusedWithin) && !isSelectionMode;
    const DateIcon = dateMeta ? getDateIcon(dateMeta) : null;

    function clearLongPress() {
        if (longPressTimeoutRef.current !== null) {
            window.clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
    }

    function triggerInlineEditError(message: string) {
        setInlineEditError(message);
        setShouldShake(true);
        window.setTimeout(() => setShouldShake(false), 400);
    }

    function beginInlineEdit() {
        setInlineEditValue(todo.title);
        setInlineEditError(null);
        setIsInlineEditing(true);
    }

    function cancelInlineEdit() {
        setInlineEditValue(todo.title);
        setInlineEditError(null);
        setIsInlineEditing(false);
    }

    async function saveInlineEdit() {
        const nextTitle = inlineEditValue.trim();

        if (nextTitle === '') {
            triggerInlineEditError('Title is required');
            return;
        }

        if (nextTitle === todo.title.trim()) {
            cancelInlineEdit();
            return;
        }

        if (!onUpdateTitle) {
            cancelInlineEdit();
            return;
        }

        setIsSavingInlineEdit(true);
        setInlineEditError(null);

        try {
            await onUpdateTitle(todo.id, nextTitle);
            setIsInlineEditing(false);
        } catch (error) {
            triggerInlineEditError(getErrorMessage(error));
        } finally {
            setIsSavingInlineEdit(false);
        }
    }

    function handleCardBlur(event: FocusEvent<HTMLDivElement>) {
        if (event.currentTarget.contains(event.relatedTarget)) {
            return;
        }

        setIsFocusedWithin(false);

        if (useAppStore.getState().hoveredTodoId === todo.id) {
            setHoveredTodoId(null);
        }
    }

    function handleInlineInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelInlineEdit();
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            void saveInlineEdit();
        }
    }

    function handleLongPressStart(event: PointerEvent<HTMLDivElement>) {
        if (event.pointerType !== 'touch' || isSelectionMode) {
            return;
        }

        if (
            event.target instanceof HTMLElement
            && event.target.closest(
                'button, input, textarea, select, [role="button"], [data-radix-collection-item]',
            )
        ) {
            return;
        }

        clearLongPress();
        longPressTimeoutRef.current = window.setTimeout(() => {
            enterSelectionMode();
            onToggleSelect(todo.id);
            longPressTimeoutRef.current = null;
        }, 500);
    }

    return (
        <div
            role="listitem"
            data-todo-card
            data-complete={todo.is_completed ? 'true' : 'false'}
            tabIndex={0}
            aria-label={getTodoAriaLabel(todo)}
            className={cn(
                'animate-fadeSlideDown rounded-lg border border-border bg-card px-3 py-2.5 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'flex items-center gap-2',
                isHovered && 'bg-accent/30',
                isSelected && 'border-primary/50 bg-primary/10',
                todo.is_completed && 'opacity-60',
                isDragging && 'z-50 scale-[1.02] rotate-[0.5deg] opacity-90 shadow-lg',
            )}
            onBlur={handleCardBlur}
            onFocus={() => {
                setIsFocusedWithin(true);
                setHoveredTodoId(todo.id);
            }}
            onKeyDown={(event) => {
                if (isInlineEditing || event.currentTarget !== event.target) {
                    return;
                }

                if (event.key === 'Enter' || event.key.toLowerCase() === 'e') {
                    event.preventDefault();
                    onOpenDetail(todo.id);
                    return;
                }

                if (event.key === ' ') {
                    event.preventDefault();

                    if (isSelectionMode) {
                        onToggleSelect(todo.id);
                        return;
                    }

                    onToggleComplete(todo.id);
                }
            }}
            onMouseEnter={() => {
                setIsHovered(true);
                setHoveredTodoId(todo.id);
            }}
            onMouseLeave={() => {
                setIsHovered(false);
                setHoveredTodoId(null);
            }}
            onPointerCancel={clearLongPress}
            onPointerDown={handleLongPressStart}
            onPointerLeave={clearLongPress}
            onPointerUp={clearLongPress}
        >
            {dragHandleProps ? (
                <div className="w-11 shrink-0 md:w-4">
                    <button
                        ref={handleRef}
                        type="button"
                        aria-label={`Reorder ${todo.title}`}
                        aria-hidden={!(isHovered || isFocusedWithin || isDragging)}
                        tabIndex={isHovered || isFocusedWithin || isDragging ? 0 : -1}
                        className={cn(
                            'flex h-11 w-11 cursor-grab items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing md:h-4 md:w-4',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            'touch-none transition-opacity duration-150',
                            isHovered || isFocusedWithin || isDragging ? 'opacity-100' : 'opacity-0',
                        )}
                        {...(resolvedDragHandleProps as ComponentPropsWithoutRef<'button'>)}
                        onClick={(event) => {
                            event.stopPropagation();
                            resolvedDragHandleProps.onClick?.(event);
                        }}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : null}

            <div className="flex w-11 shrink-0 items-center justify-center md:w-5">
                {isSelectionMode ? (
                    <Checkbox
                        checked={isSelected}
                        aria-label={`Select ${todo.title}`}
                        onCheckedChange={() => {
                            onToggleSelect(todo.id);
                        }}
                    />
                ) : (
                    <Checkbox
                        checked={todo.is_completed}
                        aria-label={`Mark ${todo.title} as ${todo.is_completed ? 'incomplete' : 'complete'}`}
                        className="data-[state=checked]:animate-fadeSlideDown"
                        onCheckedChange={() => {
                            onToggleComplete(todo.id);
                        }}
                    />
                )}
            </div>

            <div className="min-w-0 flex-1 overflow-hidden">
                {isInlineEditing ? (
                    <div className="space-y-1">
                        <Input
                            ref={inlineEditInputRef}
                            value={inlineEditValue}
                            disabled={isSavingInlineEdit}
                            className={cn(
                                'h-8 text-sm',
                                inlineEditError && 'border-destructive focus-visible:ring-destructive',
                                shouldShake && 'animate-shake-bounce',
                            )}
                            onBlur={() => {
                                if (inlineEditValue.trim() === '') {
                                    cancelInlineEdit();
                                    return;
                                }

                                void saveInlineEdit();
                            }}
                            onChange={(event) => {
                                setInlineEditError(null);
                                setInlineEditValue(event.target.value);
                            }}
                            onKeyDown={handleInlineInputKeyDown}
                        />

                        {inlineEditError ? (
                            <p className="text-xs text-destructive">
                                {inlineEditError}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <>
                        <span
                            className={cn(
                                'animate-strikethrough relative block truncate text-sm font-medium',
                                todo.is_completed && 'text-muted-foreground',
                            )}
                            onDoubleClick={beginInlineEdit}
                        >
                            {todo.title}
                        </span>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {todo.list ? (
                                <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-muted/80 px-2 py-0.5">
                                    <span
                                        aria-hidden="true"
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: todo.list.color }}
                                    />
                                    <span className="truncate">{todo.list.name}</span>
                                </span>
                            ) : null}

                            {todo.description ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1">
                                            <AlignLeft className="h-3 w-3" />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>Has description</TooltipContent>
                                </Tooltip>
                            ) : null}
                        </div>
                    </>
                )}
            </div>

            <div className="w-5 shrink-0">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                            className={cn(
                                'inline-flex h-4 w-4 items-center justify-center',
                                todo.priority === 'none' && 'invisible',
                            )}
                        >
                            <Flag
                                className={cn(
                                    'h-3.5 w-3.5',
                                    priorityClassName,
                                    todo.priority !== 'none' && 'fill-current',
                                )}
                            />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        Priority: {todo.priority}
                    </TooltipContent>
                </Tooltip>
            </div>

            {dateMeta && DateIcon ? (
                <div
                    className={cn(
                        'flex shrink-0 items-center gap-1 text-xs',
                        dateMeta.className,
                    )}
                >
                    <DateIcon className="h-3.5 w-3.5" />
                    <span>{dateMeta.label}</span>
                </div>
            ) : null}

            <div
                className={cn(
                    'flex shrink-0 items-center gap-0.5 transition-[visibility,opacity] duration-150',
                    actionButtonsVisible ? 'visible opacity-100' : 'invisible opacity-0',
                )}
            >
                {actionMode === 'trash' ? (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 md:h-6 md:w-6"
                            aria-label={`Restore ${todo.title}`}
                            onClick={() => {
                                onRestoreTodo?.(todo.id);
                            }}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-red-600 hover:text-red-600 md:h-6 md:w-6 dark:text-red-400 dark:hover:text-red-400"
                            aria-label={`Delete ${todo.title} permanently`}
                            onClick={() => {
                                onDeletePermanently?.(todo.id);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 md:h-6 md:w-6"
                            aria-label={`Edit ${todo.title}`}
                            onClick={() => {
                                onOpenDetail(todo.id);
                            }}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-red-600 hover:text-red-600 md:h-6 md:w-6 dark:text-red-400 dark:hover:text-red-400"
                            aria-label={`Delete ${todo.title}`}
                            onClick={() => {
                                onDeleteTodo?.(todo.id);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

const TodoCard = memo(TodoCardComponent);

TodoCard.displayName = 'TodoCard';

export default TodoCard;
