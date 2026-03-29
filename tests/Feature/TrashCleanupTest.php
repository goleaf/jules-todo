<?php

namespace Tests\Feature;

use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrashCleanupTest extends TestCase
{
    use RefreshDatabase;

    public function test_old_trashed_todos_are_permanently_deleted_by_the_cleanup_command(): void
    {
        $oldTask = Task::factory()->create(['title' => 'Old trash']);
        $recentTask = Task::factory()->create(['title' => 'Recent trash']);

        $oldTask->delete();
        $recentTask->delete();

        Task::withTrashed()->whereKey($oldTask->id)->update([
            'deleted_at' => now()->subDays(31),
        ]);

        Task::withTrashed()->whereKey($recentTask->id)->update([
            'deleted_at' => now()->subDays(5),
        ]);

        $this->artisan('tasks:purge-trash')
            ->assertSuccessful();

        $this->assertDatabaseMissing('tasks', [
            'id' => $oldTask->id,
        ]);

        $this->assertSoftDeleted('tasks', [
            'id' => $recentTask->id,
        ]);
    }
}
