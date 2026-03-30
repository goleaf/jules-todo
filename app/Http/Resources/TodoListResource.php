<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TodoListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->resource->getKey(),
            'name' => $this->resource->name,
            'color' => $this->resource->color,
            'sort_order' => (int) $this->resource->sort_order,
            'todos_count' => (int) $this->whenCounted(
                'todos',
                fn () => $this->resource->todos_count,
                0,
            ),
            'active_todos_count' => (int) $this->whenCounted(
                'activeTodos',
                fn () => $this->resource->active_todos_count,
                0,
            ),
            'created_at' => $this->resource->created_at?->toISOString(),
            'updated_at' => $this->resource->updated_at?->toISOString(),
        ];
    }
}
