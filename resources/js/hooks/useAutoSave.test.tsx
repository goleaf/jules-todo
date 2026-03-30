import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios', () => ({
    default: {
        isAxiosError: vi.fn(() => false),
        patch: vi.fn(),
    },
}));

vi.mock('../lib/notifications', () => ({
    showSaveErrorToast: vi.fn(),
}));

import axios from 'axios';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    it('does not save on first render', async () => {
        renderHook(() => useAutoSave(42, 'title', 'Initial title'));

        await act(async () => {
            vi.runAllTimers();
        });

        expect(axios.patch).not.toHaveBeenCalled();
    });

    it('debounces field updates and patches only the changed field', async () => {
        vi.mocked(axios.patch).mockResolvedValue({ data: {} });

        const { rerender, result } = renderHook(
            ({ value }) =>
                useAutoSave({
                    field: 'title',
                    value,
                    todoId: 42,
                    delay: 500,
                }),
            {
                initialProps: { value: 'Original title' },
            },
        );

        rerender({ value: 'Updated title' });

        expect(axios.patch).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(500);
            await Promise.resolve();
        });

        expect(axios.patch).toHaveBeenCalledWith(
            '/api/todos/42',
            { title: 'Updated title' },
            expect.objectContaining({
                signal: expect.any(AbortSignal),
            }),
        );
        expect(result.current.saveStatus).toBe('saved');
        expect(result.current.lastSavedValue).toBe('Updated title');
    });

    it('supports manual save and retry', async () => {
        vi.mocked(axios.patch)
            .mockRejectedValueOnce(new Error('nope'))
            .mockResolvedValueOnce({ data: {} });

        const { result, rerender } = renderHook(
            ({ value }) => useAutoSave(42, 'description', value, 300),
            {
                initialProps: { value: 'First' },
            },
        );

        rerender({ value: 'Second' });

        await act(async () => {
            await result.current.save();
        });

        expect(result.current.saveStatus).toBe('error');

        await act(async () => {
            await result.current.retry();
        });

        expect(result.current.lastSavedValue).toBe('Second');
    });
});
