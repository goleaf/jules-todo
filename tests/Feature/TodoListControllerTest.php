<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;

class TodoListControllerTest extends TestCase
{
    public function test_index_returns_all_lists_with_counts_ordered_by_sort_order_and_json_structure(): void
    {
        $second = TodoList::factory()->create([
            'name' => 'Second',
            'sort_order' => 2,
        ]);
        $first = TodoList::factory()->create([
            'name' => 'First',
            'sort_order' => 1,
        ]);

        Todo::factory()->count(2)->withList($first)->create([
            'is_deleted' => false,
            'is_completed' => false,
        ]);
        Todo::factory()->withList($first)->completed()->create([
            'is_deleted' => false,
        ]);
        Todo::factory()->withList($first)->deleted()->create();
        Todo::factory()->withList($second)->create([
            'is_deleted' => false,
            'is_completed' => false,
        ]);

        $response = $this->getJson('/api/lists');

        $response
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
            ->assertJsonPath('lists.0.id', $first->id)
            ->assertJsonPath('lists.1.id', $second->id)
            ->assertJsonPath('lists.0.todos_count', 3)
            ->assertJsonPath('lists.0.active_todos_count', 2);
    }

    public function test_store_creates_a_list_with_valid_data_and_returns_201(): void
    {
        $response = $this->postJson('/api/lists', [
            'name' => 'Work',
            'color' => '#3b82f6',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Work')
            ->assertJsonPath('data.color', '#3b82f6')
            ->assertJsonPath('data.sort_order', 1);

        $this->assertDatabaseHas('todo_lists', [
            'name' => 'Work',
            'color' => '#3b82f6',
            'sort_order' => 1,
        ]);
    }

    public function test_store_validates_name_uniqueness_color_and_auto_defaults(): void
    {
        TodoList::factory()->create([
            'name' => 'Personal',
            'sort_order' => 4,
        ]);

        $this->postJson('/api/lists', [
            'color' => '#3b82f6',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->postJson('/api/lists', [
            'name' => str_repeat('a', 51),
            'color' => '#3b82f6',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->postJson('/api/lists', [
            'name' => 'personal',
            'color' => '#3b82f6',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->postJson('/api/lists', [
            'name' => 'Errands',
            'color' => 'blue',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['color']);

        $response = $this->postJson('/api/lists', [
            'name' => 'Inbox',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.name', 'Inbox')
            ->assertJsonPath('data.sort_order', 5);

        $this->assertMatchesRegularExpression(
            '/^#[0-9A-Fa-f]{6}$/',
            (string) $response->json('data.color'),
        );
    }

    public function test_update_updates_a_list_and_allows_renaming_to_the_same_name(): void
    {
        $list = TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#6366f1',
        ]);

        $this->patchJson('/api/lists/'.$list->id, [
            'name' => 'Operations',
            'color' => '#10b981',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Operations')
            ->assertJsonPath('data.color', '#10b981');

        $this->patchJson('/api/lists/'.$list->id, [
            'name' => 'Operations',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Operations');

        $this->patchJson('/api/lists/999999', [
            'name' => 'Missing',
        ])->assertNotFound();
    }

    public function test_destroy_deletes_a_list_and_its_todos_and_returns_404_for_missing_list(): void
    {
        $list = TodoList::factory()->create();
        Todo::factory()->count(3)->withList($list)->create();

        $this->deleteJson('/api/lists/'.$list->id)->assertNoContent();

        $this->assertDatabaseMissing('todo_lists', ['id' => $list->id]);
        $this->assertDatabaseCount('todos', 0);

        $this->deleteJson('/api/lists/999999')->assertNotFound();
    }

    public function test_reorder_updates_sort_order_for_multiple_lists_in_one_request(): void
    {
        $first = TodoList::factory()->create(['sort_order' => 1]);
        $second = TodoList::factory()->create(['sort_order' => 2]);
        $third = TodoList::factory()->create(['sort_order' => 3]);

        $this->postJson('/api/lists/reorder', $this->reorderPayload([
            ['id' => $first->id, 'sort_order' => 3],
            ['id' => $second->id, 'sort_order' => 1],
            ['id' => $third->id, 'sort_order' => 2],
        ]))
            ->assertOk()
            ->assertJson([
                'message' => 'Lists reordered successfully',
            ]);

        $this->assertDatabaseHas('todo_lists', ['id' => $first->id, 'sort_order' => 3]);
        $this->assertDatabaseHas('todo_lists', ['id' => $second->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('todo_lists', ['id' => $third->id, 'sort_order' => 2]);
    }
}
