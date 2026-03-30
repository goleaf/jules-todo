<?php

namespace Tests\Unit;

use App\Models\Todo;
use App\Models\TodoList;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TodoModelTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_move_to_trash_sets_deleted_state_and_timestamp(): void
    {
        $todo = Todo::factory()->create([
            'is_deleted' => false,
            'deleted_at' => null,
        ]);

        $todo->moveToTrash()->refresh();

        $this->assertTrue($todo->is_deleted);
        $this->assertNotNull($todo->deleted_at);
    }

    public function test_restore_clears_deleted_state_and_timestamp(): void
    {
        $todo = Todo::factory()->deleted()->create();

        $todo->restore()->refresh();

        $this->assertFalse($todo->is_deleted);
        $this->assertNull($todo->deleted_at);
    }

    public function test_complete_sets_completion_state_and_timestamp(): void
    {
        $todo = Todo::factory()->create([
            'is_completed' => false,
            'completed_at' => null,
        ]);

        $todo->complete()->refresh();

        $this->assertTrue($todo->is_completed);
        $this->assertNotNull($todo->completed_at);
    }

    public function test_uncomplete_clears_completion_state_and_timestamp(): void
    {
        $todo = Todo::factory()->completed()->create();

        $todo->uncomplete()->refresh();

        $this->assertFalse($todo->is_completed);
        $this->assertNull($todo->completed_at);
    }

    public function test_duplicate_creates_a_new_copy_with_copy_title_suffix(): void
    {
        $list = TodoList::factory()->create();
        $todo = Todo::factory()->withList($list)->create([
            'title' => 'Prepare launch notes',
            'description' => 'Add changelog summary',
            'priority' => 'high',
            'due_date' => '2026-04-02',
            'sort_order' => 2,
            'is_completed' => true,
            'completed_at' => now(),
            'is_deleted' => true,
            'deleted_at' => now(),
        ]);

        $duplicate = $todo->duplicate();

        $this->assertNotSame($todo->id, $duplicate->id);
        $this->assertSame('Prepare launch notes (copy)', $duplicate->title);
        $this->assertSame($list->id, $duplicate->todo_list_id);
        $this->assertFalse($duplicate->is_completed);
        $this->assertNull($duplicate->completed_at);
        $this->assertFalse($duplicate->is_deleted);
        $this->assertNull($duplicate->deleted_at);
    }

    public function test_query_scopes_return_the_expected_records(): void
    {
        Carbon::setTestNow('2026-03-30 09:00:00');

        $list = TodoList::factory()->create();

        $active = Todo::factory()->withList($list)->create([
            'title' => 'Alpha task',
            'description' => 'Match by description text',
            'priority' => 'high',
            'due_date' => Carbon::today()->toDateString(),
            'is_completed' => false,
            'is_deleted' => false,
        ]);
        $overdue = Todo::factory()->withList($list)->create([
            'title' => 'Bravo task',
            'priority' => 'medium',
            'due_date' => Carbon::today()->subDay()->toDateString(),
            'is_completed' => false,
            'is_deleted' => false,
        ]);
        $completed = Todo::factory()->withList($list)->completed()->create([
            'title' => 'Charlie task',
            'is_deleted' => false,
            'priority' => 'low',
        ]);
        $trashed = Todo::factory()->withList($list)->deleted()->create([
            'title' => 'Delta task',
        ]);
        $noDate = Todo::factory()->withList($list)->create([
            'title' => 'Echo task',
            'priority' => 'none',
            'due_date' => null,
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        $this->assertSame([$active->id, $overdue->id, $noDate->id], Todo::query()->active()->pluck('id')->all());
        $this->assertSame([$completed->id], Todo::query()->completed()->pluck('id')->all());
        $this->assertSame([$trashed->id], Todo::query()->inTrash()->pluck('id')->all());
        $this->assertCount(4, Todo::query()->notInTrash()->get());
        $this->assertSame([$active->id], Todo::query()->dueToday()->pluck('id')->all());
        $this->assertSame([$overdue->id], Todo::query()->overdue()->pluck('id')->all());
        $this->assertSame([$active->id], Todo::query()->byPriority('high')->pluck('id')->all());
        $this->assertSame([$active->id], Todo::query()->search('description text')->pluck('id')->all());
        $this->assertSame([$active->id], Todo::query()->byDueDateFilter('today')->pluck('id')->all());
        $this->assertSame([$overdue->id], Todo::query()->byDueDateFilter('overdue')->pluck('id')->all());
        $this->assertSame([$noDate->id], Todo::query()->byDueDateFilter('no_date')->pluck('id')->all());
    }
}
