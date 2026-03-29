## Stack

- Framework: Laravel 11.x / 12.x (latest)
- Admin Panel: Filament 3.x
- Frontend: Laravel Blade (server-side rendered only, no React/Vue/Inertia)
- Query layer: Eloquent Models ONLY
- MCP: enabled — use for DB inspection, schema auditing, log analysis, code generation

---

## SECTION 1 — HARD RULES (Never Break)

- NEVER write raw SQL strings anywhere in the codebase
- NEVER use DB::select(), DB::statement(), or DB::raw() outside a Model's internal scope
- NEVER query inside Blade views, @foreach, or @if blocks
- NEVER call ->count(), ->sum(), or any aggregate inside a loop
- NEVER use Model::all() without a limit, scope, or pagination
- NEVER add a new query when an eager-loaded relationship already covers the data
- NEVER duplicate logic across controllers — extract to Model scopes or Actions
- NEVER put business logic in Blade templates or Filament Resources directly
- NEVER register routes in web.php without grouping by middleware, prefix, and name
- NEVER store secrets, API keys, or credentials in code — always use .env + config()

---

## SECTION 2 — ELOQUENT & QUERY OPTIMIZATION

### Eager Loading — Kill N+1 at the Source
- with(), load(), loadMissing() for all relationships
- withCount(), withSum(), withAvg(), withMin(), withMax() for aggregates
- withExists() (Laravel 11+) instead of withCount() > 0
- Conditional: with(['posts' => fn($q) => $q->where('active', true)])
- Nested: with('orders.items.product')

### Local & Global Scopes
- One scope = one responsibility
- Local: scopeActive(), scopeVerified(), scopeForTenant($q, $tenantId)
- Global: SoftDeletingScope, TenantScope, VisibilityScope
- Chain cleanly: User::active()->verified()->forRegion($r)->paginate()
- Never repeat the same where() condition across controllers — make it a scope

### Select & Payload Control
- Always ->select([...]) inside scopes — never rely on SELECT *
- Use ->makeHidden([]) and ->only([]) to trim model payloads
- Define $hidden, $visible, $appends on the model class
- Use ->without() to override globally defined $with for specific queries

### Chunking & Memory Safety
- Model::chunk(500, fn($rows) => ...) for batch jobs
- Model::lazy() / Model::lazyById() for large iteration
- Model::cursor() for streaming via PHP generators
- chunkById() over chunk() when rows may be deleted mid-loop

### Caching Strategy
- Cache::remember() inside static model methods or scopes
- Use model Observers (saved, updated, deleted) to invalidate cache keys
- Cache::tags() for grouped busting across related models
- Cache query results at the repository or scope layer, never in Blade

### Pagination
- cursorPaginate() for large or append-only datasets (O(1))
- simplePaginate() when total count is not needed in the view
- Add composite indexes (created_at, id) for cursor pagination support
- Always chain ->withQueryString() when passing paginated data to Blade
- Never use offset-based pagination on tables with millions of rows

### Relationships
- Use HasManyThrough, BelongsToMany, MorphTo as designed
- Prefer withExists() over whereHas() for boolean checks on large tables
- Define $with on the model only for universally required relations
- Use pivot models (withPivot, withTimestamps) for many-to-many metadata

---

## SECTION 3 — LARAVEL BEST PRACTICES

### Architecture
- Thin controllers: one public method per action, delegate to Actions or Services
- Use single-use Action classes: App\Actions\CreateOrderAction::handle()
- Use Form Requests for all validation: never validate in controllers directly
- Use API Resources (JsonResource) for all JSON responses
- Use Events + Listeners to decouple side effects from core logic
- Use Jobs + Queues for anything that takes > 200ms (email, PDF, webhook)
- Use Policies for all authorization — never inline Gate::allows() in controllers

### Models
- Define $fillable on every model — never use $guarded = []
- Define $casts for booleans, dates, enums, and JSON columns
- Use Enums (PHP 8.1+) for status fields: cast as AsEnum
- Use model Factories for all seeders and tests
- Use Observers for cross-cutting concerns: audit logs, cache busting, notifications
- Keep models focused: extract complex logic to Traits in App\Models\Concerns\

### Routing
- Group routes by middleware, prefix, and name prefix
- Use route model binding everywhere — never find() manually in controllers
- Use named routes always: route('orders.show', $order)
- Separate web.php (Blade) from api.php (JSON) clearly
- Use Route::resource() and Route::apiResource() for CRUD routes

### Config & Environment
- All environment values accessed via config(), never via env() outside config files
- Every new .env key must have a matching entry in config/ and .env.example
- Use php artisan config:cache in production — no dynamic env() calls at runtime

### Migrations
- One concern per migration file
- Always define both up() and down()
- Add indexes at migration time for all foreign keys and frequently filtered columns
- Use ->after() for column order clarity
- Never modify existing migrations in production — always create new ones

### Testing
- Feature tests for all HTTP endpoints using RefreshDatabase
- Unit tests for Actions, Services, and complex model methods
- Use Factories exclusively — no manual DB inserts in tests
- Use Http::fake() for external API calls
- Run php artisan test before every commit

---

## SECTION 4 — FILAMENT 3.x BEST PRACTICES

### Resources
- Every Filament Resource must use a dedicated Form schema and Table schema
- Define columns with ->searchable(), ->sortable(), ->toggleable() intentionally
- Use ->relationship() columns for BelongsTo display: never raw foreign key IDs
- Keep form fields grouped with Section and Grid for visual clarity
- Use ->default() and ->required() consistently on all form fields

### Query Optimization in Filament
- Override getEloquentQuery() in every Resource to apply default scopes and eager loads
- Always eager load relationships used in table columns via ->with([]) in getEloquentQuery()
- Use ->modifyQueryUsing() on table columns to push filtering to the database layer
- Avoid using Blade or PHP to format data that should be a DB aggregate

### Filters & Actions
- Use SelectFilter, TernaryFilter, DateRangeFilter for all common filtering needs
- Define BulkActions for any operation that applies to multiple records
- Use Action::make() with ->requiresConfirmation() for destructive operations
- Use ->authorize() on every Action and BulkAction — never skip authorization

### Widgets & Dashboard
- Use StatsOverviewWidget with stats pulled from cached model aggregates
- Never run raw queries inside Widget::getStats() — use scoped, cached model methods
- Use ChartWidget with pre-aggregated data from a Job or scheduled cache refresh

### Notifications & Modals
- Use Filament Notifications (Notification::make()) for all user feedback
- Use ->modalHeading() and ->modalDescription() for confirm dialogs
- Never use JavaScript alerts or custom modals — use Filament's built-in system

### Panels & Multi-Tenancy
- Use Filament Panels for multi-panel setups (admin, customer, api)
- Implement Filament's built-in Tenancy via ->tenant() when building multi-tenant apps
- Scope all Resource queries to the current tenant in getEloquentQuery()

---

## SECTION 5 — BLADE BEST PRACTICES

### Data Flow
- All data arrives pre-loaded from the controller — zero queries in templates
- Use compact() or named view data: view('orders.index', ['orders' => $orders])
- Pass typed ViewModels or DTOs for complex views to avoid logic in Blade
- Use View Composers in ViewServiceProvider for shared partial data

### Components & Layouts
- Use anonymous Blade components for all reusable UI: <x-card>, <x-button>
- Use class-based components for components with significant PHP logic
- Define @props(['title', 'description' => null]) at the top of every component
- Use @aware for deeply nested component prop inheritance
- Use x-slot for named slot injection: <x-modal><x-slot:title>...</x-slot></x-modal>

### Loops & Conditionals
- Always use @forelse over @foreach — handle empty state explicitly
- Use $loop->first, $loop->last, $loop->index inside loops
- Use @once for partials rendered multiple times in a single page (scripts, styles)
- Use @env('production') for environment-specific rendering

### Performance in Blade
- Never call a model method or relationship inside @foreach that was not eager loaded
- Use @cache (with Laravel cache directives) for expensive rendered partials
- Use Blade's @pushonce for deduplicating pushed scripts and styles
- Minimize @include depth — prefer components over deeply nested includes

### Forms
- Use @csrf on every POST/PUT/DELETE form — never skip it
- Use @method('PUT') / @method('DELETE') for spoofed methods
- Use old() for repopulating form fields after validation failure
- Use $errors->first('field') for inline validation error display

---

## SECTION 6 — MCP USAGE GUIDELINES

### Before Writing Any Query
- Use DB schema MCP to inspect table structure, indexes, and foreign keys
- Confirm the indexes exist for every column used in where(), orderBy(), or join()
- Use DB explain MCP to run EXPLAIN on any query touching > 10k rows

### While Writing Code
- Use code-generation MCP skills to scaffold: Models, Scopes, Factories, Migrations
- Use Laravel docs MCP to verify latest API signatures before using new features
- Use GitHub MCP to check existing patterns in the codebase before introducing new ones

### After Writing Code
- Use Laravel Telescope or Debugbar MCP to count queries before and after changes
- Use log analysis MCP to identify slow query patterns from production logs
- Use DB explain MCP to verify index usage on new scopes and filters

### Filament-Specific MCP Usage
- Use Filament docs MCP to verify correct method signatures for columns, filters, actions
- Use schema MCP to confirm eager load chains match actual table relationships
- Use test-runner MCP to execute php artisan test after every Resource change

---

## SECTION 7 — RESPONSE FORMAT FOR ALL CODE TASKS

When writing, reviewing, or refactoring any code, always structure output as:

1. PROBLEM — what is wrong or what is being built (N+1, missing scope, no authorization, etc.)
2. SOLUTION — full implementation in the correct class/file with proper placement
3. QUERY DELTA — before/after query count or performance estimate (if query-related)
4. REUSABLE SNIPPET — extracted scope, action, component, or trait to add to the project
5. BLADE USAGE — how data flows from controller → view cleanly (if Blade-related)
6. FILAMENT INTEGRATION — how the fix or feature integrates into the Resource (if applicable)
7. TESTS — the Feature or Unit test that validates this code
8. CAVEATS — index requirements, cache invalidation, Laravel version notes, MCP verification steps

---

## SECTION 8 — FILE PLACEMENT CONVENTIONS

| What                          | Where                                      |
|-------------------------------|--------------------------------------------|
| Model scopes (single model)   | App\Models\ModelName                       |
| Shared scopes/traits          | App\Models\Concerns\                       |
| Business logic                | App\Actions\ or App\Services\              |
| Cache logic                   | App\Models\Concerns\Cacheable              |
| Authorization                 | App\Policies\                              |
| Form validation               | App\Http\Requests\                         |
| API output shaping            | App\Http\Resources\                        |
| Background jobs               | App\Jobs\                                  |
| Events & Listeners            | App\Events\ + App\Listeners\               |
| Model observers               | App\Observers\                             |
| Blade components              | resources/views/components/                |
| View Composers                | App\Providers\ViewServiceProvider          |
| Filament Resources            | App\Filament\Resources\                    |
| Filament Widgets              | App\Filament\Widgets\                      |
| Filament custom Actions       | App\Filament\Actions\                      |

---

## SECTION 9 — PRE-COMMIT SELF-CHECK

Before committing any code, verify every item:

- [ ] No query inside a loop, Blade view, or Filament column renderer
- [ ] No SELECT * — all scopes use explicit ->select([])
- [ ] No Model::all() without scope, limit, or pagination
- [ ] All relationships used in the view are eager loaded in the controller or Resource
- [ ] All form inputs go through a Form Request with validation rules
- [ ] All actions on Filament Resources have ->authorize() defined
- [ ] All new routes are named, grouped, and use route model binding
- [ ] All new .env values have matching config() entries and .env.example updates
- [ ] php artisan test passes with no failures
- [ ] MCP Telescope/Debugbar used to confirm query count did not increase

If any box is unchecked → fix before committing.

## JavaScript REPL (Node)
- Use `js_repl` for Node-backed JavaScript with top-level await in a persistent kernel.
- `js_repl` is a freeform/custom tool. Direct `js_repl` calls must send raw JavaScript tool input (optionally with first-line `// codex-js-repl: timeout_ms=15000`). Do not wrap code in JSON (for example `{"code":"..."}`), quotes, or markdown code fences.
- Helpers: `codex.cwd`, `codex.homeDir`, `codex.tmpDir`, `codex.tool(name, args?)`, and `codex.emitImage(imageLike)`.
- `codex.tool` executes a normal tool call and resolves to the raw tool output object. Use it for shell and non-shell tools alike. Nested tool outputs stay inside JavaScript unless you emit them explicitly.
- `codex.emitImage(...)` adds one image to the outer `js_repl` function output each time you call it, so you can call it multiple times to emit multiple images. It accepts a data URL, a single `input_image` item, an object like `{ bytes, mimeType }`, or a raw tool response object with exactly one image and no text. It rejects mixed text-and-image content.
- `codex.tool(...)` and `codex.emitImage(...)` keep stable helper identities across cells. Saved references and persisted objects can reuse them in later cells, but async callbacks that fire after a cell finishes still fail because no exec is active.
- Request full-resolution image processing with `detail: "original"` only when the `view_image` tool schema includes a `detail` argument. The same availability applies to `codex.emitImage(...)`: if `view_image.detail` is present, you may also pass `detail: "original"` there. Use this when high-fidelity image perception or precise localization is needed, especially for CUA agents.
- Example of sharing an in-memory Playwright screenshot: `await codex.emitImage({ bytes: await page.screenshot({ type: "jpeg", quality: 85 }), mimeType: "image/jpeg", detail: "original" })`.
- Example of sharing a local image tool result: `await codex.emitImage(codex.tool("view_image", { path: "/absolute/path", detail: "original" }))`.
- When encoding an image to send with `codex.emitImage(...)` or `view_image`, prefer JPEG at about 85 quality when lossy compression is acceptable; use PNG when transparency or lossless detail matters. Smaller uploads are faster and less likely to hit size limits.
- Top-level bindings persist across cells. If a cell throws, prior bindings remain available and bindings that finished initializing before the throw often remain usable in later cells. For code you plan to reuse across cells, prefer declaring or assigning it in direct top-level statements before operations that might throw. If you hit `SyntaxError: Identifier 'x' has already been declared`, first reuse the existing binding, reassign a previously declared `let`, or pick a new descriptive name. Use `{ ... }` only for a short temporary block when you specifically need local scratch names; do not wrap an entire cell in block scope if you want those names reusable later. Reset the kernel with `js_repl_reset` only when you need a clean state.
- Top-level static import declarations (for example `import x from "./file.js"`) are currently unsupported in `js_repl`; use dynamic imports with `await import("pkg")`, `await import("./file.js")`, or `await import("/abs/path/file.mjs")` instead. Imported local files must be ESM `.js`/`.mjs` files and run in the same REPL VM context. Bare package imports always resolve from REPL-global search roots (`CODEX_JS_REPL_NODE_MODULE_DIRS`, then cwd), not relative to the imported file location. Local files may statically import only other local relative/absolute/`file://` `.js`/`.mjs` files; package and builtin imports from local files must stay dynamic. `import.meta.resolve()` returns importable strings such as `file://...`, bare package names, and `node:...` specifiers. Local file modules reload between execs, while top-level bindings persist until `js_repl_reset`.
- Avoid direct access to `process.stdout` / `process.stderr` / `process.stdin`; it can corrupt the JSON line protocol. Use `console.log`, `codex.tool(...)`, and `codex.emitImage(...)`.

---

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.5
- inertiajs/inertia-laravel (INERTIA_LARAVEL) - v2
- laravel/framework (LARAVEL) - v13
- laravel/prompts (PROMPTS) - v0
- laravel/sanctum (SANCTUM) - v4
- tightenco/ziggy (ZIGGY) - v2
- laravel/boost (BOOST) - v2
- laravel/breeze (BREEZE) - v2
- laravel/mcp (MCP) - v0
- laravel/pail (PAIL) - v1
- laravel/pint (PINT) - v1
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/react (INERTIA_REACT) - v2
- react (REACT) - v18
- tailwindcss (TAILWINDCSS) - v3

## Skills Activation

This project has domain-specific skills available. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

- `laravel-best-practices` — Apply this skill whenever writing, reviewing, or refactoring Laravel PHP code. This includes creating or modifying controllers, models, migrations, form requests, policies, jobs, scheduled commands, service classes, and Eloquent queries. Triggers for N+1 and query performance issues, caching strategies, authorization and security patterns, validation, error handling, queue and job configuration, route definitions, and architectural decisions. Also use for Laravel code reviews and refactoring existing Laravel code to follow best practices. Covers any task involving Laravel backend PHP code patterns.
- `inertia-react-development` — Develops Inertia.js v2 React client-side applications. Activates when creating React pages, forms, or navigation; using <Link>, <Form>, useForm, or router; working with deferred props, prefetching, or polling; or when user mentions React with Inertia, React pages, React forms, or React navigation.
- `tailwindcss-development` — Always invoke when the user's message includes 'tailwind' in any form. Also invoke for: building responsive grid layouts (multi-column card grids, product grids), flex/grid page structures (dashboards with sidebars, fixed topbars, mobile-toggle navs), styling UI components (cards, tables, navbars, pricing sections, forms, inputs, badges), adding dark mode variants, fixing spacing or typography, and Tailwind v3/v4 work. The core use case: writing or fixing Tailwind utility classes in HTML templates (Blade, JSX, Vue). Skip for backend PHP logic, database queries, API routes, JavaScript with no HTML/CSS component, CSS file audits, build tool configuration, and vanilla CSS.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Always use `search-docs` before making code changes. Do not skip this step. It returns version-specific docs based on installed packages automatically.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.
- To check environment variables, read the `.env` file directly.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== herd rules ===

# Laravel Herd

- The application is served by Laravel Herd at `https?://[kebab-case-project-dir].test`. Use the `get-absolute-url` tool to generate valid URLs. Never run commands to serve the site. It is always available.
- Use the `herd` CLI to manage services, PHP versions, and sites (e.g. `herd sites`, `herd services:start <service>`, `herd php:list`). Run `herd list` to discover all available commands.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/Pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v2

- Use all Inertia features from v1 and v2. Check the documentation before making changes to ensure the correct approach.
- New features: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== phpunit/core rules ===

# PHPUnit

- This application uses PHPUnit for testing. All tests must be written as PHPUnit classes. Use `php artisan make:test --phpunit {name}` to create a new test.
- If you see a test using "Pest", convert it to PHPUnit.
- Every time a test has been updated, run that singular test.
- When the tests relating to your feature are passing, ask the user if they would like to also run the entire test suite to make sure everything is still passing.
- Tests should cover all happy paths, failure paths, and edge cases.
- You must not remove any tests or test files from the tests directory without approval. These are not temporary or helper files; these are core to the application.

## Running Tests

- Run the minimal number of tests, using an appropriate filter, before finalizing.
- To run all tests: `php artisan test --compact`.
- To run all tests in a file: `php artisan test --compact tests/Feature/ExampleTest.php`.
- To filter on a particular test name: `php artisan test --compact --filter=testName` (recommended after making a change to a related file).

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>
