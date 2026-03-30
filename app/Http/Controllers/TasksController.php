<?php

namespace App\Http\Controllers;

use App\Http\Resources\TodoListResource;
use App\Models\TodoList;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TasksController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('Tasks/Index', [
            'lists' => TodoListResource::collection(
                TodoList::query()->forSidebar()->get(),
            )->resolve($request),
            'filters' => [
                'list_id' => $request->input('list_id'),
                'status' => $request->input('status'),
                'due_date_filter' => $request->input('due_date_filter'),
                'priority_filter' => $request->input('priority_filter'),
                'sort' => $request->input('sort'),
                'sort_by' => $request->input('sort_by'),
                'search' => $request->input('search'),
            ],
        ]);
    }
}
