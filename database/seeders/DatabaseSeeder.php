<?php

namespace Database\Seeders;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $lists = collect([
            ['name' => 'Personal', 'color' => '#6366f1', 'sort_order' => 0],
            ['name' => 'Work', 'color' => '#f59e0b', 'sort_order' => 1],
            ['name' => 'Shopping', 'color' => '#10b981', 'sort_order' => 2],
        ])->mapWithKeys(fn (array $attributes) => [
            $attributes['name'] => TodoList::query()->create($attributes),
        ]);

        $today = today();

        $todos = [
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Book dentist appointment',
                'description' => 'Call clinic and confirm next available morning slot.',
                'priority' => 'medium',
                'due_date' => $today->copy()->addDay(),
                'sort_order' => 0,
            ],
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Morning run',
                'description' => 'Jog 5km before breakfast.',
                'priority' => 'low',
                'due_date' => null,
                'sort_order' => 1,
            ],
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Renew passport reminder',
                'description' => 'Gather photo and identity card.',
                'priority' => 'high',
                'due_date' => $today->copy()->subDay(),
                'sort_order' => 2,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Prepare sprint planning notes',
                'description' => 'Summarize blockers and next sprint priorities.',
                'priority' => 'high',
                'due_date' => $today,
                'sort_order' => 0,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Review pull request queue',
                'description' => 'Focus on the API pagination changes first.',
                'priority' => 'medium',
                'due_date' => $today->copy()->addDays(3),
                'sort_order' => 1,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Archive completed project brief',
                'description' => 'Move the final PDF into the team handbook.',
                'priority' => 'none',
                'due_date' => $today->copy()->subDays(2),
                'sort_order' => 2,
                'is_completed' => true,
                'completed_at' => now()->subDay(),
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Schedule stakeholder check-in',
                'description' => 'Confirm time with product and support leads.',
                'priority' => 'low',
                'due_date' => $today->copy()->addDays(5),
                'sort_order' => 3,
            ],
            [
                'todo_list_id' => $lists['Shopping']->id,
                'title' => 'Buy groceries for dinner',
                'description' => 'Tomatoes, basil, pasta, olive oil.',
                'priority' => 'medium',
                'due_date' => $today,
                'sort_order' => 0,
            ],
            [
                'todo_list_id' => $lists['Shopping']->id,
                'title' => 'Replace kitchen light bulb',
                'description' => 'Pick up warm white bulbs.',
                'priority' => 'low',
                'due_date' => null,
                'sort_order' => 1,
            ],
            [
                'todo_list_id' => $lists['Shopping']->id,
                'title' => 'Order office chair mat',
                'description' => 'Check dimensions before ordering.',
                'priority' => 'high',
                'due_date' => $today->copy()->addWeek(),
                'sort_order' => 2,
                'is_completed' => true,
                'completed_at' => now()->subHours(6),
            ],
        ];

        foreach ($todos as $attributes) {
            Todo::query()->create([
                'description' => null,
                'is_completed' => false,
                'completed_at' => null,
                'due_date' => null,
                'priority' => 'none',
                'sort_order' => 0,
                'is_deleted' => false,
                'deleted_at' => null,
                ...$attributes,
            ]);
        }
    }
}
