<?php

namespace App\Models;

use Carbon\Carbon;
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

    protected $attributes = [
        'is_completed' => false,
        'priority' => 'none',
        'sort_order' => 0,
        'is_deleted' => false,
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Todo $todo): void {
            if ($todo->sort_order !== null) {
                return;
            }

            $todo->sort_order = ((static::query()
                ->when(
                    $todo->todo_list_id === null,
                    fn (Builder $query) => $query->whereNull('todo_list_id'),
                    fn (Builder $query) => $query->where('todo_list_id', $todo->todo_list_id),
                )
                ->max('sort_order')) ?? -1) + 1;
        });
    }

    public function list(): BelongsTo
    {
        return $this->belongsTo(TodoList::class, 'todo_list_id');
    }

    public function todoList(): BelongsTo
    {
        return $this->list();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query
            ->where('is_deleted', false)
            ->where('is_completed', false);
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query
            ->where('is_deleted', false)
            ->where('is_completed', true);
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
            ->whereDate('due_date', Carbon::today())
            ->where('is_deleted', false);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query
            ->whereDate('due_date', '<', Carbon::today())
            ->where('is_completed', false)
            ->where('is_deleted', false);
    }

    public function scopeByPriority(Builder $query, ?string $priority): Builder
    {
        if ($priority === null || $priority === '' || $priority === 'any') {
            return $query;
        }

        return $query->where('priority', $priority);
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $trimmedTerm = trim((string) $term);

        if ($trimmedTerm === '') {
            return $query;
        }

        $likeTerm = '%'.mb_strtolower($trimmedTerm).'%';

        return $query->where(function (Builder $nestedQuery) use ($likeTerm): void {
            $nestedQuery
                ->whereRaw('LOWER(title) LIKE ?', [$likeTerm])
                ->orWhereRaw('LOWER(COALESCE(description, \'\')) LIKE ?', [$likeTerm]);
        });
    }

    public function scopeByDueDateFilter(Builder $query, ?string $filter): Builder
    {
        $today = Carbon::today();
        $tomorrow = Carbon::tomorrow();
        $endOfWeek = $today->copy()->endOfWeek(Carbon::SUNDAY);

        return match ($filter) {
            'today' => $query->dueToday(),
            'tomorrow' => $query
                ->whereDate('due_date', $tomorrow)
                ->where('is_deleted', false),
            'this_week' => $query
                ->whereBetween('due_date', [$today->toDateString(), $endOfWeek->toDateString()])
                ->where('is_deleted', false),
            'overdue' => $query->overdue(),
            'no_date' => $query
                ->whereNull('due_date')
                ->where('is_deleted', false),
            'any' => $query,
            default => $query,
        };
    }

    public function scopeOrdered(Builder $query, string $sortOption): Builder
    {
        return match ($sortOption) {
            'manual' => $query
                ->orderBy('sort_order')
                ->orderBy('created_at'),
            'due_date' => $query
                ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END')
                ->orderBy('due_date')
                ->orderBy('created_at'),
            'priority' => $query
                ->orderByRaw(
                    "CASE priority
                        WHEN 'high' THEN 0
                        WHEN 'medium' THEN 1
                        WHEN 'low' THEN 2
                        ELSE 3
                    END"
                )
                ->orderBy('created_at'),
            'title_asc' => $query->orderByRaw('LOWER(title) ASC'),
            'title_desc' => $query->orderByRaw('LOWER(title) DESC'),
            'created_at' => $query->orderByDesc('created_at'),
            'completed_at' => $query->orderByDesc('completed_at'),
            default => $query
                ->orderBy('sort_order')
                ->orderBy('created_at'),
        };
    }

    public function moveToTrash(): static
    {
        $this->is_deleted = true;
        $this->deleted_at = Carbon::now();
        $this->save();

        return $this;
    }

    public function restore(): static
    {
        $this->is_deleted = false;
        $this->deleted_at = null;
        $this->save();

        return $this;
    }

    public function complete(): static
    {
        $this->is_completed = true;
        $this->completed_at = Carbon::now();
        $this->save();

        return $this;
    }

    public function uncomplete(): static
    {
        $this->is_completed = false;
        $this->completed_at = null;
        $this->save();

        return $this;
    }

    public function duplicate(): static
    {
        $maxSortOrder = ((static::query()
            ->when(
                $this->todo_list_id === null,
                fn (Builder $query) => $query->whereNull('todo_list_id'),
                fn (Builder $query) => $query->where('todo_list_id', $this->todo_list_id),
            )
            ->max('sort_order')) ?? -1) + 1;

        return static::query()->create([
            'todo_list_id' => $this->todo_list_id,
            'title' => $this->title.' (copy)',
            'description' => $this->description,
            'is_completed' => false,
            'completed_at' => null,
            'priority' => $this->priority,
            'due_date' => $this->due_date?->toDateString(),
            'sort_order' => $maxSortOrder,
            'is_deleted' => false,
            'deleted_at' => null,
        ]);
    }
}
