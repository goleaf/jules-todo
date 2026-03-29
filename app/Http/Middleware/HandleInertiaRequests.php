<?php

namespace App\Http\Middleware;

use App\Http\Resources\TodoListResource;
use App\Models\TodoList;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'lists' => fn () => TodoListResource::collection(
                TodoList::query()
                    ->select([
                        'id',
                        'name',
                        'color',
                        'sort_order',
                        'created_at',
                        'updated_at',
                    ])
                    ->withCount([
                        'todos as todos_count' => fn ($query) => $query->notInTrash(),
                        'activeTodos as active_todos_count',
                    ])
                    ->ordered()
                    ->get(),
            )->resolve($request),
            'default_lists' => [
                ['id' => 'all', 'name' => 'All Tasks', 'icon' => 'layers'],
                ['id' => 'today', 'name' => 'Today', 'icon' => 'sun'],
                ['id' => 'trash', 'name' => 'Trash', 'icon' => 'trash-2'],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
