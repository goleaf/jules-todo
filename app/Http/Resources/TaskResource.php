<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->getKey(),
            'title' => $this->resource->title,
            'description' => $this->resource->description,
            'due_date' => $this->resource->due_date?->toDateString(),
            'priority' => $this->resource->workspacePriority(),
            'status' => $this->resource->workspaceStatus(),
            'category_id' => $this->resource->category_id,
            'is_completed' => (bool) $this->resource->is_completed,
            'is_pinned' => (bool) $this->resource->is_pinned,
            'sort_order' => $this->resource->sort_order,
            'category' => $this->whenLoaded(
                'category',
                fn () => [
                    'id' => $this->resource->category?->getKey(),
                    'name' => $this->resource->category?->name,
                    'color' => $this->resource->category?->color,
                    'icon' => $this->resource->category?->icon,
                ],
            ),
        ];
    }
}
