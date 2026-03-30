import {
    Check,
    Flag,
} from 'lucide-react';
import { memo } from 'react';

import { useAppStore } from '../../stores/useAppStore';
import type {
    DueDateFilter,
    FilterStatus,
    PriorityLevel,
    SelectedListId,
    SortOption,
} from '../../types';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

/**
 * Props accepted by the todo filter bar.
 */
export interface TodoFilterBarProps {
    /**
     * The current selected list.
     */
    listId: SelectedListId;
    /**
     * Current status filter value.
     */
    filterStatus: FilterStatus;
    /**
     * Setter for the status filter.
     */
    setFilterStatus: (value: FilterStatus) => void;
    /**
     * Current due-date filter value.
     */
    dueDateFilter: DueDateFilter;
    /**
     * Setter for the due-date filter.
     */
    setDueDateFilter: (value: DueDateFilter) => void;
    /**
     * Current priority filter value.
     */
    priorityFilter: PriorityLevel | 'any';
    /**
     * Setter for the priority filter.
     */
    setPriorityFilter: (value: PriorityLevel | 'any') => void;
    /**
     * Current sort option.
     */
    sortOption: SortOption;
    /**
     * Setter for the sort option.
     */
    setSortOption: (value: SortOption) => void;
    /**
     * Number of completed tasks in the current view.
     */
    completedCount: number;
}

const DUE_DATE_LABELS: Record<DueDateFilter, string> = {
    any: 'Any Date',
    no_date: 'No Due Date',
    overdue: 'Overdue',
    this_week: 'This Week',
    today: 'Today',
    tomorrow: 'Tomorrow',
};

const PRIORITY_LABELS: Record<PriorityLevel | 'any', string> = {
    any: 'Any Priority',
    high: 'High',
    low: 'Low',
    medium: 'Medium',
    none: 'No Priority',
};

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
 * Returns the current due-date filter trigger label.
 *
 * @param dueDateFilter The active due-date filter.
 * @returns The trigger label shown in the dropdown button.
 */
export function getDueDateFilterButtonLabel(
    dueDateFilter: DueDateFilter,
): string {
    return dueDateFilter === 'any'
        ? 'Due Date'
        : `Due: ${DUE_DATE_LABELS[dueDateFilter]}`;
}

/**
 * Returns the current priority filter trigger label.
 *
 * @param priorityFilter The active priority filter.
 * @returns The trigger label shown in the dropdown button.
 */
export function getPriorityFilterButtonLabel(
    priorityFilter: PriorityLevel | 'any',
): string {
    return priorityFilter === 'any'
        ? 'Priority'
        : `Priority: ${PRIORITY_LABELS[priorityFilter]}`;
}

/**
 * Determines whether any todo filters are active.
 *
 * @param values The current filter values.
 * @returns `true` when any filter differs from its default state.
 */
export function hasActiveTodoFilters(values: {
    dueDateFilter: DueDateFilter;
    filterStatus: FilterStatus;
    priorityFilter: PriorityLevel | 'any';
}): boolean {
    return (
        values.filterStatus !== 'all'
        || values.dueDateFilter !== 'any'
        || values.priorityFilter !== 'any'
    );
}

/**
 * Filter and sorting controls shown above the todo list.
 *
 * @param props The component props.
 * @returns The rendered filter bar.
 */
function TodoFilterBarComponent({
    completedCount,
    dueDateFilter,
    filterStatus,
    listId: _listId,
    priorityFilter,
    setDueDateFilter,
    setFilterStatus,
    setPriorityFilter,
    setSortOption,
    sortOption,
}: TodoFilterBarProps) {
    const resetFilters = useAppStore((state) => state.resetFilters);
    const hasActiveFilters = hasActiveTodoFilters({
        dueDateFilter,
        filterStatus,
        priorityFilter,
    });

    return (
        <div className="flex flex-col gap-2 py-2 md:flex-row md:flex-nowrap md:items-center md:justify-between">
            <div className="order-2 flex flex-wrap items-center gap-2 md:order-1 md:flex-nowrap">
                <Tabs
                    value={filterStatus}
                    onValueChange={(value) => {
                        setFilterStatus(value as FilterStatus);
                    }}
                >
                    <TabsList className="h-11 bg-transparent p-0 md:h-9">
                        <TabsTrigger
                            value="all"
                            className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                        >
                            All
                        </TabsTrigger>
                        <TabsTrigger
                            value="active"
                            className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                        >
                            Active
                        </TabsTrigger>
                        <TabsTrigger
                            value="completed"
                            className="rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                        >
                            {completedCount > 0
                                ? `Completed (${completedCount})`
                                : 'Completed'}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-label="Filter by due date" variant="outline" className="h-11 md:h-9">
                            {getDueDateFilterButtonLabel(dueDateFilter)}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {(Object.keys(DUE_DATE_LABELS) as DueDateFilter[]).map((value) => (
                            <DropdownMenuCheckboxItem
                                key={value}
                                checked={dueDateFilter === value}
                                onCheckedChange={() => {
                                    setDueDateFilter(value);
                                }}
                            >
                                {DUE_DATE_LABELS[value]}
                            </DropdownMenuCheckboxItem>
                        ))}

                        {dueDateFilter !== 'any' ? (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        setDueDateFilter('any');
                                    }}
                                >
                                    Clear
                                </DropdownMenuItem>
                            </>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-label="Filter by priority" variant="outline" className="h-11 md:h-9">
                            {getPriorityFilterButtonLabel(priorityFilter)}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {(Object.keys(PRIORITY_LABELS) as Array<PriorityLevel | 'any'>).map(
                            (value) => (
                                <DropdownMenuCheckboxItem
                                    key={value}
                                    checked={priorityFilter === value}
                                    onCheckedChange={() => {
                                        setPriorityFilter(value);
                                    }}
                                >
                                    <Flag
                                        className={
                                            value === 'high'
                                                ? 'text-red-700 dark:text-red-400'
                                                : value === 'medium'
                                                    ? 'text-amber-700 dark:text-amber-400'
                                                    : value === 'low'
                                                        ? 'text-blue-700 dark:text-blue-400'
                                                        : 'text-slate-500 dark:text-slate-400'
                                        }
                                    />
                                    {PRIORITY_LABELS[value]}
                                </DropdownMenuCheckboxItem>
                            ),
                        )}

                        {priorityFilter !== 'any' ? (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        setPriorityFilter('any');
                                    }}
                                >
                                    Clear
                                </DropdownMenuItem>
                            </>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="order-1 flex items-center gap-2 md:order-2">
                <Select
                    value={sortOption}
                    onValueChange={(value) => {
                        setSortOption(value as SortOption);
                    }}
                >
                    <SelectTrigger
                        aria-label="Sort tasks"
                        className="h-11 w-[180px] md:h-9"
                    >
                        <SelectValue>
                            {`Sort: ${SORT_OPTION_LABELS[sortOption]}`}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(SORT_OPTION_LABELS) as SortOption[]).map((value) => (
                            <SelectItem key={value} value={value}>
                                {SORT_OPTION_LABELS[value]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {hasActiveFilters ? (
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-11 px-2 text-sm text-muted-foreground md:h-9"
                        onClick={() => {
                            resetFilters();
                            setSortOption('manual');
                        }}
                    >
                        Clear all filters
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

const TodoFilterBar = memo(TodoFilterBarComponent);

TodoFilterBar.displayName = 'TodoFilterBar';

export default TodoFilterBar;
