<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $table = $this->routeIs('api.lists.reorder')
            ? 'todo_lists'
            : 'todos';

        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', Rule::exists($table, 'id')],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
