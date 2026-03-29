<?php

namespace App\Actions;

use App\Models\Task;

class EmptyTrashAction
{
    public function handle(): int
    {
        $tasks = Task::onlyTrashed()->get();
        $deleted = $tasks->count();

        $tasks->each->forceDelete();

        return $deleted;
    }
}
