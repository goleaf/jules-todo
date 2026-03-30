<?php

namespace Database\Factories;

use App\Models\TodoList;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\Sequence;

/**
 * @extends Factory<TodoList>
 */
class TodoListFactory extends Factory
{
    private const COLOR_PALETTE = [
        '#6366f1',
        '#f59e0b',
        '#10b981',
        '#ef4444',
        '#3b82f6',
        '#8b5cf6',
        '#ec4899',
        '#14b8a6',
        '#f97316',
        '#06b6d4',
        '#84cc16',
        '#a855f7',
    ];

    public function configure(): static
    {
        return $this->sequence(
            fn (Sequence $sequence): array => [
                'sort_order' => $sequence->index + 1,
            ],
        );
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'color' => fake()->randomElement(self::COLOR_PALETTE),
            'sort_order' => 1,
        ];
    }
}
