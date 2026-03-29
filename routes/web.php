<?php

use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TodoController;
use App\Http\Controllers\TodoListController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')
    ->group(function (): void {
        Route::redirect('/', '/tasks')->name('home');
        Route::get('/tasks', [TodoController::class, 'indexPage'])->name('tasks.index');
        Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');

        Route::prefix('api')
            ->name('api.')
            ->group(function (): void {
                Route::post('lists/reorder', [TodoListController::class, 'reorder'])->name('lists.reorder');
                Route::post('todos/bulk', [TodoController::class, 'bulkAction'])->name('todos.bulk');
                Route::post('todos/reorder', [TodoController::class, 'reorder'])->name('todos.reorder');
                Route::post('todos/{todo}/restore', [TodoController::class, 'restore'])->name('todos.restore');
                Route::delete('todos/{todo}/permanent', [TodoController::class, 'destroyPermanently'])->name('todos.permanent');
                Route::delete('todos/trash/empty', [TodoController::class, 'emptyTrash'])->name('todos.trash.empty');
                Route::apiResource('lists', TodoListController::class);
                Route::apiResource('todos', TodoController::class);
            });
    });
