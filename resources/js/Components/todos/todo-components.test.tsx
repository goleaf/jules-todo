import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', async () => {
    const actual = await vi.importActual<typeof import('@inertiajs/react')>('@inertiajs/react');

    return {
        ...actual,
        usePage: () => ({
            props: {
                lists: [],
            },
        }),
    };
});

import type { Todo } from '../../types';
import TodoCreateInput, {
    getCreateTodoValidationError,
} from './TodoCreateInput';
import TodoEmptyState, {
    getTodoEmptyStateContent,
} from './TodoEmptyState';
import TodoSkeletonCard from './TodoSkeletonCard';
import {
    getBulkToolbarState,
} from './TodoBulkToolbar';
import {
    getDueDateFilterButtonLabel,
    getPriorityFilterButtonLabel,
    hasActiveTodoFilters,
} from './TodoFilterBar';
import {
    getPriorityFlagClassName,
} from './TodoCard';
import {
    getTodoSections,
} from './TodoList';

const baseTodo: Todo = {
    id: 1,
    todo_list_id: 1,
    title: 'Write tests',
    description: null,
    is_completed: false,
    completed_at: null,
    priority: 'medium',
    due_date: null,
    sort_order: 0,
    is_deleted: false,
    deleted_at: null,
    created_at: '2026-03-30T08:00:00.000000Z',
    updated_at: '2026-03-30T08:00:00.000000Z',
    list: {
        id: 1,
        name: 'Work',
        color: '#f59e0b',
        sort_order: 0,
        todos_count: 2,
        active_todos_count: 2,
        created_at: '2026-03-30T08:00:00.000000Z',
        updated_at: '2026-03-30T08:00:00.000000Z',
    },
};

describe('TodoSkeletonCard', () => {
    it('renders the default number of skeleton cards', () => {
        render(<TodoSkeletonCard />);

        expect(screen.getAllByTestId('todo-skeleton-card')).toHaveLength(5);
    });

    it('renders a custom count of skeleton cards', () => {
        render(<TodoSkeletonCard count={3} />);

        expect(screen.getAllByTestId('todo-skeleton-card')).toHaveLength(3);
    });
});

describe('TodoEmptyState', () => {
    it('returns the filtered empty state copy', () => {
        expect(getTodoEmptyStateContent(12, true)).toMatchObject({
            heading: 'No matching tasks',
            icon: 'Filter',
        });
    });

    it('renders the trash empty state', () => {
        render(<TodoEmptyState hasActiveFilters={false} listId="trash" />);

        expect(screen.getByText('Trash is empty')).toBeTruthy();
        expect(
            screen.getByText('Deleted tasks will appear here for 30 days'),
        ).toBeTruthy();
    });
});

describe('TodoCreateInput helpers', () => {
    it('requires a non-empty title', () => {
        expect(getCreateTodoValidationError('   ')).toBe('Title is required');
        expect(getCreateTodoValidationError('Ship UI')).toBeNull();
    });

    it('forwards the ref to the title input', () => {
        const inputRef = { current: null as HTMLInputElement | null };

        render(<TodoCreateInput listId="all" onCreateTodo={async () => undefined} ref={inputRef} />);

        expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    });
});

describe('TodoFilterBar helpers', () => {
    it('formats active filter labels', () => {
        expect(getDueDateFilterButtonLabel('today')).toBe('Due: Today');
        expect(getPriorityFilterButtonLabel('high')).toBe('Priority: High');
    });

    it('detects when any filters are active', () => {
        expect(
            hasActiveTodoFilters({
                dueDateFilter: 'any',
                filterStatus: 'all',
                priorityFilter: 'any',
            }),
        ).toBe(false);

        expect(
            hasActiveTodoFilters({
                dueDateFilter: 'today',
                filterStatus: 'all',
                priorityFilter: 'any',
            }),
        ).toBe(true);
    });
});

describe('TodoBulkToolbar helpers', () => {
    it('returns the visible state and label for a selected count', () => {
        expect(getBulkToolbarState(0)).toEqual({
            isVisible: false,
            label: '0 tasks selected',
        });

        expect(getBulkToolbarState(3)).toEqual({
            isVisible: true,
            label: '3 tasks selected',
        });
    });
});

describe('TodoCard helpers', () => {
    it('maps priority levels to the expected classes', () => {
        expect(getPriorityFlagClassName('none')).toContain('text-slate-500');
        expect(getPriorityFlagClassName('high')).toContain('text-red-700');
    });
});

describe('TodoList helpers', () => {
    it('splits todos into active and completed sections for a normal list', () => {
        const sections = getTodoSections(
            [
                baseTodo,
                { ...baseTodo, id: 2, is_completed: true, completed_at: '2026-03-30T09:00:00.000000Z' },
                { ...baseTodo, id: 3, is_deleted: true, deleted_at: '2026-03-30T09:00:00.000000Z' },
            ],
            'all',
        );

        expect(sections.activeTodos.map((todo) => todo.id)).toEqual([1]);
        expect(sections.completedTodos.map((todo) => todo.id)).toEqual([2]);
        expect(sections.trashedTodos).toEqual([]);
    });

    it('returns only trashed todos for the trash view', () => {
        const sections = getTodoSections(
            [
                { ...baseTodo, id: 3, is_deleted: true, deleted_at: '2026-03-30T09:00:00.000000Z' },
                baseTodo,
            ],
            'trash',
        );

        expect(sections.trashedTodos.map((todo) => todo.id)).toEqual([3]);
    });
});
