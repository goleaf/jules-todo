<?php

namespace App\Http\Requests;

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
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'todo_list_id' => ['sometimes', 'nullable', 'integer', 'exists:todo_lists,id'],
            'priority' => ['sometimes', 'nullable', Rule::in(['none', 'low', 'medium', 'high'])],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'is_completed' => ['sometimes', 'boolean'],
        ];
    }
}
