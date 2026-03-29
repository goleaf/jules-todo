<?php

namespace App\Http\Controllers;

use App\Actions\GetWorkspaceDataAction;
use App\Http\Resources\WorkspaceResource;
use Illuminate\Contracts\View\View;

class TaskWorkspaceController extends Controller
{
    public function __invoke(GetWorkspaceDataAction $workspace): View
    {
        $payload = (new WorkspaceResource($workspace->handle()))->resolve();

        return view('tasks.workspace', [
            'workspace' => $workspace->handle(),
            'workspacePayload' => $payload,
        ]);
    }
}
