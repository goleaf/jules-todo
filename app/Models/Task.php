<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const WORKSPACE_PRIORITY_MAP = [
        'low' => 'low',
        'medium' => 'normal',
        'high' => 'high',
    ];

    public const WORKSPACE_STATUS_MAP = [
        'active' => 'todo',
        'completed' => 'done',
    ];

    protected $fillable = [
        'title',
        'description',
        'due_date',
        'priority',
        'status',
        'category_id',
        'is_completed',
        'is_pinned',
        'sort_order',
        'recurring',
        'attachments',
        'pomodoro_estimate',
        'pomodoro_completed',
        'estimated_minutes',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'is_pinned' => 'boolean',
        'recurring' => 'json',
        'attachments' => 'json',
        'due_date' => 'date',
        'deleted_at' => 'datetime',
    ];

    public static function normalizeWorkspaceInput(array $attributes): array
    {
        if (array_key_exists('priority', $attributes) && is_string($attributes['priority'])) {
            $attributes['priority'] = self::WORKSPACE_PRIORITY_MAP[$attributes['priority']] ?? $attributes['priority'];
        }

        if (array_key_exists('status', $attributes) && is_string($attributes['status'])) {
            $attributes['status'] = self::WORKSPACE_STATUS_MAP[$attributes['status']] ?? $attributes['status'];
        }

        return $attributes;
    }

    public function workspacePriority(): string
    {
        return array_search($this->priority, self::WORKSPACE_PRIORITY_MAP, true) ?: $this->priority;
    }

    public function workspaceStatus(): string
    {
        return $this->status === 'done' ? 'completed' : 'active';
    }

    public function priorityRank(): int
    {
        return match ($this->priority) {
            'high' => 3,
            'normal' => 2,
            default => 1,
        };
    }

    public function scopeWorkspaceData(Builder $query): void
    {
        $query
            ->select([
                'id',
                'title',
                'description',
                'due_date',
                'priority',
                'status',
                'category_id',
                'is_completed',
                'is_pinned',
                'sort_order',
                'recurring',
                'attachments',
                'pomodoro_estimate',
                'pomodoro_completed',
                'estimated_minutes',
                'created_at',
                'updated_at',
            ])
            ->with([
                'category:id,name,color,icon',
                'subtasks:id,task_id,title,is_completed,created_at,updated_at',
                'reminders:id,task_id,reminder_time,reminder_type,created_at,updated_at',
            ])
            ->orderByDesc('is_pinned')
            ->orderBy('sort_order')
            ->orderBy('due_date')
            ->orderByDesc('created_at');
    }

    public function scopeInCategory(Builder $query, ?string $categoryId): void
    {
        $query->when(
            filled($categoryId),
            fn (Builder $builder) => $builder->where('category_id', $categoryId),
        );
    }

    public function scopeMatchingWorkspaceStatus(Builder $query, ?string $status): void
    {
        $query
            ->when($status === 'active', fn (Builder $builder) => $builder->where('is_completed', false))
            ->when($status === 'completed', fn (Builder $builder) => $builder->where('is_completed', true));
    }

    public function scopeMatchingDueWindow(Builder $query, ?string $due): void
    {
        $today = now()->startOfDay();

        $query
            ->when(
                $due === 'today',
                fn (Builder $builder) => $builder->whereDate('due_date', $today),
            )
            ->when(
                $due === 'week',
                fn (Builder $builder) => $builder->whereBetween('due_date', [
                    $today,
                    $today->copy()->endOfWeek(),
                ]),
            )
            ->when(
                $due === 'overdue',
                fn (Builder $builder) => $builder
                    ->whereDate('due_date', '<', $today)
                    ->where('is_completed', false),
            );
    }

    public function scopeSearching(Builder $query, ?string $search): void
    {
        $query->when(filled($search), function (Builder $builder) use ($search): void {
            $builder->where(function (Builder $nestedBuilder) use ($search): void {
                $nestedBuilder
                    ->where('title', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        });
    }

    public function scopeCsvExport(Builder $query): void
    {
        $query
            ->select([
                'id',
                'title',
                'description',
                'status',
                'priority',
                'category_id',
                'due_date',
                'is_completed',
                'is_pinned',
                'sort_order',
                'created_at',
            ])
            ->with('category:id,name')
            ->orderByDesc('is_pinned')
            ->orderBy('sort_order')
            ->orderByDesc('created_at');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function subtasks()
    {
        return $this->hasMany(Subtask::class);
    }

    public function reminders()
    {
        return $this->hasMany(Reminder::class);
    }
}
