<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportTodoDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'exported_at' => ['nullable', 'date'],
            'lists' => ['required', 'array'],
            'lists.*.name' => ['required', 'string', 'max:255'],
            'lists.*.color' => ['nullable', 'string', 'max:32'],
            'lists.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'lists.*.todos' => ['required', 'array'],
            'lists.*.todos.*.title' => ['required', 'string', 'max:255'],
            'lists.*.todos.*.description' => ['nullable', 'string', 'max:2000'],
            'lists.*.todos.*.priority' => ['nullable', Rule::in(['none', 'low', 'medium', 'high'])],
            'lists.*.todos.*.due_date' => ['nullable', 'date'],
            'lists.*.todos.*.is_completed' => ['nullable', 'boolean'],
            'lists.*.todos.*.completed_at' => ['nullable', 'date'],
            'lists.*.todos.*.is_deleted' => ['nullable', 'boolean'],
            'lists.*.todos.*.deleted_at' => ['nullable', 'date'],
            'lists.*.todos.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
