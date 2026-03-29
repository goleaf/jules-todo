<?php

namespace App\Actions;

use App\Models\Task;
use Illuminate\Support\Collection;

class ReorderTasksAction
{
    /**
     * @param  string[]  $taskIds
     * @return Collection<int, Task>
     */
    public function handle(string $categoryId, array $taskIds): Collection
    {
        foreach ($taskIds as $index => $taskId) {
            Task::query()
                ->whereKey($taskId)
                ->where('category_id', $categoryId)
                ->update(['sort_order' => $index]);
        }

        return Task::query()
            ->workspaceData()
            ->where('category_id', $categoryId)
            ->whereIn('id', $taskIds)
            ->get()
            ->sortBy('sort_order')
            ->values();
    }
}
