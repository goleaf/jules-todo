<?php

namespace App\Http\Controllers;

use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\Request;

class SubtaskController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'is_completed' => 'boolean',
        ]);

        $subtask = $task->subtasks()->create($validated);

        return response()->json($task->fresh()->load([
            'category:id,name,color,icon',
            'subtasks:id,task_id,title,is_completed,created_at,updated_at',
            'reminders:id,task_id,reminder_time,reminder_type,created_at,updated_at',
        ]), 201);
    }

    public function update(Request $request, Subtask $subtask)
    {
        $validated = $request->validate([
            'title' => 'string|max:255',
            'is_completed' => 'boolean',
        ]);

        $subtask->update($validated);

        return response()->json($subtask->task->fresh()->load([
            'category:id,name,color,icon',
            'subtasks:id,task_id,title,is_completed,created_at,updated_at',
            'reminders:id,task_id,reminder_time,reminder_type,created_at,updated_at',
        ]));
    }

    public function destroy(Subtask $subtask)
    {
        $task = $subtask->task;
        $subtask->delete();

        return response()->json($task->fresh()->load([
            'category:id,name,color,icon',
            'subtasks:id,task_id,title,is_completed,created_at,updated_at',
            'reminders:id,task_id,reminder_time,reminder_type,created_at,updated_at',
        ]));
    }

    public function toggle(Subtask $subtask)
    {
        $subtask->update(['is_completed' => ! $subtask->is_completed]);

        return response()->json($subtask->task->fresh()->load([
            'category:id,name,color,icon',
            'subtasks:id,task_id,title,is_completed,created_at,updated_at',
            'reminders:id,task_id,reminder_time,reminder_type,created_at,updated_at',
        ]));
    }
}
