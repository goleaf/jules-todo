<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkTodoActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['complete', 'uncomplete', 'delete', 'restore', 'move', 'set_priority'])],
            'todo_ids' => ['required', 'array', 'min:1', 'max:100'],
            'todo_ids.*' => ['required', 'integer', 'distinct', 'exists:todos,id'],
            'list_id' => ['nullable', 'integer', 'exists:todo_lists,id', Rule::requiredIf($this->input('action') === 'move')],
            'priority' => ['nullable', Rule::in(['none', 'low', 'medium', 'high']), Rule::requiredIf($this->input('action') === 'set_priority')],
        ];
    }
}
