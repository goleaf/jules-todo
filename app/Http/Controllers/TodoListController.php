<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReorderTodoListsRequest;
use App\Http\Requests\StoreTodoListRequest;
use App\Http\Requests\UpdateTodoListRequest;
use App\Http\Resources\TodoListResource;
use App\Models\TodoList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class TodoListController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TodoListResource::collection($this->baseQuery()->get());
    }

    public function store(StoreTodoListRequest $request): JsonResponse|RedirectResponse
    {
        $list = TodoList::query()->create([
            'name' => trim($request->validated('name')),
            'color' => $request->validated('color') ?? '#6366f1',
            'sort_order' => (TodoList::query()->max('sort_order') ?? -1) + 1,
        ]);

        if ($request->header('X-Inertia')) {
            return redirect()
                ->back()
                ->with('success', 'List created successfully.');
        }

        return (new TodoListResource($this->baseQuery()->findOrFail($list->getKey())))
            ->response()
            ->setStatusCode(201);
    }

    public function show(TodoList $list): TodoListResource
    {
        return new TodoListResource($this->baseQuery()->findOrFail($list->getKey()));
    }

    public function update(UpdateTodoListRequest $request, TodoList $list): TodoListResource
    {
        $payload = $request->validated();

        if (array_key_exists('name', $payload)) {
            $payload['name'] = trim($payload['name']);
        }

        if (array_key_exists('color', $payload) && $payload['color'] === null) {
            $payload['color'] = '#6366f1';
        }

        $list->update($payload);

        return new TodoListResource($this->baseQuery()->findOrFail($list->getKey()));
    }

    public function destroy(TodoList $list): JsonResponse
    {
        DB::transaction(function () use ($list): void {
            $list->todos()->delete();
            $list->delete();
        });

        return response()->json(null, 204);
    }

    public function reorder(ReorderTodoListsRequest $request): JsonResponse
    {
        DB::transaction(function () use ($request): void {
            TodoList::query()->upsert(
                $request->validated('items'),
                ['id'],
                ['sort_order'],
            );
        });

        return response()->json([
            'message' => 'Lists reordered successfully.',
        ]);
    }

    private function baseQuery()
    {
        return TodoList::query()
            ->select([
                'id',
                'name',
                'color',
                'sort_order',
                'created_at',
                'updated_at',
            ])
            ->withCount([
                'todos as todos_count' => fn ($query) => $query->notInTrash(),
                'activeTodos as active_todos_count',
            ])
            ->ordered();
    }
}
