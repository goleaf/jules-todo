import { Head } from '@inertiajs/react';
import axios from 'axios';
import { FormEvent, useState } from 'react';

type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'normal' | 'high';
type ReminderType = '10min' | '1h' | '1d';

interface Category {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
}

interface Subtask {
    id: string;
    task_id: string;
    title: string;
    is_completed: boolean;
}

interface Reminder {
    id: string;
    task_id: string;
    reminder_time: string;
    reminder_type: ReminderType;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    category_id: string | null;
    category?: Category | null;
    is_completed: boolean;
    recurring: string[] | null;
    attachments: string[] | null;
    pomodoro_estimate: number | null;
    pomodoro_completed: number;
    estimated_minutes: number | null;
    subtasks: Subtask[];
    reminders: Reminder[];
    created_at?: string;
}

interface TaskFormData {
    title: string;
    description: string;
    due_date: string;
    priority: TaskPriority;
    status: TaskStatus;
    category_id: string;
    is_completed: boolean;
    recurring_text: string;
    attachments_text: string;
    pomodoro_estimate: string;
    pomodoro_completed: string;
    estimated_minutes: string;
}

interface CategoryFormData {
    name: string;
    color: string;
    icon: string;
}

interface ReminderDraft {
    reminder_time: string;
    reminder_type: ReminderType;
}

interface TaskWorkspaceProps {
    tasks: Task[];
    categories: Category[];
}

const statusLabels: Record<TaskStatus, string> = {
    todo: 'To do',
    in_progress: 'In progress',
    done: 'Done',
};

const priorityLabels: Record<TaskPriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
};

const emptyTaskForm: TaskFormData = {
    title: '',
    description: '',
    due_date: '',
    priority: 'normal',
    status: 'todo',
    category_id: '',
    is_completed: false,
    recurring_text: '',
    attachments_text: '',
    pomodoro_estimate: '',
    pomodoro_completed: '0',
    estimated_minutes: '',
};

const emptyCategoryForm: CategoryFormData = {
    name: '',
    color: '#155e75',
    icon: '',
};

const emptyReminderDraft: ReminderDraft = {
    reminder_time: '',
    reminder_type: '1h',
};

function splitListInput(value: string): string[] | null {
    const items = value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

    return items.length > 0 ? items : null;
}

function stringifyListInput(value: string[] | null): string {
    return value?.join(', ') ?? '';
}

function normalizeTaskForm(task: Task): TaskFormData {
    return {
        title: task.title,
        description: task.description ?? '',
        due_date: task.due_date ? task.due_date.slice(0, 10) : '',
        priority: task.priority,
        status: task.status,
        category_id: task.category_id ?? '',
        is_completed: task.is_completed,
        recurring_text: stringifyListInput(task.recurring),
        attachments_text: stringifyListInput(task.attachments),
        pomodoro_estimate: task.pomodoro_estimate?.toString() ?? '',
        pomodoro_completed: task.pomodoro_completed.toString(),
        estimated_minutes: task.estimated_minutes?.toString() ?? '',
    };
}

function normalizeTaskPayload(form: TaskFormData) {
    return {
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
        priority: form.priority,
        status: form.status,
        category_id: form.category_id || null,
        is_completed: form.is_completed,
        recurring: splitListInput(form.recurring_text),
        attachments: splitListInput(form.attachments_text),
        pomodoro_estimate: form.pomodoro_estimate
            ? Number(form.pomodoro_estimate)
            : null,
        pomodoro_completed: Number(form.pomodoro_completed || 0),
        estimated_minutes: form.estimated_minutes
            ? Number(form.estimated_minutes)
            : null,
    };
}

function sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((left, right) => {
        const completedComparison =
            Number(left.is_completed) - Number(right.is_completed);

        if (completedComparison !== 0) {
            return completedComparison;
        }

        if (left.due_date && right.due_date) {
            return left.due_date.localeCompare(right.due_date);
        }

        if (left.due_date) {
            return -1;
        }

        if (right.due_date) {
            return 1;
        }

        return (right.created_at ?? '').localeCompare(left.created_at ?? '');
    });
}

function sortCategories(categories: Category[]): Category[] {
    return [...categories].sort((left, right) =>
        left.name.localeCompare(right.name),
    );
}

function formatFriendlyDate(value: string | null): string {
    if (!value) {
        return 'No due date';
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(value));
}

function formatFriendlyDateTime(value: string): string {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function toLocalDateTimeValue(value: string): string {
    const date = new Date(value);
    const timezoneOffset = date.getTimezoneOffset() * 60_000;
    const localDate = new Date(date.getTime() - timezoneOffset);

    return localDate.toISOString().slice(0, 16);
}

export default function TaskWorkspace({
    tasks: initialTasks,
    categories: initialCategories,
}: TaskWorkspaceProps) {
    const [tasks, setTasks] = useState(() => sortTasks(initialTasks));
    const [categories, setCategories] = useState(() =>
        sortCategories(initialCategories),
    );
    const [taskForm, setTaskForm] = useState<TaskFormData>(emptyTaskForm);
    const [categoryForm, setCategoryForm] =
        useState<CategoryFormData>(emptyCategoryForm);
    const [taskDrafts, setTaskDrafts] = useState<Record<string, TaskFormData>>(
        {},
    );
    const [categoryDrafts, setCategoryDrafts] = useState<
        Record<string, CategoryFormData>
    >({});
    const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>(
        {},
    );
    const [subtaskEditDrafts, setSubtaskEditDrafts] = useState<
        Record<string, string>
    >({});
    const [reminderDrafts, setReminderDrafts] = useState<
        Record<string, ReminderDraft>
    >({});
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [bulkStatus, setBulkStatus] = useState<string>('');
    const [bulkPriority, setBulkPriority] = useState<string>('');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [notice, setNotice] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);

    const tasksByStatus = tasks.reduce<Record<TaskStatus, Task[]>>(
        (carry, task) => {
            carry[task.status].push(task);

            return carry;
        },
        { todo: [], in_progress: [], done: [] },
    );

    const categoryTaskCounts = tasks.reduce<Record<string, number>>(
        (carry, task) => {
            if (task.category_id) {
                carry[task.category_id] = (carry[task.category_id] ?? 0) + 1;
            }

            return carry;
        },
        {},
    );

    const completedTaskCount = tasks.filter((task) => task.is_completed).length;
    const overdueTaskCount = tasks.filter(
        (task) =>
            task.due_date &&
            !task.is_completed &&
            new Date(task.due_date).getTime() < Date.now(),
    ).length;

    function applyTask(nextTask: Task): void {
        setTasks((currentTasks) =>
            sortTasks([
                nextTask,
                ...currentTasks.filter((task) => task.id !== nextTask.id),
            ]),
        );
    }

    function removeTask(taskId: string): void {
        setTasks((currentTasks) =>
            currentTasks.filter((task) => task.id !== taskId),
        );
        setSelectedTaskIds((currentIds) =>
            currentIds.filter((currentId) => currentId !== taskId),
        );
    }

    function applyCategory(nextCategory: Category): void {
        setCategories((currentCategories) =>
            sortCategories([
                nextCategory,
                ...currentCategories.filter(
                    (category) => category.id !== nextCategory.id,
                ),
            ]),
        );
    }

    function showSuccess(text: string): void {
        setNotice({ type: 'success', text });
    }

    function showError(error: unknown): void {
        if (axios.isAxiosError(error)) {
            const message =
                (error.response?.data as { message?: string })?.message ??
                'The request failed.';

            setNotice({ type: 'error', text: message });

            return;
        }

        setNotice({
            type: 'error',
            text: 'An unexpected error interrupted the request.',
        });
    }

    async function createTask(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setBusyKey('task:create');

        try {
            const response = await axios.post<Task>(
                '/api/tasks',
                normalizeTaskPayload(taskForm),
            );

            applyTask(response.data);
            setTaskForm(emptyTaskForm);
            showSuccess('Task created.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function saveTask(taskId: string): Promise<void> {
        const draft = taskDrafts[taskId];

        if (!draft) {
            return;
        }

        setBusyKey(`task:update:${taskId}`);

        try {
            const response = await axios.patch<Task>(
                `/api/tasks/${taskId}`,
                normalizeTaskPayload(draft),
            );

            applyTask(response.data);
            setEditingTaskId(null);
            setTaskDrafts((currentDrafts) => {
                const nextDrafts = { ...currentDrafts };
                delete nextDrafts[taskId];

                return nextDrafts;
            });
            showSuccess('Task updated.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function toggleTaskCompletion(task: Task): Promise<void> {
        setBusyKey(`task:toggle:${task.id}`);

        try {
            const response = await axios.patch<Task>(`/api/tasks/${task.id}`, {
                is_completed: !task.is_completed,
                status: task.is_completed ? 'todo' : 'done',
            });

            applyTask(response.data);
            showSuccess('Task progress updated.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function deleteTask(taskId: string): Promise<void> {
        setBusyKey(`task:delete:${taskId}`);

        try {
            await axios.delete(`/api/tasks/${taskId}`);
            removeTask(taskId);
            showSuccess('Task deleted.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function createCategory(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setBusyKey('category:create');

        try {
            const response = await axios.post<Category>('/api/categories', {
                name: categoryForm.name.trim(),
                color: categoryForm.color || null,
                icon: categoryForm.icon.trim() || null,
            });

            applyCategory(response.data);
            setCategoryForm(emptyCategoryForm);
            showSuccess('Category created.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function saveCategory(categoryId: string): Promise<void> {
        const draft = categoryDrafts[categoryId];

        if (!draft) {
            return;
        }

        setBusyKey(`category:update:${categoryId}`);

        try {
            const response = await axios.patch<Category>(
                `/api/categories/${categoryId}`,
                {
                    name: draft.name.trim(),
                    color: draft.color || null,
                    icon: draft.icon.trim() || null,
                },
            );

            applyCategory(response.data);
            setTasks((currentTasks) =>
                currentTasks.map((task) =>
                    task.category_id === categoryId
                        ? { ...task, category: response.data }
                        : task,
                ),
            );
            showSuccess('Category updated.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function deleteCategory(categoryId: string): Promise<void> {
        setBusyKey(`category:delete:${categoryId}`);

        try {
            await axios.delete(`/api/categories/${categoryId}`);

            setCategories((currentCategories) =>
                currentCategories.filter(
                    (category) => category.id !== categoryId,
                ),
            );
            setTasks((currentTasks) =>
                currentTasks.map((task) =>
                    task.category_id === categoryId
                        ? { ...task, category_id: null, category: null }
                        : task,
                ),
            );
            showSuccess('Category deleted.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function createSubtask(taskId: string): Promise<void> {
        const title = subtaskDrafts[taskId]?.trim();

        if (!title) {
            return;
        }

        setBusyKey(`subtask:create:${taskId}`);

        try {
            const response = await axios.post<Task>(
                `/api/tasks/${taskId}/subtasks`,
                {
                    title,
                    is_completed: false,
                },
            );

            applyTask(response.data);
            setSubtaskDrafts((currentDrafts) => ({
                ...currentDrafts,
                [taskId]: '',
            }));
            showSuccess('Subtask added.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function toggleSubtask(subtaskId: string): Promise<void> {
        setBusyKey(`subtask:toggle:${subtaskId}`);

        try {
            const response = await axios.patch<Task>(
                `/api/subtasks/${subtaskId}/toggle`,
            );

            applyTask(response.data);
            showSuccess('Subtask updated.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function saveSubtask(
        subtaskId: string,
        title: string,
    ): Promise<void> {
        if (!title.trim()) {
            return;
        }

        setBusyKey(`subtask:update:${subtaskId}`);

        try {
            const response = await axios.patch<Task>(`/api/subtasks/${subtaskId}`, {
                title,
            });

            applyTask(response.data);
            setSubtaskEditDrafts((currentDrafts) => {
                const nextDrafts = { ...currentDrafts };
                delete nextDrafts[subtaskId];

                return nextDrafts;
            });
            showSuccess('Subtask renamed.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function deleteSubtask(subtaskId: string): Promise<void> {
        setBusyKey(`subtask:delete:${subtaskId}`);

        try {
            const response = await axios.delete<Task>(`/api/subtasks/${subtaskId}`);

            applyTask(response.data);
            showSuccess('Subtask deleted.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function createReminder(taskId: string): Promise<void> {
        const draft = reminderDrafts[taskId] ?? emptyReminderDraft;

        if (!draft.reminder_time) {
            return;
        }

        setBusyKey(`reminder:create:${taskId}`);

        try {
            const response = await axios.post<Reminder>('/api/reminders', {
                task_id: taskId,
                reminder_time: new Date(draft.reminder_time).toISOString(),
                reminder_type: draft.reminder_type,
            });

            setTasks((currentTasks) =>
                sortTasks(
                    currentTasks.map((task) =>
                        task.id === taskId
                            ? {
                                  ...task,
                                  reminders: [...task.reminders, response.data].sort(
                                      (left, right) =>
                                          left.reminder_time.localeCompare(
                                              right.reminder_time,
                                          ),
                                  ),
                              }
                            : task,
                    ),
                ),
            );
            setReminderDrafts((currentDrafts) => ({
                ...currentDrafts,
                [taskId]: emptyReminderDraft,
            }));
            showSuccess('Reminder scheduled.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function deleteReminder(
        taskId: string,
        reminderId: string,
    ): Promise<void> {
        setBusyKey(`reminder:delete:${reminderId}`);

        try {
            await axios.delete(`/api/reminders/${reminderId}`);
            setTasks((currentTasks) =>
                sortTasks(
                    currentTasks.map((task) =>
                        task.id === taskId
                            ? {
                                  ...task,
                                  reminders: task.reminders.filter(
                                      (reminder) => reminder.id !== reminderId,
                                  ),
                              }
                            : task,
                    ),
                ),
            );
            showSuccess('Reminder removed.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    async function applyBulkChanges(): Promise<void> {
        if (selectedTaskIds.length === 0) {
            return;
        }

        const changes: Partial<Pick<Task, 'status' | 'priority'>> = {};

        if (bulkStatus) {
            changes.status = bulkStatus as TaskStatus;
        }

        if (bulkPriority) {
            changes.priority = bulkPriority as TaskPriority;
        }

        if (Object.keys(changes).length === 0) {
            return;
        }

        setBusyKey('bulk:update');

        try {
            const response = await axios.patch<Task[]>('/api/tasks/bulk', {
                updates: selectedTaskIds.map((taskId) => ({
                    id: taskId,
                    changes,
                })),
            });

            const updatedTasks = response.data;

            setTasks((currentTasks) => {
                const updateMap = new Map(
                    updatedTasks.map((task) => [task.id, task]),
                );

                return sortTasks(
                    currentTasks.map(
                        (task) => updateMap.get(task.id) ?? task,
                    ),
                );
            });
            setSelectedTaskIds([]);
            setBulkStatus('');
            setBulkPriority('');
            showSuccess('Bulk update applied.');
        } catch (error) {
            showError(error);
        } finally {
            setBusyKey(null);
        }
    }

    return (
        <>
            <Head title="Task Workspace" />

            <div className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#f4f7f5_52%,#ecfeff_100%)] text-slate-900">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.65)] backdrop-blur">
                        <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.9fr_1fr] lg:px-8">
                            <div>
                                <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-700">
                                    Public Workspace
                                </p>
                                <h1 className="mt-3 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl">
                                    Task Workspace
                                </h1>
                                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                                    Everything lives on the public home route
                                    now: task planning, categories, subtasks,
                                    reminders, bulk updates, and CSV export.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <a
                                        href="/api/export/tasks"
                                        className="rounded-full bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800"
                                    >
                                        Export CSV
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => window.location.assign('/')}
                                        className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                        Refresh page
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                                <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                                    <p className="text-sm text-white/70">
                                        Total tasks
                                    </p>
                                    <p className="mt-3 text-3xl font-semibold">
                                        {tasks.length}
                                    </p>
                                </div>
                                <div className="rounded-3xl bg-emerald-100 px-5 py-4 text-emerald-950">
                                    <p className="text-sm text-emerald-800">
                                        Completed
                                    </p>
                                    <p className="mt-3 text-3xl font-semibold">
                                        {completedTaskCount}
                                    </p>
                                </div>
                                <div className="rounded-3xl bg-amber-100 px-5 py-4 text-amber-950">
                                    <p className="text-sm text-amber-800">
                                        Overdue
                                    </p>
                                    <p className="mt-3 text-3xl font-semibold">
                                        {overdueTaskCount}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {notice ? (
                        <div
                            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                                notice.type === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}
                        >
                            {notice.text}
                        </div>
                    ) : null}

                    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-6">
                            <form
                                onSubmit={createTask}
                                className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-950">
                                            New task
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            Add work directly from the home
                                            screen.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <input
                                        value={taskForm.title}
                                        onChange={(event) =>
                                            setTaskForm((currentForm) => ({
                                                ...currentForm,
                                                title: event.target.value,
                                            }))
                                        }
                                        placeholder="Task title"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        required
                                    />
                                    <textarea
                                        value={taskForm.description}
                                        onChange={(event) =>
                                            setTaskForm((currentForm) => ({
                                                ...currentForm,
                                                description: event.target.value,
                                            }))
                                        }
                                        placeholder="Description"
                                        rows={3}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                    />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <select
                                            value={taskForm.status}
                                            onChange={(event) =>
                                                setTaskForm((currentForm) => ({
                                                    ...currentForm,
                                                    status: event.target
                                                        .value as TaskStatus,
                                                }))
                                            }
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        >
                                            {Object.entries(statusLabels).map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <select
                                            value={taskForm.priority}
                                            onChange={(event) =>
                                                setTaskForm((currentForm) => ({
                                                    ...currentForm,
                                                    priority: event.target
                                                        .value as TaskPriority,
                                                }))
                                            }
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        >
                                            {Object.entries(priorityLabels).map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <input
                                            type="date"
                                            value={taskForm.due_date}
                                            onChange={(event) =>
                                                setTaskForm((currentForm) => ({
                                                    ...currentForm,
                                                    due_date:
                                                        event.target.value,
                                                }))
                                            }
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        />
                                        <select
                                            value={taskForm.category_id}
                                            onChange={(event) =>
                                                setTaskForm((currentForm) => ({
                                                    ...currentForm,
                                                    category_id:
                                                        event.target.value,
                                                }))
                                            }
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        >
                                            <option value="">
                                                Inbox / no category
                                            </option>
                                            {categories.map((category) => (
                                                <option
                                                    key={category.id}
                                                    value={category.id}
                                                >
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <input
                                            value={taskForm.estimated_minutes}
                                            onChange={(event) =>
                                                setTaskForm((currentForm) => ({
                                                    ...currentForm,
                                                    estimated_minutes:
                                                        event.target.value,
                                                }))
                                            }
                                            type="number"
                                            min="0"
                                            placeholder="Minutes"
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        />
                                        <input
                                            value={taskForm.pomodoro_estimate}
                                            onChange={(event) =>
                                                setTaskForm((currentForm) => ({
                                                    ...currentForm,
                                                    pomodoro_estimate:
                                                        event.target.value,
                                                }))
                                            }
                                            type="number"
                                            min="0"
                                            placeholder="Pomodoros"
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        />
                                    </div>
                                    <textarea
                                        value={taskForm.recurring_text}
                                        onChange={(event) =>
                                            setTaskForm((currentForm) => ({
                                                ...currentForm,
                                                recurring_text:
                                                    event.target.value,
                                            }))
                                        }
                                        rows={2}
                                        placeholder="Recurring notes or pattern, comma separated"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                    />
                                    <textarea
                                        value={taskForm.attachments_text}
                                        onChange={(event) =>
                                            setTaskForm((currentForm) => ({
                                                ...currentForm,
                                                attachments_text:
                                                    event.target.value,
                                            }))
                                        }
                                        rows={2}
                                        placeholder="Attachment URLs, comma or newline separated"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={busyKey === 'task:create'}
                                    className="mt-5 w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                >
                                    {busyKey === 'task:create'
                                        ? 'Creating task...'
                                        : 'Create task'}
                                </button>
                            </form>

                            <form
                                onSubmit={createCategory}
                                className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <h2 className="text-lg font-semibold text-slate-950">
                                    Categories
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Create, rename, recolor, and remove groups.
                                </p>

                                <div className="mt-5 space-y-3">
                                    <input
                                        value={categoryForm.name}
                                        onChange={(event) =>
                                            setCategoryForm((currentForm) => ({
                                                ...currentForm,
                                                name: event.target.value,
                                            }))
                                        }
                                        placeholder="Category name"
                                        required
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                    />
                                    <div className="grid gap-3 sm:grid-cols-[90px_minmax(0,1fr)]">
                                        <input
                                            type="color"
                                            value={categoryForm.color}
                                            onChange={(event) =>
                                                setCategoryForm((currentForm) => ({
                                                    ...currentForm,
                                                    color: event.target.value,
                                                }))
                                            }
                                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-2 py-2"
                                        />
                                        <input
                                            value={categoryForm.icon}
                                            onChange={(event) =>
                                                setCategoryForm((currentForm) => ({
                                                    ...currentForm,
                                                    icon: event.target.value,
                                                }))
                                            }
                                            placeholder="Icon label"
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={busyKey === 'category:create'}
                                    className="mt-5 w-full rounded-full border border-slate-950 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                                >
                                    {busyKey === 'category:create'
                                        ? 'Creating category...'
                                        : 'Create category'}
                                </button>

                                <div className="mt-5 space-y-3">
                                    {categories.length === 0 ? (
                                        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                                            No categories yet. Tasks can still
                                            live in Inbox.
                                        </p>
                                    ) : null}

                                    {categories.map((category) => {
                                        const draft =
                                            categoryDrafts[category.id] ?? {
                                                name: category.name,
                                                color:
                                                    category.color ??
                                                    '#155e75',
                                                icon: category.icon ?? '',
                                            };

                                        return (
                                            <div
                                                key={category.id}
                                                className="rounded-2xl border border-slate-200 px-4 py-4"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
                                                        {categoryTaskCounts[
                                                            category.id
                                                        ] ?? 0}{' '}
                                                        tasks
                                                    </span>
                                                    <span
                                                        className="inline-flex h-3 w-3 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                draft.color ||
                                                                '#64748b',
                                                        }}
                                                    />
                                                </div>
                                                <div className="mt-3 space-y-3">
                                                    <input
                                                        value={draft.name}
                                                        onChange={(event) =>
                                                            setCategoryDrafts(
                                                                (
                                                                    currentDrafts,
                                                                ) => ({
                                                                    ...currentDrafts,
                                                                    [category.id]:
                                                                        {
                                                                            ...draft,
                                                                            name: event
                                                                                .target
                                                                                .value,
                                                                        },
                                                                }),
                                                            )
                                                        }
                                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                    />
                                                    <div className="grid gap-3 sm:grid-cols-[80px_minmax(0,1fr)]">
                                                        <input
                                                            type="color"
                                                            value={draft.color}
                                                            onChange={(event) =>
                                                                setCategoryDrafts(
                                                                    (
                                                                        currentDrafts,
                                                                    ) => ({
                                                                        ...currentDrafts,
                                                                        [category.id]:
                                                                            {
                                                                                ...draft,
                                                                                color: event
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                    }),
                                                                )
                                                            }
                                                            className="h-11 rounded-2xl border border-slate-200 bg-white px-2 py-2"
                                                        />
                                                        <input
                                                            value={draft.icon}
                                                            onChange={(event) =>
                                                                setCategoryDrafts(
                                                                    (
                                                                        currentDrafts,
                                                                    ) => ({
                                                                        ...currentDrafts,
                                                                        [category.id]:
                                                                            {
                                                                                ...draft,
                                                                                icon: event
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                    }),
                                                                )
                                                            }
                                                            placeholder="Icon label"
                                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                saveCategory(
                                                                    category.id,
                                                                )
                                                            }
                                                            disabled={
                                                                busyKey ===
                                                                `category:update:${category.id}`
                                                            }
                                                            className="flex-1 rounded-full bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-cyan-400"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteCategory(
                                                                    category.id,
                                                                )
                                                            }
                                                            disabled={
                                                                busyKey ===
                                                                `category:delete:${category.id}`
                                                            }
                                                            className="rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </form>
                        </div>

                        <div className="space-y-6">
                            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-950">
                                            Bulk actions
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            Apply the same status or priority to
                                            the selected tasks.
                                        </p>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <select
                                            value={bulkStatus}
                                            onChange={(event) =>
                                                setBulkStatus(event.target.value)
                                            }
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        >
                                            <option value="">
                                                Keep status
                                            </option>
                                            {Object.entries(statusLabels).map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <select
                                            value={bulkPriority}
                                            onChange={(event) =>
                                                setBulkPriority(
                                                    event.target.value,
                                                )
                                            }
                                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                        >
                                            <option value="">
                                                Keep priority
                                            </option>
                                            {Object.entries(priorityLabels).map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={applyBulkChanges}
                                            disabled={
                                                busyKey === 'bulk:update' ||
                                                selectedTaskIds.length === 0
                                            }
                                            className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                        >
                                            Apply to {selectedTaskIds.length}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            <section className="grid gap-4 xl:grid-cols-3">
                                {(Object.keys(tasksByStatus) as TaskStatus[]).map(
                                    (status) => (
                                        <div
                                            key={status}
                                            className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                                <div>
                                                    <h2 className="text-lg font-semibold text-slate-950">
                                                        {statusLabels[status]}
                                                    </h2>
                                                    <p className="text-sm text-slate-500">
                                                        {tasksByStatus[status]
                                                            .length}{' '}
                                                        tasks
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 space-y-4">
                                                {tasksByStatus[status].length ===
                                                0 ? (
                                                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                                                        No tasks in this lane.
                                                    </div>
                                                ) : null}

                                                {tasksByStatus[status].map(
                                                    (task) => {
                                                        const isEditing =
                                                            editingTaskId ===
                                                            task.id;
                                                        const draft =
                                                            taskDrafts[
                                                                task.id
                                                            ] ??
                                                            normalizeTaskForm(
                                                                task,
                                                            );
                                                        const reminderDraft =
                                                            reminderDrafts[
                                                                task.id
                                                            ] ??
                                                            emptyReminderDraft;
                                                        const completedSubtasks =
                                                            task.subtasks.filter(
                                                                (subtask) =>
                                                                    subtask.is_completed,
                                                            ).length;

                                                        return (
                                                            <article
                                                                key={task.id}
                                                                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4"
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <label className="mt-1 inline-flex items-center gap-3">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedTaskIds.includes(
                                                                                task.id,
                                                                            )}
                                                                            onChange={() =>
                                                                                setSelectedTaskIds(
                                                                                    (
                                                                                        currentIds,
                                                                                    ) =>
                                                                                        currentIds.includes(
                                                                                            task.id,
                                                                                        )
                                                                                            ? currentIds.filter(
                                                                                                  (
                                                                                                      currentId,
                                                                                                  ) =>
                                                                                                      currentId !==
                                                                                                      task.id,
                                                                                              )
                                                                                            : [
                                                                                                  ...currentIds,
                                                                                                  task.id,
                                                                                              ],
                                                                                )
                                                                            }
                                                                            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                                                                        />
                                                                        <div>
                                                                            <h3 className="text-base font-semibold text-slate-950">
                                                                                {
                                                                                    task.title
                                                                                }
                                                                            </h3>
                                                                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                                                                {priorityLabels[
                                                                                    task.priority
                                                                                ]}{' '}
                                                                                priority
                                                                            </p>
                                                                        </div>
                                                                    </label>

                                                                    <div className="flex flex-wrap justify-end gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                toggleTaskCompletion(
                                                                                    task,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                busyKey ===
                                                                                `task:toggle:${task.id}`
                                                                            }
                                                                            className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-emerald-300"
                                                                        >
                                                                            {task.is_completed
                                                                                ? 'Mark open'
                                                                                : 'Mark done'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditingTaskId(
                                                                                    isEditing
                                                                                        ? null
                                                                                        : task.id,
                                                                                );
                                                                                setTaskDrafts(
                                                                                    (
                                                                                        currentDrafts,
                                                                                    ) => ({
                                                                                        ...currentDrafts,
                                                                                        [task.id]:
                                                                                            currentDrafts[
                                                                                                task.id
                                                                                            ] ??
                                                                                            normalizeTaskForm(
                                                                                                task,
                                                                                            ),
                                                                                    }),
                                                                                );
                                                                            }}
                                                                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white"
                                                                        >
                                                                            {isEditing
                                                                                ? 'Close'
                                                                                : 'Edit'}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                deleteTask(
                                                                                    task.id,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                busyKey ===
                                                                                `task:delete:${task.id}`
                                                                            }
                                                                            className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                                                                    <span className="rounded-full bg-white px-3 py-1.5">
                                                                        {formatFriendlyDate(
                                                                            task.due_date,
                                                                        )}
                                                                    </span>
                                                                    <span className="rounded-full bg-white px-3 py-1.5">
                                                                        {
                                                                            statusLabels[
                                                                                task.status
                                                                            ]
                                                                        }
                                                                    </span>
                                                                    <span className="rounded-full bg-white px-3 py-1.5">
                                                                        {task.category
                                                                            ?.name ??
                                                                            'Inbox'}
                                                                    </span>
                                                                    <span className="rounded-full bg-white px-3 py-1.5">
                                                                        {
                                                                            completedSubtasks
                                                                        }
                                                                        /
                                                                        {
                                                                            task.subtasks
                                                                                .length
                                                                        }{' '}
                                                                        subtasks
                                                                    </span>
                                                                    <span className="rounded-full bg-white px-3 py-1.5">
                                                                        {
                                                                            task.pomodoro_completed
                                                                        }
                                                                        /
                                                                        {task.pomodoro_estimate ??
                                                                            0}{' '}
                                                                        pomodoros
                                                                    </span>
                                                                </div>

                                                                {task.description ? (
                                                                    <p className="mt-4 text-sm leading-6 text-slate-600">
                                                                        {
                                                                            task.description
                                                                        }
                                                                    </p>
                                                                ) : null}

                                                                {isEditing ? (
                                                                    <div className="mt-5 space-y-4 rounded-[1.25rem] bg-white p-4">
                                                                        <input
                                                                            value={
                                                                                draft.title
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                setTaskDrafts(
                                                                                    (
                                                                                        currentDrafts,
                                                                                    ) => ({
                                                                                        ...currentDrafts,
                                                                                        [task.id]:
                                                                                            {
                                                                                                ...draft,
                                                                                                title: event
                                                                                                    .target
                                                                                                    .value,
                                                                                            },
                                                                                    }),
                                                                                )
                                                                            }
                                                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                        />
                                                                        <textarea
                                                                            value={
                                                                                draft.description
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                setTaskDrafts(
                                                                                    (
                                                                                        currentDrafts,
                                                                                    ) => ({
                                                                                        ...currentDrafts,
                                                                                        [task.id]:
                                                                                            {
                                                                                                ...draft,
                                                                                                description:
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                            },
                                                                                    }),
                                                                                )
                                                                            }
                                                                            rows={3}
                                                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                        />
                                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                                            <select
                                                                                value={
                                                                                    draft.status
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setTaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...draft,
                                                                                                    status: event
                                                                                                        .target
                                                                                                        .value as TaskStatus,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            >
                                                                                {Object.entries(
                                                                                    statusLabels,
                                                                                ).map(
                                                                                    ([
                                                                                        value,
                                                                                        label,
                                                                                    ]) => (
                                                                                        <option
                                                                                            key={
                                                                                                value
                                                                                            }
                                                                                            value={
                                                                                                value
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                label
                                                                                            }
                                                                                        </option>
                                                                                    ),
                                                                                )}
                                                                            </select>
                                                                            <select
                                                                                value={
                                                                                    draft.priority
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setTaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...draft,
                                                                                                    priority: event
                                                                                                        .target
                                                                                                        .value as TaskPriority,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            >
                                                                                {Object.entries(
                                                                                    priorityLabels,
                                                                                ).map(
                                                                                    ([
                                                                                        value,
                                                                                        label,
                                                                                    ]) => (
                                                                                        <option
                                                                                            key={
                                                                                                value
                                                                                            }
                                                                                            value={
                                                                                                value
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                label
                                                                                            }
                                                                                        </option>
                                                                                    ),
                                                                                )}
                                                                            </select>
                                                                        </div>
                                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                                            <input
                                                                                type="date"
                                                                                value={
                                                                                    draft.due_date
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setTaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...draft,
                                                                                                    due_date:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            />
                                                                            <select
                                                                                value={
                                                                                    draft.category_id
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setTaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...draft,
                                                                                                    category_id:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            >
                                                                                <option value="">
                                                                                    Inbox / no
                                                                                    category
                                                                                </option>
                                                                                {categories.map(
                                                                                    (
                                                                                        category,
                                                                                    ) => (
                                                                                        <option
                                                                                            key={
                                                                                                category.id
                                                                                            }
                                                                                            value={
                                                                                                category.id
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                category.name
                                                                                            }
                                                                                        </option>
                                                                                    ),
                                                                                )}
                                                                            </select>
                                                                        </div>
                                                                        <div className="grid gap-3 sm:grid-cols-3">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                value={
                                                                                    draft.estimated_minutes
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setTaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...draft,
                                                                                                    estimated_minutes:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                placeholder="Minutes"
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                value={
                                                                                    draft.pomodoro_estimate
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setTaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...draft,
                                                                                                    pomodoro_estimate:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                placeholder="Estimate"
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                value={
                                                                                    draft.pomodoro_completed
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setTaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...draft,
                                                                                                    pomodoro_completed:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                placeholder="Completed"
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            />
                                                                        </div>
                                                                        <textarea
                                                                            value={
                                                                                draft.recurring_text
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                setTaskDrafts(
                                                                                    (
                                                                                        currentDrafts,
                                                                                    ) => ({
                                                                                        ...currentDrafts,
                                                                                        [task.id]:
                                                                                            {
                                                                                                ...draft,
                                                                                                recurring_text:
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                            },
                                                                                    }),
                                                                                )
                                                                            }
                                                                            rows={2}
                                                                            placeholder="Recurring notes"
                                                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                        />
                                                                        <textarea
                                                                            value={
                                                                                draft.attachments_text
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                setTaskDrafts(
                                                                                    (
                                                                                        currentDrafts,
                                                                                    ) => ({
                                                                                        ...currentDrafts,
                                                                                        [task.id]:
                                                                                            {
                                                                                                ...draft,
                                                                                                attachments_text:
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                            },
                                                                                    }),
                                                                                )
                                                                            }
                                                                            rows={2}
                                                                            placeholder="Attachment URLs"
                                                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                saveTask(
                                                                                    task.id,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                busyKey ===
                                                                                `task:update:${task.id}`
                                                                            }
                                                                            className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                                                        >
                                                                            Save
                                                                            task
                                                                        </button>
                                                                    </div>
                                                                ) : null}

                                                                <div className="mt-5 space-y-4 rounded-[1.25rem] bg-white p-4">
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-slate-900">
                                                                            Subtasks
                                                                        </h4>
                                                                        <div className="mt-3 space-y-2">
                                                                            {task.subtasks.length ===
                                                                            0 ? (
                                                                                <p className="text-sm text-slate-500">
                                                                                    No subtasks
                                                                                    yet.
                                                                                </p>
                                                                            ) : null}
                                                                            {task.subtasks.map(
                                                                                (
                                                                                    subtask,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            subtask.id
                                                                                        }
                                                                                        className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                                                                                    >
                                                                                        <div className="flex flex-1 items-center gap-3">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() =>
                                                                                                    toggleSubtask(
                                                                                                        subtask.id,
                                                                                                    )
                                                                                                }
                                                                                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                                                                                    subtask.is_completed
                                                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                                                        : 'border-slate-200 text-slate-500'
                                                                                                }`}
                                                                                            >
                                                                                                {subtask.is_completed
                                                                                                    ? 'Done'
                                                                                                    : 'Open'}
                                                                                            </button>
                                                                                            <input
                                                                                                value={
                                                                                                    subtaskEditDrafts[
                                                                                                        subtask.id
                                                                                                    ] ??
                                                                                                    subtask.title
                                                                                                }
                                                                                                onChange={(
                                                                                                    event,
                                                                                                ) =>
                                                                                                    setSubtaskEditDrafts(
                                                                                                        (
                                                                                                            currentDrafts,
                                                                                                        ) => ({
                                                                                                            ...currentDrafts,
                                                                                                            [subtask.id]:
                                                                                                                event
                                                                                                                    .target
                                                                                                                    .value,
                                                                                                        }),
                                                                                                    )
                                                                                                }
                                                                                                className={`flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-cyan-600 ${
                                                                                                    subtask.is_completed
                                                                                                        ? 'text-slate-400 line-through'
                                                                                                        : 'text-slate-700'
                                                                                                }`}
                                                                                            />
                                                                                        </div>
                                                                                        <div className="flex gap-2">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() =>
                                                                                                    saveSubtask(
                                                                                                        subtask.id,
                                                                                                        (
                                                                                                            subtaskEditDrafts[
                                                                                                                subtask.id
                                                                                                            ] ??
                                                                                                            subtask.title
                                                                                                        ).trim(),
                                                                                                    )
                                                                                                }
                                                                                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white"
                                                                                            >
                                                                                                Save
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() =>
                                                                                                    deleteSubtask(
                                                                                                        subtask.id,
                                                                                                    )
                                                                                                }
                                                                                                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                                                                            >
                                                                                                Delete
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-3 flex gap-2">
                                                                            <input
                                                                                value={
                                                                                    subtaskDrafts[
                                                                                        task.id
                                                                                    ] ??
                                                                                    ''
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setSubtaskDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                event
                                                                                                    .target
                                                                                                    .value,
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                placeholder="Add subtask"
                                                                                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    createSubtask(
                                                                                        task.id,
                                                                                    )
                                                                                }
                                                                                className="rounded-full bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800"
                                                                            >
                                                                                Add
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-slate-900">
                                                                            Reminders
                                                                        </h4>
                                                                        <div className="mt-3 space-y-2">
                                                                            {task.reminders.length ===
                                                                            0 ? (
                                                                                <p className="text-sm text-slate-500">
                                                                                    No reminders
                                                                                    yet.
                                                                                </p>
                                                                            ) : null}
                                                                            {task.reminders.map(
                                                                                (
                                                                                    reminder,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            reminder.id
                                                                                        }
                                                                                        className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                                                                                    >
                                                                                        <div className="text-sm text-slate-700">
                                                                                            <p className="font-medium">
                                                                                                {
                                                                                                    reminder.reminder_type
                                                                                                }{' '}
                                                                                                before
                                                                                            </p>
                                                                                            <p className="text-slate-500">
                                                                                                {formatFriendlyDateTime(
                                                                                                    reminder.reminder_time,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                deleteReminder(
                                                                                                    task.id,
                                                                                                    reminder.id,
                                                                                                )
                                                                                            }
                                                                                            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                                                                        >
                                                                                            Delete
                                                                                        </button>
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                                                                            <input
                                                                                type="datetime-local"
                                                                                value={
                                                                                    reminderDraft.reminder_time
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setReminderDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...reminderDraft,
                                                                                                    reminder_time:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            />
                                                                            <select
                                                                                value={
                                                                                    reminderDraft.reminder_type
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    setReminderDrafts(
                                                                                        (
                                                                                            currentDrafts,
                                                                                        ) => ({
                                                                                            ...currentDrafts,
                                                                                            [task.id]:
                                                                                                {
                                                                                                    ...reminderDraft,
                                                                                                    reminder_type:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value as ReminderType,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-600"
                                                                            >
                                                                                <option value="10min">
                                                                                    10 min
                                                                                </option>
                                                                                <option value="1h">
                                                                                    1 hour
                                                                                </option>
                                                                                <option value="1d">
                                                                                    1 day
                                                                                </option>
                                                                            </select>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    createReminder(
                                                                                        task.id,
                                                                                    )
                                                                                }
                                                                                className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                                                            >
                                                                                Add
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </article>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </section>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
