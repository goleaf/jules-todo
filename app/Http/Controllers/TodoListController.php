<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReorderRequest;
use App\Http\Requests\StoreTodoListRequest;
use App\Http\Requests\UpdateTodoListRequest;
use App\Http\Resources\TodoListResource;
use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TodoListController extends Controller
{
    private const DEFAULT_COLOR = '#6366f1';

    private const NEW_LIST_COLOR_PALETTE = [
        '#6366f1',
        '#f59e0b',
        '#10b981',
        '#ef4444',
        '#3b82f6',
        '#8b5cf6',
        '#ec4899',
        '#14b8a6',
        '#f97316',
        '#06b6d4',
        '#84cc16',
        '#a855f7',
    ];

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'lists' => TodoListResource::collection(
                TodoList::query()->forSidebar()->get(),
            )->resolve($request),
        ]);
    }

    public function store(StoreTodoListRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $list = TodoList::query()->create([
            'name' => $validated['name'],
            'color' => $validated['color'] ?? $this->randomPaletteColor(),
            'sort_order' => ((int) (TodoList::query()->max('sort_order') ?? 0)) + 1,
        ]);

        return (new TodoListResource(
            TodoList::query()->forSidebar()->findOrFail($list->getKey()),
        ))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateTodoListRequest $request, TodoList $list): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('color', $validated) && $validated['color'] === null) {
            $validated['color'] = self::DEFAULT_COLOR;
        }

        if ($validated !== []) {
            $list->update($validated);
        }

        return (new TodoListResource(
            TodoList::query()->forSidebar()->findOrFail($list->getKey()),
        ))->response();
    }

    public function destroy(TodoList $list): JsonResponse
    {
        DB::transaction(function () use ($list): void {
            Todo::query()
                ->where('todo_list_id', $list->getKey())
                ->delete();

            $list->delete();
        });

        return response()->json(null, 204);
    }

    public function reorder(ReorderRequest $request): JsonResponse
    {
        DB::transaction(function () use ($request): void {
            foreach ($request->validated('items') as $item) {
                TodoList::query()
                    ->where('id', $item['id'])
                    ->update([
                        'sort_order' => $item['sort_order'],
                    ]);
            }
        });

        return response()->json([
            'message' => 'Lists reordered successfully',
        ]);
    }

    private function randomPaletteColor(): string
    {
        return self::NEW_LIST_COLOR_PALETTE[array_rand(self::NEW_LIST_COLOR_PALETTE)];
    }
}
