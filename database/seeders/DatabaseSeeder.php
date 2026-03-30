<?php

namespace Database\Seeders;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (TodoList::query()->count() > 0) {
            return;
        }

        $today = Carbon::today();

        $lists = collect([
            [
                'name' => 'Personal',
                'color' => '#6366f1',
                'sort_order' => 1,
            ],
            [
                'name' => 'Work',
                'color' => '#f59e0b',
                'sort_order' => 2,
            ],
            [
                'name' => 'Shopping',
                'color' => '#10b981',
                'sort_order' => 3,
            ],
        ])->mapWithKeys(fn (array $attributes) => [
            $attributes['name'] => TodoList::query()->create($attributes),
        ]);

        $todos = [
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Renew passport photo',
                'description' => 'Visit the photo booth downtown and print two compliant copies.',
                'priority' => 'high',
                'due_date' => $today->copy()->subDays(2)->toDateString(),
                'sort_order' => 0,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Call Mom about Sunday lunch',
                'description' => 'Confirm whether we are meeting at her place or downtown.',
                'priority' => 'medium',
                'due_date' => $today->toDateString(),
                'sort_order' => 1,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Schedule annual checkup',
                'description' => 'Use the clinic portal and look for an early morning appointment.',
                'priority' => 'medium',
                'due_date' => null,
                'sort_order' => 2,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Finish book club chapter',
                'description' => 'Read the final two sections before Thursday night discussion.',
                'priority' => 'low',
                'due_date' => null,
                'sort_order' => 3,
                'is_completed' => true,
                'completed_at' => $today->copy()->subDay()->setTime(20, 15),
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Personal']->id,
                'title' => 'Upload insurance receipt',
                'description' => 'Attach the pharmacy receipt in the reimbursement portal.',
                'priority' => 'none',
                'due_date' => null,
                'sort_order' => 4,
                'is_completed' => true,
                'completed_at' => $today->copy()->subDays(3)->setTime(9, 30),
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Draft launch status update',
                'description' => 'Summarize API blockers, frontend progress, and launch risks for leadership.',
                'priority' => 'high',
                'due_date' => $today->copy()->addDays(3)->toDateString(),
                'sort_order' => 0,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Prepare Q2 budget notes',
                'description' => 'Pull together tool costs, contractor hours, and infrastructure spend.',
                'priority' => 'medium',
                'due_date' => $today->copy()->addDays(6)->toDateString(),
                'sort_order' => 1,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Review vendor contract',
                'description' => 'Flag the data retention clause before legal review.',
                'priority' => 'high',
                'due_date' => null,
                'sort_order' => 2,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Clean up backlog labels',
                'description' => 'Merge duplicated bug labels and archive unused workflow tags.',
                'priority' => 'low',
                'due_date' => null,
                'sort_order' => 3,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Publish sprint retrospective notes',
                'description' => 'Share the final retro summary and action items in the team wiki.',
                'priority' => 'medium',
                'due_date' => null,
                'sort_order' => 4,
                'is_completed' => true,
                'completed_at' => $today->copy()->subDay()->setTime(15, 45),
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Work']->id,
                'title' => 'Archive old onboarding deck',
                'description' => 'Remove the outdated pricing slide before someone reuses it.',
                'priority' => 'none',
                'due_date' => null,
                'sort_order' => 5,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => true,
                'deleted_at' => $today->copy()->subDays(5)->setTime(11, 0),
            ],
            [
                'todo_list_id' => $lists['Shopping']->id,
                'title' => 'Buy oat milk and eggs',
                'description' => 'Pick up two cartons of oat milk and a dozen free-range eggs.',
                'priority' => 'none',
                'due_date' => null,
                'sort_order' => 0,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Shopping']->id,
                'title' => 'Replace bathroom light bulbs',
                'description' => 'Look for warm white bulbs that match the existing fixture.',
                'priority' => 'none',
                'due_date' => null,
                'sort_order' => 1,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Shopping']->id,
                'title' => 'Pick up dog food',
                'description' => 'Grab the large salmon bag from the pet store before the weekend.',
                'priority' => 'none',
                'due_date' => null,
                'sort_order' => 2,
                'is_completed' => false,
                'completed_at' => null,
                'is_deleted' => false,
                'deleted_at' => null,
            ],
            [
                'todo_list_id' => $lists['Shopping']->id,
                'title' => 'Order printer paper',
                'description' => 'Reorder the heavier matte paper used for invoices and labels.',
                'priority' => 'none',
                'due_date' => null,
                'sort_order' => 3,
                'is_completed' => true,
                'completed_at' => $today->copy()->subHours(8),
                'is_deleted' => false,
                'deleted_at' => null,
            ],
        ];

        foreach ($todos as $attributes) {
            Todo::query()->create($attributes);
        }
    }
}
