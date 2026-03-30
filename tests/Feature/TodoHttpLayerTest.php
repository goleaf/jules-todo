<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoHttpLayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_list_routes_follow_the_expected_resource_contract(): void
    {
        $list = TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#f59e0b',
            'sort_order' => 2,
        ]);

        Todo::factory()->for($list, 'todoList')->create([
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        Todo::factory()->for($list, 'todoList')->completed()->create([
            'is_deleted' => false,
        ]);

        $this->getJson('/api/lists')
            ->assertOk()
            ->assertJsonStructure([
                'lists' => [
                    '*' => [
                        'id',
                        'name',
                        'color',
                        'sort_order',
                        'todos_count',
                        'active_todos_count',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ])
            ->assertJsonPath('lists.0.todos_count', 2)
            ->assertJsonPath('lists.0.active_todos_count', 1);

        $created = $this->postJson('/api/lists', [
            'name' => ' Ideas ',
            'color' => '#ec4899',
        ]);

        $created
            ->assertCreated()
            ->assertJsonPath('data.name', 'Ideas')
            ->assertJsonPath('data.color', '#ec4899');

        $updated = $this->patchJson('/api/lists/'.$list->getKey(), [
            'name' => 'Work Ops',
        ]);

        $updated
            ->assertOk()
            ->assertJsonPath('data.name', 'Work Ops');

        $reorder = $this->postJson('/api/lists/reorder', [
            'items' => [
                ['id' => $list->getKey(), 'sort_order' => 8],
            ],
        ]);

        $reorder
            ->assertOk()
            ->assertJson([
                'message' => 'Lists reordered successfully',
            ]);

        $destroy = $this->deleteJson('/api/lists/'.$list->getKey());

        $destroy->assertNoContent();
        $this->assertDatabaseMissing('todo_lists', ['id' => $list->getKey()]);
        $this->assertDatabaseMissing('todos', ['todo_list_id' => $list->getKey()]);
    }

    public function test_todo_routes_follow_the_expected_resource_and_bulk_contracts(): void
    {
        $list = TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#f59e0b',
            'sort_order' => 2,
        ]);

        $todo = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Draft release notes',
            'description' => 'Summarize shipped items',
            'priority' => 'medium',
            'is_completed' => false,
            'is_deleted' => false,
            'due_date' => now()->toDateString(),
            'sort_order' => 3,
        ]);

        $secondTodo = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Prepare hiring plan',
            'priority' => 'high',
            'is_completed' => false,
            'is_deleted' => false,
            'sort_order' => 4,
        ]);

        $this->getJson('/api/todos?list_id=today&status=active&due_date_filter=today&priority_filter=medium&search=release&sort=manual')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
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
                        'list',
                    ],
                ],
                'links',
                'meta',
            ])
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $todo->getKey())
            ->assertJsonPath('data.0.list.id', $list->getKey());

        $created = $this->postJson('/api/todos', [
            'title' => '  New API task  ',
            'description' => '  Prepared from request  ',
            'todo_list_id' => $list->getKey(),
        ]);

        $created
            ->assertCreated()
            ->assertJsonPath('data.title', 'New API task')
            ->assertJsonPath('data.priority', 'none');

        $this->getJson('/api/todos/'.$todo->getKey())
            ->assertOk()
            ->assertJsonPath('data.id', $todo->getKey())
            ->assertJsonPath('data.list.id', $list->getKey());

        $updated = $this->patchJson('/api/todos/'.$todo->getKey(), [
            'is_completed' => true,
            'priority' => 'high',
        ]);

        $updated
            ->assertOk()
            ->assertJsonPath('data.is_completed', true)
            ->assertJsonPath('data.priority', 'high');

        $deleted = $this->deleteJson('/api/todos/'.$todo->getKey());

        $deleted
            ->assertOk()
            ->assertJsonPath('data.is_deleted', true);

        $restored = $this->postJson('/api/todos/'.$todo->getKey().'/restore');

        $restored
            ->assertOk()
            ->assertJsonPath('data.is_deleted', false);

        $bulk = $this->postJson('/api/todos/bulk', [
            'action' => 'set_priority',
            'todo_ids' => [$todo->getKey(), $secondTodo->getKey()],
            'priority' => 'low',
        ]);

        $bulk
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.priority', 'low');

        $reorder = $this->postJson('/api/todos/reorder', [
            'items' => [
                ['id' => $todo->getKey(), 'sort_order' => 10],
                ['id' => $secondTodo->getKey(), 'sort_order' => 11],
            ],
        ]);

        $reorder
            ->assertOk()
            ->assertJson([
                'message' => 'Todos reordered successfully',
            ]);

        $this->deleteJson('/api/todos/'.$todo->getKey());
        $this->deleteJson('/api/todos/'.$secondTodo->getKey());

        $emptyTrash = $this->deleteJson('/api/todos/trash/empty');

        $emptyTrash
            ->assertOk()
            ->assertJsonPath('count', 2)
            ->assertJsonPath('message', '2 tasks permanently deleted');

        $trashedTodo = Todo::factory()->for($list, 'todoList')->deleted()->create();

        $this->deleteJson('/api/todos/'.$trashedTodo->getKey().'/permanent')
            ->assertNoContent();
    }
}
