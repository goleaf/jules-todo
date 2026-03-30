import { usePage } from '@inertiajs/react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import {
    AlertCircle,
    AlignLeft,
    CalendarDays,
    CalendarPlus,
    Check,
    CheckCircle,
    Copy,
    Flag,
    FolderOpen,
    Loader2,
    MoreHorizontal,
    Trash2,
    X,
    type LucideIcon,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import {
    KEYBOARD_SHORTCUT_EVENTS,
    isTypingInField,
} from '../../hooks/useKeyboardShortcuts';
import { useAnnounce } from '../../hooks/useAnnounce';
import { useAutoSave, type AutoSaveStatus } from '../../hooks/useAutoSave';
import { LISTS_INVALIDATED_EVENT } from '../../hooks/useTodos';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import type { PageProps, PriorityLevel, Todo, TodoList } from '../../types';
import { getTodoDateMeta } from './TodoCard';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Separator } from '../ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '../ui/sheet';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';

type DetailPanelMode = 'desktop' | 'tablet' | 'mobile';

type TodoPageProps = PageProps<{
    lists?: TodoList[];
}>;

type TodoResourceResponse = {
    data: Todo;
};

interface PriorityOption {
    value: PriorityLevel;
    label: string;
    className: string;
    iconClassName?: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
    {
        value: 'none',
        label: 'No Priority',
        className: 'text-slate-500 dark:text-slate-400',
    },
    {
        value: 'low',
        label: 'Low',
        className: 'text-foreground',
        iconClassName: 'text-blue-700 fill-current dark:text-blue-400',
    },
    {
        value: 'medium',
        label: 'Medium',
        className: 'text-foreground',
        iconClassName: 'text-amber-700 fill-current dark:text-amber-400',
    },
    {
        value: 'high',
        label: 'High',
        className: 'text-foreground',
        iconClassName: 'text-red-700 fill-current dark:text-red-400',
    },
];

/**
 * Maps the current viewport width to the detail-panel mode.
 *
 * @param width The current viewport width.
 * @returns The active panel mode.
 */
export function getDetailPanelMode(width: number): DetailPanelMode {
    if (width < 768) {
        return 'mobile';
    }

    if (width < 1024) {
        return 'tablet';
    }

    return 'desktop';
}

/**
 * Formats metadata timestamps for the detail-panel footer rows.
 *
 * @param value The ISO timestamp to format.
 * @returns The formatted metadata label.
 */
export function formatTodoDetailMetadataDate(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const parsedDate = parseISO(value);
    const normalizedDate = new Date(
        parsedDate.getTime() + parsedDate.getTimezoneOffset() * 60_000,
    );

    return format(normalizedDate, "EEEE, MMMM d yyyy 'at' h:mm a");
}

/**
 * Returns the next Monday while preserving the original time component.
 *
 * @param baseDate The starting date.
 * @returns The next Monday date.
 */
export function getNextMondayDate(baseDate: Date = new Date()): Date {
    const nextDate = new Date(baseDate);
    const day = nextDate.getDay();
    const distance = day === 1 ? 7 : (8 - day) % 7;

    nextDate.setDate(nextDate.getDate() + distance);

    return nextDate;
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;

        if (typeof responseData?.message === 'string') {
            return responseData.message;
        }

        const firstValidationError = responseData?.errors
            ? Object.values(responseData.errors)[0]
            : null;

        if (
            Array.isArray(firstValidationError)
            && typeof firstValidationError[0] === 'string'
        ) {
            return firstValidationError[0];
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}

function syncTextareaHeight(element: HTMLTextAreaElement | null) {
    if (!element) {
        return;
    }

    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
}

function dispatchWorkspaceInvalidation() {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new Event(LISTS_INVALIDATED_EVENT));
}

function shouldInvalidateSidebarCounts(patch: Partial<Todo>): boolean {
    return (
        'due_date' in patch
        || 'is_completed' in patch
        || 'is_deleted' in patch
        || 'todo_list_id' in patch
    );
}

function resolveOptimisticTodo(
    previousTodo: Todo,
    patch: Partial<Todo>,
    lists: TodoList[],
): Todo {
    const nextTodo: Todo = {
        ...previousTodo,
        ...patch,
    };

    if ('is_completed' in patch) {
        nextTodo.completed_at = patch.is_completed
            ? new Date().toISOString()
            : null;
    }

    if ('is_deleted' in patch) {
        nextTodo.deleted_at = patch.is_deleted
            ? new Date().toISOString()
            : null;
    }

    if ('todo_list_id' in patch) {
        nextTodo.list =
            patch.todo_list_id === null
                ? undefined
                : lists.find((list) => list.id === patch.todo_list_id);
    }

    return nextTodo;
}

function getPriorityOption(priority: PriorityLevel): PriorityOption {
    return (
        PRIORITY_OPTIONS.find((option) => option.value === priority)
        ?? PRIORITY_OPTIONS[0]
    );
}

function getPanelSaveDescriptor(
    saveStatus: AutoSaveStatus,
    errorMessage: string | null,
): {
    icon: LucideIcon;
    className: string;
    label: string;
    showRetry: boolean;
} | null {
    if (saveStatus === 'saving') {
        return {
            className: 'text-muted-foreground',
            icon: Loader2,
            label: 'Saving…',
            showRetry: false,
        };
    }

    if (saveStatus === 'saved') {
        return {
            className: 'text-emerald-700 dark:text-emerald-400',
            icon: Check,
            label: 'Saved',
            showRetry: false,
        };
    }

    if (saveStatus === 'error') {
        return {
            className: 'text-red-700 dark:text-red-400',
            icon: AlertCircle,
            label: errorMessage ?? 'Save failed',
            showRetry: true,
        };
    }

    return null;
}

function DetailPanelSkeleton() {
    return (
        <div className="space-y-6 px-5 py-5">
            <div className="flex items-start gap-3">
                <Skeleton className="mt-1 h-6 w-6 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-6 w-4/5" />
                    <Skeleton className="ml-auto h-4 w-20" />
                </div>
                <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                </div>
            </div>

            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="ml-auto h-3 w-16" />
            </div>

            <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            <div className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            <div className="space-y-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>
        </div>
    );
}

function useBreakpoint(): DetailPanelMode {
    const [viewportWidth, setViewportWidth] = useState<number>(() =>
        typeof window === 'undefined' ? 1280 : window.innerWidth,
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        function handleResize() {
            setViewportWidth(window.innerWidth);
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return getDetailPanelMode(viewportWidth);
}

/**
 * Right-side or bottom-sheet detail panel for a selected todo.
 *
 * @returns The rendered detail panel.
 */
export default function TodoDetailPanel() {
    const { props } = usePage<TodoPageProps>();
    const { announce } = useAnnounce();
    const lists = props.lists ?? [];
    const panelMode = useBreakpoint();

    const {
        bumpTodosVersion,
        closeDetailPanel,
        openDetailPanel,
        selectedTodoId,
    } = useAppStore(
        useShallow((state) => ({
            bumpTodosVersion: state.bumpTodosVersion,
            closeDetailPanel: state.closeDetailPanel,
            openDetailPanel: state.openDetailPanel,
            selectedTodoId: state.selectedTodoId,
        })),
    );

    const [fetchError, setFetchError] = useState<string | null>(null);
    const [immediateSaveError, setImmediateSaveError] = useState<string | null>(null);
    const [immediateSaveStatus, setImmediateSaveStatus] =
        useState<AutoSaveStatus>('idle');
    const [isDueDateOpen, setIsDueDateOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [localTodo, setLocalTodo] = useState<Todo | null>(null);

    const panelRef = useRef<HTMLDivElement | null>(null);
    const titleRef = useRef<HTMLTextAreaElement | null>(null);
    const notesRef = useRef<HTMLTextAreaElement | null>(null);
    const dueDateTriggerRef = useRef<HTMLButtonElement | null>(null);
    const retryImmediateSaveRef = useRef<(() => Promise<void>) | null>(null);
    const saveStatusTimeoutRef = useRef<number | null>(null);

    const isOpen = selectedTodoId !== null;
    const titleValue = localTodo?.title ?? '';
    const notesValue = localTodo?.description ?? '';
    const titleIsInvalid =
        titleValue.trim().length < 1 || titleValue.trim().length > 255;
    const notesCount = notesValue.length;
    const descriptionCounterClassName =
        notesCount >= 2000
            ? 'text-red-700 dark:text-red-400'
            : notesCount > 1800
                ? 'text-orange-700 dark:text-orange-300'
                : 'text-muted-foreground';
    const dueDateMeta = useMemo(
        () =>
            localTodo
                ? getTodoDateMeta({
                    ...localTodo,
                    deleted_at: null,
                    is_deleted: false,
                })
                : null,
        [localTodo],
    );
    const titleAutoSave = useAutoSave({
        delay: 500,
        enabled: Boolean(localTodo) && !isLoading && !titleIsInvalid,
        field: 'title',
        todoId: localTodo?.id ?? null,
        value: titleValue.trim(),
        onSuccess: (payload) => {
            const nextTodo = (payload as TodoResourceResponse | undefined)?.data;

            if (!nextTodo) {
                return;
            }

            setLocalTodo(nextTodo);
            titleAutoSave.resetSavedBaseline(nextTodo.title);
            notesAutoSave.resetSavedBaseline(nextTodo.description ?? '');
            bumpTodosVersion();
        },
    });
    const notesAutoSave = useAutoSave({
        delay: 500,
        enabled: Boolean(localTodo) && !isLoading && notesCount <= 2000,
        field: 'description',
        todoId: localTodo?.id ?? null,
        value: notesValue,
        onSuccess: (payload) => {
            const nextTodo = (payload as TodoResourceResponse | undefined)?.data;

            if (!nextTodo) {
                return;
            }

            setLocalTodo(nextTodo);
            titleAutoSave.resetSavedBaseline(nextTodo.title);
            notesAutoSave.resetSavedBaseline(nextTodo.description ?? '');
            bumpTodosVersion();
        },
    });

    const combinedSaveStatus: AutoSaveStatus =
        immediateSaveStatus === 'error'
        || titleAutoSave.saveStatus === 'error'
        || notesAutoSave.saveStatus === 'error'
            ? 'error'
            : immediateSaveStatus === 'saving'
                || titleAutoSave.saveStatus === 'saving'
                || notesAutoSave.saveStatus === 'saving'
                ? 'saving'
                : immediateSaveStatus === 'saved'
                    || titleAutoSave.saveStatus === 'saved'
                    || notesAutoSave.saveStatus === 'saved'
                    ? 'saved'
                    : 'idle';
    const saveErrorMessage =
        immediateSaveError
        ?? titleAutoSave.errorMessage
        ?? notesAutoSave.errorMessage;
    const saveDescriptor = getPanelSaveDescriptor(
        combinedSaveStatus,
        saveErrorMessage,
    );
    const createdLabel = formatTodoDetailMetadataDate(localTodo?.created_at ?? null);
    const completedLabel = formatTodoDetailMetadataDate(localTodo?.completed_at ?? null);
    const deletedLabel = formatTodoDetailMetadataDate(localTodo?.deleted_at ?? null);
    const selectedList = localTodo?.list ?? null;
    const priorityOption = getPriorityOption(localTodo?.priority ?? 'none');

    const clearImmediateSaveTimeout = useCallback(() => {
        if (saveStatusTimeoutRef.current !== null) {
            window.clearTimeout(saveStatusTimeoutRef.current);
            saveStatusTimeoutRef.current = null;
        }
    }, []);

    const scheduleImmediateStatusReset = useCallback(() => {
        clearImmediateSaveTimeout();
        saveStatusTimeoutRef.current = window.setTimeout(() => {
            setImmediateSaveStatus((currentStatus) =>
                currentStatus === 'saved' ? 'idle' : currentStatus,
            );
        }, 2000);
    }, [clearImmediateSaveTimeout]);

    const syncAutosaveBaselines = useCallback((nextTodo: Todo) => {
        titleAutoSave.resetSavedBaseline(nextTodo.title);
        notesAutoSave.resetSavedBaseline(nextTodo.description ?? '');
    }, [notesAutoSave, titleAutoSave]);

    const saveTodoImmediately = useCallback(async (
        patch: Partial<Todo>,
        options?: {
            closeOnSuccess?: boolean;
            onSuccess?: (nextTodo: Todo) => void;
        },
    ) => {
        if (!localTodo) {
            return;
        }

        const previousTodo = localTodo;
        const optimisticTodo = resolveOptimisticTodo(previousTodo, patch, lists);

        retryImmediateSaveRef.current = () => saveTodoImmediately(patch, options);
        clearImmediateSaveTimeout();
        setImmediateSaveError(null);
        setImmediateSaveStatus('saving');
        setLocalTodo(optimisticTodo);

        try {
            const response = await axios.patch<TodoResourceResponse>(
                `/api/todos/${previousTodo.id}`,
                patch,
            );
            const nextTodo = response.data.data;

            setLocalTodo(nextTodo);
            syncAutosaveBaselines(nextTodo);
            setImmediateSaveStatus('saved');
            bumpTodosVersion();

            if (shouldInvalidateSidebarCounts(patch)) {
                dispatchWorkspaceInvalidation();
            }

            if (patch.is_completed === true) {
                announce('Task marked as complete');
            } else if (patch.is_completed === false) {
                announce('Task marked as incomplete');
            }

            options?.onSuccess?.(nextTodo);

            if (options?.closeOnSuccess) {
                closeDetailPanel();
            }

            scheduleImmediateStatusReset();
        } catch (error) {
            setLocalTodo(previousTodo);
            setImmediateSaveError(getErrorMessage(error, 'Save failed'));
            setImmediateSaveStatus('error');
            toast.error(getErrorMessage(error, 'Failed to update task.'));
        }
    }, [
        bumpTodosVersion,
        clearImmediateSaveTimeout,
        closeDetailPanel,
        lists,
        localTodo,
        announce,
        scheduleImmediateStatusReset,
        syncAutosaveBaselines,
    ]);

    const handleRetryFailedSave = useCallback(async () => {
        if (immediateSaveStatus === 'error' && retryImmediateSaveRef.current) {
            await retryImmediateSaveRef.current();
            return;
        }

        if (titleAutoSave.saveStatus === 'error') {
            await titleAutoSave.retry();
            return;
        }

        if (notesAutoSave.saveStatus === 'error') {
            await notesAutoSave.retry();
        }
    }, [
        immediateSaveStatus,
        notesAutoSave,
        titleAutoSave,
    ]);

    const handleMoveToTrash = useCallback(async () => {
        if (!localTodo) {
            return;
        }

        const previousTodo = localTodo;

        clearImmediateSaveTimeout();
        setImmediateSaveError(null);
        setImmediateSaveStatus('saving');
        setLocalTodo({
            ...previousTodo,
            deleted_at: new Date().toISOString(),
            is_deleted: true,
        });

        retryImmediateSaveRef.current = handleMoveToTrash;

        try {
            await axios.delete(`/api/todos/${previousTodo.id}`);
            dispatchWorkspaceInvalidation();
            bumpTodosVersion();
            setImmediateSaveStatus('saved');
            announce('Task moved to trash');
            closeDetailPanel();
            scheduleImmediateStatusReset();
        } catch (error) {
            setLocalTodo(previousTodo);
            setImmediateSaveError(getErrorMessage(error, 'Save failed'));
            setImmediateSaveStatus('error');
            toast.error(getErrorMessage(error, 'Failed to move task to Trash.'));
        }
    }, [
        bumpTodosVersion,
        clearImmediateSaveTimeout,
        closeDetailPanel,
        localTodo,
        announce,
        scheduleImmediateStatusReset,
    ]);

    const handleDuplicateTask = useCallback(async () => {
        if (!localTodo) {
            return;
        }

        try {
            const nextTitle =
                localTodo.title.length >= 248
                    ? `${localTodo.title.slice(0, 248)}…`
                    : `${localTodo.title} (Copy)`;
            const response = await axios.post<TodoResourceResponse>('/api/todos', {
                description: localTodo.description,
                due_date: localTodo.due_date,
                priority: localTodo.priority,
                title: nextTitle,
                todo_list_id: localTodo.todo_list_id,
            });

            dispatchWorkspaceInvalidation();
            bumpTodosVersion();
            openDetailPanel(response.data.data.id);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to duplicate task.'));
        }
    }, [bumpTodosVersion, localTodo, openDetailPanel]);

    useEffect(() => {
        return () => {
            clearImmediateSaveTimeout();
        };
    }, [clearImmediateSaveTimeout]);

    useEffect(() => {
        syncTextareaHeight(titleRef.current);
    }, [titleValue]);

    useEffect(() => {
        syncTextareaHeight(notesRef.current);
    }, [notesValue]);

    useEffect(() => {
        if (!selectedTodoId) {
            setLocalTodo(null);
            setFetchError(null);
            setImmediateSaveError(null);
            setImmediateSaveStatus('idle');
            return;
        }

        const controller = new AbortController();

        async function fetchTodo() {
            setIsLoading(true);
            setFetchError(null);

            try {
                const response = await axios.get<TodoResourceResponse>(
                    `/api/todos/${selectedTodoId}`,
                    { signal: controller.signal },
                );

                if (controller.signal.aborted) {
                    return;
                }

                setLocalTodo(response.data.data);
                syncAutosaveBaselines(response.data.data);
                setImmediateSaveStatus('idle');
                setImmediateSaveError(null);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setFetchError(getErrorMessage(error, 'Failed to load task.'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void fetchTodo();

        return () => {
            controller.abort();
        };
    }, [selectedTodoId, syncAutosaveBaselines]);

    useEffect(() => {
        if (!isOpen || !panelRef.current) {
            return;
        }

        panelRef.current.focus();
    }, [isOpen, panelMode]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleSetPriority(event: Event) {
            const detail = (event as CustomEvent<{ priority: PriorityLevel }>).detail;

            if (!detail?.priority) {
                return;
            }

            void saveTodoImmediately({ priority: detail.priority });
        }

        function handleFocusDueDate() {
            dueDateTriggerRef.current?.focus();
            setIsDueDateOpen(true);
        }

        function handleShortcutMoveToTrash() {
            if (panelRef.current?.contains(document.activeElement) ?? false) {
                void handleMoveToTrash();
            }
        }

        function handlePanelKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented) {
                return;
            }

            const activeElement = document.activeElement;

            if (!panelRef.current?.contains(activeElement)) {
                return;
            }

            if (event.key === '1') {
                event.preventDefault();
                void saveTodoImmediately({ priority: 'high' });
                return;
            }

            if (event.key === '2') {
                event.preventDefault();
                void saveTodoImmediately({ priority: 'medium' });
                return;
            }

            if (event.key === '3') {
                event.preventDefault();
                void saveTodoImmediately({ priority: 'low' });
                return;
            }

            if (event.key.toLowerCase() === 'd') {
                event.preventDefault();
                dueDateTriggerRef.current?.focus();
                setIsDueDateOpen(true);
                return;
            }

            if (event.key === 'Backspace' && !isTypingInField(activeElement)) {
                event.preventDefault();
                void handleMoveToTrash();
            }
        }

        window.addEventListener(
            KEYBOARD_SHORTCUT_EVENTS.setPriority,
            handleSetPriority as EventListener,
        );
        window.addEventListener(
            KEYBOARD_SHORTCUT_EVENTS.focusDueDate,
            handleFocusDueDate,
        );
        window.addEventListener(
            KEYBOARD_SHORTCUT_EVENTS.moveToTrash,
            handleShortcutMoveToTrash,
        );
        document.addEventListener('keydown', handlePanelKeyDown);

        return () => {
            window.removeEventListener(
                KEYBOARD_SHORTCUT_EVENTS.setPriority,
                handleSetPriority as EventListener,
            );
            window.removeEventListener(
                KEYBOARD_SHORTCUT_EVENTS.focusDueDate,
                handleFocusDueDate,
            );
            window.removeEventListener(
                KEYBOARD_SHORTCUT_EVENTS.moveToTrash,
                handleShortcutMoveToTrash,
            );
            document.removeEventListener('keydown', handlePanelKeyDown);
        };
    }, [handleMoveToTrash, isOpen, saveTodoImmediately]);

    if (!isOpen) {
        return null;
    }

    return (
        <Sheet
            modal={panelMode !== 'desktop'}
            open={isOpen}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    closeDetailPanel();
                }
            }}
        >
            <SheetContent
                side={panelMode === 'mobile' ? 'bottom' : 'right'}
                showCloseButton={false}
                showOverlay={panelMode !== 'desktop'}
                className={cn(
                    'flex h-full flex-col gap-0 p-0',
                    panelMode !== 'mobile'
                        ? 'data-[state=closed]:animate-[detailPanelSlideOut_200ms_ease-in_both] data-[state=open]:animate-detail-slide-in'
                        : null,
                    panelMode === 'desktop'
                        ? 'w-[var(--detail-panel-width)] max-w-[var(--detail-panel-width)]'
                        : null,
                    panelMode === 'tablet'
                        ? 'w-[320px] max-w-[320px]'
                        : null,
                    panelMode === 'mobile'
                        ? 'h-[95vh] max-h-[95vh] w-full max-w-none rounded-t-3xl'
                        : null,
                )}
            >
                <SheetHeader className="sr-only">
                    <SheetTitle>Task details</SheetTitle>
                    <SheetDescription>
                        Review and edit the selected task.
                    </SheetDescription>
                </SheetHeader>

                <div
                    ref={panelRef}
                    role="complementary"
                    aria-label="Task details"
                    data-detail-panel=""
                    tabIndex={-1}
                    className="flex h-full min-h-0 flex-col bg-background outline-none"
                >
                    <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                checked={Boolean(localTodo?.is_completed)}
                                className="mt-1 h-6 w-6 rounded-full"
                                aria-label={
                                    localTodo?.is_completed
                                        ? `Mark ${localTodo.title} as incomplete`
                                        : `Mark ${localTodo?.title ?? 'task'} as complete`
                                }
                                onCheckedChange={(checked) => {
                                    void saveTodoImmediately({
                                        is_completed: Boolean(checked),
                                    });
                                }}
                            />

                            <div className="min-w-0 flex-1">
                                {isLoading || !localTodo ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-4/5" />
                                        <Skeleton className="ml-auto h-4 w-20" />
                                    </div>
                                ) : (
                                    <>
                                        <Textarea
                                            ref={titleRef}
                                            value={titleValue}
                                            rows={1}
                                            maxLength={255}
                                            placeholder="Task title"
                                            className={cn(
                                                'min-h-0 resize-none overflow-hidden rounded-md border-0 bg-transparent px-2 py-1 text-base font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                                'placeholder:text-muted-foreground',
                                                titleIsInvalid && 'border-red-600 focus-visible:ring-red-600 dark:border-red-400 dark:focus-visible:ring-red-400',
                                            )}
                                            onChange={(event) => {
                                                setLocalTodo((currentTodo) =>
                                                    currentTodo
                                                        ? {
                                                            ...currentTodo,
                                                            title: event.target.value,
                                                        }
                                                        : currentTodo,
                                                );
                                            }}
                                        />

                                        {saveDescriptor ? (
                                            <div className="mt-1 flex justify-end">
                                                <div
                                                    className={cn(
                                                        'flex items-center gap-1.5 text-xs transition-opacity duration-200',
                                                        saveDescriptor.className,
                                                    )}
                                                >
                                                    <saveDescriptor.icon
                                                        className={cn(
                                                            'h-3.5 w-3.5',
                                                            combinedSaveStatus === 'saving'
                                                                ? 'animate-spin'
                                                                : null,
                                                        )}
                                                    />
                                                    <span>{saveDescriptor.label}</span>
                                                    {saveDescriptor.showRetry ? (
                                                        <button
                                                            type="button"
                                                            className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            onClick={() => {
                                                                void handleRetryFailedSave();
                                                            }}
                                                        >
                                                            Retry
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label="More options"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onSelect={() => {
                                                void handleDuplicateTask();
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                            Duplicate task
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                            onSelect={() => {
                                                void handleMoveToTrash();
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            Move to Trash
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Close detail panel"
                                    onClick={closeDetailPanel}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {!isLoading && titleIsInvalid ? (
                            <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                                Title must be between 1 and 255 characters.
                            </p>
                        ) : null}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {isLoading ? (
                            <DetailPanelSkeleton />
                        ) : fetchError ? (
                            <div className="flex h-full min-h-[320px] items-center justify-center px-5 py-10">
                                <div className="space-y-3 text-center">
                                    <AlertCircle className="mx-auto h-6 w-6 text-red-700 dark:text-red-400" />
                                    <p className="text-sm text-muted-foreground">
                                        {fetchError}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={closeDetailPanel}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        ) : localTodo ? (
                            <div className="space-y-6 px-5 py-5">
                                <section className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                        <AlignLeft className="h-3.5 w-3.5" />
                                        <span>Notes</span>
                                    </div>

                                    <Textarea
                                        ref={notesRef}
                                        value={notesValue}
                                        rows={2}
                                        maxLength={2000}
                                        placeholder="Add notes…"
                                        className="max-h-[120px] min-h-[96px] resize-none overflow-y-auto rounded-md border-0 bg-transparent px-2 py-1 shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        onChange={(event) => {
                                            setLocalTodo((currentTodo) =>
                                                currentTodo
                                                    ? {
                                                        ...currentTodo,
                                                        description: event.target.value,
                                                    }
                                                    : currentTodo,
                                            );
                                        }}
                                    />

                                    <p
                                        aria-live="polite"
                                        className={cn(
                                            'text-right text-xs',
                                            descriptionCounterClassName,
                                        )}
                                    >
                                        {notesCount} / 2000
                                    </p>
                                </section>

                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            <span>Due Date</span>
                                        </div>

                                        {localTodo.due_date ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-11 w-11 md:h-6 md:w-6"
                                                aria-label="Clear due date"
                                                onClick={() => {
                                                    void saveTodoImmediately({ due_date: null });
                                                }}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        ) : null}
                                    </div>

                                    <Popover
                                        open={isDueDateOpen}
                                        onOpenChange={setIsDueDateOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <button
                                                ref={dueDateTriggerRef}
                                                type="button"
                                                aria-label="Date picker"
                                                className="flex w-full items-center justify-start gap-2 rounded-md border border-border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                                <span
                                                    className={cn(
                                                        'text-sm',
                                                        dueDateMeta?.className,
                                                        !localTodo.due_date
                                                            && 'italic text-muted-foreground',
                                                    )}
                                                >
                                                    {dueDateMeta?.label ?? 'Add due date'}
                                                </span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-auto p-3">
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        void saveTodoImmediately(
                                                            {
                                                                due_date: format(
                                                                    new Date(),
                                                                    'yyyy-MM-dd',
                                                                ),
                                                            },
                                                            {
                                                                onSuccess: () => {
                                                                    setIsDueDateOpen(false);
                                                                },
                                                            },
                                                        );
                                                    }}
                                                >
                                                    Today
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        const tomorrow = new Date();
                                                        tomorrow.setDate(tomorrow.getDate() + 1);

                                                        void saveTodoImmediately(
                                                            {
                                                                due_date: format(
                                                                    tomorrow,
                                                                    'yyyy-MM-dd',
                                                                ),
                                                            },
                                                            {
                                                                onSuccess: () => {
                                                                    setIsDueDateOpen(false);
                                                                },
                                                            },
                                                        );
                                                    }}
                                                >
                                                    Tomorrow
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        void saveTodoImmediately(
                                                            {
                                                                due_date: format(
                                                                    getNextMondayDate(),
                                                                    'yyyy-MM-dd',
                                                                ),
                                                            },
                                                            {
                                                                onSuccess: () => {
                                                                    setIsDueDateOpen(false);
                                                                },
                                                            },
                                                        );
                                                    }}
                                                >
                                                    Next Week
                                                </Button>
                                            </div>

                                            <Calendar
                                                initialFocus
                                                mode="single"
                                                selected={
                                                    localTodo.due_date
                                                        ? parseISO(localTodo.due_date)
                                                        : undefined
                                                }
                                                fromMonth={new Date(
                                                    new Date().getFullYear() - 1,
                                                    new Date().getMonth(),
                                                    1,
                                                )}
                                                toMonth={new Date(
                                                    new Date().getFullYear() + 2,
                                                    new Date().getMonth(),
                                                    1,
                                                )}
                                                onSelect={(selectedDate) => {
                                                    if (!selectedDate) {
                                                        return;
                                                    }

                                                    void saveTodoImmediately(
                                                        {
                                                            due_date: format(
                                                                selectedDate,
                                                                'yyyy-MM-dd',
                                                            ),
                                                        },
                                                        {
                                                            onSuccess: () => {
                                                                setIsDueDateOpen(false);
                                                            },
                                                        },
                                                    );
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </section>

                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                            <Flag className="h-3.5 w-3.5" />
                                            <span>Priority</span>
                                        </div>

                                        <Select
                                            value={localTodo.priority}
                                            onValueChange={(value) => {
                                                void saveTodoImmediately({
                                                    priority: value as PriorityLevel,
                                                });
                                            }}
                                        >
                                            <SelectTrigger
                                                aria-label="Task priority"
                                                className="h-11 w-[180px] justify-start md:h-10"
                                            >
                                                <SelectValue>
                                                    <span className="flex items-center gap-2">
                                                        <Flag
                                                            className={cn(
                                                                'h-4 w-4',
                                                                priorityOption.className,
                                                                priorityOption.iconClassName,
                                                            )}
                                                        />
                                                        {priorityOption.label}
                                                    </span>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRIORITY_OPTIONS.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Flag
                                                                className={cn(
                                                                    'h-4 w-4',
                                                                    option.className,
                                                                    option.iconClassName,
                                                                )}
                                                            />
                                                            {option.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </section>

                                <section className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                            <FolderOpen className="h-3.5 w-3.5" />
                                            <span>List</span>
                                        </div>

                                        <Select
                                            value={
                                                localTodo.todo_list_id === null
                                                    ? 'none'
                                                    : String(localTodo.todo_list_id)
                                            }
                                            onValueChange={(value) => {
                                                void saveTodoImmediately({
                                                    todo_list_id:
                                                        value === 'none'
                                                            ? null
                                                            : Number(value),
                                                });
                                            }}
                                        >
                                            <SelectTrigger
                                                aria-label="Task list"
                                                className="h-11 w-[180px] justify-start md:h-10"
                                            >
                                                <SelectValue>
                                                    <span className="flex items-center gap-2">
                                                        {selectedList ? (
                                                            <span
                                                                className="h-2.5 w-2.5 rounded-full"
                                                                style={{
                                                                    backgroundColor: selectedList.color,
                                                                }}
                                                            />
                                                        ) : (
                                                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                        {selectedList?.name ?? 'No List'}
                                                    </span>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    <span className="flex items-center gap-2">
                                                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                                        No List
                                                    </span>
                                                </SelectItem>
                                                {lists.map((list) => (
                                                    <SelectItem
                                                        key={list.id}
                                                        value={String(list.id)}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span
                                                                className="h-2.5 w-2.5 rounded-full"
                                                                style={{
                                                                    backgroundColor: list.color,
                                                                }}
                                                            />
                                                            {list.name}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </section>

                                <Separator />

                                <section className="space-y-3">
                                    {createdLabel ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
                                            <span>Created</span>
                                            <span className="ml-auto text-right">
                                                {createdLabel}
                                            </span>
                                        </div>
                                    ) : null}

                                    {completedLabel ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>Completed</span>
                                            <span className="ml-auto text-right">
                                                {completedLabel}
                                            </span>
                                        </div>
                                    ) : null}

                                    {deletedLabel ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                            <span>Deleted</span>
                                            <span className="ml-auto text-right">
                                                {deletedLabel}
                                            </span>
                                        </div>
                                    ) : null}
                                </section>
                            </div>
                        ) : null}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
