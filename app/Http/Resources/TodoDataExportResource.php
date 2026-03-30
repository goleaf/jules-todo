<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TodoDataExportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'exported_at' => data_get($this->resource, 'exported_at'),
            'lists' => TodoDataExportListResource::collection(
                data_get($this->resource, 'lists', []),
            ),
        ];
    }
}
