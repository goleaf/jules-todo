<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(Task::normalizeWorkspaceInput($this->all()));
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['required', Rule::in(['low', 'normal', 'high'])],
            'status' => ['required', Rule::in(['todo', 'in_progress', 'done'])],
            'category_id' => ['nullable', 'uuid', 'exists:categories,id'],
            'is_completed' => ['boolean'],
            'is_pinned' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'recurring' => ['nullable', 'array'],
            'attachments' => ['nullable', 'array'],
            'pomodoro_estimate' => ['nullable', 'integer', 'min:0'],
            'pomodoro_completed' => ['nullable', 'integer', 'min:0'],
            'estimated_minutes' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
