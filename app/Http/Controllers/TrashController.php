<?php

namespace App\Http\Controllers;

use App\Actions\EmptyTrashAction;

class TrashController extends Controller
{
    public function destroy(EmptyTrashAction $emptyTrash): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'data' => [
                'deleted' => $emptyTrash->handle(),
            ],
        ]);
    }
}
