import { memo } from 'react';

import { Skeleton } from '../ui/skeleton';

/**
 * Props for the todo skeleton placeholder list.
 */
export interface TodoSkeletonCardProps {
    /**
     * Number of placeholder cards to render.
     */
    count?: number;
}

/**
 * Builds stable placeholder keys for the skeleton list.
 *
 * @param count The number of skeleton rows requested.
 * @returns Stable key strings for each rendered skeleton row.
 */
export function getTodoSkeletonKeys(count: number): string[] {
    return Array.from(
        { length: Math.max(0, count) },
        (_, position) => `todo-skeleton-card-${position + 1}`,
    );
}

/**
 * Loading placeholder that mirrors the structure of a todo card.
 *
 * @param props The component props.
 * @returns The rendered skeleton list.
 */
function TodoSkeletonCardComponent({
    count = 5,
}: TodoSkeletonCardProps) {
    return (
        <div className="flex flex-col gap-1">
            {getTodoSkeletonKeys(count).map((key) => (
                <div
                    key={key}
                    data-testid="todo-skeleton-card"
                    className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />

                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/5" />

                        <div className="flex items-center gap-2">
                            <Skeleton className="h-3.5 w-20 rounded-full" />
                            <Skeleton className="h-3.5 w-16 rounded-full" />
                        </div>
                    </div>

                    <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
                </div>
            ))}
        </div>
    );
}

const TodoSkeletonCard = memo(TodoSkeletonCardComponent);

TodoSkeletonCard.displayName = 'TodoSkeletonCard';

export default TodoSkeletonCard;
