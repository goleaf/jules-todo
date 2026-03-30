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

    public function test_database_seeder_is_idempotent_and_creates_the_expected_lists_and_todos(): void
    {
        $this->seed();
        $this->seed();

        $this->assertDatabaseCount('todo_lists', 3);
        $this->assertDatabaseCount('todos', 15);
        $this->assertDatabaseHas('todo_lists', [
            'name' => 'Personal',
            'color' => '#6366f1',
            'sort_order' => 1,
        ]);
        $this->assertDatabaseHas('todo_lists', [
            'name' => 'Work',
            'color' => '#f59e0b',
            'sort_order' => 2,
        ]);
        $this->assertDatabaseHas('todo_lists', [
            'name' => 'Shopping',
            'color' => '#10b981',
            'sort_order' => 3,
        ]);

        $lists = TodoList::query()
            ->withCount([
                'todos as todos_count' => fn ($query) => $query->notInTrash(),
                'activeTodos as active_todos_count',
            ])
            ->ordered()
            ->get()
            ->keyBy('name');

        $this->assertSame(5, $lists['Personal']->todos_count);
        $this->assertSame(3, $lists['Personal']->active_todos_count);
        $this->assertSame(5, $lists['Work']->todos_count);
        $this->assertSame(4, $lists['Work']->active_todos_count);
        $this->assertSame(4, $lists['Shopping']->todos_count);
        $this->assertSame(3, $lists['Shopping']->active_todos_count);

        $this->assertSame(1, Todo::query()->inTrash()->count());
        $this->assertSame(4, Todo::query()->completed()->count());
    }

    public function test_todo_scopes_accessors_ordering_and_state_methods_work(): void
    {
        Carbon::setTestNow('2026-03-30 10:00:00');

        $list = TodoList::factory()->create([
            'name' => 'Errands',
            'sort_order' => 4,
        ]);

        $autoOrderedFirst = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Alpha inbox zero',
            'description' => 'Archive yesterday email threads',
            'priority' => 'medium',
            'due_date' => Carbon::today(),
            'sort_order' => null,
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        $autoOrderedSecond = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Bravo dry cleaning',
            'description' => 'Pick up wool coat before 6pm',
            'priority' => 'low',
            'due_date' => Carbon::tomorrow(),
            'sort_order' => null,
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        $thisWeek = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Charlie gym induction',
            'description' => 'Take membership card to the front desk',
            'priority' => 'high',
            'due_date' => Carbon::today()->addDays(4),
            'sort_order' => 7,
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        $overdue = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Delta passport photo',
            'description' => 'Need a new print for the renewal form',
            'priority' => 'medium',
            'due_date' => Carbon::today()->subDay(),
            'sort_order' => 8,
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        $completed = Todo::factory()->for($list, 'todoList')->completed()->create([
            'title' => 'Echo submit tax receipt',
            'priority' => 'none',
            'due_date' => Carbon::today()->subDays(2),
            'sort_order' => 9,
            'is_deleted' => false,
        ]);

        $trashed = Todo::factory()->for($list, 'todoList')->deleted()->create([
            'title' => 'Foxtrot old donation bag',
            'priority' => 'low',
            'sort_order' => 10,
            'is_completed' => false,
        ]);

        $noDate = Todo::factory()->for($list, 'todoList')->create([
            'title' => 'Golf buy birthday card',
            'description' => 'Get one with room for a long note',
            'priority' => 'none',
            'due_date' => null,
            'sort_order' => 11,
            'is_completed' => false,
            'is_deleted' => false,
        ]);

        $this->assertSame(0, $autoOrderedFirst->sort_order);
        $this->assertSame(1, $autoOrderedSecond->sort_order);

        $this->assertSame(5, Todo::query()->active()->count());
        $this->assertSame(1, Todo::query()->completed()->count());
        $this->assertSame(6, Todo::query()->notInTrash()->count());
        $this->assertSame(1, Todo::query()->inTrash()->count());
        $this->assertSame(1, Todo::query()->dueToday()->count());
        $this->assertSame(1, Todo::query()->overdue()->count());
        $this->assertSame(1, Todo::query()->byPriority('high')->count());
        $this->assertSame(1, Todo::query()->search('PASSPORT')->count());
        $this->assertSame(1, Todo::query()->byDueDateFilter('today')->count());
        $this->assertSame(1, Todo::query()->byDueDateFilter('tomorrow')->count());
        $this->assertSame(3, Todo::query()->byDueDateFilter('this_week')->count());
        $this->assertSame(1, Todo::query()->byDueDateFilter('overdue')->count());
        $this->assertSame(1, Todo::query()->byDueDateFilter('no_date')->count());
        $this->assertSame(7, Todo::query()->byDueDateFilter('any')->count());

        $manualOrder = Todo::query()->ordered('manual')->pluck('title')->all();
        $priorityOrder = Todo::query()->ordered('priority')->pluck('title')->all();
        $titleAscOrder = Todo::query()->ordered('title_asc')->pluck('title')->all();
        $dueDateOrder = Todo::query()->active()->ordered('due_date')->pluck('title')->all();

        $this->assertSame('Alpha inbox zero', $manualOrder[0]);
        $this->assertSame('Charlie gym induction', $priorityOrder[0]);
        $this->assertSame('Alpha inbox zero', $titleAscOrder[0]);
        $this->assertSame('Delta passport photo', $dueDateOrder[0]);
        $this->assertSame('Golf buy birthday card', $dueDateOrder[array_key_last($dueDateOrder)]);

        $list->load('todos');

        $this->assertSame(5, $list->active_todos_count);
        $this->assertSame(6, $list->todos_count);

        $completedResult = $autoOrderedFirst->complete();
        $this->assertTrue($completedResult->is($autoOrderedFirst));
        $autoOrderedFirst->refresh();
        $this->assertTrue($autoOrderedFirst->is_completed);
        $this->assertNotNull($autoOrderedFirst->completed_at);

        $uncompletedResult = $autoOrderedFirst->uncomplete();
        $this->assertTrue($uncompletedResult->is($autoOrderedFirst));
        $autoOrderedFirst->refresh();
        $this->assertFalse($autoOrderedFirst->is_completed);
        $this->assertNull($autoOrderedFirst->completed_at);

        $trashedResult = $autoOrderedFirst->moveToTrash();
        $this->assertTrue($trashedResult->is($autoOrderedFirst));
        $autoOrderedFirst->refresh();
        $this->assertTrue($autoOrderedFirst->is_deleted);
        $this->assertNotNull($autoOrderedFirst->deleted_at);

        $restoredResult = $autoOrderedFirst->restore();
        $this->assertTrue($restoredResult->is($autoOrderedFirst));
        $autoOrderedFirst->refresh();
        $this->assertFalse($autoOrderedFirst->is_deleted);
        $this->assertNull($autoOrderedFirst->deleted_at);

        $duplicate = $thisWeek->duplicate();

        $this->assertNotTrue($duplicate->is($thisWeek));
        $this->assertSame('Charlie gym induction (copy)', $duplicate->title);
        $this->assertSame($list->id, $duplicate->todo_list_id);
        $this->assertFalse($duplicate->is_completed);
        $this->assertNull($duplicate->completed_at);
        $this->assertFalse($duplicate->is_deleted);
        $this->assertNull($duplicate->deleted_at);
        $this->assertSame(12, $duplicate->sort_order);
    }
}
