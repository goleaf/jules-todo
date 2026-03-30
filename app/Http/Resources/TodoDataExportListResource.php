<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TodoDataExportListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->resource->getKey(),
            'name' => $this->resource->name,
            'color' => $this->resource->color,
            'sort_order' => (int) $this->resource->sort_order,
            'created_at' => $this->resource->created_at?->toISOString(),
            'updated_at' => $this->resource->updated_at?->toISOString(),
            'todos' => TodoDataExportTodoResource::collection(
                $this->whenLoaded('todos'),
            ),
        ];
    }
}
