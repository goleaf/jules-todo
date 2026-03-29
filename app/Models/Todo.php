<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Todo extends Model
{
    /** @use HasFactory<\Database\Factories\TodoFactory> */
    use HasFactory;

    protected $fillable = [
        'todo_list_id',
        'title',
        'description',
        'is_completed',
        'completed_at',
        'priority',
        'due_date',
        'sort_order',
        'is_deleted',
        'deleted_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'is_deleted' => 'boolean',
        'completed_at' => 'datetime',
        'deleted_at' => 'datetime',
        'due_date' => 'date',
        'sort_order' => 'integer',
    ];

    public function list(): BelongsTo
    {
        return $this->belongsTo(TodoList::class, 'todo_list_id');
    }

    public function todoList(): BelongsTo
    {
        return $this->list();
    }

    public function priorityRank(): int
    {
        return match ($this->priority) {
            'high' => 3,
            'medium' => 2,
            'low' => 1,
            default => 0,
        };
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query
            ->where('is_completed', false)
            ->where('is_deleted', false);
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query
            ->where('is_completed', true)
            ->where('is_deleted', false);
    }

    public function scopeNotInTrash(Builder $query): Builder
    {
        return $query->where('is_deleted', false);
    }

    public function scopeInTrash(Builder $query): Builder
    {
        return $query->where('is_deleted', true);
    }

    public function scopeDueToday(Builder $query): Builder
    {
        return $query
            ->whereDate('due_date', today())
            ->where('is_deleted', false);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query
            ->whereDate('due_date', '<', today())
            ->where('is_completed', false)
            ->where('is_deleted', false);
    }

    public function scopeByPriority(Builder $query, ?string $priority): Builder
    {
        return $query->when(
            filled($priority) && $priority !== 'any',
            fn (Builder $builder) => $builder->where('priority', $priority),
        );
    }

    public function scopeByDueDateFilter(Builder $query, ?string $filter): Builder
    {
        $today = today();
        $endOfWeek = $today->copy()->addDays((7 - $today->dayOfWeekIso) % 7);

        return match ($filter) {
            'today' => $query->dueToday(),
            'tomorrow' => $query->notInTrash()->whereDate('due_date', $today->copy()->addDay()),
            'this_week' => $query->notInTrash()->whereBetween('due_date', [$today, $endOfWeek]),
            'overdue' => $query->overdue(),
            'no_date' => $query->notInTrash()->whereNull('due_date'),
            default => $query,
        };
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);

        return $query->when($term !== '', function (Builder $builder) use ($term): void {
            $builder->where(function (Builder $nestedBuilder) use ($term): void {
                $nestedBuilder
                    ->where('title', 'like', '%'.$term.'%')
                    ->orWhere('description', 'like', '%'.$term.'%');
            });
        });
    }

    public function moveToTrash(): bool
    {
        $this->is_deleted = true;
        $this->deleted_at = now();

        return $this->save();
    }

    public function restore(): bool
    {
        $this->is_deleted = false;
        $this->deleted_at = null;

        return $this->save();
    }

    public function complete(): bool
    {
        $this->is_completed = true;
        $this->completed_at = now();

        return $this->save();
    }

    public function uncomplete(): bool
    {
        $this->is_completed = false;
        $this->completed_at = null;

        return $this->save();
    }
}
