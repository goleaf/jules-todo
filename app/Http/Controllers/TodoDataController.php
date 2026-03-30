<?php

namespace App\Http\Controllers;

use App\Actions\ClearTodoDataAction;
use App\Actions\ExportTodoDataAction;
use App\Actions\ImportTodoDataAction;
use App\Http\Requests\ImportTodoDataRequest;
use App\Http\Resources\TodoDataClearResultResource;
use App\Http\Resources\TodoDataExportResource;
use App\Http\Resources\TodoDataImportResultResource;

class TodoDataController extends Controller
{
    public function export(ExportTodoDataAction $exportTodoDataAction): TodoDataExportResource
    {
        return new TodoDataExportResource($exportTodoDataAction->handle());
    }

    public function import(
        ImportTodoDataRequest $request,
        ImportTodoDataAction $importTodoDataAction,
    ): TodoDataImportResultResource {
        return new TodoDataImportResultResource(
            $importTodoDataAction->handle($request->validated()),
        );
    }

    public function destroyAll(ClearTodoDataAction $clearTodoDataAction): TodoDataClearResultResource
    {
        return new TodoDataClearResultResource($clearTodoDataAction->handle());
    }
}
