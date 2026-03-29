import { Head, usePage } from '@inertiajs/react';

type PageProps = {
    todos?: {
        data?: Array<{
            id: number;
            title: string;
            priority: string;
            is_completed: boolean;
        }>;
    };
    filters?: Record<string, string | null>;
};

export default function TasksIndex() {
    const { props } = usePage<PageProps>();
    const todos = props.todos?.data ?? [];

    return (
        <>
            <Head title="Tasks" />
            <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
                <header className="space-y-2">
                    <p className="text-sm text-slate-500">Inertia Workspace</p>
                    <h1 className="text-3xl font-semibold text-slate-900">
                        Tasks
                    </h1>
                </header>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-600">
                        Initial todos loaded from Laravel: {todos.length}
                    </p>

                    <ul className="mt-4 space-y-3">
                        {todos.map((todo) => (
                            <li
                                key={todo.id}
                                className="rounded-lg border border-slate-200 px-4 py-3"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-medium text-slate-900">
                                        {todo.title}
                                    </span>
                                    <span className="text-xs uppercase tracking-wide text-slate-500">
                                        {todo.priority}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </>
    );
}
