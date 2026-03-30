<?php

namespace App\Actions;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Support\Facades\DB;

class ClearTodoDataAction
{
    /**
     * @return array{deleted_lists:int,deleted_todos:int}
     */
    public function handle(): array
    {
        return DB::transaction(function (): array {
            $deletedTodos = Todo::query()->count();
            $deletedLists = TodoList::query()->count();

            Todo::query()->delete();
            TodoList::query()->delete();

            return [
                'deleted_lists' => $deletedLists,
                'deleted_todos' => $deletedTodos,
            ];
        });
    }
}
