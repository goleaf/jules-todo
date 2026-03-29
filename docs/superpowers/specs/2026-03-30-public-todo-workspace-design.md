# Public Todo Workspace Design

**Date:** 2026-03-30

## Goal

Build a public, auth-free todo application on `/` that uses named lists, optimistic UI, database persistence, soft-delete trash, responsive layouts, dark mode, inline editing, drag-and-drop ordering, filters, search, due dates, reminders, priorities, and bulk actions.

## Constraints

- Follow the repository's declared Laravel + Blade stack for the public UI.
- Keep all todo data in the database, never in browser-only storage.
- Preserve the existing `categories` table as the backing model for named lists.
- Keep controllers thin and move reusable query logic into model scopes or actions.

## Product Shape

The home page becomes a list-first todo workspace. The left side shows named lists and the trash entry. The main area shows the active list's todos with a toolbar for search, filters, sorts, theme toggle, and bulk actions.

Todos render in two groups:

1. Pinned todos
2. Regular todos

Within each group, the default order is manual list order. Users can temporarily sort by due date or priority without changing the saved manual order.

## Core Behaviors

### Todo CRUD

- Create todos with required title and optional description.
- Edit title and description inline.
- Delete sends a todo to Trash after confirmation.
- Complete/incomplete is toggled by checkbox or bulk actions.

### Lists

- Users can create, rename, recolor, and delete lists.
- Moving a todo between lists preserves its content and metadata.
- Drag-and-drop reorders todos within the active list.
- Pinned todos stay above unpinned todos in the same list.

### Filters and Search

- Status filter: all, active, completed.
- List filter via the selected list.
- Due-date filter: today, this week, overdue.
- Keyword search over title and description.
- Sort options: manual, due date ascending, due date descending, priority.

### Dates and Priority

- Due date is optional.
- Overdue todos display a destructive visual treatment.
- Priority values: low, medium, high with visible badges.
- Reminder timestamps remain optional task metadata.

### Bulk Actions

- Multi-select via checkboxes.
- Bulk complete, uncomplete, delete, and move to another list.

### Persistence and Trash

- All changes persist to SQLite through Laravel routes and controllers.
- UI updates optimistically and rolls back a specific change if the server rejects it.
- Todo deletion uses soft deletes.
- Trashed todos can be restored for 30 days.
- Trash can be emptied manually.
- A scheduled cleanup permanently removes trashed todos older than 30 days.

## Data Design

### Tasks

Extend `tasks` with:

- `is_pinned` boolean default `false`
- `sort_order` unsigned integer default `0`
- `deleted_at` nullable timestamp for soft deletes

Indexes should support list rendering and filtering:

- `(category_id, deleted_at, is_pinned, sort_order)`
- `(status, deleted_at)`
- `(due_date, deleted_at)`
- `(priority, deleted_at)`

### Categories

Extend `categories` with:

- `sort_order` unsigned integer default `0`

This keeps list ordering stable if list drag-and-drop is added later.

## Server Design

### Web Routes

`/` returns a Blade view with preloaded workspace data. Additional named web routes handle:

- task create, update, reorder, toggle, soft delete, restore, force delete
- bulk actions
- list create, update, delete
- trash empty

JSON responses are acceptable for async interactions as long as the rendered app remains Blade-based.

### Query Layer

Model scopes should provide:

- active workspace tasks for a list
- trashed tasks
- keyword filtering
- status filtering
- due-date filtering
- explicit sort application
- ordered category lists

### Actions

Use dedicated actions for:

- workspace data assembly
- bulk todo mutation
- task reordering
- trash cleanup

## UI Structure

### Desktop

- Left rail: list navigation, counts, create list button, trash link
- Main toolbar: search, filters, sort, bulk action controls, theme toggle
- Main content: empty state, loading skeletons, or todo sections

### Mobile

- Collapsible list drawer
- Sticky toolbar
- Same actions as desktop with stacked controls

### Todo Row/Card

Each todo shows:

- selection checkbox
- completion checkbox
- inline-editable title
- optional description
- list chip
- due date
- priority badge
- pin toggle
- move control
- drag handle
- delete action

## Error Handling

- Failed optimistic mutations revert only the affected record(s).
- Validation errors appear inline near the editor or form that caused them.
- Bulk failures report how many operations succeeded or failed.

## Testing Strategy

- Feature tests for workspace page rendering, CRUD, bulk actions, filters, trash, restore, reorder, and cleanup.
- Unit tests for action classes and query scopes where logic is non-trivial.
- Browser-facing interaction logic should be kept small enough to cover with integration-oriented HTTP tests plus targeted UI smoke verification.

## Migration Path

The existing Inertia workspace is replaced as the runtime path for `/`. Blade becomes the active public UI. Legacy React/Inertia files can be removed or left unused after the Blade route is in place, but the public entrypoint must no longer depend on Inertia.
