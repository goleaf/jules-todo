<?php

namespace App\Http\Requests;

use App\Models\TodoList;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTodoListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var TodoList|null $list */
        $list = $this->route('list');

        return [
            'name' => [
                'nullable',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail) use ($list): void {
                    if ($value === null) {
                        return;
                    }

                    $name = trim((string) $value);

                    if ($name === '') {
                        $fail('Please enter a list name.');

                        return;
                    }

                    $exists = TodoList::query()
                        ->whereKeyNot($list?->getKey())
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
            'name.string' => 'The list name must be a valid string.',
            'name.max' => 'List names may not be longer than 50 characters.',
            'color.string' => 'The list color must be a valid string.',
            'color.regex' => 'Please choose a valid hex color like #6366f1.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && $this->input('name') !== null) {
            $this->merge([
                'name' => trim((string) $this->input('name')),
            ]);
        }
    }
}
