<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'Laravel') }}</title>
        @routes
        @vite(['resources/js/workspace.js'])
    </head>
    <body class="min-h-full bg-stone-100 text-slate-900 transition dark:bg-slate-950 dark:text-slate-50">
        <script id="workspace-payload" type="application/json">@json($workspacePayload)</script>

        <div
            id="workspace-app"
            class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6"
        >
            <section class="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/90 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
                <div class="grid gap-6 px-6 py-7 lg:grid-cols-[1.8fr_1fr] lg:px-8">
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">
                            Public Todo Workspace
                        </p>
                        <h1 class="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                            Lists, filters, trash, and fast edits on the home route
                        </h1>
                        <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                            This Blade shell hydrates the list-first task workspace. The interactive controls below are enhanced by the workspace script.
                        </p>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <div class="rounded-3xl bg-slate-950 px-5 py-4 text-white dark:bg-white dark:text-slate-950">
                            <p class="text-sm opacity-70">Lists</p>
                            <p class="mt-3 text-3xl font-semibold">{{ $workspace['categories']->count() }}</p>
                        </div>
                        <div class="rounded-3xl bg-emerald-100 px-5 py-4 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100">
                            <p class="text-sm opacity-80">Active tasks</p>
                            <p class="mt-3 text-3xl font-semibold">{{ $workspace['tasks']->where('is_completed', false)->count() }}</p>
                        </div>
                        <div class="rounded-3xl bg-rose-100 px-5 py-4 text-rose-950 dark:bg-rose-500/20 dark:text-rose-100">
                            <p class="text-sm opacity-80">Trash</p>
                            <p class="mt-3 text-3xl font-semibold">{{ $workspace['trashed_tasks']->count() }}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section class="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
                <aside class="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Lists</h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400">Organize Work, Personal, or anything else.</p>
                        </div>
                        <button
                            type="button"
                            data-action="create-category"
                            class="rounded-full border border-cyan-200 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:border-cyan-400/30 dark:text-cyan-200 dark:hover:bg-cyan-400/10"
                        >
                            Create list
                        </button>
                    </div>

                    <div class="mt-4 space-y-2" data-role="category-list">
                        @forelse ($workspace['categories'] as $category)
                            <button
                                type="button"
                                data-category-id="{{ $category->id }}"
                                class="flex w-full items-center justify-between rounded-2xl border border-stone-200 px-4 py-3 text-left transition hover:border-cyan-300 hover:bg-cyan-50/70 dark:border-white/10 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/10"
                            >
                                <span>
                                    <span class="block text-sm font-medium text-slate-900 dark:text-slate-100">{{ $category->name }}</span>
                                    <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">List ready for drag-and-drop</span>
                                </span>
                                <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">0</span>
                            </button>
                        @empty
                            <div class="rounded-2xl border border-dashed border-stone-300 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                                No lists yet.
                            </div>
                        @endforelse
                    </div>

                    <button
                        type="button"
                        data-action="show-trash"
                        class="mt-4 flex w-full items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
                    >
                        <span>
                            <span class="block text-sm font-semibold text-rose-700 dark:text-rose-200">Trash</span>
                            <span class="mt-1 block text-xs text-rose-600/80 dark:text-rose-200/80">Restore or empty deleted todos</span>
                        </span>
                        <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-rose-700 dark:bg-slate-900 dark:text-rose-200">0</span>
                    </button>
                </aside>

                <section class="space-y-6">
                    <div class="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                        <div class="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
                            <label class="block">
                                <span class="sr-only">Search todos</span>
                                <input
                                    type="search"
                                    data-role="search"
                                    placeholder="Search todos"
                                    class="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                                >
                            </label>
                            <select data-role="status-filter" class="h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                            </select>
                            <select data-role="due-filter" class="h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                                <option value="">Due date</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="overdue">Overdue</option>
                            </select>
                            <select data-role="sort-filter" class="h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                                <option value="manual">Manual order</option>
                                <option value="priority">Sort by priority</option>
                                <option value="due_asc">Due date ↑</option>
                                <option value="due_desc">Due date ↓</option>
                            </select>
                            <button type="button" data-action="toggle-theme" class="h-12 rounded-2xl border border-stone-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-stone-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-slate-800">
                                Dark mode
                            </button>
                            <button type="button" data-action="focus-create-form" class="h-12 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">
                                Create todo
                            </button>
                        </div>

                        <div class="mt-4 hidden rounded-2xl border px-4 py-3 text-sm" data-role="notice"></div>
                    </div>

                    <div class="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                        <form data-role="create-task-form" class="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_160px_140px_auto]">
                            <label class="block md:col-span-2">
                                <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Title</span>
                                <input
                                    name="title"
                                    type="text"
                                    required
                                    placeholder="Add a new todo"
                                    class="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                                >
                            </label>
                            <label class="block">
                                <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Due date</span>
                                <input name="due_date" type="date" class="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                            </label>
                            <label class="block">
                                <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Priority</span>
                                <select name="priority" class="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </label>
                            <button type="submit" class="mt-auto h-12 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:bg-cyan-500/20">
                                Create todo
                            </button>
                            <label class="block md:col-span-5">
                                <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
                                <textarea name="description" rows="3" placeholder="Optional description" class="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-white"></textarea>
                            </label>
                        </form>
                    </div>

                    <div class="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Workspace</h2>
                                <p class="text-sm text-slate-500 dark:text-slate-400">Pinned todos stay at the top. Drag within the current list to reorder.</p>
                            </div>

                            <div class="hidden items-center gap-3" data-role="bulk-bar">
                                <span class="text-sm font-medium text-slate-600 dark:text-slate-300" data-role="bulk-count">0 selected</span>
                                <select data-role="bulk-action" class="h-11 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100">
                                    <option value="complete">Complete</option>
                                    <option value="uncomplete">Uncomplete</option>
                                    <option value="move">Move</option>
                                    <option value="delete">Delete</option>
                                </select>
                                <select data-role="bulk-category" class="h-11 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"></select>
                                <button type="button" data-action="apply-bulk" class="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">
                                    Apply
                                </button>
                            </div>
                        </div>

                        <div class="mt-6" data-role="workspace-content">
                            <div class="rounded-3xl border border-dashed border-stone-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                                Loading todo workspace…
                            </div>
                        </div>
                    </div>
                </section>
            </section>
        </div>
    </body>
</html>
