<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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

    protected $attributes = [
        'color' => '#6366f1',
        'sort_order' => 0,
    ];

    public function todos(): HasMany
    {
        return $this->hasMany(Todo::class, 'todo_list_id');
    }

    public function activeTodos(): HasMany
    {
        return $this->hasMany(Todo::class, 'todo_list_id')
            ->where('is_deleted', false)
            ->where('is_completed', false);
    }

    #[Scope]
    protected function ordered(Builder $query): void
    {
        $query
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    #[Scope]
    protected function forSidebar(Builder $query): void
    {
        $query
            ->select([
                'id',
                'name',
                'color',
                'sort_order',
                'created_at',
                'updated_at',
            ])
            ->withCount([
                'todos as todos_count' => fn (Builder $todoQuery) => $todoQuery->notInTrash(),
                'activeTodos as active_todos_count',
            ])
            ->ordered();
    }

    protected function todosCount(): Attribute
    {
        $attribute = Attribute::make(
            get: function (mixed $value): int {
                if ($value !== null) {
                    return (int) $value;
                }

                if ($this->relationLoaded('todos')) {
                    return $this->todos
                        ->where('is_deleted', false)
                        ->count();
                }

                return $this->todos()
                    ->where('is_deleted', false)
                    ->count();
            },
        );

        return method_exists($attribute, 'shouldCache')
            ? $attribute->shouldCache()
            : $attribute;
    }

    protected function activeTodosCount(): Attribute
    {
        $attribute = Attribute::make(
            get: function (mixed $value): int {
                if ($value !== null) {
                    return (int) $value;
                }

                if ($this->relationLoaded('todos')) {
                    return $this->todos
                        ->where('is_deleted', false)
                        ->where('is_completed', false)
                        ->count();
                }

                return $this->activeTodos()->count();
            },
        );

        return method_exists($attribute, 'shouldCache')
            ? $attribute->shouldCache()
            : $attribute;
    }
}
