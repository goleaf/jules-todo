<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkTodoActionRequest;
use App\Http\Requests\FilterTodosRequest;
use App\Http\Requests\ReorderTodosRequest;
use App\Http\Requests\StoreTodoRequest;
use App\Http\Requests\UpdateTodoRequest;
use App\Http\Resources\TodoResource;
use App\Models\Todo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TodoController extends Controller
{
    public function index(FilterTodosRequest $request): AnonymousResourceCollection
    {
        return TodoResource::collection(
            $this->paginatedTodos($request),
        );
    }

    public function indexPage(FilterTodosRequest $request): InertiaResponse
    {
        return Inertia::render('Tasks/Index', [
            'todos' => TodoResource::collection($this->paginatedTodos($request)),
            'filters' => $request->safe()->only([
                'list_id',
                'status',
                'due_date_filter',
                'priority_filter',
                'sort_by',
                'search',
            ]),
        ]);
    }

    public function store(StoreTodoRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $listId = $validated['todo_list_id'] ?? null;

        $todo = Todo::query()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'todo_list_id' => $listId,
            'priority' => $validated['priority'] ?? 'none',
            'due_date' => $validated['due_date'] ?? null,
            'sort_order' => $this->nextSortOrder($listId),
            'is_completed' => false,
            'completed_at' => null,
            'is_deleted' => false,
            'deleted_at' => null,
        ]);

        return (new TodoResource($this->findTodo($todo->getKey())))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Todo $todo): TodoResource
    {
        return new TodoResource($this->findTodo($todo->getKey()));
    }

    public function update(UpdateTodoRequest $request, Todo $todo): TodoResource
    {
        $validated = $request->validated();
        $completionState = Arr::pull($validated, 'is_completed');

        if (array_key_exists('title', $validated) && $validated['title'] === null) {
            unset($validated['title']);
        }

        if (array_key_exists('priority', $validated) && $validated['priority'] === null) {
            $validated['priority'] = 'none';
        }

        if (array_key_exists('todo_list_id', $validated) && $validated['todo_list_id'] !== $todo->todo_list_id) {
            $validated['sort_order'] = $this->nextSortOrder($validated['todo_list_id']);
        }

        if ($validated !== []) {
            $todo->fill($validated);
            $todo->save();
        }

        if ($completionState === true && ! $todo->is_completed) {
            $todo->complete();
        }

        if ($completionState === false && $todo->is_completed) {
            $todo->uncomplete();
        }

        return new TodoResource($this->findTodo($todo->getKey()));
    }

    public function destroy(Todo $todo): TodoResource
    {
        $todo->moveToTrash();

        return new TodoResource($this->findTodo($todo->getKey()));
    }

    public function restore(Todo $todo): TodoResource
    {
        $todo->restore();

        return new TodoResource($this->findTodo($todo->getKey()));
    }

    public function destroyPermanently(Todo $todo): JsonResponse
    {
        $todo->delete();

        return response()->json(null, 204);
    }

    public function bulkAction(BulkTodoActionRequest $request): AnonymousResourceCollection
    {
        $ids = $request->validated('todo_ids');
        $action = $request->validated('action');
        $targetListId = $request->validated('list_id');
        $priority = $request->validated('priority');

        DB::transaction(function () use ($ids, $action, $targetListId, $priority): void {
            $todos = Todo::query()
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
                ->whereKey($ids)
                ->get()
                ->keyBy('id');

            $nextSortOrder = $action === 'move'
                ? $this->nextSortOrder($targetListId)
                : null;

            foreach ($ids as $id) {
                /** @var Todo $todo */
                $todo = $todos->get($id);

                switch ($action) {
                    case 'complete':
                        $todo->complete();
                        break;

                    case 'uncomplete':
                        $todo->uncomplete();
                        break;

                    case 'delete':
                        $todo->moveToTrash();
                        break;

                    case 'restore':
                        $todo->restore();
                        break;

                    case 'move':
                        $this->moveTodoToList($todo, $targetListId, $nextSortOrder++);
                        break;

                    case 'set_priority':
                        $this->setTodoPriority($todo, $priority);
                        break;
                }
            }
        });

        return TodoResource::collection($this->findTodosByIds($ids));
    }

    public function reorder(ReorderTodosRequest $request): JsonResponse
    {
        DB::transaction(function () use ($request): void {
            Todo::query()->upsert(
                $request->validated('items'),
                ['id'],
                ['sort_order'],
            );
        });

        return response()->json([
            'message' => 'Todos reordered successfully.',
        ]);
    }

    public function emptyTrash(): JsonResponse
    {
        $deleted = DB::transaction(function (): int {
            $query = Todo::query()->inTrash();
            $count = $query->count();
            $query->delete();

            return $count;
        });

        return response()->json([
            'deleted' => $deleted,
        ]);
    }

    private function baseQuery()
    {
        return Todo::query()
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
            ->with([
                'list:id,name,color,sort_order,created_at,updated_at',
            ]);
    }

    private function applyFilters(FilterTodosRequest $request)
    {
        $query = $this->baseQuery();
        $listId = $request->validated('list_id');
        $status = $request->validated('status', 'all');
        $dueDateFilter = $request->validated('due_date_filter');
        $priorityFilter = $request->validated('priority_filter');
        $search = $request->validated('search');

        if ($listId === 'trash') {
            $query->inTrash();
        } elseif ($listId === 'today') {
            $query->dueToday();
        } elseif ($listId === null || $listId === 'all') {
            $query->notInTrash();
        } else {
            $query
                ->notInTrash()
                ->where('todo_list_id', (int) $listId);
        }

        if ($listId !== 'trash') {
            match ($status) {
                'active' => $query->active(),
                'completed' => $query->completed(),
                default => null,
            };

            if (! in_array($listId, ['today'], true)) {
                $query->byDueDateFilter($dueDateFilter);
            }
        }

        $query
            ->byPriority($priorityFilter)
            ->search($search);

        return $query;
    }

    private function paginatedTodos(FilterTodosRequest $request): LengthAwarePaginator
    {
        $query = $this->applyFilters($request);
        $sortBy = $request->validated('sort_by', 'manual');

        if ($sortBy === 'priority') {
            return $this->paginateCollection(
                $query->get()->sortByDesc(fn (Todo $todo) => $todo->priorityRank())->values(),
                50,
                $request,
            );
        }

        match ($sortBy) {
            'due_date' => $query->orderBy('due_date')->orderBy('sort_order'),
            'title_asc' => $query->orderBy('title'),
            'title_desc' => $query->orderByDesc('title'),
            'created_at' => $query->orderByDesc('created_at'),
            'completed_at' => $query->orderByDesc('completed_at'),
            default => $query->orderBy('sort_order')->orderByDesc('created_at'),
        };

        return $query->paginate(50)->withQueryString();
    }

    private function paginateCollection(Collection $items, int $perPage, FilterTodosRequest $request): LengthAwarePaginator
    {
        $page = LengthAwarePaginator::resolveCurrentPage();

        return new LengthAwarePaginator(
            $items->forPage($page, $perPage)->values(),
            $items->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ],
        );
    }

    private function nextSortOrder(?int $listId): int
    {
        return (Todo::query()
            ->notInTrash()
            ->when(
                $listId === null,
                fn ($query) => $query->whereNull('todo_list_id'),
                fn ($query) => $query->where('todo_list_id', $listId),
            )
            ->max('sort_order') ?? -1) + 1;
    }

    private function moveTodoToList(Todo $todo, ?int $listId, int $sortOrder): void
    {
        $todo->todo_list_id = $listId;
        $todo->sort_order = $sortOrder;
        $todo->save();
    }

    private function setTodoPriority(Todo $todo, string $priority): void
    {
        $todo->priority = $priority;
        $todo->save();
    }

    private function findTodo(int $id): Todo
    {
        return $this->baseQuery()->findOrFail($id);
    }

    private function findTodosByIds(array $ids): Collection
    {
        return $this->baseQuery()
            ->whereKey($ids)
            ->get()
            ->sortBy(fn (Todo $todo) => array_search($todo->getKey(), $ids, true))
            ->values();
    }
}
