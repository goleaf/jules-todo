<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WorkspaceQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'uuid', 'exists:categories,id'],
            'status' => ['nullable', Rule::in(['all', 'active', 'completed'])],
            'due' => ['nullable', Rule::in(['today', 'week', 'overdue'])],
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', Rule::in(['manual', 'priority', 'due_asc', 'due_desc'])],
        ];
    }
}
