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
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('due_date')->nullable();
            $table->enum('priority', ['low', 'normal', 'high'])->default('normal');
            $table->enum('status', ['todo', 'in_progress', 'done'])->default('todo');
            $table->uuid('category_id')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->json('recurring')->nullable();
            $table->json('attachments')->nullable();
            $table->integer('pomodoro_estimate')->nullable();
            $table->integer('pomodoro_completed')->default(0);
            $table->integer('estimated_minutes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
