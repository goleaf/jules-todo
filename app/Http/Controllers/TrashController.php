<?php

namespace App\Http\Controllers;

use App\Actions\EmptyTrashAction;
use Illuminate\Http\JsonResponse;

class TrashController extends Controller
{
    public function destroy(EmptyTrashAction $emptyTrash): JsonResponse
    {
        return response()->json([
            'data' => [
                'deleted' => $emptyTrash->handle(),
            ],
        ]);
    }
}
