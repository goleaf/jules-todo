import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
    default: {
        delete: vi.fn(),
        patch: vi.fn(),
    },
}));

import axios from 'axios';

import { useAppStore } from '../stores/useAppStore';
import { isTypingInField, useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('isTypingInField', () => {
    it('returns true for input, textarea, select, and contenteditable elements', () => {
        const input = document.createElement('input');
        const textarea = document.createElement('textarea');
        const select = document.createElement('select');
        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        document.body.append(input, textarea, select, editable);

        input.focus();
        expect(isTypingInField()).toBe(true);

        textarea.focus();
        expect(isTypingInField()).toBe(true);

        select.focus();
        expect(isTypingInField()).toBe(true);

        editable.focus();
        expect(isTypingInField(editable)).toBe(true);
    });

    it('returns false for non-editable elements', () => {
        const button = document.createElement('button');
        document.body.append(button);
        button.focus();

        expect(isTypingInField()).toBe(false);
        expect(isTypingInField(button)).toBe(false);
    });
});

describe('useKeyboardShortcuts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAppStore.setState({
            hoveredTodoId: null,
            isSearchOpen: false,
            isSelectionMode: false,
            selectedTodoId: null,
        });
        document.body.innerHTML = '';
    });

    it('opens search on Ctrl+K', () => {
        renderHook(() => useKeyboardShortcuts());

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    ctrlKey: true,
                    key: 'k',
                }),
            );
        });

        expect(useAppStore.getState().isSearchOpen).toBe(true);
    });

    it('focuses the create input on N when not typing', () => {
        const input = document.createElement('input');
        document.body.append(input);
        const focusSpy = vi.spyOn(input, 'focus');

        renderHook(() =>
            useKeyboardShortcuts({
                createInputRef: { current: input },
            }),
        );

        act(() => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: 'n',
                }),
            );
        });

        expect(focusSpy).toHaveBeenCalled();
    });

    it('patches priority shortcuts for the selected todo', async () => {
        vi.mocked(axios.patch).mockResolvedValue({ data: {} });
        useAppStore.setState({ selectedTodoId: 12 });

        renderHook(() => useKeyboardShortcuts());

        await act(async () => {
            document.dispatchEvent(
                new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: '1',
                }),
            );
            await Promise.resolve();
        });

        expect(axios.patch).toHaveBeenCalledWith('/api/todos/12', {
            priority: 'high',
        });
    });
});
