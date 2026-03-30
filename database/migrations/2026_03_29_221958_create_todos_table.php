<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('todos', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('todo_list_id')
                ->nullable()
                ->index()
                ->constrained('todo_lists')
                ->nullOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->boolean('is_completed')->default(false)->index();
            $table->timestamp('completed_at')->nullable();
            $table->string('priority', 10)->default('none')->index();
            $table->date('due_date')->nullable()->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_deleted')->default(false)->index();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index(['is_deleted', 'is_completed']);
            $table->index(['todo_list_id', 'sort_order']);
            $table->index(['is_deleted', 'due_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('todos');
    }
};
