import { toast } from 'sonner';

export function showTaskAddedToast() {
    toast.success('Task added');
}

export function showTaskCompletedToast() {
    toast.success('Task completed');
}

export function showTaskRestoredToast() {
    toast.success('Task restored');
}

export function showTasksUpdatedToast(count: number) {
    toast.success(`${count} tasks updated`);
}

export function showSaveErrorToast() {
    toast.error('Failed to save. Retrying…');
}

export function showImportSuccessToast(
    importedLists: number,
    importedTodos: number,
) {
    toast.success(`Imported ${importedLists} lists and ${importedTodos} tasks`);
}

export function showListDeletedToast() {
    toast.error('List deleted. All tasks inside were removed.');
}

export function showUndoDeleteToast(onUndo: () => void | Promise<void>) {
    toast('Task moved to Trash', {
        action: {
            label: 'Undo',
            onClick: onUndo,
        },
        duration: 5000,
    });
}
