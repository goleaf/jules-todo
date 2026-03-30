<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TodoDataImportResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'imported_lists' => (int) data_get($this->resource, 'imported_lists', 0),
            'imported_todos' => (int) data_get($this->resource, 'imported_todos', 0),
        ];
    }
}
