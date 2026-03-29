<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->optional()->sentence(),
            'due_date' => fake()->optional()->dateTimeBetween('now', '+10 days'),
            'priority' => fake()->randomElement(['low', 'normal', 'high']),
            'status' => 'todo',
            'category_id' => Category::factory(),
            'is_completed' => false,
            'recurring' => null,
            'attachments' => null,
            'pomodoro_estimate' => null,
            'pomodoro_completed' => 0,
            'estimated_minutes' => fake()->optional()->numberBetween(15, 120),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => 'done',
            'is_completed' => true,
        ]);
    }
}
