import { describe, expect, it } from 'vitest';

import type { Todo } from '../../types';
import { getTodoDateMeta } from './TodoCard';
import { getEmptyStateContent } from './TodoList';

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

describe('getTodoDateMeta', () => {
    it('uses deleted label for trashed todos', () => {
        const meta = getTodoDateMeta(
            {
                ...baseTodo,
                is_deleted: true,
                deleted_at: '2026-03-29T10:00:00.000000Z',
            },
            new Date('2026-03-30T09:00:00.000Z'),
        );

        expect(meta).toMatchObject({
            label: 'Deleted Mar 29',
            tone: 'trash',
            showAlert: false,
        });
    });

    it('marks overdue incomplete todos as overdue', () => {
        const meta = getTodoDateMeta(
            {
                ...baseTodo,
                due_date: '2026-03-29',
            },
            new Date('2026-03-30T09:00:00.000Z'),
        );

        expect(meta).toMatchObject({
            label: 'Mar 29',
            tone: 'overdue',
            showAlert: true,
        });
    });
});

describe('getEmptyStateContent', () => {
    it('returns the today-specific empty state', () => {
        expect(getEmptyStateContent('today', false)).toMatchObject({
            heading: 'Nothing due today',
            icon: 'Sun',
        });
    });

    it('returns the filtered empty state when filters are active', () => {
        expect(getEmptyStateContent(12, true)).toMatchObject({
            heading: 'No matching tasks',
            icon: 'Filter',
        });
    });
});
