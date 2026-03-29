<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'categories' => CategoryResource::collection($this->resource['categories']),
            'tasks' => TaskResource::collection($this->resource['tasks']),
            'trashed_tasks' => TaskResource::collection($this->resource['trashed_tasks']),
        ];
    }
}
