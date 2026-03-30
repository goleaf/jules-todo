import '../css/app.css';
import './bootstrap';

import { lazy, Suspense, type ComponentType } from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

import { Skeleton } from './Components/ui/skeleton';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
const pages = import.meta.glob([
    './Pages/**/*.tsx',
    '!./Pages/**/*.test.tsx',
]);

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: async (name) => {
        if (name === 'Settings/Index') {
            return lazy(async () => {
                const module = await pages['./Pages/Settings/Index.tsx']() as {
                    default: ComponentType<unknown>;
                };

                return module;
            });
        }

        return resolvePageComponent(
            `./Pages/${name}.tsx`,
            pages,
        );
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <Suspense fallback={<SettingsPageFallback />}>
                <App {...props} />
            </Suspense>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

function SettingsPageFallback() {
    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-10 px-6 py-10">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-4 w-72" />
            </div>

            <div className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        </div>
    );
}
