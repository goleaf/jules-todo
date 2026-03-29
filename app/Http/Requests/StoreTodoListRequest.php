<?php

namespace App\Http\Requests;

use App\Models\TodoList;
use Closure;
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
            'name' => ['required', 'string', 'max:50', $this->uniqueNameRule()],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }

    private function uniqueNameRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $normalized = mb_strtolower(trim((string) $value));

            $exists = TodoList::query()
                ->select(['id', 'name'])
                ->get()
                ->contains(fn (TodoList $list) => mb_strtolower($list->name) === $normalized);

            if ($exists) {
                $fail('The name has already been taken.');
            }
        };
    }
}
