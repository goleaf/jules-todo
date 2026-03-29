<?php

namespace App\Http\Controllers;

use App\Actions\ApplyBulkTaskAction;
use App\Actions\ReorderTasksAction;
use App\Http\Requests\BulkTaskRequest;
use App\Http\Requests\ReorderTasksRequest;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TaskController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TaskResource::collection(Task::query()->workspaceData()->get());
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = Task::create([
            ...$request->validated(),
            'pomodoro_completed' => $request->integer('pomodoro_completed', 0),
            'sort_order' => $request->integer(
                'sort_order',
                (Task::withTrashed()->max('sort_order') ?? -1) + 1,
            ),
        ]);

        return (new TaskResource($this->loadTask($task->fresh())))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Task $task): TaskResource
    {
        return new TaskResource($this->loadTask($task));
    }

    public function update(UpdateTaskRequest $request, Task $task): TaskResource
    {
        $task->update($request->validated());

        return new TaskResource($this->loadTask($task->fresh()));
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();

        return response()->json(null, 204);
    }

    public function restore(Task $task): TaskResource
    {
        $task->restore();

        return new TaskResource($this->loadTask($task->fresh()));
    }

    public function bulkUpdate(
        BulkTaskRequest $request,
        ApplyBulkTaskAction $bulkAction,
    ): JsonResponse|AnonymousResourceCollection {
        $result = $bulkAction->handle(
            $request->validated('task_ids'),
            $request->validated('action'),
            $request->validated('category_id'),
        );

        if (array_key_exists('deleted', $result)) {
            return response()->json([
                'data' => [
                    'deleted' => $result['deleted'],
                ],
            ]);
        }

        return TaskResource::collection($result['tasks']);
    }

    public function reorder(
        ReorderTasksRequest $request,
        ReorderTasksAction $reorderTasks,
    ): AnonymousResourceCollection {
        return TaskResource::collection(
            $reorderTasks->handle(
                $request->validated('category_id'),
                $request->validated('task_ids'),
            ),
        );
    }

    public function exportCsv(): StreamedResponse
    {
        $tasks = Task::query()->csvExport()->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename=tasks.csv',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $columns = ['Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date', 'Completed'];

        $callback = function () use ($tasks, $columns): void {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($tasks as $task) {
                fputcsv($file, [
                    $task->title,
                    $task->description ?? '',
                    $task->workspaceStatus(),
                    $task->workspacePriority(),
                    $task->category?->name ?? 'Inbox',
                    $task->due_date ? $task->due_date->format('Y-m-d') : '',
                    $task->is_completed ? 'Yes' : 'No',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function loadTask(Task $task): Task
    {
        return $task->load([
            'category:id,name,color,icon',
            'subtasks:id,task_id,title,is_completed,created_at,updated_at',
            'reminders:id,task_id,reminder_time,reminder_type,created_at,updated_at',
        ]);
    }
}
