# Public Todo Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current public workspace with a Blade-based, list-first todo app that supports optimistic CRUD, lists, filters, sorting, bulk actions, soft-delete trash, dark mode, and responsive interactions.

**Architecture:** The app will move `/` from Inertia/React to a Blade-rendered workspace that hydrates server-provided data and enhances interactions with a focused TypeScript module. Laravel actions, form requests, and model scopes will own business rules, while controllers stay thin and return Blade or JSON responses for async mutations.

**Tech Stack:** Laravel, Blade, Eloquent, SQLite, Tailwind CSS, Vite, TypeScript, PHPUnit

---

### Task 1: Extend Persistence for Ordering, Pinning, and Trash

**Files:**
- Create: `database/migrations/2026_03_30_000001_add_workspace_fields_to_tasks_table.php`
- Create: `database/migrations/2026_03_30_000002_add_sort_order_to_categories_table.php`
- Modify: `app/Models/Task.php`
- Modify: `app/Models/Category.php`
- Test: `tests/Feature/PublicWorkspaceTest.php`

- [ ] **Step 1: Write the failing tests**

Add feature coverage asserting that deleted todos remain restorable, pinned state persists, and reorder metadata exists after updates.

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `php artisan test tests/Feature/PublicWorkspaceTest.php --filter=trash`
Expected: FAIL because soft delete and workspace fields do not exist yet.

- [ ] **Step 3: Add schema changes**

Create migrations adding:
- `tasks.is_pinned`
- `tasks.sort_order`
- `tasks.deleted_at`
- `categories.sort_order`
- supporting indexes

- [ ] **Step 4: Update models minimally**

Add casts, fillable fields, `SoftDeletes`, and ordered/filter scopes required by the new columns.

- [ ] **Step 5: Re-run the targeted test**

Run: `php artisan test tests/Feature/PublicWorkspaceTest.php --filter=trash`
Expected: PASS or fail later on missing controller behavior instead of schema errors.

- [ ] **Step 6: Skip commit**

Workspace is not a git repository, so record progress in the plan instead of committing.

### Task 2: Refactor Backend to Blade Workspace and Thin JSON Endpoints

**Files:**
- Create: `app/Actions/GetWorkspaceDataAction.php`
- Create: `app/Actions/ApplyBulkTaskAction.php`
- Create: `app/Actions/ReorderTasksAction.php`
- Create: `app/Actions/EmptyTrashAction.php`
- Create: `app/Http/Requests/StoreTaskRequest.php`
- Create: `app/Http/Requests/UpdateTaskRequest.php`
- Create: `app/Http/Requests/BulkTaskRequest.php`
- Create: `app/Http/Requests/StoreCategoryRequest.php`
- Create: `app/Http/Requests/UpdateCategoryRequest.php`
- Modify: `app/Http/Controllers/TaskWorkspaceController.php`
- Modify: `app/Http/Controllers/TaskController.php`
- Modify: `app/Http/Controllers/CategoryController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/PublicWorkspaceTest.php`

- [ ] **Step 1: Write failing endpoint tests**

Add tests for:
- workspace Blade render
- task create/update/toggle/delete/restore
- bulk complete/uncomplete/delete/move
- reorder persistence
- trash empty

- [ ] **Step 2: Run the targeted backend tests**

Run: `php artisan test tests/Feature/PublicWorkspaceTest.php`
Expected: FAIL on missing routes, wrong response shapes, and missing trash behavior.

- [ ] **Step 3: Implement action classes**

Move workspace assembly, bulk mutation, reorder logic, and trash emptying into dedicated actions.

- [ ] **Step 4: Add form requests**

Replace inline controller validation with typed request classes for task/category/bulk mutations.

- [ ] **Step 5: Refactor controllers and routes**

Return Blade from `/`, keep async mutations as named web routes returning JSON, and add restore/reorder/trash routes.

- [ ] **Step 6: Re-run backend tests**

Run: `php artisan test tests/Feature/PublicWorkspaceTest.php`
Expected: PASS for backend behaviors or fail only on UI expectations not wired yet.

- [ ] **Step 7: Skip commit**

Workspace is not a git repository.

### Task 3: Build the Blade Workspace UI and TypeScript Interactions

**Files:**
- Create: `resources/views/tasks/workspace.blade.php`
- Create: `resources/views/components/tasks/list-sidebar.blade.php`
- Create: `resources/views/components/tasks/toolbar.blade.php`
- Create: `resources/views/components/tasks/todo-list.blade.php`
- Create: `resources/views/components/tasks/todo-item.blade.php`
- Create: `resources/views/components/tasks/empty-state.blade.php`
- Create: `resources/js/workspace.ts`
- Modify: `resources/css/app.css`
- Modify: `resources/js/app.tsx` or replace with a non-React entrypoint if needed
- Test: `tests/Feature/PublicWorkspaceTest.php`

- [ ] **Step 1: Write the failing workspace render tests**

Add assertions for Blade content:
- list names visible
- trash visible
- empty state visible
- no Inertia component dependency on `/`

- [ ] **Step 2: Run the targeted UI-facing tests**

Run: `php artisan test tests/Feature/PublicWorkspaceTest.php --filter=workspace`
Expected: FAIL because `/` still renders the existing Inertia page.

- [ ] **Step 3: Create Blade components**

Build the responsive layout, dark-mode toggle shell, list rail, toolbar, todo cards, empty states, and trash view.

- [ ] **Step 4: Implement focused TypeScript behavior**

Handle optimistic mutations, inline editing, search/filter submissions, drag-and-drop reorder, bulk actions, skeleton states, and rollback on error.

- [ ] **Step 5: Wire Vite assets**

Ensure the Blade page loads the correct CSS and JS entrypoints without React/Inertia at `/`.

- [ ] **Step 6: Re-run workspace tests**

Run: `php artisan test tests/Feature/PublicWorkspaceTest.php --filter=workspace`
Expected: PASS for rendered workspace assertions.

- [ ] **Step 7: Skip commit**

Workspace is not a git repository.

### Task 4: Remove Runtime Dependence on the Old Inertia Workspace and Verify End-to-End

**Files:**
- Modify: `resources/js/Pages/TaskWorkspace.tsx`
- Modify: `resources/js/app.tsx`
- Modify: `tests/Feature/ExampleTest.php`
- Optional cleanup: unused Inertia-only files if no longer referenced

- [ ] **Step 1: Write the failing regression test**

Assert `/` does not require Inertia and still supports public todo interactions after the Blade switch.

- [ ] **Step 2: Run the focused regression test**

Run: `php artisan test tests/Feature/ExampleTest.php tests/Feature/PublicWorkspaceTest.php`
Expected: FAIL until the runtime no longer points at Inertia.

- [ ] **Step 3: Remove old runtime wiring**

Detach the public route from Inertia. Leave unused assets only if safe; otherwise clean them up.

- [ ] **Step 4: Run full verification**

Run:
- `php artisan test`
- `npm run build`

Expected:
- tests PASS
- build exits 0

- [ ] **Step 5: Skip commit**

Workspace is not a git repository.
