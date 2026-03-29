<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReorderTodosRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (array_is_list($this->all())) {
            $this->replace(['items' => $this->all()]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'distinct', 'exists:todos,id'],
            'items.*.sort_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
