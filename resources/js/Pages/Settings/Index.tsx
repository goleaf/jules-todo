import { Head } from '@inertiajs/react';

export default function SettingsIndex() {
    return (
        <>
            <Head title="Settings" />
            <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
                <header className="space-y-2">
                    <p className="text-sm text-slate-500">Inertia Workspace</p>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Settings
                    </h1>
                </header>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-600">
                        Settings page scaffolded for the todo application.
                    </p>
                </section>
            </main>
        </>
    );
}
