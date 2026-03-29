<?php

namespace App\Http\Controllers;

use App\Actions\GetWorkspaceDataAction;
use App\Http\Resources\WorkspaceResource;
use Illuminate\Contracts\View\View;

class TaskWorkspaceController extends Controller
{
    public function __invoke(GetWorkspaceDataAction $workspace): View
    {
        $workspaceData = $workspace->handle();
        $payload = (new WorkspaceResource($workspaceData))->resolve();

        return view('tasks.workspace', [
            'workspace' => $workspaceData,
            'workspacePayload' => $payload,
        ]);
    }
}
