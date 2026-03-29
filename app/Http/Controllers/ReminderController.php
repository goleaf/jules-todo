<?php

namespace App\Http\Controllers;

use App\Models\Reminder;
use App\Models\Task;
use Illuminate\Http\Request;

class ReminderController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'task_id' => 'required|uuid|exists:tasks,id',
            'reminder_time' => 'required|date',
            'reminder_type' => 'required|in:10min,1h,1d',
        ]);

        $reminder = Reminder::create($validated);
        
        return response()->json($reminder, 201);
    }

    public function destroy(Reminder $reminder)
    {
        $reminder->delete();
        
        return response()->json(null, 204);
    }
}
