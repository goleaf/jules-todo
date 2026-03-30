<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class TodoDataManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_export_endpoint_returns_downloadable_json_with_non_deleted_nested_todos(): void
    {
        $list = TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#f59e0b',
            'sort_order' => 2,
        ]);

        Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Ship settings page',
            'priority' => 'high',
            'sort_order' => 0,
            'is_deleted' => false,
        ]);

        Todo::factory()->for($list, 'todoList')->deleted()->create([
            'title' => 'Do not export me',
        ]);

        $response = $this->getJson('/api/export');

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'application/json')
            ->assertHeader(
                'Content-Disposition',
                'attachment; filename="todoapp-export-'.now()->format('Y-m-d').'.json"',
            )
            ->assertJsonStructure([
                'exported_at',
                'version',
                'lists' => [
                    '*' => [
                        'id',
                        'name',
                        'color',
                        'sort_order',
                        'created_at',
                        'updated_at',
                        'todos' => [
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
                            ],
                        ],
                    ],
                ],
            ])
            ->assertJsonPath('version', '1.0')
            ->assertJsonCount(1, 'lists.0.todos')
            ->assertJsonPath('lists.0.todos.0.title', 'Ship settings page');
    }

    public function test_import_endpoint_accepts_uploaded_json_file_and_skips_trashed_todos(): void
    {
        $existingList = TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#f59e0b',
            'sort_order' => 2,
        ]);

        $payload = [
            'exported_at' => now()->toISOString(),
            'version' => '1.0',
            'lists' => [
                [
                    'id' => 99,
                    'name' => 'Work',
                    'color' => '#f59e0b',
                    'sort_order' => 2,
                    'created_at' => now()->subDay()->toISOString(),
                    'updated_at' => now()->subDay()->toISOString(),
                    'todos' => [
                        [
                            'id' => 501,
                            'title' => 'Imported existing-list todo',
                            'description' => 'Merged into Work',
                            'priority' => 'medium',
                            'due_date' => '2026-04-01',
                            'is_completed' => false,
                            'completed_at' => null,
                            'is_deleted' => false,
                            'deleted_at' => null,
                            'sort_order' => 0,
                        ],
                        [
                            'id' => 502,
                            'title' => 'Skip trashed todo',
                            'description' => null,
                            'priority' => 'low',
                            'due_date' => null,
                            'is_completed' => false,
                            'completed_at' => null,
                            'is_deleted' => true,
                            'deleted_at' => now()->subDay()->toISOString(),
                            'sort_order' => 1,
                        ],
                    ],
                ],
                [
                    'id' => 100,
                    'name' => 'Personal',
                    'color' => '#6366f1',
                    'sort_order' => 1,
                    'created_at' => now()->subDay()->toISOString(),
                    'updated_at' => now()->subDay()->toISOString(),
                    'todos' => [
                        [
                            'id' => 503,
                            'title' => 'Imported new-list todo',
                            'description' => null,
                            'priority' => 'low',
                            'due_date' => null,
                            'is_completed' => false,
                            'completed_at' => null,
                            'is_deleted' => false,
                            'deleted_at' => null,
                            'sort_order' => 0,
                        ],
                    ],
                ],
            ],
        ];

        $file = UploadedFile::fake()->createWithContent(
            'todo-import.json',
            json_encode($payload, JSON_THROW_ON_ERROR),
        );

        $response = $this->post('/api/import', [
            'file' => $file,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('imported_lists', 1)
            ->assertJsonPath('imported_todos', 2);

        $this->assertDatabaseCount('todo_lists', 2);
        $this->assertDatabaseHas('todos', [
            'todo_list_id' => $existingList->getKey(),
            'title' => 'Imported existing-list todo',
        ]);
        $this->assertDatabaseHas('todo_lists', [
            'name' => 'Personal',
        ]);
        $this->assertDatabaseMissing('todos', [
            'title' => 'Skip trashed todo',
        ]);
    }

    public function test_clear_all_data_endpoint_removes_lists_and_todos(): void
    {
        $list = TodoList::factory()->create();
        Todo::factory()->for($list, 'todoList')->count(2)->create();

        $response = $this->deleteJson('/api/data/all');

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'All data cleared',
            ]);

        $this->assertDatabaseCount('todo_lists', 0);
        $this->assertDatabaseCount('todos', 0);
    }
}
