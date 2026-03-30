import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    Check,
    Download,
    Moon,
    Monitor,
    Sun,
    Upload,
} from 'lucide-react';
import {
    type ChangeEvent,
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

import AppLayout from '../../Components/layout/AppLayout';
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
} from '../../Components/ui/alert-dialog';
import { Button } from '../../Components/ui/button';
import { Label } from '../../Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../Components/ui/select';
import { Separator } from '../../Components/ui/separator';
import { Toggle } from '../../Components/ui/toggle';
import { showImportSuccessToast } from '../../lib/notifications';
import { useAnnounce } from '../../hooks/useAnnounce';
import {
    ACCENT_COLOR_OPTIONS,
    ACCENT_COLOR_STORAGE_KEY,
    AUTO_COLLAPSE_COMPLETED_STORAGE_KEY,
    COMPLETE_TO_BOTTOM_STORAGE_KEY,
    CONFIRM_DELETE_STORAGE_KEY,
    DEFAULT_FILTER_STORAGE_KEY,
    DEFAULT_SORT_STORAGE_KEY,
    FONT_SIZE_MAP,
    FONT_SIZE_OPTIONS,
    FONT_SIZE_STORAGE_KEY,
    THEME_STORAGE_KEY,
    applyAccentColor,
    applyFontSize,
    applyTheme,
    type FontSizeOption,
} from '../../lib/theme';
import { useAppStore, type ThemeMode } from '../../stores/useAppStore';
import type { FilterStatus, PageProps, SortOption } from '../../types';

const DEFAULT_SORT_OPTIONS: Array<{
    label: string;
    value: Extract<SortOption, 'manual' | 'due_date' | 'priority' | 'created_at'>;
}> = [
    { label: 'Manual', value: 'manual' },
    { label: 'Due Date', value: 'due_date' },
    { label: 'Priority', value: 'priority' },
    { label: 'Date Created', value: 'created_at' },
];

const DEFAULT_FILTER_OPTIONS: Array<{
    label: string;
    value: FilterStatus;
}> = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
];

type SettingsPageProps = PageProps;

type ImportTodoPayload = {
    exported_at?: string;
    lists: Array<{
        name: string;
        color?: string | null;
        sort_order?: number | null;
        todos: Array<{
            title: string;
            description?: string | null;
            priority?: string | null;
            due_date?: string | null;
            is_completed?: boolean | null;
            completed_at?: string | null;
            is_deleted?: boolean | null;
            deleted_at?: string | null;
            sort_order?: number | null;
        }>;
    }>;
};

type ImportResponse = {
    imported_lists: number;
    imported_todos: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

export function buildSettingsExportFilename(date: Date = new Date()) {
    return `todoapp-export-${date.toISOString().slice(0, 10)}.json`;
}

export function isTodoImportPayload(value: unknown): value is ImportTodoPayload {
    if (!isObject(value) || !Array.isArray(value.lists)) {
        return false;
    }

    return value.lists.every((list) => {
        if (!isObject(list) || typeof list.name !== 'string' || !Array.isArray(list.todos)) {
            return false;
        }

        return list.todos.every(
            (todo) => isObject(todo) && typeof todo.title === 'string',
        );
    });
}

function getBooleanStorageValue(key: string, defaultValue: boolean) {
    if (typeof window === 'undefined') {
        return defaultValue;
    }

    const value = window.localStorage.getItem(key);

    if (value === null) {
        return defaultValue;
    }

    return value === 'true';
}

function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;

        if (typeof responseData?.message === 'string') {
            return responseData.message;
        }

        const firstValidationError = responseData?.errors
            ? Object.values(responseData.errors)[0]
            : null;

        if (Array.isArray(firstValidationError) && typeof firstValidationError[0] === 'string') {
            return firstValidationError[0];
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return fallback;
}

function SectionHeader({
    description,
    title,
}: {
    description?: string;
    title: string;
}) {
    return (
        <header className="space-y-3">
            <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description ? (
                    <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            <Separator />
        </header>
    );
}

function SettingRow({
    children,
    description,
    title,
}: {
    children: ReactNode;
    description?: string;
    title: string;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground">{title}</Label>
                {description ? (
                    <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
            </div>
            <div className="sm:min-w-[220px] sm:max-w-[260px] sm:flex-1">{children}</div>
        </div>
    );
}

export default function SettingsIndex() {
    const { props } = usePage<SettingsPageProps>();
    const { announce } = useAnnounce();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { setTheme, theme } = useAppStore(
        useShallow((state) => ({
            setTheme: state.setTheme,
            theme: state.theme,
        })),
    );

    const [accentColor, setAccentColor] = useState<(typeof ACCENT_COLOR_OPTIONS)[number]['value']>(
        ACCENT_COLOR_OPTIONS[0].value,
    );
    const [fontSize, setFontSize] = useState<FontSizeOption>('medium');
    const [defaultSort, setDefaultSort] = useState<Extract<SortOption, 'manual' | 'due_date' | 'priority' | 'created_at'>>('manual');
    const [defaultFilter, setDefaultFilter] = useState<FilterStatus>('all');
    const [moveCompletedToBottom, setMoveCompletedToBottom] = useState(true);
    const [confirmBeforeDeleting, setConfirmBeforeDeleting] = useState(true);
    const [autoCollapseCompleted, setAutoCollapseCompleted] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isClearingAllData, setIsClearingAllData] = useState(false);

    const stats = useMemo(
        () => ({
            lists: props.lists.length,
            todos: props.lists.reduce((sum, list) => sum + list.todos_count, 0),
        }),
        [props.lists],
    );
    const selectedAccentColor = useMemo(
        () =>
            ACCENT_COLOR_OPTIONS.find((option) => option.value === accentColor) ??
            ACCENT_COLOR_OPTIONS[0],
        [accentColor],
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        const storedAccentColor = window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
        const storedFontSize = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
        const storedDefaultSort = window.localStorage.getItem(DEFAULT_SORT_STORAGE_KEY);
        const storedDefaultFilter = window.localStorage.getItem(DEFAULT_FILTER_STORAGE_KEY);

        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
            setTheme(storedTheme);
            applyTheme(storedTheme);
        }

        const matchedAccentColor = ACCENT_COLOR_OPTIONS.find(
            (option) =>
                option.value === storedAccentColor ||
                option.hex === storedAccentColor,
        );

        if (matchedAccentColor) {
            setAccentColor(matchedAccentColor.value);
            applyAccentColor(matchedAccentColor.value);
        } else {
            applyAccentColor(ACCENT_COLOR_OPTIONS[0].value);
        }

        if (storedFontSize === 'small' || storedFontSize === 'medium' || storedFontSize === 'large') {
            setFontSize(storedFontSize);
            applyFontSize(storedFontSize);
        }

        if (storedDefaultSort === 'manual' || storedDefaultSort === 'due_date' || storedDefaultSort === 'priority' || storedDefaultSort === 'created_at') {
            setDefaultSort(storedDefaultSort);
        }

        if (storedDefaultFilter === 'all' || storedDefaultFilter === 'active' || storedDefaultFilter === 'completed') {
            setDefaultFilter(storedDefaultFilter);
        }

        setMoveCompletedToBottom(
            getBooleanStorageValue(COMPLETE_TO_BOTTOM_STORAGE_KEY, true),
        );
        setConfirmBeforeDeleting(
            getBooleanStorageValue(CONFIRM_DELETE_STORAGE_KEY, true),
        );
        setAutoCollapseCompleted(
            getBooleanStorageValue(AUTO_COLLAPSE_COMPLETED_STORAGE_KEY, true),
        );
    }, [setTheme]);

    function updateTheme(nextTheme: ThemeMode) {
        setTheme(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }

    function updateAccentColor(nextColor: (typeof ACCENT_COLOR_OPTIONS)[number]['value']) {
        setAccentColor(nextColor);
        applyAccentColor(nextColor);
        window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, nextColor);
    }

    function updateFontSize(nextFontSize: FontSizeOption) {
        setFontSize(nextFontSize);
        applyFontSize(nextFontSize);
        window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, nextFontSize);
    }

    function updateDefaultSort(
        nextSort: Extract<SortOption, 'manual' | 'due_date' | 'priority' | 'created_at'>,
    ) {
        setDefaultSort(nextSort);
        window.localStorage.setItem(DEFAULT_SORT_STORAGE_KEY, nextSort);
    }

    function updateDefaultFilter(nextFilter: FilterStatus) {
        setDefaultFilter(nextFilter);
        window.localStorage.setItem(DEFAULT_FILTER_STORAGE_KEY, nextFilter);
    }

    function updateBooleanSetting(
        key: string,
        nextValue: boolean,
        setter: (value: boolean) => void,
    ) {
        setter(nextValue);
        window.localStorage.setItem(key, String(nextValue));
    }

    async function handleExport() {
        setIsExporting(true);

        try {
            const response = await axios.get('/api/export', {
                responseType: 'blob',
            });
            const blobUrl = window.URL.createObjectURL(response.data as Blob);
            const link = document.createElement('a');

            link.href = blobUrl;
            link.download = buildSettingsExportFilename();
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
            toast.success('Your task export is ready.');
            announce('Export downloaded');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to export task data.'));
        } finally {
            setIsExporting(false);
        }
    }

    function triggerImport() {
        fileInputRef.current?.click();
    }

    async function handleImportFileSelection(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setIsImporting(true);

        try {
            const parsed = JSON.parse(await file.text()) as unknown;

            if (!isTodoImportPayload(parsed)) {
                throw new Error('This file does not match the TodoApp export format.');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post<ImportResponse>('/api/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            const importedLists = response.data.imported_lists;
            const importedTodos = response.data.imported_todos;

            showImportSuccessToast(importedLists, importedTodos);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to import task data.'));
        } finally {
            event.target.value = '';
            setIsImporting(false);
        }
    }

    async function handleClearAllData() {
        setIsClearingAllData(true);

        try {
            await axios.delete('/api/data/all');
            toast.success('All data has been cleared');
            router.visit('/tasks');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to clear all data.'));
        } finally {
            setIsClearingAllData(false);
        }
    }

    return (
        <>
            <Head title="Settings" />
            <AppLayout>
                <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-10 px-6 py-10">
                    <header className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            Preferences
                        </p>
                        <h1 className="text-3xl font-semibold text-foreground">
                            Settings
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Adjust the way TodoApp looks, behaves, and handles your data.
                        </p>
                    </header>

                    <section className="space-y-4">
                        <SectionHeader title="Appearance" />

                        <SettingRow title="Theme">
                            <div className="inline-flex rounded-lg border border-border bg-background p-1">
                                <Toggle
                                    aria-label="Use light theme"
                                    pressed={theme === 'light'}
                                    variant="default"
                                    onPressedChange={() => updateTheme('light')}
                                >
                                    <Sun className="h-4 w-4" />
                                    Light
                                </Toggle>
                                <Toggle
                                    aria-label="Use dark theme"
                                    pressed={theme === 'dark'}
                                    variant="default"
                                    onPressedChange={() => updateTheme('dark')}
                                >
                                    <Moon className="h-4 w-4" />
                                    Dark
                                </Toggle>
                                <Toggle
                                    aria-label="Use system theme"
                                    pressed={theme === 'system'}
                                    variant="default"
                                    onPressedChange={() => updateTheme('system')}
                                >
                                    <Monitor className="h-4 w-4" />
                                    System
                                </Toggle>
                            </div>
                        </SettingRow>

                        <SettingRow title="Accent Color">
                            <div className="flex flex-wrap gap-3">
                                {ACCENT_COLOR_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-label={`Use ${option.label.toLowerCase()} accent color`}
                                        className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        style={{ backgroundColor: option.hex }}
                                        onClick={() => updateAccentColor(option.value)}
                                    >
                                        {selectedAccentColor.value === option.value ? (
                                            <Check className="h-3.5 w-3.5 text-white" />
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        </SettingRow>

                        <SettingRow title="Font Size">
                            <Select
                                value={fontSize}
                                onValueChange={(value) => updateFontSize(value as keyof typeof FONT_SIZE_MAP)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select font size" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_SIZE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </SettingRow>
                    </section>

                    <section className="space-y-4">
                        <SectionHeader title="Behavior" />

                        <SettingRow title="Default sort for new lists">
                            <Select
                                value={defaultSort}
                                onValueChange={(value) =>
                                    updateDefaultSort(
                                        value as Extract<SortOption, 'manual' | 'due_date' | 'priority' | 'created_at'>,
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select default sort" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEFAULT_SORT_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </SettingRow>

                        <SettingRow title="Default filter for new lists">
                            <Select
                                value={defaultFilter}
                                onValueChange={(value) => updateDefaultFilter(value as FilterStatus)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select default filter" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEFAULT_FILTER_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </SettingRow>

                        <SettingRow
                            title="Move completed tasks to bottom"
                            description="Completed tasks will appear below active tasks"
                        >
                            <div className="flex justify-end">
                                <Toggle
                                    aria-label="Toggle completed tasks position"
                                    pressed={moveCompletedToBottom}
                                    variant="outline"
                                    onPressedChange={(pressed) =>
                                        updateBooleanSetting(
                                            COMPLETE_TO_BOTTOM_STORAGE_KEY,
                                            pressed,
                                            setMoveCompletedToBottom,
                                        )
                                    }
                                >
                                    {moveCompletedToBottom ? 'On' : 'Off'}
                                </Toggle>
                            </div>
                        </SettingRow>

                        <SettingRow
                            title="Confirm before deleting"
                            description="Show undo toast when moving tasks to trash"
                        >
                            <div className="flex justify-end">
                                <Toggle
                                    aria-label="Toggle delete confirmation"
                                    pressed={confirmBeforeDeleting}
                                    variant="outline"
                                    onPressedChange={(pressed) =>
                                        updateBooleanSetting(
                                            CONFIRM_DELETE_STORAGE_KEY,
                                            pressed,
                                            setConfirmBeforeDeleting,
                                        )
                                    }
                                >
                                    {confirmBeforeDeleting ? 'On' : 'Off'}
                                </Toggle>
                            </div>
                        </SettingRow>

                        <SettingRow
                            title="Auto-collapse completed tasks"
                            description="The completed section starts collapsed in each list"
                        >
                            <div className="flex justify-end">
                                <Toggle
                                    aria-label="Toggle auto collapse completed tasks"
                                    pressed={autoCollapseCompleted}
                                    variant="outline"
                                    onPressedChange={(pressed) =>
                                        updateBooleanSetting(
                                            AUTO_COLLAPSE_COMPLETED_STORAGE_KEY,
                                            pressed,
                                            setAutoCollapseCompleted,
                                        )
                                    }
                                >
                                    {autoCollapseCompleted ? 'On' : 'Off'}
                                </Toggle>
                            </div>
                        </SettingRow>
                    </section>

                    <section className="space-y-4">
                        <SectionHeader title="Data" />

                        <SettingRow
                            title="Export all tasks"
                            description="Download a JSON file with all your lists and tasks"
                        >
                            <Button
                                variant="outline"
                                className="w-full justify-center sm:w-auto"
                                disabled={isExporting}
                                onClick={() => void handleExport()}
                            >
                                <Download className="h-4 w-4" />
                                Export JSON
                            </Button>
                        </SettingRow>

                        <SettingRow
                            title="Import tasks"
                            description="Import a previously exported JSON file. Merges with existing data."
                        >
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    className="hidden"
                                    onChange={(event) => {
                                        void handleImportFileSelection(event);
                                    }}
                                />
                                <Button
                                    variant="outline"
                                    className="w-full justify-center sm:w-auto"
                                    disabled={isImporting}
                                    onClick={triggerImport}
                                >
                                    <Upload className="h-4 w-4" />
                                    Import JSON
                                </Button>
                            </>
                        </SettingRow>

                        <SettingRow
                            title="Clear all data"
                            description="Permanently delete all lists and tasks. This cannot be undone."
                        >
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-center sm:w-auto"
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                        Clear All Data
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            Are you absolutely sure?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete all {stats.lists} lists and {stats.todos} tasks. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            disabled={isClearingAllData}
                                            onClick={() => {
                                                void handleClearAllData();
                                            }}
                                        >
                                            Yes, delete everything
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </SettingRow>
                    </section>
                </div>
            </AppLayout>
        </>
    );
}
