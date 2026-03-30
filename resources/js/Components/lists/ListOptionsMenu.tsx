import {
    MoreHorizontal,
    Palette,
    Pencil,
    Trash2,
} from 'lucide-react';

import { useLists } from '../../hooks/useLists';
import type { TodoList } from '../../types';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import ListColorPicker from './ListColorPicker';

/**
 * Props accepted by the per-list options menu.
 */
export interface ListOptionsMenuProps {
    /**
     * The list being acted on.
     */
    list: TodoList;
    /**
     * Callback fired when rename is requested.
     */
    onEdit: () => void;
    /**
     * Callback fired when delete is requested.
     */
    onDelete: () => void;
}

/**
 * Dropdown menu for rename, color, and delete list actions.
 *
 * @param props The component props.
 * @returns The rendered options menu.
 */
export default function ListOptionsMenu({
    list,
    onDelete,
    onEdit,
}: ListOptionsMenuProps) {
    const { updateList } = useLists();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-md md:h-6 md:w-6"
                    aria-label={`Open ${list.name} options`}
                    onClick={(event) => {
                        event.stopPropagation();
                    }}
                >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" side="right">
                <DropdownMenuItem
                    onSelect={(event) => {
                        event.preventDefault();
                        onEdit();
                    }}
                >
                    <Pencil className="h-4 w-4" />
                    Rename
                </DropdownMenuItem>

                <ListColorPicker
                    currentColor={list.color}
                    onColorSelect={async (color) => {
                        await updateList(list.id, { color });
                    }}
                    trigger={
                        <DropdownMenuItem
                            onSelect={(event) => {
                                event.preventDefault();
                            }}
                        >
                            <Palette className="h-4 w-4" />
                            Change color
                        </DropdownMenuItem>
                    }
                />

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                    onSelect={(event) => {
                        event.preventDefault();
                        onDelete();
                    }}
                >
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    Delete list
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
