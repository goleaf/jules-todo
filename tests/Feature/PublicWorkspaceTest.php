<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_root_route_renders_a_blade_workspace_page(): void
    {
        Category::factory()->create(['name' => 'Work']);

        $response = $this->get('/');

        $response
            ->assertOk()
            ->assertViewIs('tasks.workspace')
            ->assertSee('Work')
            ->assertSee('Search todos')
            ->assertSee('Dark mode')
            ->assertSee('Create todo')
            ->assertSee('Trash');
    }

    public function test_auth_only_routes_are_not_available_anymore(): void
    {
        $this->get('/login')->assertNotFound();
        $this->get('/register')->assertNotFound();
        $this->get('/profile')->assertNotFound();
    }

    public function test_guest_can_soft_delete_restore_and_empty_trash(): void
    {
        $task = Task::factory()->create([
            'title' => 'Soft delete me',
        ]);

        $this->deleteJson("/api/tasks/{$task->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('tasks', [
            'id' => $task->id,
        ]);

        $this->postJson("/api/tasks/{$task->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.title', 'Soft delete me');

        $this->assertDatabaseHas('tasks', [
            'id' => $task->id,
            'deleted_at' => null,
        ]);

        $this->deleteJson("/api/tasks/{$task->id}");

        $this->deleteJson('/api/trash/tasks')
            ->assertOk()
            ->assertJsonPath('data.deleted', 1);

        $this->assertDatabaseMissing('tasks', [
            'id' => $task->id,
        ]);
    }

    public function test_guest_can_create_update_toggle_and_reorder_tasks(): void
    {
        $category = Category::factory()->create(['name' => 'Work']);

        $createResponse = $this->postJson('/api/tasks', [
            'title' => 'Write docs',
            'description' => 'Draft the public docs',
            'priority' => 'medium',
            'status' => 'active',
            'category_id' => $category->id,
            'is_completed' => false,
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.title', 'Write docs')
            ->assertJsonPath('data.priority', 'medium')
            ->assertJsonPath('data.status', 'active');

        $taskId = $createResponse->json('data.id');

        $this->patchJson("/api/tasks/{$taskId}", [
            'title' => 'Write public docs',
            'description' => 'Publish the docs',
            'is_completed' => true,
            'status' => 'completed',
            'is_pinned' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.title', 'Write public docs')
            ->assertJsonPath('data.is_completed', true)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.is_pinned', true);

        $first = Task::factory()->create([
            'category_id' => $category->id,
            'title' => 'First task',
        ]);

        $second = Task::factory()->create([
            'category_id' => $category->id,
            'title' => 'Second task',
        ]);

        $this->postJson('/api/tasks/reorder', [
            'category_id' => $category->id,
            'task_ids' => [$second->id, $first->id],
        ])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second->id)
            ->assertJsonPath('data.0.sort_order', 0)
            ->assertJsonPath('data.1.id', $first->id)
            ->assertJsonPath('data.1.sort_order', 1);
    }

    public function test_guest_can_apply_bulk_actions_to_tasks(): void
    {
        $source = Category::factory()->create(['name' => 'Inbox']);
        $target = Category::factory()->create(['name' => 'Personal']);

        $first = Task::factory()->create(['category_id' => $source->id]);
        $second = Task::factory()->create(['category_id' => $source->id]);

        $this->patchJson('/api/tasks/bulk', [
            'task_ids' => [$first->id, $second->id],
            'action' => 'complete',
        ])
            ->assertOk()
            ->assertJsonPath('data.0.is_completed', true)
            ->assertJsonPath('data.1.is_completed', true);

        $this->patchJson('/api/tasks/bulk', [
            'task_ids' => [$first->id, $second->id],
            'action' => 'move',
            'category_id' => $target->id,
        ])
            ->assertOk()
            ->assertJsonPath('data.0.category_id', $target->id)
            ->assertJsonPath('data.1.category_id', $target->id);

        $this->patchJson('/api/tasks/bulk', [
            'task_ids' => [$first->id, $second->id],
            'action' => 'delete',
        ])
            ->assertOk()
            ->assertJsonPath('data.deleted', 2);

        $this->assertSoftDeleted('tasks', ['id' => $first->id]);
        $this->assertSoftDeleted('tasks', ['id' => $second->id]);
    }

    public function test_guest_can_filter_search_and_sort_workspace_data(): void
    {
        $work = Category::factory()->create(['name' => 'Work']);
        $personal = Category::factory()->create(['name' => 'Personal']);

        Task::factory()->create([
            'category_id' => $work->id,
            'title' => 'Alpha launch',
            'description' => 'Project alpha docs',
            'due_date' => now()->subDay(),
            'priority' => 'high',
        ]);

        Task::factory()->completed()->create([
            'category_id' => $work->id,
            'title' => 'Completed note',
            'description' => 'Done item',
            'priority' => 'low',
        ]);

        Task::factory()->create([
            'category_id' => $personal->id,
            'title' => 'Groceries',
            'description' => 'Milk and bread',
            'due_date' => now()->addDays(3),
            'priority' => 'normal',
        ]);

        $this->getJson('/api/workspace?category_id='.$work->id.'&status=active&due=overdue&search=alpha&sort=priority')
            ->assertOk()
            ->assertJsonCount(1, 'data.tasks')
            ->assertJsonPath('data.tasks.0.title', 'Alpha launch')
            ->assertJsonPath('data.tasks.0.priority', 'high');
    }
}
