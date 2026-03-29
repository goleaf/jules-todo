<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReorderTasksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['required', 'uuid', 'exists:categories,id'],
            'task_ids' => ['required', 'array', 'min:1'],
            'task_ids.*' => ['required', 'uuid', 'exists:tasks,id'],
        ];
    }
}
