<?php

namespace App\Http\Requests;

use App\Models\TodoList;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTodoListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:50', $this->uniqueNameRule()],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }

    private function uniqueNameRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $normalized = mb_strtolower(trim((string) $value));
            /** @var TodoList|null $current */
            $current = $this->route('list');

            $exists = TodoList::query()
                ->select(['id', 'name'])
                ->when($current, fn ($query) => $query->whereKeyNot($current->getKey()))
                ->get()
                ->contains(fn (TodoList $list) => mb_strtolower($list->name) === $normalized);

            if ($exists) {
                $fail('The name has already been taken.');
            }
        };
    }
}
