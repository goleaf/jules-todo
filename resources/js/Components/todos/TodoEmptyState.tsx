import {
    CheckSquare,
    Filter,
    Layers,
    Sun,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import { memo } from 'react';

import type { SelectedListId } from '../../types';

/**
 * Props accepted by the todo empty state component.
 */
export interface TodoEmptyStateProps {
    /**
     * The currently selected list identifier.
     */
    listId: SelectedListId;
    /**
     * Whether any filters or search constraints are active.
     */
    hasActiveFilters: boolean;
}

/**
 * Supported empty-state icon names.
 */
export type TodoEmptyStateIcon =
    | 'CheckSquare'
    | 'Filter'
    | 'Layers'
    | 'Sun'
    | 'Trash2';

/**
 * Structured empty-state copy used by the component and tests.
 */
export interface TodoEmptyStateContent {
    /**
     * The icon to display for the current context.
     */
    icon: TodoEmptyStateIcon;
    /**
     * The primary heading text.
     */
    heading: string;
    /**
     * Supporting helper text.
     */
    subtext: string;
}

const EMPTY_STATE_ICONS: Record<TodoEmptyStateIcon, LucideIcon> = {
    CheckSquare,
    Filter,
    Layers,
    Sun,
    Trash2,
};

/**
 * Returns the empty-state content for the current list/filter context.
 *
 * @param listId The active list identifier.
 * @param hasActiveFilters Whether filters or search are currently active.
 * @returns The icon and copy for the empty state.
 */
export function getTodoEmptyStateContent(
    listId: SelectedListId,
    hasActiveFilters: boolean,
): TodoEmptyStateContent {
    if (hasActiveFilters) {
        return {
            icon: 'Filter',
            heading: 'No matching tasks',
            subtext: 'Try adjusting or clearing your filters',
        };
    }

    if (listId === 'all') {
        return {
            icon: 'Layers',
            heading: 'No tasks yet',
            subtext: 'Press N or click below to add your first task',
        };
    }

    if (listId === 'today') {
        return {
            icon: 'Sun',
            heading: 'Nothing due today',
            subtext: 'Enjoy your day! Tasks due today will appear here',
        };
    }

    if (listId === 'trash') {
        return {
            icon: 'Trash2',
            heading: 'Trash is empty',
            subtext: 'Deleted tasks will appear here for 30 days',
        };
    }

    return {
        icon: 'CheckSquare',
        heading: 'This list is empty',
        subtext: 'Add a task above to get started',
    };
}

/**
 * Context-sensitive empty state for a todo list view.
 *
 * @param props The component props.
 * @returns The rendered empty state.
 */
function TodoEmptyStateComponent({
    hasActiveFilters,
    listId,
}: TodoEmptyStateProps) {
    const content = getTodoEmptyStateContent(listId, hasActiveFilters);
    const Icon = EMPTY_STATE_ICONS[content.icon];

    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <Icon className="h-12 w-12 text-muted-foreground" />

            <div className="space-y-1">
                <h3 className="text-base font-medium text-foreground">
                    {content.heading}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {content.subtext}
                </p>
            </div>
        </div>
    );
}

const TodoEmptyState = memo(TodoEmptyStateComponent);

TodoEmptyState.displayName = 'TodoEmptyState';

export default TodoEmptyState;
