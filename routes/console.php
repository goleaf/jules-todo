<?php

use App\Models\Task;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('tasks:purge-trash', function () {
    $cutoff = now()->subDays(30);
    $deleted = 0;

    Task::onlyTrashed()
        ->where('deleted_at', '<=', $cutoff)
        ->cursor()
        ->each(function (Task $task) use (&$deleted): void {
            $task->forceDelete();
            $deleted++;
        });

    $this->info("Purged {$deleted} trashed task(s).");
})->purpose('Permanently delete trashed tasks older than 30 days');

Schedule::command('tasks:purge-trash')->daily();
