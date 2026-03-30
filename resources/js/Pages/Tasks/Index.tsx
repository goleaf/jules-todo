import { Head } from '@inertiajs/react';

import AppLayout from '../../Components/layout/AppLayout';
import TodoList from '../../Components/todos/TodoList';

export default function TasksIndex() {
    return (
        <>
            <Head title="Tasks" />
            <AppLayout>
                <TodoList />
            </AppLayout>
        </>
    );
}
