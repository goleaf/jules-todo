<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Models\TodoList;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class DataController extends Controller
{
    public function export(): JsonResponse
    {
        $lists = TodoList::query()
            ->select([
                'id',
                'name',
                'color',
                'sort_order',
                'created_at',
                'updated_at',
            ])
            ->with([
                'todos' => fn ($query) => $query
                    ->select([
                        'id',
                        'todo_list_id',
                        'title',
                        'description',
                        'is_completed',
                        'completed_at',
                        'priority',
                        'due_date',
                        'sort_order',
                        'is_deleted',
                        'deleted_at',
                        'created_at',
                        'updated_at',
                    ])
                    ->notInTrash()
                    ->ordered('manual'),
            ])
            ->ordered()
            ->get();

        $payload = [
            'exported_at' => now()->toISOString(),
            'version' => '1.0',
            'lists' => $lists->map(function (TodoList $list): array {
                return [
                    'id' => (int) $list->getKey(),
                    'name' => $list->name,
                    'color' => $list->color,
                    'sort_order' => (int) $list->sort_order,
                    'created_at' => $list->created_at?->toISOString(),
                    'updated_at' => $list->updated_at?->toISOString(),
                    'todos' => $list->todos->map(function (Todo $todo): array {
                        return [
                            'id' => (int) $todo->getKey(),
                            'todo_list_id' => $todo->todo_list_id ? (int) $todo->todo_list_id : null,
                            'title' => $todo->title,
                            'description' => $todo->description,
                            'is_completed' => (bool) $todo->is_completed,
                            'completed_at' => $todo->completed_at?->toISOString(),
                            'priority' => $todo->priority,
                            'due_date' => $todo->due_date?->toDateString(),
                            'sort_order' => (int) $todo->sort_order,
                            'is_deleted' => (bool) $todo->is_deleted,
                            'deleted_at' => $todo->deleted_at?->toISOString(),
                            'created_at' => $todo->created_at?->toISOString(),
                            'updated_at' => $todo->updated_at?->toISOString(),
                        ];
                    })->values()->all(),
                ];
            })->values()->all(),
        ];

        return response()->json(
            $payload,
            200,
            [
                'Content-Disposition' => 'attachment; filename="todoapp-export-'.now()->format('Y-m-d').'.json"',
                'Content-Type' => 'application/json',
            ],
        );
    }

    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:json', 'max:5120'],
        ]);

        $contents = $validated['file']->get();
        $payload = json_decode($contents, true);

        if (! is_array($payload) || ! isset($payload['lists']) || ! is_array($payload['lists'])) {
            return response()->json([
                'message' => 'The import file must contain a top-level lists array.',
            ], 422);
        }

        [$importedLists, $importedTodos] = DB::transaction(function () use ($payload): array {
            $importedLists = 0;
            $importedTodos = 0;

            foreach ($payload['lists'] as $listPayload) {
                if (! is_array($listPayload) || ! is_string($listPayload['name'] ?? null)) {
                    continue;
                }

                $existingList = TodoList::query()
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($listPayload['name']))])
                    ->first();

                $list = $existingList;

                if (! $list instanceof TodoList) {
                    $list = TodoList::query()->create([
                        'name' => trim($listPayload['name']),
                        'color' => $listPayload['color'] ?? '#6366f1',
                        'sort_order' => (int) ($listPayload['sort_order'] ?? 0),
                    ]);
                    $importedLists++;
                }

                foreach (($listPayload['todos'] ?? []) as $todoPayload) {
                    if (! is_array($todoPayload) || ($todoPayload['is_deleted'] ?? false) === true) {
                        continue;
                    }

                    Todo::query()->create([
                        'todo_list_id' => $list->getKey(),
                        'title' => trim((string) ($todoPayload['title'] ?? '')),
                        'description' => $todoPayload['description'] ?? null,
                        'is_completed' => (bool) ($todoPayload['is_completed'] ?? false),
                        'completed_at' => $todoPayload['completed_at'] ?? null,
                        'priority' => $todoPayload['priority'] ?? 'none',
                        'due_date' => $todoPayload['due_date'] ?? null,
                        'sort_order' => (int) ($todoPayload['sort_order'] ?? 0),
                        'is_deleted' => false,
                        'deleted_at' => null,
                    ]);

                    $importedTodos++;
                }
            }

            return [$importedLists, $importedTodos];
        });

        return response()->json([
            'imported_lists' => $importedLists,
            'imported_todos' => $importedTodos,
        ]);
    }

    public function clearAll(): JsonResponse
    {
        DB::transaction(function (): void {
            Todo::query()->delete();
            TodoList::query()->delete();
        });

        return response()->json([
            'message' => 'All data cleared',
        ]);
    }
}
