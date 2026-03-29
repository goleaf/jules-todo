<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TodoList extends Model
{
    /** @use HasFactory<\Database\Factories\TodoListFactory> */
    use HasFactory;

    protected $table = 'todo_lists';

    protected $fillable = [
        'name',
        'color',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function todos(): HasMany
    {
        return $this->hasMany(Todo::class);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    public function activeTodos(): HasMany
    {
        return $this->hasMany(Todo::class, 'todo_list_id')->active();
    }

    public function getActiveTodosCountAttribute(): int
    {
        if ($this->relationLoaded('todos')) {
            return $this->todos
                ->where('is_deleted', false)
                ->where('is_completed', false)
                ->count();
        }

        return $this->activeTodos()->count();
    }

    public function getTodosCountAttribute(): int
    {
        if ($this->relationLoaded('todos')) {
            return $this->todos
                ->where('is_deleted', false)
                ->count();
        }

        return $this->todos()->notInTrash()->count();
    }
}
