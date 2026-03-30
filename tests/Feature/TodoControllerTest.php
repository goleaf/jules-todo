<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;
use Carbon\Carbon;

class TodoControllerTest extends TestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_index_returns_all_non_trashed_todos_with_paginated_structure_by_default(): void
    {
        $visible = Todo::factory()->count(2)->create([
            'is_deleted' => false,
        ]);
        Todo::factory()->deleted()->create();

        $response = $this->getJson('/api/todos');

        $response
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
            ->assertJsonCount(2, 'data');

        $returnedIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertEqualsCanonicalizing($visible->pluck('id')->all(), $returnedIds);
    }

    public function test_index_filters_by_list_today_trash_status_due_date_and_search(): void
    {
        Carbon::setTestNow('2026-03-30 09:00:00');

        $work = TodoList::factory()->create(['name' => 'Work']);
        $personal = TodoList::factory()->create(['name' => 'Personal']);

        $todayTodo = Todo::factory()->withList($work)->create([
            'title' => 'Submit status update',
            'description' => 'Mention blocker on search',
            'due_date' => Carbon::today()->toDateString(),
            'priority' => 'high',
            'is_completed' => false,
            'is_deleted' => false,
        ]);
        $completed = Todo::factory()->withList($work)->completed()->create([
            'title' => 'Completed report',
            'description' => 'Already done',
            'is_deleted' => false,
        ]);
        $overdue = Todo::factory()->withList($personal)->create([
            'title' => 'Renew passport',
            'description' => 'Urgent admin task',
            'due_date' => Carbon::today()->subDay()->toDateString(),
            'priority' => 'medium',
            'is_completed' => false,
            'is_deleted' => false,
        ]);
        $trashed = Todo::factory()->withList($personal)->deleted()->create([
            'title' => 'Old trashed task',
        ]);

        $this->getJson('/api/todos?list_id='.$work->id)
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/todos?list_id=today')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $todayTodo->id);

        $this->getJson('/api/todos?list_id=trash')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $trashed->id);

        $this->getJson('/api/todos?status=active')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/todos?status=completed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $completed->id);

        $this->getJson('/api/todos?due_date_filter=overdue')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $overdue->id);

        $this->getJson('/api/todos?due_date_filter=today')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $todayTodo->id);

        $this->getJson('/api/todos?search=blocker')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $todayTodo->id);
    }

    public function test_index_sorts_by_priority_and_due_date_with_nulls_last(): void
    {
        Carbon::setTestNow('2026-03-30 09:00:00');

        $high = Todo::factory()->create([
            'title' => 'High',
            'priority' => 'high',
            'due_date' => Carbon::today()->addDays(2)->toDateString(),
            'is_deleted' => false,
            'is_completed' => false,
            'sort_order' => 3,
        ]);
        $medium = Todo::factory()->create([
            'title' => 'Medium',
            'priority' => 'medium',
            'due_date' => Carbon::today()->toDateString(),
            'is_deleted' => false,
            'is_completed' => false,
            'sort_order' => 2,
        ]);
        $none = Todo::factory()->create([
            'title' => 'None',
            'priority' => 'none',
            'due_date' => null,
            'is_deleted' => false,
            'is_completed' => false,
            'sort_order' => 1,
        ]);

        $priorityResponse = $this->getJson('/api/todos?sort=priority');
        $dueDateResponse = $this->getJson('/api/todos?sort=due_date');

        $this->assertSame(
            [$high->id, $medium->id, $none->id],
            collect($priorityResponse->json('data'))->pluck('id')->take(3)->all(),
        );
        $this->assertSame(
            [$medium->id, $high->id, $none->id],
            collect($dueDateResponse->json('data'))->pluck('id')->take(3)->all(),
        );
    }

    public function test_store_creates_todos_with_minimal_and_full_payloads_and_auto_assigns_sort_order(): void
    {
        $list = TodoList::factory()->create();

        $minimal = $this->postJson('/api/todos', [
            'title' => 'Inbox task',
        ]);

        $minimal
            ->assertCreated()
            ->assertJsonPath('data.title', 'Inbox task')
            ->assertJsonPath('data.priority', 'none')
            ->assertJsonPath('data.todo_list_id', null)
            ->assertJsonPath('data.sort_order', 0);

        $full = $this->postJson('/api/todos', [
            'title' => 'Plan launch retro',
            'description' => 'Collect release notes and blockers',
            'todo_list_id' => $list->id,
            'priority' => 'high',
            'due_date' => '2026-04-01',
        ]);

        $full
            ->assertCreated()
            ->assertJsonPath('data.title', 'Plan launch retro')
            ->assertJsonPath('data.description', 'Collect release notes and blockers')
            ->assertJsonPath('data.todo_list_id', $list->id)
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.due_date', '2026-04-01')
            ->assertJsonPath('data.sort_order', 0);
    }

    public function test_store_validates_required_fields_lengths_and_existing_list(): void
    {
        $this->postJson('/api/todos', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);

        $this->postJson('/api/todos', [
            'title' => str_repeat('a', 256),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);

        $this->postJson('/api/todos', [
            'title' => 'Valid title',
            'description' => str_repeat('a', 2001),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['description']);

        $this->postJson('/api/todos', [
            'title' => 'Valid title',
            'todo_list_id' => 999999,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['todo_list_id']);
    }

    public function test_update_updates_fields_and_completion_state_and_returns_404_for_missing_todo(): void
    {
        $firstList = TodoList::factory()->create();
        $secondList = TodoList::factory()->create();
        $todo = Todo::factory()->withList($firstList)->create([
            'title' => 'Initial',
            'priority' => 'low',
            'due_date' => null,
            'is_completed' => false,
        ]);

        $this->patchJson('/api/todos/'.$todo->id, [
            'title' => 'Updated title',
            'is_completed' => true,
            'due_date' => '2026-04-05',
            'priority' => 'high',
            'todo_list_id' => $secondList->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated title')
            ->assertJsonPath('data.is_completed', true)
            ->assertJsonPath('data.priority', 'high')
            ->assertJsonPath('data.todo_list_id', $secondList->id)
            ->assertJsonPath('data.due_date', '2026-04-05');

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'title' => 'Updated title',
            'priority' => 'high',
            'todo_list_id' => $secondList->id,
            'is_completed' => true,
        ]);
        $this->assertDatabaseMissing('todos', [
            'id' => $todo->id,
            'completed_at' => null,
        ]);

        $this->patchJson('/api/todos/'.$todo->id, [
            'is_completed' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_completed', false)
            ->assertJsonPath('data.completed_at', null);

        $this->patchJson('/api/todos/999999', [
            'title' => 'Missing',
        ])->assertNotFound();
    }

    public function test_destroy_moves_a_todo_to_trash_and_returns_the_updated_resource(): void
    {
        $todo = Todo::factory()->create([
            'is_deleted' => false,
        ]);

        $response = $this->deleteJson('/api/todos/'.$todo->id);

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $todo->id)
            ->assertJsonPath('data.is_deleted', true);

        $this->assertDatabaseHas('todos', [
            'id' => $todo->id,
            'is_deleted' => true,
        ]);
        $this->assertDatabaseMissing('todos', [
            'id' => $todo->id,
            'deleted_at' => null,
        ]);
    }

    public function test_restore_restores_a_trashed_todo_and_rejects_active_todos(): void
    {
        $trashed = Todo::factory()->deleted()->create();
        $active = Todo::factory()->create(['is_deleted' => false]);

        $this->postJson('/api/todos/'.$trashed->id.'/restore')
            ->assertOk()
            ->assertJsonPath('data.is_deleted', false);

        $this->postJson('/api/todos/'.$active->id.'/restore')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This task is not in trash');
    }

    public function test_destroy_permanently_deletes_trashed_todos_and_rejects_active_todos(): void
    {
        $trashed = Todo::factory()->deleted()->create();
        $active = Todo::factory()->create(['is_deleted' => false]);

        $this->deleteJson('/api/todos/'.$trashed->id.'/permanent')
            ->assertNoContent();

        $this->assertDatabaseMissing('todos', ['id' => $trashed->id]);

        $this->deleteJson('/api/todos/'.$active->id.'/permanent')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This task is not in trash');
    }

    public function test_bulk_action_completes_deletes_moves_and_sets_priority_on_multiple_todos(): void
    {
        $sourceList = TodoList::factory()->create();
        $targetList = TodoList::factory()->create();

        $first = Todo::factory()->withList($sourceList)->create([
            'is_completed' => false,
            'is_deleted' => false,
            'priority' => 'none',
        ]);
        $second = Todo::factory()->withList($sourceList)->create([
            'is_completed' => false,
            'is_deleted' => false,
            'priority' => 'none',
        ]);

        $this->postJson('/api/todos/bulk', [
            'action' => 'complete',
            'todo_ids' => [$first->id, $second->id],
        ])->assertOk();

        $this->assertDatabaseHas('todos', ['id' => $first->id, 'is_completed' => true]);
        $this->assertDatabaseHas('todos', ['id' => $second->id, 'is_completed' => true]);

        $this->postJson('/api/todos/bulk', [
            'action' => 'set_priority',
            'todo_ids' => [$first->id, $second->id],
            'priority' => 'high',
        ])->assertOk();

        $this->assertDatabaseHas('todos', ['id' => $first->id, 'priority' => 'high']);
        $this->assertDatabaseHas('todos', ['id' => $second->id, 'priority' => 'high']);

        $this->postJson('/api/todos/bulk', [
            'action' => 'move',
            'todo_ids' => [$first->id, $second->id],
            'list_id' => $targetList->id,
        ])->assertOk();

        $this->assertDatabaseHas('todos', ['id' => $first->id, 'todo_list_id' => $targetList->id]);
        $this->assertDatabaseHas('todos', ['id' => $second->id, 'todo_list_id' => $targetList->id]);

        $this->postJson('/api/todos/bulk', [
            'action' => 'delete',
            'todo_ids' => [$first->id, $second->id],
        ])->assertOk();

        $this->assertDatabaseHas('todos', ['id' => $first->id, 'is_deleted' => true]);
        $this->assertDatabaseHas('todos', ['id' => $second->id, 'is_deleted' => true]);
    }

    public function test_bulk_action_validates_missing_todo_ids_and_invalid_action(): void
    {
        $todo = Todo::factory()->create();

        $this->postJson('/api/todos/bulk', [
            'action' => 'complete',
            'todo_ids' => [$todo->id, 999999],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['todo_ids.1']);

        $this->postJson('/api/todos/bulk', [
            'action' => 'archive',
            'todo_ids' => [$todo->id],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['action']);
    }

    public function test_empty_trash_permanently_deletes_all_trashed_todos_and_returns_the_count(): void
    {
        Todo::factory()->count(3)->deleted()->create();
        Todo::factory()->count(2)->create(['is_deleted' => false]);

        $this->deleteJson('/api/todos/trash/empty')
            ->assertOk()
            ->assertJsonPath('count', 3)
            ->assertJsonPath('message', '3 tasks permanently deleted');

        $this->assertDatabaseCount('todos', 2);
    }
}
