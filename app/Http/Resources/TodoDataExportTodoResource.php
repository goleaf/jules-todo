<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TodoDataExportTodoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->resource->getKey(),
            'todo_list_id' => $this->resource->todo_list_id ? (int) $this->resource->todo_list_id : null,
            'title' => $this->resource->title,
            'description' => $this->resource->description,
            'is_completed' => (bool) $this->resource->is_completed,
            'completed_at' => $this->resource->completed_at?->toISOString(),
            'priority' => $this->resource->priority,
            'due_date' => $this->resource->due_date?->toDateString(),
            'sort_order' => (int) $this->resource->sort_order,
            'is_deleted' => (bool) $this->resource->is_deleted,
            'deleted_at' => $this->resource->deleted_at?->toISOString(),
            'created_at' => $this->resource->created_at?->toISOString(),
            'updated_at' => $this->resource->updated_at?->toISOString(),
        ];
    }
}
