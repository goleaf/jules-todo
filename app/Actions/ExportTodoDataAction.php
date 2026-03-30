<?php

namespace App\Actions;

use App\Models\TodoList;
use Illuminate\Support\Collection;

class ExportTodoDataAction
{
    /**
     * @return array{exported_at:string,lists:Collection<int,TodoList>}
     */
    public function handle(): array
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
                    ->orderBy('sort_order')
                    ->orderBy('created_at'),
            ])
            ->ordered()
            ->get();

        return [
            'exported_at' => now()->toISOString(),
            'lists' => $lists,
        ];
    }
}
