<?php

namespace App\Http\Requests;

use App\Models\TodoList;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FilterTodosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'list_id' => ['nullable', $this->validListIdentifierRule()],
            'status' => ['nullable', Rule::in(['all', 'active', 'completed'])],
            'due_date_filter' => ['nullable', Rule::in(['today', 'tomorrow', 'this_week', 'overdue', 'no_date'])],
            'priority_filter' => ['nullable', Rule::in(['any', 'none', 'low', 'medium', 'high'])],
            'sort_by' => ['nullable', Rule::in(['manual', 'due_date', 'priority', 'title_asc', 'title_desc', 'created_at', 'completed_at'])],
            'search' => ['nullable', 'string', 'max:255'],
        ];
    }

    private function validListIdentifierRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if ($value === null || $value === '' || in_array($value, ['all', 'today', 'trash'], true)) {
                return;
            }

            if (! ctype_digit((string) $value) || ! TodoList::query()->whereKey((int) $value)->exists()) {
                $fail('The selected list is invalid.');
            }
        };
    }
}
