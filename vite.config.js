import path from 'node:path';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }

                    if (id.includes('@dnd-kit')) {
                        return 'dnd-kit';
                    }

                    if (id.includes('@radix-ui')) {
                        return 'radix-vendor';
                    }

                    if (id.includes('cmdk')) {
                        return 'command-vendor';
                    }

                    if (id.includes('react-day-picker')) {
                        return 'calendar-vendor';
                    }

                    if (id.includes('sonner')) {
                        return 'toast-vendor';
                    }

                    if (id.includes('lucide-react')) {
                        return 'lucide';
                    }

                    if (id.includes('@inertiajs')) {
                        return 'inertia-vendor';
                    }

                    if (id.includes('zustand')) {
                        return 'state-vendor';
                    }

                    if (
                        id.includes('react')
                        || id.includes('react-dom')
                        || id.includes('scheduler')
                    ) {
                        return 'react-vendor';
                    }

                    if (id.includes('date-fns')) {
                        return 'date-vendor';
                    }

                    if (id.includes('axios')) {
                        return 'axios';
                    }

                    if (
                        id.includes('clsx')
                        || id.includes('class-variance-authority')
                        || id.includes('tailwind-merge')
                    ) {
                        return 'utils-vendor';
                    }

                    return 'vendor';
                },
            },
        },
    },
    resolve: {
        alias: [
            {
                find: '@/components',
                replacement: path.resolve(__dirname, 'resources/js/Components'),
            },
            {
                find: '@/hooks',
                replacement: path.resolve(__dirname, 'resources/js/hooks'),
            },
            {
                find: '@/lib',
                replacement: path.resolve(__dirname, 'resources/js/lib'),
            },
            {
                find: '@',
                replacement: path.resolve(__dirname, 'resources/js'),
            },
        ],
    },
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.tsx',
                'resources/js/workspace.js',
            ],
            refresh: true,
        }),
        react(),
    ],
});
