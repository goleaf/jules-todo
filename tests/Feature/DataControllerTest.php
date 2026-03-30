<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Http\UploadedFile;

class DataControllerTest extends TestCase
{
    public function test_export_returns_a_downloadable_json_file_with_lists_and_non_deleted_todos(): void
    {
        $list = TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#f59e0b',
        ]);

        Todo::factory()->withList($list)->create([
            'title' => 'Visible task',
            'is_deleted' => false,
        ]);
        Todo::factory()->withList($list)->deleted()->create([
            'title' => 'Hidden task',
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
                        'todos' => [
                            '*' => [
                                'id',
                                'title',
                                'description',
                                'priority',
                                'is_completed',
                                'is_deleted',
                            ],
                        ],
                    ],
                ],
            ])
            ->assertJsonCount(1, 'lists.0.todos')
            ->assertJsonPath('lists.0.todos.0.title', 'Visible task');
    }

    public function test_import_imports_valid_json_merges_existing_lists_skips_deleted_todos_and_returns_counts(): void
    {
        TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#f59e0b',
            'sort_order' => 1,
        ]);

        $payload = [
            'exported_at' => now()->toISOString(),
            'version' => '1.0',
            'lists' => [
                [
                    'name' => 'Work',
                    'color' => '#f59e0b',
                    'sort_order' => 1,
                    'todos' => [
                        [
                            'title' => 'Merged todo',
                            'description' => 'Existing list',
                            'priority' => 'high',
                            'is_completed' => false,
                            'completed_at' => null,
                            'is_deleted' => false,
                            'deleted_at' => null,
                            'due_date' => '2026-04-10',
                            'sort_order' => 0,
                        ],
                        [
                            'title' => 'Skip deleted',
                            'description' => null,
                            'priority' => 'low',
                            'is_completed' => false,
                            'completed_at' => null,
                            'is_deleted' => true,
                            'deleted_at' => now()->subDay()->toISOString(),
                            'due_date' => null,
                            'sort_order' => 1,
                        ],
                    ],
                ],
                [
                    'name' => 'Personal',
                    'color' => '#6366f1',
                    'sort_order' => 2,
                    'todos' => [
                        [
                            'title' => 'Imported todo',
                            'description' => null,
                            'priority' => 'medium',
                            'is_completed' => true,
                            'completed_at' => now()->toISOString(),
                            'is_deleted' => false,
                            'deleted_at' => null,
                            'due_date' => null,
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

        $this->post('/api/import', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('imported_lists', 1)
            ->assertJsonPath('imported_todos', 2);

        $this->assertDatabaseCount('todo_lists', 2);
        $this->assertDatabaseHas('todos', ['title' => 'Merged todo']);
        $this->assertDatabaseHas('todos', ['title' => 'Imported todo']);
        $this->assertDatabaseMissing('todos', ['title' => 'Skip deleted']);
    }

    public function test_import_returns_422_for_invalid_json_structure(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'todo-import.json',
            json_encode(['version' => '1.0'], JSON_THROW_ON_ERROR),
        );

        $this->post('/api/import', ['file' => $file])
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'The import file must contain a top-level lists array.',
            );
    }

    public function test_clear_all_deletes_all_todos_and_lists_and_returns_a_success_message(): void
    {
        $list = TodoList::factory()->create();
        Todo::factory()->count(2)->withList($list)->create();

        $this->deleteJson('/api/data/all')
            ->assertOk()
            ->assertJson([
                'message' => 'All data cleared',
            ]);

        $this->assertDatabaseCount('todo_lists', 0);
        $this->assertDatabaseCount('todos', 0);
    }
}
