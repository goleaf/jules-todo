<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends \Tests\TestCase
{
    use RefreshDatabase;

    protected function createList(array $attributes = []): TodoList
    {
        return TodoList::factory()->create($attributes);
    }

    protected function createTodo(array $attributes = []): Todo
    {
        $factory = Todo::factory();

        if (array_key_exists('todo_list_id', $attributes)) {
            return $factory->create($attributes);
        }

        if (($attributes['with_list'] ?? false) === true) {
            unset($attributes['with_list']);

            return $factory->withList()->create($attributes);
        }

        return $factory->create($attributes);
    }

    /**
     * @param  array<int, array{id:int,sort_order:int}>  $items
     */
    protected function reorderPayload(array $items): array
    {
        return ['items' => $items];
    }
}
