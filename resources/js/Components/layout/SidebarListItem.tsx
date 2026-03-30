import {
    memo,
    useState,
    type AriaRole,
    type ComponentPropsWithoutRef,
    type HTMLAttributes,
    type ReactNode,
    type Ref,
} from 'react';
import {
    GripVertical,
    Pencil,
    Trash2,
    type LucideIcon,
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import type { SelectedListId } from '../../types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '../ui/tooltip';

type DragHandleButtonProps = HTMLAttributes<HTMLButtonElement> & {
    /**
     * Optional accessibility role from dnd-kit attributes.
     */
    role?: AriaRole;
    /**
     * Optional forwarded ref from `setActivatorNodeRef`.
     */
    ref?: Ref<HTMLButtonElement>;
};

/**
 * Props accepted by the reusable sidebar list row.
 */
export interface SidebarListItemProps {
    /**
     * The selected-list identifier represented by the row.
     */
    id: SelectedListId;
    /**
     * Optional icon component rendered when no color dot is used.
     */
    icon?: LucideIcon | null;
    /**
     * Optional hex color dot for user lists.
     */
    colorDot: string | null;
    /**
     * The visible list label.
     */
    label: string;
    /**
     * Optional badge count rendered at the end of the row.
     */
    badge: number | null;
    /**
     * Whether the row is the currently active navigation target.
     */
    isActive: boolean;
    /**
     * Whether the containing sidebar is collapsed.
     */
    isCollapsed: boolean;
    /**
     * Whether edit/delete action buttons should appear on hover.
     */
    showActions: boolean;
    /**
     * Whether the drag handle should be displayed.
     */
    isDragHandle: boolean;
    /**
     * Optional dnd-kit drag-handle props to spread onto the handle button.
     */
    dragHandleProps: DragHandleButtonProps | null;
    /**
     * Callback fired when edit is requested.
     */
    onEdit: (() => void) | null;
    /**
     * Callback fired when delete is requested.
     */
    onDelete: (() => void) | null;
    /**
     * Callback fired when the row is activated.
     */
    onClick: () => void;
    /**
     * Optional custom action content rendered in place of the default buttons.
     */
    actions?: ReactNode;
}

/**
 * Reusable sidebar list row for default lists and user-defined lists.
 *
 * @param props The row props.
 * @returns The rendered sidebar list item.
 */
function SidebarListItemComponent({
    badge,
    colorDot,
    dragHandleProps,
    icon: Icon,
    id,
    isActive,
    isCollapsed,
    isDragHandle,
    label,
    onClick,
    onDelete,
    onEdit,
    showActions,
    actions,
}: SidebarListItemProps) {
    const setSelectedListId = useAppStore((state) => state.setSelectedListId);
    const [isHovered, setIsHovered] = useState(false);

    const shouldShowBadge =
        !isCollapsed && typeof badge === 'number' && badge > 0;
    const actionButtonsVisible = (showActions || Boolean(actions)) && !isCollapsed;
    const dragHandleVisible = isDragHandle && !isCollapsed;
    const handleRef = dragHandleProps?.ref;
    const { ref: _ignoredRef, ...resolvedDragHandleProps } = dragHandleProps ?? {};

    const row = (
        <div
            data-hovered={isHovered}
            className="group/sidebar-item relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Button
                aria-label={isCollapsed ? label : undefined}
                className={cn(
                    'h-11 w-full rounded-md justify-start gap-3 transition-colors duration-150 ease-out md:h-9',
                    isCollapsed ? 'justify-center px-0' : 'px-3',
                    dragHandleVisible && 'pl-9',
                    actionButtonsVisible && shouldShowBadge && 'pr-24',
                    actionButtonsVisible && !shouldShowBadge && 'pr-16',
                    !actionButtonsVisible && shouldShowBadge && 'pr-12',
                    isActive
                        ? 'bg-accent text-accent-foreground hover:bg-accent'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
                type="button"
                variant="ghost"
                onClick={() => {
                    setSelectedListId(id);
                    onClick();
                }}
            >
                {colorDot ? (
                    <span
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: colorDot }}
                    />
                ) : Icon ? (
                    <Icon className="h-4 w-4 shrink-0" />
                ) : null}

                {!isCollapsed ? (
                    <span className="min-w-0 flex-1 truncate text-left">
                        {label}
                    </span>
                ) : null}

                {shouldShowBadge ? (
                    <Badge
                        variant="secondary"
                        className={cn(
                            'shrink-0',
                            isActive && 'bg-background/20 text-accent-foreground',
                        )}
                    >
                        {badge}
                    </Badge>
                ) : null}
            </Button>

            {dragHandleVisible ? (
                <Button
                    ref={handleRef}
                    aria-label={`Reorder ${label}`}
                    className={cn(
                        'absolute left-1 top-1/2 h-11 w-11 -translate-y-1/2 rounded-md text-muted-foreground md:h-7 md:w-7',
                        'opacity-0 transition-opacity duration-150',
                        'pointer-events-none group-hover/sidebar-item:pointer-events-auto group-hover/sidebar-item:opacity-100 group-focus-within/sidebar-item:pointer-events-auto group-focus-within/sidebar-item:opacity-100',
                    )}
                    size="icon"
                    type="button"
                    variant="ghost"
                    {...(resolvedDragHandleProps as ComponentPropsWithoutRef<'button'>)}
                    onClick={(event) => {
                        event.stopPropagation();
                        resolvedDragHandleProps.onClick?.(event);
                    }}
                >
                    <GripVertical className="h-4 w-4" />
                </Button>
            ) : null}

            {actionButtonsVisible ? (
                <div
                    className={cn(
                        'absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-1',
                        'opacity-0 transition-opacity duration-150',
                        'pointer-events-none group-hover/sidebar-item:pointer-events-auto group-hover/sidebar-item:opacity-100 group-focus-within/sidebar-item:pointer-events-auto group-focus-within/sidebar-item:opacity-100',
                    )}
                >
                    {actions ?? (
                        <>
                            {onEdit ? (
                                <Button
                                    aria-label={`Edit ${label}`}
                                    className="h-11 w-11 rounded-md md:h-7 md:w-7"
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onEdit();
                                    }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}

                            {onDelete ? (
                                <Button
                                    aria-label={`Delete ${label}`}
                                    className="h-11 w-11 rounded-md text-destructive hover:text-destructive md:h-7 md:w-7"
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onDelete();
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            ) : null}
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );

    if (!isCollapsed) {
        return row;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{row}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

const SidebarListItem = memo(SidebarListItemComponent);

SidebarListItem.displayName = 'SidebarListItem';

export default SidebarListItem;
