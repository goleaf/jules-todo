<?php

namespace App\Http\Controllers;

use App\Actions\GetWorkspaceDataAction;
use App\Http\Requests\WorkspaceQueryRequest;
use App\Http\Resources\WorkspaceResource;

class WorkspaceDataController extends Controller
{
    public function __invoke(
        WorkspaceQueryRequest $request,
        GetWorkspaceDataAction $workspace,
    ): WorkspaceResource {
        return new WorkspaceResource($workspace->handle($request->validated()));
    }
}
