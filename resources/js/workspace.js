import '../css/app.css';
import './bootstrap';

const root = document.getElementById('workspace-app');
const payloadElement = document.getElementById('workspace-payload');

if (!root || !payloadElement) {
    // No public workspace on this page.
} else {
    const rawPayload = JSON.parse(payloadElement.textContent || '{}');
    const initialPayload = rawPayload.data ?? rawPayload;

    const state = {
        categories: initialPayload.categories ?? [],
        tasks: normalizeTasks(initialPayload.tasks ?? []),
        trashedTasks: normalizeTasks(initialPayload.trashed_tasks ?? []),
        filters: {
            categoryId: '',
            status: 'all',
            due: '',
            search: '',
            sort: 'manual',
        },
        view: 'active',
        selectedTaskIds: [],
        editingTaskId: null,
        drafts: {},
        loading: false,
        notice: null,
        searchTimer: null,
        dragTaskId: null,
    };

    const elements = {
        categoryList: root.querySelector('[data-role="category-list"]'),
        search: root.querySelector('[data-role="search"]'),
        statusFilter: root.querySelector('[data-role="status-filter"]'),
        dueFilter: root.querySelector('[data-role="due-filter"]'),
        sortFilter: root.querySelector('[data-role="sort-filter"]'),
        notice: root.querySelector('[data-role="notice"]'),
        createForm: root.querySelector('[data-role="create-task-form"]'),
        workspaceContent: root.querySelector('[data-role="workspace-content"]'),
        bulkBar: root.querySelector('[data-role="bulk-bar"]'),
        bulkCount: root.querySelector('[data-role="bulk-count"]'),
        bulkAction: root.querySelector('[data-role="bulk-action"]'),
        bulkCategory: root.querySelector('[data-role="bulk-category"]'),
    };

    initializeTheme();
    bindStaticEvents();
    render();

    function normalizeTasks(tasks) {
        return tasks.map((task) => ({
            description: '',
            due_date: null,
            category: null,
            is_completed: false,
            is_pinned: false,
            sort_order: 0,
            priority: 'medium',
            status: 'active',
            ...task,
        }));
    }

    function initializeTheme() {
        const storedTheme = localStorage.getItem('workspace-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = storedTheme ?? (prefersDark ? 'dark' : 'light');

        document.documentElement.classList.toggle('dark', theme === 'dark');
    }

    function bindStaticEvents() {
        elements.search?.addEventListener('input', (event) => {
            state.filters.search = event.target.value;

            clearTimeout(state.searchTimer);

            state.searchTimer = window.setTimeout(() => {
                loadWorkspace();
            }, 250);
        });

        elements.statusFilter?.addEventListener('change', (event) => {
            state.filters.status = event.target.value;
            loadWorkspace();
        });

        elements.dueFilter?.addEventListener('change', (event) => {
            state.filters.due = event.target.value;
            loadWorkspace();
        });

        elements.sortFilter?.addEventListener('change', (event) => {
            state.filters.sort = event.target.value;
            loadWorkspace();
        });

        elements.createForm?.addEventListener('submit', async (event) => {
            event.preventDefault();
            await createTask(new FormData(event.currentTarget));
        });

        root.addEventListener('click', async (event) => {
            const categoryTarget = event.target.closest('[data-role="category-select"]');

            if (categoryTarget) {
                state.filters.categoryId = categoryTarget.getAttribute('value') || '';
                state.view = 'active';
                await loadWorkspace();
                return;
            }

            const actionTarget = event.target.closest('[data-action]');

            if (!actionTarget) {
                return;
            }

            const { action } = actionTarget.dataset;

            switch (action) {
                case 'toggle-theme':
                    toggleTheme();
                    break;
                case 'focus-create-form':
                    elements.createForm?.querySelector('input[name="title"]')?.focus();
                    break;
                case 'show-trash':
                    state.view = 'trash';
                    state.selectedTaskIds = [];
                    render();
                    break;
                case 'show-active':
                    state.view = 'active';
                    render();
                    break;
                case 'create-category':
                    await createCategory();
                    break;
                case 'rename-category':
                    await renameCategory(actionTarget.dataset.categoryId);
                    break;
                case 'delete-category':
                    await deleteCategory(actionTarget.dataset.categoryId);
                    break;
                case 'edit-task':
                    openEditor(actionTarget.dataset.taskId);
                    break;
                case 'cancel-edit':
                    closeEditor();
                    break;
                case 'save-task':
                    await saveTask(actionTarget.dataset.taskId);
                    break;
                case 'toggle-pin':
                    await togglePin(actionTarget.dataset.taskId);
                    break;
                case 'delete-task':
                    await deleteTask(actionTarget.dataset.taskId);
                    break;
                case 'restore-task':
                    await restoreTask(actionTarget.dataset.taskId);
                    break;
                case 'empty-trash':
                    await emptyTrash();
                    break;
                case 'apply-bulk':
                    await applyBulkAction();
                    break;
                default:
                    break;
            }
        });

        root.addEventListener('change', async (event) => {
            const input = event.target;

            if (input.matches('[data-role="select-task"]')) {
                toggleSelection(input.dataset.taskId, input.checked);
                renderBulkBar();
                return;
            }

            if (input.matches('[data-role="complete-task"]')) {
                await toggleCompletion(input.dataset.taskId, input.checked);
                return;
            }

            if (input.matches('[data-role="draft-field"]')) {
                updateDraft(
                    input.dataset.taskId,
                    input.dataset.field,
                    input.type === 'checkbox' ? input.checked : input.value,
                );
            }
        });

        root.addEventListener('dragstart', (event) => {
            const card = event.target.closest('[data-role="task-card"]');

            if (!card || state.filters.sort !== 'manual' || state.view !== 'active') {
                return;
            }

            state.dragTaskId = card.dataset.taskId;
            event.dataTransfer.effectAllowed = 'move';
        });

        root.addEventListener('dragover', (event) => {
            if (state.dragTaskId) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            }
        });

        root.addEventListener('drop', async (event) => {
            const targetCard = event.target.closest('[data-role="task-card"]');

            if (!targetCard || !state.dragTaskId || !state.filters.categoryId) {
                return;
            }

            event.preventDefault();

            await reorderTasks(state.dragTaskId, targetCard.dataset.taskId);
            state.dragTaskId = null;
        });
    }

    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('workspace-theme', isDark ? 'dark' : 'light');
        render();
    }

    function render() {
        renderNotice();
        renderCategoryList();
        renderBulkBar();
        renderWorkspaceContent();
    }

    function renderNotice() {
        if (!elements.notice) {
            return;
        }

        if (!state.notice) {
            elements.notice.className = 'mt-4 hidden rounded-2xl border px-4 py-3 text-sm';
            elements.notice.textContent = '';
            return;
        }

        elements.notice.className = `mt-4 rounded-2xl border px-4 py-3 text-sm ${
            state.notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100'
        }`;
        elements.notice.textContent = state.notice.text;
    }

    function renderCategoryList() {
        if (!elements.categoryList) {
            return;
        }

        const activeCategoryId = state.filters.categoryId;
        const trashCount = state.trashedTasks.length;
        const categoryButtons = [
            `
                <button
                    type="button"
                    data-role="category-select"
                    value=""
                    class="${categoryButtonClasses(activeCategoryId === '')}"
                >
                    <span>
                        <span class="block text-sm font-medium">All lists</span>
                        <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">Everything that matches the current filters</span>
                    </span>
                    <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">${state.tasks.length}</span>
                </button>
            `,
            ...state.categories.map((category) => {
                const taskCount = state.tasks.filter((task) => task.category_id === category.id).length;

                return `
                    <div class="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-1 dark:border-white/10 dark:bg-slate-950/60">
                        <button
                            type="button"
                            data-role="category-select"
                            value="${category.id}"
                            class="${categoryButtonClasses(activeCategoryId === category.id)}"
                        >
                            <span>
                                <span class="block text-sm font-medium">${escapeHtml(category.name)}</span>
                                <span class="mt-1 block text-xs text-slate-500 dark:text-slate-400">${escapeHtml(category.color || 'Custom accent')}</span>
                            </span>
                            <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">${taskCount}</span>
                        </button>
                        <div class="flex gap-2 px-3 pb-2 pt-1">
                            <button type="button" data-action="rename-category" data-category-id="${category.id}" class="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800">Rename</button>
                            <button type="button" data-action="delete-category" data-category-id="${category.id}" class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-200 dark:hover:bg-rose-500/10">Delete</button>
                        </div>
                    </div>
                `;
            }),
        ];

        elements.categoryList.innerHTML = categoryButtons.join('');

        const trashButton = root.querySelector('[data-action="show-trash"]');

        if (trashButton) {
            trashButton.querySelector('span:last-child').textContent = String(trashCount);
        }
    }

    function categoryButtonClasses(isActive) {
        return `flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
            isActive
                ? 'border-cyan-300 bg-cyan-50 shadow-sm dark:border-cyan-400/40 dark:bg-cyan-500/10'
                : 'border-stone-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/70 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-500/10'
        }`;
    }

    function renderBulkBar() {
        if (!elements.bulkBar || !elements.bulkCount || !elements.bulkCategory) {
            return;
        }

        const hasSelection = state.selectedTaskIds.length > 0 && state.view === 'active';
        elements.bulkBar.classList.toggle('hidden', !hasSelection);
        elements.bulkBar.classList.toggle('flex', hasSelection);
        elements.bulkCount.textContent = `${state.selectedTaskIds.length} selected`;

        elements.bulkCategory.innerHTML = `
            <option value="">Choose list</option>
            ${state.categories
                .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
                .join('')}
        `;
    }

    function renderWorkspaceContent() {
        if (!elements.workspaceContent) {
            return;
        }

        if (state.loading) {
            elements.workspaceContent.innerHTML = renderSkeletons();
            return;
        }

        if (state.view === 'trash') {
            elements.workspaceContent.innerHTML = renderTrashView();
            return;
        }

        const { pinned, regular } = splitPinned(currentTasks());
        const sections = [];

        if (pinned.length > 0) {
            sections.push(renderTaskSection('Pinned', pinned, true));
        }

        sections.push(renderTaskSection('Todos', regular, false));

        elements.workspaceContent.innerHTML = sections.join('');
    }

    function renderTaskSection(title, tasks, pinnedSection) {
        if (tasks.length === 0) {
            return `
                <section class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">${title}</h3>
                        <button type="button" data-action="show-active" class="text-xs font-medium text-cyan-700 dark:text-cyan-200">Refresh</button>
                    </div>
                    ${renderEmptyState(
                        pinnedSection
                            ? 'No pinned todos in this list yet.'
                            : 'This list has no todos matching the current filters.',
                    )}
                </section>
            `;
        }

        return `
            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">${title}</h3>
                    <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">${tasks.length}</span>
                </div>
                <div class="space-y-3">
                    ${tasks.map((task) => renderTaskCard(task)).join('')}
                </div>
            </section>
        `;
    }

    function renderTaskCard(task) {
        const editing = state.editingTaskId === task.id;
        const draft = state.drafts[task.id] ?? {
            title: task.title,
            description: task.description ?? '',
            due_date: task.due_date ?? '',
            priority: task.priority,
            category_id: task.category_id ?? '',
            is_pinned: task.is_pinned,
        };

        const overdue = task.due_date && !task.is_completed && new Date(task.due_date).getTime() < Date.now();

        return `
            <article
                class="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4 shadow-sm transition dark:border-white/10 dark:bg-slate-950/60"
                data-role="task-card"
                data-task-id="${task.id}"
                draggable="${state.filters.sort === 'manual' && state.view === 'active' && state.filters.categoryId ? 'true' : 'false'}"
            >
                <div class="flex flex-wrap items-start gap-3">
                    <label class="mt-1 inline-flex items-center gap-3">
                        <input
                            type="checkbox"
                            data-role="select-task"
                            data-task-id="${task.id}"
                            ${state.selectedTaskIds.includes(task.id) ? 'checked' : ''}
                            class="h-4 w-4 rounded border-stone-300 text-cyan-700 focus:ring-cyan-500"
                        >
                        <input
                            type="checkbox"
                            data-role="complete-task"
                            data-task-id="${task.id}"
                            ${task.is_completed ? 'checked' : ''}
                            class="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        >
                    </label>

                    <div class="min-w-0 flex-1">
                        ${
                            editing
                                ? renderTaskEditor(task, draft)
                                : `
                                    <button type="button" data-action="edit-task" data-task-id="${task.id}" class="w-full text-left">
                                        <span class="block text-base font-semibold ${task.is_completed ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-950 dark:text-white'}">${escapeHtml(task.title)}</span>
                                        <span class="mt-1 block text-sm ${task.description ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}">
                                            ${escapeHtml(task.description || 'Click the title to add a description, due date, or move it to another list.')}
                                        </span>
                                    </button>
                                `
                        }
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <span class="${priorityBadgeClasses(task.priority)}">${escapeHtml(capitalize(task.priority))}</span>
                        <span class="${dueBadgeClasses(overdue)}">${task.due_date ? escapeHtml(formatDate(task.due_date)) : 'No due date'}</span>
                        <button type="button" data-action="toggle-pin" data-task-id="${task.id}" class="rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-500/10">${task.is_pinned ? 'Pinned' : 'Pin'}</button>
                        ${
                            editing
                                ? `<button type="button" data-action="save-task" data-task-id="${task.id}" class="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">Save</button>
                                   <button type="button" data-action="cancel-edit" class="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>`
                                : ''
                        }
                        <button type="button" data-action="delete-task" data-task-id="${task.id}" class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-200 dark:hover:bg-rose-500/10">Delete</button>
                    </div>
                </div>
            </article>
        `;
    }

    function renderTaskEditor(task, draft) {
        return `
            <div class="space-y-3">
                <input
                    type="text"
                    value="${escapeAttribute(draft.title)}"
                    data-role="draft-field"
                    data-task-id="${task.id}"
                    data-field="title"
                    class="h-11 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                >
                <textarea
                    rows="3"
                    data-role="draft-field"
                    data-task-id="${task.id}"
                    data-field="description"
                    class="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                >${escapeHtml(draft.description)}</textarea>
                <div class="grid gap-3 md:grid-cols-4">
                    <input
                        type="date"
                        value="${escapeAttribute(draft.due_date || '')}"
                        data-role="draft-field"
                        data-task-id="${task.id}"
                        data-field="due_date"
                        class="h-11 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    >
                    <select
                        data-role="draft-field"
                        data-task-id="${task.id}"
                        data-field="priority"
                        class="h-11 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    >
                        ${renderOptions(['low', 'medium', 'high'], draft.priority)}
                    </select>
                    <select
                        data-role="draft-field"
                        data-task-id="${task.id}"
                        data-field="category_id"
                        class="h-11 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
                    >
                        <option value="">No list</option>
                        ${state.categories.map((category) => `<option value="${category.id}" ${draft.category_id === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}
                    </select>
                    <label class="inline-flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
                        <input
                            type="checkbox"
                            data-role="draft-field"
                            data-task-id="${task.id}"
                            data-field="is_pinned"
                            ${draft.is_pinned ? 'checked' : ''}
                            class="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        >
                        Pin to top
                    </label>
                </div>
            </div>
        `;
    }

    function renderTrashView() {
        if (state.trashedTasks.length === 0) {
            return `
                <section class="space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Trash</h3>
                        <button type="button" data-action="show-active" class="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800">Back to lists</button>
                    </div>
                    ${renderEmptyState('Trash is empty. Deleted todos can be restored here for 30 days.')}
                </section>
            `;
        }

        return `
            <section class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Trash</h3>
                        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Restore deleted todos or empty the trash now.</p>
                    </div>
                    <div class="flex gap-2">
                        <button type="button" data-action="show-active" class="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white dark:border-white/10 dark:text-slate-200 dark:hover:bg-slate-800">Back</button>
                        <button type="button" data-action="empty-trash" class="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-200 dark:hover:bg-rose-500/10">Empty Trash</button>
                    </div>
                </div>
                <div class="space-y-3">
                    ${state.trashedTasks
                        .map(
                            (task) => `
                                <article class="rounded-[1.5rem] border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-400/20 dark:bg-rose-500/10">
                                    <div class="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h4 class="text-base font-semibold text-slate-950 dark:text-white">${escapeHtml(task.title)}</h4>
                                            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${escapeHtml(task.description || 'No description')}</p>
                                        </div>
                                        <button type="button" data-action="restore-task" data-task-id="${task.id}" class="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">Restore</button>
                                    </div>
                                </article>
                            `,
                        )
                        .join('')}
                </div>
            </section>
        `;
    }

    function renderEmptyState(message) {
        return `
            <div class="rounded-[1.75rem] border border-dashed border-stone-300 bg-stone-50/70 px-6 py-10 text-center dark:border-white/10 dark:bg-slate-950/50">
                <svg viewBox="0 0 160 120" class="mx-auto h-28 w-40 text-cyan-500/70" fill="none" aria-hidden="true">
                    <path d="M28 76C28 53.909 45.909 36 68 36h18c21.539 0 39 17.461 39 39v9H28v-8Z" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
                    <path d="M48 32c0-6.627 5.373-12 12-12h40c6.627 0 12 5.373 12 12v8H48v-8Z" fill="currentColor" fill-opacity=".15"/>
                    <circle cx="52" cy="88" r="6" fill="currentColor"/>
                    <circle cx="106" cy="88" r="6" fill="currentColor"/>
                </svg>
                <p class="mt-5 text-base font-semibold text-slate-900 dark:text-white">Nothing here yet</p>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${escapeHtml(message)}</p>
            </div>
        `;
    }

    function renderSkeletons() {
        return `
            <div class="space-y-3">
                ${Array.from({ length: 4 })
                    .map(
                        () => `
                            <div class="animate-pulse rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                                <div class="h-4 w-24 rounded-full bg-stone-200 dark:bg-slate-800"></div>
                                <div class="mt-4 h-5 w-3/4 rounded-full bg-stone-200 dark:bg-slate-800"></div>
                                <div class="mt-3 h-4 w-full rounded-full bg-stone-200 dark:bg-slate-800"></div>
                                <div class="mt-2 h-4 w-2/3 rounded-full bg-stone-200 dark:bg-slate-800"></div>
                            </div>
                        `,
                    )
                    .join('')}
            </div>
        `;
    }

    function currentTasks() {
        return state.tasks;
    }

    function splitPinned(tasks) {
        return {
            pinned: tasks.filter((task) => task.is_pinned),
            regular: tasks.filter((task) => !task.is_pinned),
        };
    }

    function openEditor(taskId) {
        const task = state.tasks.find((entry) => entry.id === taskId);

        if (!task) {
            return;
        }

        state.editingTaskId = taskId;
        state.drafts[taskId] = {
            title: task.title,
            description: task.description ?? '',
            due_date: task.due_date ?? '',
            priority: task.priority,
            category_id: task.category_id ?? '',
            is_pinned: task.is_pinned,
        };
        renderWorkspaceContent();
    }

    function closeEditor() {
        state.editingTaskId = null;
        renderWorkspaceContent();
    }

    function updateDraft(taskId, field, value) {
        state.drafts[taskId] = {
            ...(state.drafts[taskId] ?? {}),
            [field]: value,
        };
    }

    function toggleSelection(taskId, checked) {
        if (!taskId) {
            return;
        }

        state.selectedTaskIds = checked
            ? [...new Set([...state.selectedTaskIds, taskId])]
            : state.selectedTaskIds.filter((id) => id !== taskId);
    }

    async function loadWorkspace() {
        state.loading = true;
        renderWorkspaceContent();

        try {
            const url = new URL(route('api.workspace'), window.location.origin);

            if (state.filters.categoryId) {
                url.searchParams.set('category_id', state.filters.categoryId);
            }

            if (state.filters.status && state.filters.status !== 'all') {
                url.searchParams.set('status', state.filters.status);
            }

            if (state.filters.due) {
                url.searchParams.set('due', state.filters.due);
            }

            if (state.filters.search) {
                url.searchParams.set('search', state.filters.search);
            }

            if (state.filters.sort) {
                url.searchParams.set('sort', state.filters.sort);
            }

            const response = await window.axios.get(url.toString());
            const payload = response.data.data ?? response.data;

            state.categories = payload.categories ?? [];
            state.tasks = normalizeTasks(payload.tasks ?? []);
            state.trashedTasks = normalizeTasks(payload.trashed_tasks ?? []);
        } catch (error) {
            showError(error);
        } finally {
            state.loading = false;
            render();
        }
    }

    async function createTask(formData) {
        const title = String(formData.get('title') || '').trim();

        if (!title) {
            showNotice('error', 'A todo title is required.');
            return;
        }

        const payload = {
            title,
            description: String(formData.get('description') || '').trim() || null,
            due_date: String(formData.get('due_date') || '') || null,
            priority: String(formData.get('priority') || 'medium'),
            status: 'active',
            category_id: state.filters.categoryId || state.categories[0]?.id || null,
            is_completed: false,
            is_pinned: false,
        };

        const temporaryId = `temp-${Date.now()}`;
        const temporaryTask = {
            ...payload,
            id: temporaryId,
            status: 'active',
            category: state.categories.find((category) => category.id === payload.category_id) || null,
            sort_order: state.tasks.length,
        };

        state.tasks = normalizeTasks([...state.tasks, temporaryTask]);
        render();
        elements.createForm?.reset();

        try {
            const response = await window.axios.post(route('api.tasks.store'), payload);
            replaceTask(temporaryId, response.data.data);
            showNotice('success', 'Todo created.');
        } catch (error) {
            state.tasks = state.tasks.filter((task) => task.id !== temporaryId);
            showError(error);
        } finally {
            render();
        }
    }

    async function saveTask(taskId) {
        const draft = state.drafts[taskId];
        const existing = state.tasks.find((task) => task.id === taskId);

        if (!draft || !existing) {
            return;
        }

        const rollback = { ...existing };

        patchTask(taskId, {
            ...existing,
            ...draft,
            description: draft.description || null,
        });
        state.editingTaskId = null;
        render();

        try {
            const response = await window.axios.patch(route('api.tasks.update', taskId), {
                ...draft,
                description: draft.description || null,
            });
            replaceTask(taskId, response.data.data);
            showNotice('success', 'Todo updated.');
        } catch (error) {
            replaceTask(taskId, rollback);
            showError(error);
        } finally {
            render();
        }
    }

    async function toggleCompletion(taskId, checked) {
        const existing = state.tasks.find((task) => task.id === taskId);

        if (!existing) {
            return;
        }

        const rollback = { ...existing };

        patchTask(taskId, {
            is_completed: checked,
            status: checked ? 'completed' : 'active',
        });
        render();

        try {
            const response = await window.axios.patch(route('api.tasks.update', taskId), {
                is_completed: checked,
                status: checked ? 'completed' : 'active',
            });
            replaceTask(taskId, response.data.data);
        } catch (error) {
            replaceTask(taskId, rollback);
            showError(error);
        } finally {
            render();
        }
    }

    async function togglePin(taskId) {
        const existing = state.tasks.find((task) => task.id === taskId);

        if (!existing) {
            return;
        }

        const rollback = { ...existing };

        patchTask(taskId, {
            is_pinned: !existing.is_pinned,
        });
        render();

        try {
            const response = await window.axios.patch(route('api.tasks.update', taskId), {
                is_pinned: !existing.is_pinned,
            });
            replaceTask(taskId, response.data.data);
        } catch (error) {
            replaceTask(taskId, rollback);
            showError(error);
        } finally {
            render();
        }
    }

    async function deleteTask(taskId) {
        if (!window.confirm('Move this todo to Trash?')) {
            return;
        }

        const task = state.tasks.find((entry) => entry.id === taskId);

        if (!task) {
            return;
        }

        state.tasks = state.tasks.filter((entry) => entry.id !== taskId);
        state.trashedTasks = normalizeTasks([task, ...state.trashedTasks]);
        state.selectedTaskIds = state.selectedTaskIds.filter((entry) => entry !== taskId);
        render();

        try {
            await window.axios.delete(route('api.tasks.destroy', taskId));
            showNotice('success', 'Todo moved to Trash.');
        } catch (error) {
            state.tasks = normalizeTasks([...state.tasks, task]);
            state.trashedTasks = state.trashedTasks.filter((entry) => entry.id !== taskId);
            showError(error);
        } finally {
            render();
        }
    }

    async function restoreTask(taskId) {
        const task = state.trashedTasks.find((entry) => entry.id === taskId);

        if (!task) {
            return;
        }

        state.trashedTasks = state.trashedTasks.filter((entry) => entry.id !== taskId);
        render();

        try {
            const response = await window.axios.post(route('api.tasks.restore', taskId));
            state.tasks = normalizeTasks([...state.tasks, response.data.data]);
            showNotice('success', 'Todo restored.');
        } catch (error) {
            state.trashedTasks = normalizeTasks([...state.trashedTasks, task]);
            showError(error);
        } finally {
            render();
        }
    }

    async function emptyTrash() {
        if (!state.trashedTasks.length || !window.confirm('Permanently delete all trashed todos?')) {
            return;
        }

        const rollback = [...state.trashedTasks];
        state.trashedTasks = [];
        render();

        try {
            await window.axios.delete(route('api.trash.tasks.destroy'));
            showNotice('success', 'Trash emptied.');
        } catch (error) {
            state.trashedTasks = rollback;
            showError(error);
        } finally {
            render();
        }
    }

    async function applyBulkAction() {
        const action = elements.bulkAction?.value;
        const categoryId = elements.bulkCategory?.value || null;

        if (!action || state.selectedTaskIds.length === 0) {
            return;
        }

        if (action === 'move' && !categoryId) {
            showNotice('error', 'Choose a destination list for bulk move.');
            renderNotice();
            return;
        }

        const snapshot = {
            tasks: [...state.tasks],
            trashedTasks: [...state.trashedTasks],
        };

        if (action === 'complete' || action === 'uncomplete') {
            state.tasks = normalizeTasks(
                state.tasks.map((task) =>
                    state.selectedTaskIds.includes(task.id)
                        ? {
                              ...task,
                              is_completed: action === 'complete',
                              status: action === 'complete' ? 'completed' : 'active',
                          }
                        : task,
                ),
            );
        }

        if (action === 'move') {
            state.tasks = normalizeTasks(
                state.tasks.map((task) =>
                    state.selectedTaskIds.includes(task.id)
                        ? {
                              ...task,
                              category_id: categoryId,
                              category: state.categories.find((category) => category.id === categoryId) || null,
                          }
                        : task,
                ),
            );
        }

        if (action === 'delete') {
            const deletedTasks = state.tasks.filter((task) => state.selectedTaskIds.includes(task.id));
            state.tasks = state.tasks.filter((task) => !state.selectedTaskIds.includes(task.id));
            state.trashedTasks = normalizeTasks([...deletedTasks, ...state.trashedTasks]);
        }

        render();

        try {
            const response = await window.axios.patch(route('api.tasks.bulk'), {
                task_ids: state.selectedTaskIds,
                action,
                category_id: categoryId,
            });

            if (action === 'delete') {
                showNotice('success', `${response.data.data.deleted} todos moved to Trash.`);
            } else {
                state.tasks = normalizeTasks(response.data.data ?? response.data);
                showNotice('success', 'Bulk action applied.');
                await loadWorkspace();
            }
        } catch (error) {
            state.tasks = snapshot.tasks;
            state.trashedTasks = snapshot.trashedTasks;
            showError(error);
        } finally {
            state.selectedTaskIds = [];
            render();
        }
    }

    async function reorderTasks(sourceId, targetId) {
        if (sourceId === targetId || !state.filters.categoryId) {
            return;
        }

        const groupTasks = currentTasks().filter((task) => {
            const draggedTask = state.tasks.find((entry) => entry.id === sourceId);

            return task.category_id === state.filters.categoryId && task.is_pinned === draggedTask?.is_pinned;
        });
        const sourceIndex = groupTasks.findIndex((task) => task.id === sourceId);
        const targetIndex = groupTasks.findIndex((task) => task.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) {
            return;
        }

        const reordered = [...groupTasks];
        const [movedTask] = reordered.splice(sourceIndex, 1);
        reordered.splice(targetIndex, 0, movedTask);

        const rollback = [...state.tasks];
        let order = 0;
        const orderMap = new Map(reordered.map((task) => [task.id, order++]));

        state.tasks = normalizeTasks(
            state.tasks.map((task) =>
                orderMap.has(task.id)
                    ? {
                          ...task,
                          sort_order: orderMap.get(task.id),
                      }
                    : task,
            ),
        );
        render();

        try {
            const response = await window.axios.post(route('api.tasks.reorder'), {
                category_id: state.filters.categoryId,
                task_ids: reordered.map((task) => task.id),
            });

            const updated = response.data.data ?? response.data;

            updated.forEach((task) => replaceTask(task.id, task));
        } catch (error) {
            state.tasks = rollback;
            showError(error);
        } finally {
            render();
        }
    }

    async function createCategory() {
        const name = window.prompt('List name');

        if (!name || !name.trim()) {
            return;
        }

        const tempId = `temp-category-${Date.now()}`;
        const tempCategory = {
            id: tempId,
            name: name.trim(),
            color: '#155e75',
            icon: 'list',
            sort_order: state.categories.length,
        };

        state.categories = [...state.categories, tempCategory];
        renderCategoryList();

        try {
            const response = await window.axios.post(route('api.categories.store'), {
                name: name.trim(),
                color: '#155e75',
                icon: 'list',
            });

            state.categories = state.categories.map((category) =>
                category.id === tempId ? response.data : category,
            );
            showNotice('success', 'List created.');
        } catch (error) {
            state.categories = state.categories.filter((category) => category.id !== tempId);
            showError(error);
        } finally {
            render();
        }
    }

    async function renameCategory(categoryId) {
        const category = state.categories.find((entry) => entry.id === categoryId);

        if (!category) {
            return;
        }

        const name = window.prompt('Rename list', category.name);

        if (!name || !name.trim()) {
            return;
        }

        const rollback = { ...category };
        state.categories = state.categories.map((entry) =>
            entry.id === categoryId ? { ...entry, name: name.trim() } : entry,
        );
        renderCategoryList();

        try {
            const response = await window.axios.patch(route('api.categories.update', categoryId), {
                name: name.trim(),
                color: category.color,
                icon: category.icon,
            });
            state.categories = state.categories.map((entry) =>
                entry.id === categoryId ? response.data : entry,
            );
            showNotice('success', 'List updated.');
        } catch (error) {
            state.categories = state.categories.map((entry) =>
                entry.id === categoryId ? rollback : entry,
            );
            showError(error);
        } finally {
            render();
        }
    }

    async function deleteCategory(categoryId) {
        const category = state.categories.find((entry) => entry.id === categoryId);

        if (!category || !window.confirm(`Delete "${category.name}"? Todos in it will move to Inbox.`)) {
            return;
        }

        const rollbackCategories = [...state.categories];
        const rollbackTasks = [...state.tasks];

        state.categories = state.categories.filter((entry) => entry.id !== categoryId);
        state.tasks = normalizeTasks(
            state.tasks.map((task) =>
                task.category_id === categoryId
                    ? { ...task, category_id: null, category: null }
                    : task,
            ),
        );

        if (state.filters.categoryId === categoryId) {
            state.filters.categoryId = '';
        }

        render();

        try {
            await window.axios.delete(route('api.categories.destroy', categoryId));
            showNotice('success', 'List deleted.');
        } catch (error) {
            state.categories = rollbackCategories;
            state.tasks = rollbackTasks;
            showError(error);
        } finally {
            render();
        }
    }

    function replaceTask(taskId, nextTask) {
        state.tasks = normalizeTasks(
            state.tasks.map((task) => (task.id === taskId ? { ...task, ...nextTask } : task)),
        );
    }

    function patchTask(taskId, patch) {
        state.tasks = normalizeTasks(
            state.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
        );
    }

    function showNotice(type, text) {
        state.notice = { type, text };
        renderNotice();
    }

    function showError(error) {
        const message =
            error?.response?.data?.message ??
            'The request could not be completed. The interface has been rolled back.';

        showNotice('error', message);
    }

    function formatDate(value) {
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(value));
    }

    function capitalize(value) {
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    function renderOptions(options, current) {
        return options
            .map(
                (option) => `<option value="${option}" ${current === option ? 'selected' : ''}>${capitalize(option)}</option>`,
            )
            .join('');
    }

    function priorityBadgeClasses(priority) {
        return {
            low: 'rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            medium: 'rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-100',
            high: 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-100',
        }[priority] ?? 'rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-slate-600';
    }

    function dueBadgeClasses(overdue) {
        return overdue
            ? 'rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-100'
            : 'rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function escapeAttribute(value) {
        return escapeHtml(value ?? '');
    }
}
