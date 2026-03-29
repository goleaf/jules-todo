<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'todo_list_id' => ['nullable', 'integer', 'exists:todo_lists,id'],
            'priority' => ['nullable', Rule::in(['none', 'low', 'medium', 'high'])],
            'due_date' => ['nullable', 'date'],
        ];
    }
}
