import { usePage } from '@inertiajs/react';
import { format, isToday } from 'date-fns';
import {
    CalendarDays,
    Flag,
    FolderOpen,
    Plus,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import {
    forwardRef,
    memo,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';

import { cn } from '../../lib/utils';
import type { PageProps, PriorityLevel, SelectedListId, Todo } from '../../types';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';

/**
 * Props accepted by the todo quick-create input.
 */
export interface TodoCreateInputProps {
    /**
     * The currently selected list identifier.
     */
    listId: SelectedListId;
    /**
     * Callback that creates a new todo from the collected form values.
     */
    onCreateTodo: (data: Partial<Todo>) => Promise<unknown>;
}

/**
 * Validates the quick-create title field.
 *
 * @param title The current title value.
 * @returns A validation error message, or `null` when the value is valid.
 */
export function getCreateTodoValidationError(title: string): string | null {
    return title.trim() === '' ? 'Title is required' : null;
}

function getDefaultListValue(listId: SelectedListId): string {
    return typeof listId === 'number' ? String(listId) : 'none';
}

/**
 * Todo quick-create bar with expandable metadata controls.
 *
 * @param props The component props.
 * @param forwardedRef A forwarded ref to the inner title input element.
 * @returns The rendered create-input form.
 */
const TodoCreateInputBase = forwardRef<HTMLInputElement, TodoCreateInputProps>(
    function TodoCreateInput(
        {
            listId,
            onCreateTodo,
        }: TodoCreateInputProps,
        forwardedRef,
    ) {
        const page = usePage<PageProps>();
        const availableLists = page.props.lists ?? [];

        const [title, setTitle] = useState('');
        const [description, setDescription] = useState('');
        const [priority, setPriority] = useState<PriorityLevel>('none');
        const [selectedListValue, setSelectedListValue] = useState(
            getDefaultListValue(listId),
        );
        const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
        const [isExpanded, setIsExpanded] = useState(false);
        const [showMoreOptions, setShowMoreOptions] = useState(false);
        const [isCalendarOpen, setIsCalendarOpen] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [shouldShake, setShouldShake] = useState(false);
        const [isMobile, setIsMobile] = useState(() =>
            typeof window === 'undefined' ? false : window.innerWidth < 768,
        );
        const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);

        const titleInputRef = useRef<HTMLInputElement | null>(null);
        const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

        const descriptionLength = description.length;
        const resolvedDueDateLabel = useMemo(() => {
            if (!dueDate) {
                return 'Add due date';
            }

            if (isToday(dueDate)) {
                return 'Due today';
            }

            return format(dueDate, 'MMM d');
        }, [dueDate]);

        useEffect(() => {
            setSelectedListValue(getDefaultListValue(listId));
        }, [listId]);

        useEffect(() => {
            if (typeof window === 'undefined') {
                return;
            }

            function handleResize() {
                setIsMobile(window.innerWidth < 768);
            }

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }, []);

        useEffect(() => {
            const textarea = descriptionRef.current;

            if (!textarea) {
                return;
            }

            textarea.style.height = '0px';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }, [description]);

        function assignTitleInputRef(node: HTMLInputElement | null) {
            titleInputRef.current = node;

            if (typeof forwardedRef === 'function') {
                forwardedRef(node);
                return;
            }

            if (forwardedRef) {
                forwardedRef.current = node;
            }
        }

        function resetForm() {
            setTitle('');
            setDescription('');
            setPriority('none');
            setSelectedListValue(getDefaultListValue(listId));
            setDueDate(undefined);
            setIsExpanded(false);
            setShowMoreOptions(false);
            setIsMobileOptionsOpen(false);
            setError(null);
            setShouldShake(false);
        }

        function cancelForm() {
            resetForm();
            titleInputRef.current?.focus();
        }

        async function handleSubmit() {
            const validationError = getCreateTodoValidationError(title);

            if (validationError) {
                setError(validationError);
                setShouldShake(true);
                window.setTimeout(() => setShouldShake(false), 400);
                return;
            }

            setIsSubmitting(true);
            setError(null);

            try {
                await onCreateTodo({
                    description: description.trim() === '' ? null : description.trim(),
                    due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
                    priority,
                    title: title.trim(),
                    todo_list_id:
                        selectedListValue === 'none'
                            ? null
                            : Number(selectedListValue),
                });

                resetForm();
                titleInputRef.current?.focus();
            } finally {
                setIsSubmitting(false);
            }
        }

        function handleTitleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelForm();
                return;
            }

            if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault();
                descriptionRef.current?.focus();
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                void handleSubmit();
            }
        }

        function handleDescriptionKeyDown(
            event: KeyboardEvent<HTMLTextAreaElement>,
        ) {
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelForm();
            }
        }

        const moreOptionsControls = (
            <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'md:grid-cols-3')}>
                <div className="space-y-2">
                    <Label id="todo-create-due-date-label" className="sr-only">
                        Due date
                    </Label>
                    <Popover
                        open={isCalendarOpen}
                        onOpenChange={setIsCalendarOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                aria-label="Date picker"
                                aria-labelledby="todo-create-due-date-label"
                                className="h-11 w-full justify-start"
                            >
                                <CalendarDays className="h-4 w-4" />
                                <span>{resolvedDueDateLabel}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={dueDate}
                                onSelect={(nextDate) => {
                                    setDueDate(nextDate ?? undefined);
                                    if (nextDate) {
                                        setIsCalendarOpen(false);
                                    }
                                }}
                                initialFocus
                            />

                            <div className="border-t border-border p-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start text-xs"
                                    onClick={() => {
                                        setDueDate(undefined);
                                        setIsCalendarOpen(false);
                                    }}
                                >
                                    Clear date
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label id="todo-create-priority-label" className="sr-only">
                        Priority
                    </Label>
                    <Select
                        value={priority}
                        onValueChange={(value) => {
                            setPriority(value as PriorityLevel);
                        }}
                    >
                        <SelectTrigger
                            aria-labelledby="todo-create-priority-label"
                            className="h-11"
                        >
                            <div className="flex items-center gap-2">
                                <Flag className="h-4 w-4" />
                                <SelectValue placeholder="Priority" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Priority</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label id="todo-create-list-label" className="sr-only">
                        List
                    </Label>
                    <Select
                        value={selectedListValue}
                        onValueChange={setSelectedListValue}
                    >
                        <SelectTrigger
                            aria-labelledby="todo-create-list-label"
                            className="h-11"
                        >
                            <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                <SelectValue placeholder="Choose a list" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No List</SelectItem>
                            {availableLists.map((list) => (
                                <SelectItem
                                    key={list.id}
                                    value={String(list.id)}
                                >
                                    {list.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );

        return (
            <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-start gap-3">
                    <Plus className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                    <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="todo-create-title" className="sr-only">
                                Task title
                            </Label>
                            <Input
                                id="todo-create-title"
                                ref={assignTitleInputRef}
                                data-add-task-input=""
                                value={title}
                                placeholder="Add a task…"
                                className={cn(
                                    'rounded-md border-transparent px-0 text-sm shadow-none',
                                    isExpanded && 'border-input px-3 shadow-xs focus-visible:ring-2',
                                    error && 'border-destructive focus-visible:ring-destructive',
                                    shouldShake && 'animate-shakeBounce',
                                )}
                                onFocus={() => setIsExpanded(true)}
                                onChange={(event) => {
                                    if (error) {
                                        setError(null);
                                    }

                                    setTitle(event.target.value);
                                }}
                                onKeyDown={handleTitleKeyDown}
                            />

                            {error ? (
                                <p className="text-xs text-destructive">{error}</p>
                            ) : null}
                        </div>

                        {isExpanded ? (
                            <>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="todo-create-description"
                                        className="sr-only"
                                    >
                                        Task description
                                    </Label>
                                    <Textarea
                                        id="todo-create-description"
                                        ref={descriptionRef}
                                        value={description}
                                        rows={2}
                                        placeholder="Add a description…"
                                        className="max-h-[120px] min-h-[64px] resize-none overflow-y-auto text-sm"
                                        onChange={(event) => {
                                            setDescription(event.target.value);
                                        }}
                                        onKeyDown={handleDescriptionKeyDown}
                                    />

                                    <p
                                        aria-live="polite"
                                        className={cn(
                                            'text-right text-xs text-muted-foreground',
                                            descriptionLength >= 2000
                                                ? 'text-red-700 dark:text-red-400'
                                                : descriptionLength > 1800
                                                    ? 'text-orange-700 dark:text-orange-300'
                                                    : null,
                                        )}
                                    >
                                        {descriptionLength} / 2000
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-auto justify-start px-0 text-xs font-medium text-muted-foreground"
                                    onClick={() => {
                                        if (isMobile) {
                                            setIsMobileOptionsOpen(true);
                                            return;
                                        }

                                        setShowMoreOptions((currentValue) => !currentValue);
                                    }}
                                >
                                    More options{' '}
                                    {showMoreOptions && !isMobile ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                </Button>

                                {!isMobile && showMoreOptions ? moreOptionsControls : null}

                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <Button
                                        type="button"
                                        className="w-full sm:w-auto"
                                        disabled={isSubmitting}
                                        onClick={() => {
                                            void handleSubmit();
                                        }}
                                    >
                                        Add Task
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full sm:w-auto"
                                        disabled={isSubmitting}
                                        onClick={cancelForm}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                <Dialog
                    open={isMobile && isMobileOptionsOpen}
                    onOpenChange={setIsMobileOptionsOpen}
                >
                    <DialogContent
                        className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none p-0 sm:rounded-none"
                    >
                        <DialogHeader className="border-b border-border px-4 py-3">
                            <DialogTitle>More options</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 px-4 py-4">
                            {moreOptionsControls}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    },
);

TodoCreateInputBase.displayName = 'TodoCreateInput';

const TodoCreateInput = memo(TodoCreateInputBase);

TodoCreateInput.displayName = 'TodoCreateInput';

export default TodoCreateInput;
