<?php

namespace Tests\Feature;

use Tests\TestCase;

class InertiaBootstrapTest extends TestCase
{
    public function test_inertia_root_blade_template_matches_the_required_minimal_markup(): void
    {
        $this->assertFileExists(resource_path('views/app.blade.php'));

        $expected = <<<'BLADE'
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @viteReactRefresh
        @vite(['resources/js/app.tsx', 'resources/css/app.css'])
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
BLADE;

        $this->assertSame(
            $expected,
            trim((string) file_get_contents(resource_path('views/app.blade.php'))),
        );
    }

    public function test_ziggy_generated_assets_and_types_are_present(): void
    {
        $this->assertFileExists(resource_path('js/ziggy.js'));
        $this->assertFileExists(resource_path('js/ziggy.d.ts'));

        $globalTypes = (string) file_get_contents(resource_path('js/types/global.d.ts'));

        $this->assertStringContainsString("import { route as ziggyRoute } from 'ziggy-js';", $globalTypes);
        $this->assertStringContainsString('var route: typeof ziggyRoute;', $globalTypes);
    }

    public function test_bootstrap_registers_the_handle_inertia_requests_middleware(): void
    {
        $bootstrap = (string) file_get_contents(base_path('bootstrap/app.php'));

        $this->assertStringContainsString(
            'HandleInertiaRequests::class',
            $bootstrap,
        );
    }
}
