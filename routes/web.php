<?php

use App\Http\Controllers\DataController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TasksController;
use App\Http\Controllers\TodoController;
use App\Http\Controllers\TodoListController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function (): void {
    Route::redirect('/', '/tasks')->name('home');
    Route::get('/tasks', [TasksController::class, 'index'])->name('tasks.index');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');

    Route::prefix('api')
        ->name('api.')
        ->group(function (): void {
            Route::get('/lists', [TodoListController::class, 'index'])->name('lists.index');
            Route::post('/lists', [TodoListController::class, 'store'])->name('lists.store');
            Route::patch('/lists/{list}', [TodoListController::class, 'update'])->name('lists.update');
            Route::delete('/lists/{list}', [TodoListController::class, 'destroy'])->name('lists.destroy');
            Route::post('/lists/reorder', [TodoListController::class, 'reorder'])->name('lists.reorder');

            Route::post('/todos/bulk', [TodoController::class, 'bulkAction'])->name('todos.bulk');
            Route::post('/todos/reorder', [TodoController::class, 'reorder'])->name('todos.reorder');
            Route::delete('/todos/trash/empty', [TodoController::class, 'emptyTrash'])->name('todos.trash.empty');
            Route::get('/todos', [TodoController::class, 'index'])->name('todos.index');
            Route::post('/todos', [TodoController::class, 'store'])->name('todos.store');
            Route::get('/todos/{todo}', [TodoController::class, 'show'])->name('todos.show');
            Route::patch('/todos/{todo}', [TodoController::class, 'update'])->name('todos.update');
            Route::delete('/todos/{todo}', [TodoController::class, 'destroy'])->name('todos.destroy');
            Route::post('/todos/{todo}/restore', [TodoController::class, 'restore'])->name('todos.restore');
            Route::delete('/todos/{todo}/permanent', [TodoController::class, 'destroyPermanently'])->name('todos.permanent');

            Route::get('/export', [DataController::class, 'export'])->name('data.export');
            Route::post('/import', [DataController::class, 'import'])->name('data.import');
            Route::delete('/data/all', [DataController::class, 'clearAll'])->name('data.clear-all');
        });
});
