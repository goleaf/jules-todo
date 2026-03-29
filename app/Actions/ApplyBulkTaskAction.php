<?php

namespace App\Actions;

use App\Models\Task;
use Illuminate\Support\Collection;

class ApplyBulkTaskAction
{
    public function handle(array $taskIds, string $action, ?string $categoryId = null): array
    {
        $tasks = Task::query()
            ->workspaceData()
            ->whereIn('id', $taskIds)
            ->get()
            ->values();

        return match ($action) {
            'complete' => ['tasks' => $this->update($tasks, ['is_completed' => true, 'status' => 'done'])],
            'uncomplete' => ['tasks' => $this->update($tasks, ['is_completed' => false, 'status' => 'todo'])],
            'move' => ['tasks' => $this->update($tasks, ['category_id' => $categoryId])],
            'delete' => ['deleted' => $this->delete($tasks)],
            default => ['tasks' => collect()],
        };
    }

    /**
     * @param  Collection<int, Task>  $tasks
     * @return Collection<int, Task>
     */
    private function update(Collection $tasks, array $attributes): Collection
    {
        return $tasks->map(function (Task $task) use ($attributes): Task {
            $task->update($attributes);

            return $task->fresh()->loadMissing('category:id,name,color,icon');
        });
    }

    /**
     * @param  Collection<int, Task>  $tasks
     */
    private function delete(Collection $tasks): int
    {
        $deleted = $tasks->count();

        $tasks->each->delete();

        return $deleted;
    }
}
