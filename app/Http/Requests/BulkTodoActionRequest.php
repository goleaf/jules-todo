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
            'action' => [
                'required',
                'string',
                Rule::in([
                    'complete',
                    'uncomplete',
                    'delete',
                    'restore',
                    'move',
                    'set_priority',
                    'permanent_delete',
                ]),
            ],
            'todo_ids' => ['required', 'array', 'min:1', 'max:100'],
            'todo_ids.*' => ['required', 'integer', 'exists:todos,id'],
            'list_id' => [
                Rule::requiredIf($this->input('action') === 'move'),
                'integer',
                'exists:todo_lists,id',
            ],
            'priority' => [
                Rule::requiredIf($this->input('action') === 'set_priority'),
                'string',
                Rule::in(['none', 'low', 'medium', 'high']),
            ],
        ];
    }
}
