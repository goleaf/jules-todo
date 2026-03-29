<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->boolean('is_pinned')->default(false)->after('is_completed');
            $table->unsignedInteger('sort_order')->default(0)->after('is_pinned');
            $table->softDeletes()->after('updated_at');

            $table->index(
                ['category_id', 'deleted_at', 'is_pinned', 'sort_order'],
                'tasks_workspace_order_index',
            );
            $table->index(['status', 'deleted_at'], 'tasks_status_deleted_index');
            $table->index(['due_date', 'deleted_at'], 'tasks_due_deleted_index');
            $table->index(['priority', 'deleted_at'], 'tasks_priority_deleted_index');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table): void {
            $table->dropIndex('tasks_workspace_order_index');
            $table->dropIndex('tasks_status_deleted_index');
            $table->dropIndex('tasks_due_deleted_index');
            $table->dropIndex('tasks_priority_deleted_index');
            $table->dropSoftDeletes();
            $table->dropColumn(['sort_order', 'is_pinned']);
        });
    }
};
