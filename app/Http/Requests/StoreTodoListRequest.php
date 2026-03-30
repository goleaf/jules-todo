<?php

namespace App\Http\Requests;

use App\Models\TodoList;
use Illuminate\Foundation\Http\FormRequest;

class StoreTodoListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $name = trim((string) $value);

                    if ($name === '') {
                        return;
                    }

                    $exists = TodoList::query()
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                        ->exists();

                    if ($exists) {
                        $fail('A list with this name already exists.');
                    }
                },
            ],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Please enter a list name.',
            'name.string' => 'The list name must be a valid string.',
            'name.max' => 'List names may not be longer than 50 characters.',
            'color.string' => 'The list color must be a valid string.',
            'color.regex' => 'Please choose a valid hex color like #6366f1.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge([
                'name' => trim((string) $this->input('name')),
            ]);
        }
    }
}
