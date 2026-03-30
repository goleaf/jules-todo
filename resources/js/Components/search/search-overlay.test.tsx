import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { highlightMatch } from '../../lib/highlightMatch';
import {
    upsertRecentSearches,
} from './SearchOverlay';

describe('highlightMatch', () => {
    it('wraps case-insensitive matches in mark tags', () => {
        render(
            <div data-testid="content">
                {highlightMatch('Write Tests Today', 'te')}
            </div>,
        );

        const marks = screen.getAllByText(/te/i, { selector: 'mark' });

        expect(marks).toHaveLength(2);
        expect(screen.getByTestId('content').textContent).toBe(
            'Write Tests Today',
        );
    });

    it('returns the original text when the query is empty', () => {
        render(
            <div data-testid="content">
                {highlightMatch('Search tasks', '')}
            </div>,
        );

        expect(screen.getByTestId('content').textContent).toBe('Search tasks');
        expect(screen.queryByText(/search/i, { selector: 'mark' })).toBeNull();
    });
});

describe('upsertRecentSearches', () => {
    it('moves an existing term to the front and keeps terms unique', () => {
        expect(
            upsertRecentSearches(['today', 'work', 'errands'], 'work'),
        ).toEqual(['work', 'today', 'errands']);
    });

    it('trims the list to five items', () => {
        expect(
            upsertRecentSearches(
                ['one', 'two', 'three', 'four', 'five'],
                'six',
            ),
        ).toEqual(['six', 'one', 'two', 'three', 'four']);
    });
});
