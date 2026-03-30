/**
 * Numeric identifier returned by Laravel that is guaranteed by the domain
 * model to be a positive integer.
 */
export type PositiveInteger = number;

/**
 * Numeric value that is guaranteed by the domain model to be zero or greater.
 */
export type NonNegativeInteger = number;

/**
 * ISO 8601 datetime string returned by Laravel JSON serialization.
 */
export type Iso8601DateTimeString = string;

/**
 * Calendar date string formatted as `YYYY-MM-DD`.
 */
export type CalendarDateString = string;

/**
 * Seven-character hex color string that always starts with `#`.
 */
export type HexColorString = string;

/**
 * Shared palette used for list creation and list color editing.
 */
export const LIST_COLOR_PALETTE = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#84cc16',
    '#10b981',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#64748b',
] as const satisfies readonly HexColorString[];

/**
 * Priority level assigned to a todo item.
 */
export type PriorityLevel = 'none' | 'low' | 'medium' | 'high';

/**
 * Completion filter applied to a todo list view.
 */
export type FilterStatus = 'all' | 'active' | 'completed';

/**
 * Due-date filter applied to a todo list view.
 */
export type DueDateFilter =
    | 'any'
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'overdue'
    | 'no_date';

/**
 * Sort option applied to todos in a list view.
 */
export type SortOption =
    | 'manual'
    | 'due_date'
    | 'priority'
    | 'title_asc'
    | 'title_desc'
    | 'created_at'
    | 'completed_at';

/**
 * Supported application theme mode.
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Supported named accent color choice.
 */
export type AccentColor =
    | 'indigo'
    | 'amber'
    | 'emerald'
    | 'red'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'teal';

/**
 * Supported application font size option.
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Identifier of a built-in virtual list.
 */
export type VirtualListId = 'all' | 'today' | 'trash';

/**
 * Identifier of the currently selected list, either a persisted database list
 * or one of the built-in virtual lists.
 */
export type SelectedListId = number | VirtualListId;

/**
 * Legacy alias retained for current page props and sidebar code.
 */
export type DefaultListId = VirtualListId;

/**
 * Validation errors returned by Laravel's JSON validation responses.
 */
export type ValidationErrors = Record<string, string[]>;

export interface User {
    /** Positive integer primary key of the authenticated user. */
    id: PositiveInteger;
    /** Human-readable display name for the authenticated user. */
    name: string;
    /** Unique email address for the authenticated user. */
    email: string;
    /** ISO 8601 datetime string for email verification, or null when unverified. */
    email_verified_at?: Iso8601DateTimeString | null;
}

export interface TodoList {
    /** Positive integer primary key of the list. */
    id: PositiveInteger;
    /** Display name of the list, constrained to 1 to 50 characters. */
    name: string;
    /** Seven-character hex color string that always starts with `#`. */
    color: HexColorString;
    /** Non-negative integer that defines sidebar ordering for the list. */
    sort_order: NonNegativeInteger;
    /** Non-negative integer count of non-deleted todos in the list. */
    todos_count: NonNegativeInteger;
    /** Non-negative integer count of incomplete non-deleted todos in the list. */
    active_todos_count: NonNegativeInteger;
    /** ISO 8601 datetime string representing when the list was created. */
    created_at: Iso8601DateTimeString;
    /** ISO 8601 datetime string representing when the list was last updated. */
    updated_at: Iso8601DateTimeString;
}

export interface Todo {
    /** Positive integer primary key of the todo. */
    id: PositiveInteger;
    /** Positive integer foreign key of the owning list, or null when uncategorized. */
    todo_list_id: PositiveInteger | null;
    /** Title text constrained to 1 to 255 characters. */
    title: string;
    /** Optional description text constrained to 2000 characters or fewer. */
    description: string | null;
    /** Whether the todo is currently marked as completed. */
    is_completed: boolean;
    /** ISO 8601 datetime string when the todo was completed, or null if active. */
    completed_at: Iso8601DateTimeString | null;
    /** Priority classification for the todo. */
    priority: PriorityLevel;
    /** Due date string formatted as `YYYY-MM-DD`, or null when unset. */
    due_date: CalendarDateString | null;
    /** Non-negative integer used to order todos inside their list. */
    sort_order: NonNegativeInteger;
    /** Whether the todo is currently in the trash. */
    is_deleted: boolean;
    /** ISO 8601 datetime string when the todo was trashed, or null if active. */
    deleted_at: Iso8601DateTimeString | null;
    /** ISO 8601 datetime string representing when the todo was created. */
    created_at: Iso8601DateTimeString;
    /** ISO 8601 datetime string representing when the todo was last updated. */
    updated_at: Iso8601DateTimeString;
    /** Optional eagerly loaded list relationship returned by the API. */
    list?: TodoList;
}

export interface VirtualList {
    /** Stable built-in identifier for the virtual sidebar list. */
    id: VirtualListId;
    /** Display name rendered in the sidebar. */
    name: string;
    /** Lucide icon name used to render the virtual list. */
    icon: string;
    /** Optional badge count displayed beside the virtual list, or null to hide it. */
    badge_count: number | null;
}

/**
 * Legacy alias retained for existing Inertia page props.
 */
export type DefaultListDefinition = VirtualList;

export interface MoveToTrashUndoAction {
    /** Discriminant identifying a single-todo trash action. */
    action: 'move_to_trash';
    /** Full todo snapshot captured before the todo was moved to trash. */
    todo: Todo;
}

export interface CompleteUndoAction {
    /** Discriminant identifying a single-todo completion toggle action. */
    action: 'complete';
    /** Positive integer identifier of the todo whose completion changed. */
    todoId: PositiveInteger;
    /** Completion value that existed before the mutation. */
    previousIsCompleted: boolean;
}

export interface BulkDeleteUndoAction {
    /** Discriminant identifying a bulk delete action. */
    action: 'bulk_delete';
    /** Full todo snapshots captured before the bulk delete mutation. */
    todos: Todo[];
}

export interface BulkCompleteUndoTodoSnapshot {
    /** Positive integer identifier of the mutated todo. */
    todoId: PositiveInteger;
    /** Completion value that existed before the bulk completion mutation. */
    was_completed: boolean;
}

export interface BulkCompleteUndoAction {
    /** Discriminant identifying a bulk completion action. */
    action: 'bulk_complete';
    /** Per-todo completion snapshots captured before the bulk mutation. */
    todos: BulkCompleteUndoTodoSnapshot[];
}

/**
 * Discriminated union describing reversible todo mutations.
 */
export type UndoAction =
    | MoveToTrashUndoAction
    | CompleteUndoAction
    | BulkDeleteUndoAction
    | BulkCompleteUndoAction;

export interface AppSettings {
    /** Theme preference applied to the application shell. */
    theme: Theme;
    /** Named accent color applied to CSS variables and UI highlights. */
    accentColor: AccentColor;
    /** Base font size applied to the root HTML element. */
    fontSize: FontSize;
    /** Default sort option applied when a new list is opened. */
    defaultSort: SortOption;
    /** Default completion filter applied when a new list is opened. */
    defaultFilter: FilterStatus;
    /** Whether completed todos should be rendered below active todos. */
    moveCompletedToBottom: boolean;
    /** Whether destructive delete flows should request confirmation first. */
    confirmBeforeDeleting: boolean;
    /** Whether completed sections should start collapsed by default. */
    autoCollapseCompleted: boolean;
}

export interface FlashMessages {
    /** Optional success flash message shared through Inertia. */
    success?: string;
    /** Optional error flash message shared through Inertia. */
    error?: string;
    /** Optional informational flash message shared through Inertia. */
    info?: string;
}

export interface InertiaSharedProps {
    /** Eager-loaded database-backed todo lists available to the current request. */
    lists: TodoList[];
    /** Built-in sidebar lists that are not persisted in the database. */
    virtualLists: VirtualList[];
    /** Flash messages shared by the Inertia middleware. */
    flash: FlashMessages;
}

export interface AuthProps {
    /** Auth context shared by the Inertia middleware. */
    auth: {
        /** Authenticated user for the current request, or null for guests. */
        user: User | null;
    };
}

export interface PagePropsBase extends InertiaSharedProps, AuthProps {
    /** Additional shared props injected by Inertia or page-specific controllers. */
    [key: string]: unknown;
    /** Legacy alias for virtual lists retained for current page components. */
    default_lists?: DefaultListDefinition[];
    /** Snake-case shared virtual lists as serialized directly from Laravel. */
    virtual_lists?: VirtualList[];
    /** Active non-trash todos due today. */
    today_count?: number;
    /** Todos currently in trash. */
    trash_count?: number;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, never>,
> = PagePropsBase & T;

export interface ApiSuccess<T> {
    /** Successful response payload returned by the server. */
    data: T;
    /** Optional user-facing message returned alongside the payload. */
    message?: string;
}

export interface ApiError {
    /** Human-readable error message returned by the server. */
    message: string;
    /** Optional Laravel validation errors keyed by field name. */
    errors?: ValidationErrors;
}

export interface PaginatedResponse<T> {
    /** Array of items returned for the current page. */
    data: T[];
    /** Current page number in the paginated collection. */
    current_page: number;
    /** Final available page number in the paginated collection. */
    last_page: number;
    /** Number of items requested per page. */
    per_page: number;
    /** Total number of matching items across all pages. */
    total: number;
}

export interface TodoCardProps {
    // TODO: define per-component prompt.
}

export interface TodoListProps {
    // TODO: define per-component prompt.
}

export interface TodoDetailPanelProps {
    // TODO: define per-component prompt.
}

export interface SidebarProps {
    // TODO: define per-component prompt.
}

export interface SearchOverlayProps {
    // TODO: define per-component prompt.
}

export interface SettingsPageProps {
    // TODO: define per-component prompt.
}
