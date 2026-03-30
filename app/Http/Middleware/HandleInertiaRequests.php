<?php

namespace App\Http\Middleware;

use App\Http\Resources\TodoListResource;
use App\Models\Todo;
use App\Models\TodoList;
use Carbon\Carbon;
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
                TodoList::query()->forSidebar()->get(),
            )->resolve($request),
            'virtual_lists' => [
                ['id' => 'all', 'name' => 'All Tasks', 'icon' => 'layers'],
                ['id' => 'today', 'name' => 'Today', 'icon' => 'sun'],
                ['id' => 'trash', 'name' => 'Trash', 'icon' => 'trash-2'],
            ],
            'default_lists' => [
                ['id' => 'all', 'name' => 'All Tasks', 'icon' => 'layers'],
                ['id' => 'today', 'name' => 'Today', 'icon' => 'sun'],
                ['id' => 'trash', 'name' => 'Trash', 'icon' => 'trash-2'],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
            ],
            'today_count' => fn () => Todo::query()
                ->notInTrash()
                ->where('is_completed', false)
                ->whereDate('due_date', Carbon::today())
                ->count(),
            'trash_count' => fn () => Todo::query()
                ->inTrash()
                ->count(),
        ];
    }
}
