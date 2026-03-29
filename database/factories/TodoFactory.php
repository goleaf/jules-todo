<?php

namespace Database\Factories;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Todo>
 */
class TodoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'todo_list_id' => TodoList::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->sentence(),
            'is_completed' => false,
            'completed_at' => null,
            'priority' => fake()->randomElement(['none', 'low', 'medium', 'high']),
            'due_date' => fake()->optional()->dateTimeBetween('-3 days', '+10 days'),
            'sort_order' => fake()->numberBetween(0, 20),
            'is_deleted' => false,
            'deleted_at' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (): array => [
            'is_completed' => true,
            'completed_at' => now()->subHour(),
        ]);
    }

    public function deleted(): static
    {
        return $this->state(fn (): array => [
            'is_deleted' => true,
            'deleted_at' => now()->subHour(),
        ]);
    }
}
