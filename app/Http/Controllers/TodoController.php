<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkTodoActionRequest;
use App\Http\Requests\ReorderRequest;
use App\Http\Requests\StoreTodoRequest;
use App\Http\Requests\UpdateTodoRequest;
use App\Http\Resources\TodoResource;
use App\Models\Todo;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TodoController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'list_id' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'due_date_filter' => ['nullable', 'string'],
            'priority_filter' => ['nullable', 'string'],
            'search' => ['nullable', 'string'],
            'sort' => ['nullable', 'string'],
            'sort_by' => ['nullable', 'string'],
        ]);

        $listId = $validated['list_id'] ?? null;
        $isTrashView = $listId === 'trash';

        $query = Todo::query()
            ->select($this->todoColumns())
            ->with(['list:id,name,color,sort_order,created_at,updated_at']);

        if ($isTrashView) {
            $query->inTrash();
        } else {
            $query->notInTrash();

            if ($listId === 'today') {
                $query->dueToday();
            } elseif ($listId !== null && $listId !== '' && $listId !== 'all') {
                $query->where('todo_list_id', (int) $listId);
            }

            $status = $validated['status'] ?? null;

            if ($status === 'active') {
                $query->where('is_completed', false);
            }

            if ($status === 'completed') {
                $query->where('is_completed', true);
            }

            if (array_key_exists('due_date_filter', $validated)) {
                $query->byDueDateFilter($validated['due_date_filter']);
            }

            if (($validated['priority_filter'] ?? 'any') !== 'any') {
                $query->byPriority($validated['priority_filter']);
            }

            if (trim((string) ($validated['search'] ?? '')) !== '') {
                $query->search($validated['search']);
            }
        }

        $sortOption = $validated['sort'] ?? $validated['sort_by'] ?? 'manual';

        return TodoResource::collection(
            $query
                ->ordered($sortOption)
                ->paginate(50)
                ->withQueryString(),
        );
    }

    public function store(StoreTodoRequest $request): JsonResponse
    {
        $todo = Todo::query()->create([
            'title' => $request->validated('title'),
            'description' => $request->validated('description'),
            'todo_list_id' => $request->validated('todo_list_id'),
            'priority' => $request->validated('priority', 'none'),
            'due_date' => $request->validated('due_date'),
            'is_completed' => false,
            'completed_at' => null,
            'is_deleted' => false,
            'deleted_at' => null,
        ]);

        return (new TodoResource($todo->load('list')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Todo $todo): TodoResource
    {
        return new TodoResource($todo->load('list'));
    }

    public function update(UpdateTodoRequest $request, Todo $todo): TodoResource
    {
        $fields = $request->validated();
        $completionState = Arr::pull($fields, 'is_completed');

        if (array_key_exists('title', $fields) && $fields['title'] === null) {
            unset($fields['title']);
        }

        if (array_key_exists('priority', $fields) && $fields['priority'] === null) {
            $fields['priority'] = 'none';
        }

        if (
            array_key_exists('todo_list_id', $fields)
            && $fields['todo_list_id'] !== $todo->todo_list_id
            && ! array_key_exists('sort_order', $fields)
        ) {
            $fields['sort_order'] = $this->nextSortOrder(
                $fields['todo_list_id'] !== null ? (int) $fields['todo_list_id'] : null,
            );
        }

        if ($completionState === true && ! $todo->is_completed) {
            $todo->complete();
        }

        if ($completionState === false && $todo->is_completed) {
            $todo->uncomplete();
        }

        if ($fields !== []) {
            $todo->update($fields);
        }

        return new TodoResource($todo->fresh()->load('list'));
    }

    public function destroy(Todo $todo): TodoResource
    {
        $todo->moveToTrash();

        return new TodoResource($todo->fresh()->load('list'));
    }

    public function restore(Todo $todo): JsonResponse|TodoResource
    {
        if (! $todo->is_deleted) {
            return response()->json([
                'message' => 'This task is not in trash',
            ], 422);
        }

        $todo->restore();

        return new TodoResource($todo->fresh()->load('list'));
    }

    public function destroyPermanently(Todo $todo): JsonResponse
    {
        if (! $todo->is_deleted) {
            return response()->json([
                'message' => 'This task is not in trash',
            ], 422);
        }

        $todo->delete();

        return response()->json(null, 204);
    }

    public function bulkAction(BulkTodoActionRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $ids = array_values($validated['todo_ids']);
        $action = $validated['action'];
        $targetListId = $validated['list_id'] ?? null;
        $priority = $validated['priority'] ?? null;

        if (
            $action === 'permanent_delete'
            && Todo::query()
                ->whereIn('id', $ids)
                ->where('is_deleted', false)
                ->exists()
        ) {
            return response()->json([
                'message' => 'Only trashed tasks can be permanently deleted.',
            ], 422);
        }

        $updatedIds = DB::transaction(function () use ($action, $ids, $priority, $targetListId): array {
            /** @var Collection<int, Todo> $todos */
            $todos = Todo::query()
                ->select($this->todoColumns())
                ->whereIn('id', $ids)
                ->get()
                ->keyBy('id');

            $nextSortOrder = $action === 'move'
                ? $this->nextSortOrder($targetListId !== null ? (int) $targetListId : null)
                : null;

            foreach ($ids as $id) {
                $todo = $todos->get($id);

                if (! $todo instanceof Todo) {
                    continue;
                }

                switch ($action) {
                    case 'complete':
                        if (! $todo->is_completed) {
                            $todo->complete();
                        }
                        break;
                    case 'uncomplete':
                        if ($todo->is_completed) {
                            $todo->uncomplete();
                        }
                        break;
                    case 'delete':
                        if (! $todo->is_deleted) {
                            $todo->moveToTrash();
                        }
                        break;
                    case 'restore':
                        if ($todo->is_deleted) {
                            $todo->restore();
                        }
                        break;
                    case 'permanent_delete':
                        $todo->delete();
                        break;
                    case 'move':
                        $todo->update([
                            'todo_list_id' => $targetListId,
                            'sort_order' => $nextSortOrder++,
                        ]);
                        break;
                    case 'set_priority':
                        $todo->update([
                            'priority' => $priority,
                        ]);
                        break;
                }
            }

            return $action === 'permanent_delete'
                ? []
                : $ids;
        });

        if ($updatedIds === []) {
            return response()->json([
                'data' => [],
            ]);
        }

        return response()->json([
            'data' => TodoResource::collection(
                Todo::query()
                    ->select($this->todoColumns())
                    ->with(['list:id,name,color,sort_order,created_at,updated_at'])
                    ->whereIn('id', $updatedIds)
                    ->ordered('manual')
                    ->get(),
            )->resolve($request),
        ]);
    }

    public function reorder(ReorderRequest $request): JsonResponse
    {
        DB::transaction(function () use ($request): void {
            foreach ($request->validated('items') as $item) {
                Todo::query()
                    ->where('id', $item['id'])
                    ->update([
                        'sort_order' => $item['sort_order'],
                    ]);
            }
        });

        return response()->json([
            'message' => 'Todos reordered successfully',
        ]);
    }

    public function emptyTrash(): JsonResponse
    {
        $count = DB::transaction(function (): int {
            $query = Todo::query()->inTrash();
            $count = $query->count();
            $query->delete();

            return $count;
        });

        return response()->json([
            'message' => $count.' tasks permanently deleted',
            'count' => $count,
        ]);
    }

    /**
     * @return array<int, string>
     */
    private function todoColumns(): array
    {
        return [
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
        ];
    }

    private function nextSortOrder(?int $listId): int
    {
        return ((int) (Todo::query()
            ->when(
                $listId === null,
                fn (Builder $query) => $query->whereNull('todo_list_id'),
                fn (Builder $query) => $query->where('todo_list_id', $listId),
            )
            ->max('sort_order') ?? -1)) + 1;
    }
}
