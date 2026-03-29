<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reminder extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'task_id',
        'reminder_time',
        'reminder_type',
    ];

    protected $casts = [
        'reminder_time' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
