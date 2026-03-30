import type { ReactNode } from 'react';

/**
 * Escapes a string for safe interpolation inside a regular expression.
 *
 * @param value The user-entered string.
 * @returns A regex-safe version of the string.
 */
export function escapeHighlightQuery(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights case-insensitive query matches inside the provided text.
 *
 * @param text The text to highlight.
 * @param query The current search query.
 * @returns The rendered text with `<mark>` wrappers around matching segments.
 */
export function highlightMatch(text: string, query: string): ReactNode {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
        return text;
    }

    const pattern = new RegExp(`(${escapeHighlightQuery(trimmedQuery)})`, 'gi');
    const normalizedQuery = trimmedQuery.toLowerCase();

    return text.split(pattern).map((segment, index) => {
        if (segment.toLowerCase() === normalizedQuery) {
            return (
                <mark
                    key={`highlight-${segment}-${index}`}
                    className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800"
                >
                    {segment}
                </mark>
            );
        }

        return segment;
    });
}
