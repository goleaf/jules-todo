<?php

namespace App\Http\Requests;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'todo_list_id' => ['nullable', 'integer', 'exists:todo_lists,id'],
            'priority' => ['nullable', 'string', Rule::in(['none', 'low', 'medium', 'high'])],
            'due_date' => ['nullable', 'date'],
            'is_completed' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [];

        if ($this->has('title') && $this->input('title') !== null) {
            $payload['title'] = trim((string) $this->input('title'));
        }

        if ($this->has('description')) {
            $description = $this->input('description');
            $payload['description'] = $description === null
                ? null
                : trim((string) $description);
        }

        if ($this->filled('due_date')) {
            $payload['due_date'] = Carbon::parse((string) $this->input('due_date'))->toDateString();
        }

        $this->merge($payload);
    }
}
