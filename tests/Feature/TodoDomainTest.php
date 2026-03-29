<?php

namespace Tests\Feature;

use App\Models\Todo;
use App\Models\TodoList;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoDomainTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * @return void
     */
    public function test_database_seeder_creates_default_lists_and_sample_todos(): void
    {
        $this->seed();

        $this->assertDatabaseCount('todo_lists', 3);
        $this->assertDatabaseCount('todos', 10);
        $this->assertDatabaseHas('todo_lists', ['name' => 'Personal', 'color' => '#6366f1']);
        $this->assertDatabaseHas('todo_lists', ['name' => 'Work', 'color' => '#f59e0b']);
        $this->assertDatabaseHas('todo_lists', ['name' => 'Shopping', 'color' => '#10b981']);
    }

    public function test_todo_scopes_accessors_and_state_methods_work(): void
    {
        Carbon::setTestNow('2026-03-30 10:00:00');

        $list = TodoList::factory()->create([
            'name' => 'Errands',
            'sort_order' => 0,
        ]);

        $active = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Active task',
            'priority' => 'high',
            'due_date' => today(),
            'sort_order' => 0,
        ]);

        $tomorrow = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Tomorrow task',
            'priority' => 'low',
            'due_date' => today()->copy()->addDay(),
            'sort_order' => 1,
        ]);

        $thisWeek = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'This week task',
            'priority' => 'medium',
            'due_date' => today()->copy()->addDays(4),
            'sort_order' => 2,
        ]);

        $overdue = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Overdue alpha',
            'description' => 'Needs attention',
            'priority' => 'medium',
            'due_date' => today()->copy()->subDay(),
            'sort_order' => 3,
        ]);

        $completed = Todo::factory()->for($list, 'todoList')->completed()->create([
            'title' => 'Completed task',
            'priority' => 'none',
            'due_date' => today()->copy()->subDays(2),
            'sort_order' => 4,
        ]);

        $trashed = Todo::factory()->for($list, 'todoList')->deleted()->create([
            'title' => 'Trashed task',
            'priority' => 'low',
            'sort_order' => 5,
        ]);

        $noDate = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'No date task',
            'priority' => 'none',
            'due_date' => null,
            'sort_order' => 6,
        ]);

        $this->assertSame(5, Todo::query()->active()->count());
        $this->assertSame(1, Todo::query()->completed()->count());
        $this->assertSame(6, Todo::query()->notInTrash()->count());
        $this->assertSame(1, Todo::query()->inTrash()->count());
        $this->assertSame(1, Todo::query()->dueToday()->count());
        $this->assertSame(1, Todo::query()->overdue()->count());
        $this->assertSame(1, Todo::query()->byPriority('high')->count());
        $this->assertSame(1, Todo::query()->byDueDateFilter('tomorrow')->count());
        $this->assertSame(3, Todo::query()->byDueDateFilter('this_week')->count());
        $this->assertSame(1, Todo::query()->byDueDateFilter('no_date')->count());
        $this->assertSame(1, Todo::query()->search('alpha')->count());

        $list->load('todos');

        $this->assertSame(5, $list->active_todos_count);
        $this->assertSame(6, $list->todos_count);

        $this->assertTrue($active->complete());
        $active->refresh();
        $this->assertTrue($active->is_completed);
        $this->assertNotNull($active->completed_at);

        $this->assertTrue($active->uncomplete());
        $active->refresh();
        $this->assertFalse($active->is_completed);
        $this->assertNull($active->completed_at);

        $this->assertTrue($active->moveToTrash());
        $active->refresh();
        $this->assertTrue($active->is_deleted);
        $this->assertNotNull($active->deleted_at);

        $this->assertTrue($active->restore());
        $active->refresh();
        $this->assertFalse($active->is_deleted);
        $this->assertNull($active->deleted_at);
    }
}
