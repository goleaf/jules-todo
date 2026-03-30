<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TodoDataClearResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'deleted_lists' => (int) data_get($this->resource, 'deleted_lists', 0),
            'deleted_todos' => (int) data_get($this->resource, 'deleted_todos', 0),
        ];
    }
}
