<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // TODO: Automatic trash cleanup belongs in a scheduled command that
        // permanently deletes todos where is_deleted = true and deleted_at is
        // older than 30 days. No schema changes are required for that job.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // TODO: Nothing to roll back. Trash cleanup is handled by a scheduled command.
    }
};
