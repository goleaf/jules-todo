<?php

use App\Http\Controllers\TaskWorkspaceController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')
    ->name('workspace.')
    ->group(function (): void {
        Route::get('/', TaskWorkspaceController::class)->name('index');
    });
