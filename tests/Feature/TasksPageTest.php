<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TasksPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_tasks_page_renders_the_inertia_workspace_with_shared_data(): void
    {
        $list = TodoList::factory()->create([
            'name' => 'Work',
            'color' => '#f59e0b',
            'sort_order' => 2,
        ]);

        Todo::factory()->create([
            'title' => 'Ship regression fix',
            'todo_list_id' => $list->id,
            'due_date' => now()->toDateString(),
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        Todo::factory()->for($list, 'todoList')->deleted()->create([
            'title' => 'Already trashed',
        ]);

        $this->get('/tasks')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tasks/Index')
                ->has('lists', 1, fn (Assert $lists) => $lists
                    ->where('id', $list->id)
                    ->where('name', 'Work')
                    ->where('todos_count', 1)
                    ->where('active_todos_count', 1)
                    ->etc()
                )
                ->has('virtual_lists', 3)
                ->where('today_count', 1)
                ->where('trash_count', 1)
                ->where('flash.success', null)
                ->where('flash.error', null)
                ->where('flash.info', null)
                ->where('filters.list_id', null)
                ->where('filters.status', null)
                ->where('filters.due_date_filter', null)
                ->where('filters.priority_filter', null)
                ->where('filters.sort', null)
                ->where('filters.search', null)
            );
    }

    public function test_settings_page_renders_without_page_specific_payload(): void
    {
        $this->get('/settings')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Settings/Index')
                ->missing('stats')
            );
    }
}
