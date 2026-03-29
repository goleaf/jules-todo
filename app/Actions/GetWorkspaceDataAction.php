<?php

namespace App\Actions;

use App\Models\Category;
use App\Models\Task;
use Illuminate\Support\Collection;

class GetWorkspaceDataAction
{
    public function handle(array $filters = []): array
    {
        $tasks = Task::query()
            ->workspaceData()
            ->inCategory($filters['category_id'] ?? null)
            ->matchingWorkspaceStatus($filters['status'] ?? null)
            ->matchingDueWindow($filters['due'] ?? null)
            ->searching($filters['search'] ?? null)
            ->get();

        return [
            'categories' => Category::query()->ordered()->get(),
            'tasks' => $this->sortTasks($tasks, $filters['sort'] ?? 'manual'),
            'trashed_tasks' => Task::onlyTrashed()->workspaceData()->get(),
        ];
    }

    /**
     * @param  Collection<int, Task>  $tasks
     * @return Collection<int, Task>
     */
    private function sortTasks(Collection $tasks, string $sort): Collection
    {
        return match ($sort) {
            'priority' => $tasks->sortByDesc(fn (Task $task) => $task->priorityRank())->values(),
            'due_asc' => $tasks->sortBy(fn (Task $task) => $task->due_date?->timestamp ?? PHP_INT_MAX)->values(),
            'due_desc' => $tasks->sortByDesc(fn (Task $task) => $task->due_date?->timestamp ?? 0)->values(),
            default => $tasks->values(),
        };
    }
}
