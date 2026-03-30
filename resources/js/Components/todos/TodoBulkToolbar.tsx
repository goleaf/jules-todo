import {
    CheckCircle,
    Flag,
    FolderInput,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import { memo } from 'react';

import { useLists } from '../../hooks/useLists';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '../ui/tooltip';

/**
 * Props accepted by the bulk toolbar.
 */
export interface TodoBulkToolbarProps {
    /**
     * The number of selected todos.
     */
    selectedCount: number;
    /**
     * Callback invoked when a bulk action should be executed.
     */
    onBulkAction: (
        action: string,
        extra?: Record<string, unknown>,
    ) => void | Promise<void>;
}

/**
 * Derived visibility and label state for the bulk toolbar.
 */
export interface BulkToolbarState {
    /**
     * Whether the toolbar should be shown.
     */
    isVisible: boolean;
    /**
     * Human-readable selection count label.
     */
    label: string;
}

/**
 * Builds the toolbar visibility state from the current selection count.
 *
 * @param selectedCount The number of selected tasks.
 * @returns The toolbar state used for rendering and tests.
 */
export function getBulkToolbarState(selectedCount: number): BulkToolbarState {
    return {
        isVisible: selectedCount > 0,
        label: `${selectedCount} tasks selected`,
    };
}

/**
 * Bottom bulk-action toolbar displayed during selection mode.
 *
 * @param props The component props.
 * @returns The rendered toolbar.
 */
function TodoBulkToolbarComponent({
    onBulkAction,
    selectedCount,
}: TodoBulkToolbarProps) {
    const { lists } = useLists();
    const exitSelectionMode = useAppStore((state) => state.exitSelectionMode);
    const toolbarState = getBulkToolbarState(selectedCount);

    return (
        <div
            role="toolbar"
            aria-label="Bulk actions"
            aria-hidden={!toolbarState.isVisible}
            data-visible={toolbarState.isVisible}
            className={cn(
                'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
                'transition-transform duration-200 ease-out',
                toolbarState.isVisible
                    ? 'animate-bulk-slide-up translate-y-0'
                    : 'pointer-events-none motion-safe:animate-[bulkToolbarSlideDown_150ms_ease-in_both] translate-y-full',
            )}
        >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                    {toolbarState.label}
                </p>

                <div className="flex items-center gap-1 sm:gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                aria-label="Mark selected tasks as complete"
                                className="h-11 gap-2 md:h-9"
                                onClick={() => {
                                    void onBulkAction('complete');
                                }}
                            >
                                <CheckCircle className="h-4 w-4" />
                                <span className="hidden md:inline">Complete</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Complete</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                aria-label="Mark selected tasks as incomplete"
                                className="h-11 gap-2 md:h-9"
                                onClick={() => {
                                    void onBulkAction('uncomplete');
                                }}
                            >
                                <RotateCcw className="h-4 w-4" />
                                <span className="hidden md:inline">Uncomplete</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Uncomplete</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-label="Move selected tasks"
                                        className="h-11 gap-2 md:h-9"
                                    >
                                        <FolderInput className="h-4 w-4" />
                                        <span className="hidden md:inline">Move</span>
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Move</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                            {lists.map((list) => (
                                <DropdownMenuItem
                                    key={list.id}
                                    onSelect={() => {
                                        void onBulkAction('move', {
                                            list_id: list.id,
                                        });
                                    }}
                                >
                                    {list.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-label="Change selected tasks priority"
                                        className="h-11 gap-2 md:h-9"
                                    >
                                        <Flag className="h-4 w-4" />
                                        <span className="hidden md:inline">Priority</span>
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Priority</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() => {
                                    void onBulkAction('set_priority', {
                                        priority: 'high',
                                    });
                                }}
                            >
                                <Flag className="text-red-700 dark:text-red-400" />
                                High
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => {
                                    void onBulkAction('set_priority', {
                                        priority: 'medium',
                                    });
                                }}
                            >
                                <Flag className="text-amber-700 dark:text-amber-400" />
                                Medium
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => {
                                    void onBulkAction('set_priority', {
                                        priority: 'low',
                                    });
                                }}
                            >
                                <Flag className="text-blue-700 dark:text-blue-400" />
                                Low
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => {
                                    void onBulkAction('set_priority', {
                                        priority: 'none',
                                    });
                                }}
                            >
                                <Flag className="text-muted-foreground" />
                                No Priority
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                aria-label="Move selected tasks to trash"
                                className="h-11 gap-2 text-red-600 hover:text-red-600 md:h-9 dark:text-red-400 dark:hover:text-red-400"
                                onClick={() => {
                                    void onBulkAction('delete');
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden md:inline">Delete</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Exit selection mode"
                                className="h-11 w-11 md:h-9 md:w-9"
                                onClick={exitSelectionMode}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Exit selection mode</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}

const TodoBulkToolbar = memo(TodoBulkToolbarComponent);

TodoBulkToolbar.displayName = 'TodoBulkToolbar';

export default TodoBulkToolbar;
