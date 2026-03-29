<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TrashController;
use App\Http\Controllers\WorkspaceDataController;
use Illuminate\Support\Facades\Route;

Route::name('api.')->group(function (): void {
    Route::get('workspace', WorkspaceDataController::class)->name('workspace');
    Route::patch('tasks/bulk', [TaskController::class, 'bulkUpdate'])->name('tasks.bulk');
    Route::post('tasks/reorder', [TaskController::class, 'reorder'])->name('tasks.reorder');
    Route::get('export/tasks', [TaskController::class, 'exportCsv'])->name('tasks.export');
    Route::post('tasks/{task}/restore', [TaskController::class, 'restore'])
        ->withTrashed()
        ->name('tasks.restore');
    Route::delete('trash/tasks', [TrashController::class, 'destroy'])->name('trash.tasks.destroy');
    Route::apiResource('tasks', TaskController::class);

    Route::apiResource('categories', CategoryController::class);

    Route::apiResource('tasks.subtasks', SubtaskController::class)->shallow();
    Route::patch('subtasks/{subtask}/toggle', [SubtaskController::class, 'toggle'])->name('subtasks.toggle');

    Route::apiResource('reminders', ReminderController::class)->only(['store', 'destroy']);
});
