<?php

namespace App\Actions;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportTodoDataAction
{
    /**
     * @param  array{
     *     exported_at?:string|null,
     *     lists:array<int,array{
     *         name:string,
     *         color?:string|null,
     *         sort_order?:int|null,
     *         todos?:array<int,array{
     *             title:string,
     *             description?:string|null,
     *             priority?:string|null,
     *             due_date?:string|null,
     *             is_completed?:bool|null,
     *             completed_at?:string|null,
     *             is_deleted?:bool|null,
     *             deleted_at?:string|null,
     *             sort_order?:int|null
     *         }>
     *     }>
     * }  $payload
     * @return array{imported_lists:int,imported_todos:int}
     */
    public function handle(array $payload): array
    {
        return DB::transaction(function () use ($payload): array {
            $existingLists = TodoList::query()
                ->select([
                    'id',
                    'name',
                    'color',
                    'sort_order',
                    'created_at',
                    'updated_at',
                ])
                ->ordered()
                ->get()
                ->keyBy(fn (TodoList $list) => Str::lower($list->name));

            $nextListSortOrder = ($existingLists->max('sort_order') ?? -1) + 1;
            $importedLists = 0;
            $importedTodos = 0;

            foreach ($payload['lists'] as $listPayload) {
                $normalizedName = Str::lower($listPayload['name']);
                /** @var TodoList|null $list */
                $list = $existingLists->get($normalizedName);

                if (! $list) {
                    $list = TodoList::query()->create([
                        'name' => $listPayload['name'],
                        'color' => $listPayload['color'] ?? '#6366f1',
                        'sort_order' => $nextListSortOrder++,
                    ]);

                    $existingLists->put($normalizedName, $list);
                    $importedLists++;
                }

                $this->importTodosForList(
                    $list,
                    collect($listPayload['todos'] ?? []),
                );

                $importedTodos += count($listPayload['todos'] ?? []);
            }

            return [
                'imported_lists' => $importedLists,
                'imported_todos' => $importedTodos,
            ];
        });
    }

    /**
     * @param  Collection<int,array{
     *     title:string,
     *     description?:string|null,
     *     priority?:string|null,
     *     due_date?:string|null,
     *     is_completed?:bool|null,
     *     completed_at?:string|null,
     *     is_deleted?:bool|null,
     *     deleted_at?:string|null,
     *     sort_order?:int|null
     * }>  $todos
     */
    private function importTodosForList(TodoList $list, Collection $todos): void
    {
        $nextSortOrder = ((int) (
            Todo::query()
                ->where('todo_list_id', $list->getKey())
                ->max('sort_order') ?? -1
        )) + 1;

        foreach ($todos as $todoPayload) {
            Todo::query()->create([
                'todo_list_id' => $list->getKey(),
                'title' => $todoPayload['title'],
                'description' => $todoPayload['description'] ?? null,
                'priority' => $todoPayload['priority'] ?? 'none',
                'due_date' => $todoPayload['due_date'] ?? null,
                'is_completed' => (bool) ($todoPayload['is_completed'] ?? false),
                'completed_at' => $todoPayload['completed_at'] ?? null,
                'is_deleted' => (bool) ($todoPayload['is_deleted'] ?? false),
                'deleted_at' => $todoPayload['deleted_at'] ?? null,
                'sort_order' => $todoPayload['sort_order'] ?? $nextSortOrder++,
            ]);
        }
    }
}
