<?php

namespace Database\Factories;

use App\Models\Todo;
use App\Models\TodoList;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\Sequence;

/**
 * @extends Factory<Todo>
 */
class TodoFactory extends Factory
{
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
        $isCompleted = fake()->boolean(30);
        $isDeleted = fake()->boolean(10);

        return [
            'todo_list_id' => null,
            'title' => fake()->sentence(fake()->numberBetween(3, 8), false),
            'description' => fake()->boolean(70) ? fake()->paragraph() : null,
            'is_completed' => $isCompleted,
            'completed_at' => $isCompleted
                ? fake()->dateTimeBetween('-30 days', 'now')
                : null,
            'priority' => fake()->randomElement(['none', 'low', 'medium', 'high']),
            'due_date' => fake()->boolean(60)
                ? fake()->dateTimeBetween('-7 days', '+30 days')
                : null,
            'sort_order' => 1,
            'is_deleted' => $isDeleted,
            'deleted_at' => $isDeleted
                ? fake()->dateTimeBetween('-25 days', 'now')
                : null,
        ];
    }

    public function withList(?TodoList $list = null): static
    {
        return $this->for($list ?? TodoList::factory(), 'todoList');
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
