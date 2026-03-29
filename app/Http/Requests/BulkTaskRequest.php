<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'task_ids' => ['required', 'array', 'min:1'],
            'task_ids.*' => ['required', 'uuid', 'exists:tasks,id'],
            'action' => ['required', Rule::in(['complete', 'uncomplete', 'delete', 'move'])],
            'category_id' => [
                'nullable',
                'uuid',
                'exists:categories,id',
                Rule::requiredIf($this->input('action') === 'move'),
            ],
        ];
    }
}
