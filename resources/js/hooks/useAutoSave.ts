import axios from 'axios';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { showSaveErrorToast } from '../lib/notifications';
import type { Todo } from '../types';

/**
 * Represents the lifecycle of an auto-save request.
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Backward-compatible object signature for the auto-save hook.
 *
 * @template K The todo field being saved.
 * @template V The field value type.
 */
export type UseAutoSaveOptions<
    K extends keyof Todo,
    V = Todo[K],
> = {
    /**
     * The todo identifier whose field should be saved.
     */
    todoId: number | null;
    /**
     * The todo field name to patch.
     */
    field: K;
    /**
     * The current field value.
     */
    value: V;
    /**
     * Optional debounce delay in milliseconds.
     */
    delay?: number;
    /**
     * Whether auto-saving is currently enabled.
     */
    enabled?: boolean;
    /**
     * Optional initial database value used as the baseline.
     */
    initialValue?: V;
    /**
     * Optional callback invoked after a successful save.
     */
    onSuccess?: (payload: unknown) => void;
};

/**
 * The public contract returned by the auto-save hook.
 *
 * @template V The tracked field value type.
 */
export interface UseAutoSaveResult<V> {
    /**
     * The current save lifecycle state.
     */
    saveStatus: AutoSaveStatus;
    /**
     * Backward-compatible alias for `saveStatus`.
     */
    saveState: AutoSaveStatus;
    /**
     * The last successfully persisted value.
     */
    lastSavedValue: V;
    /**
     * The latest error message, if any.
     */
    error: string | null;
    /**
     * Backward-compatible alias for `error`.
     */
    errorMessage: string | null;
    /**
     * Immediately persists the current value without waiting for the debounce delay.
     */
    save: () => Promise<V | undefined>;
    /**
     * Retries the last failed save immediately.
     */
    retry: () => Promise<V | undefined>;
    /**
     * Resets the internal saved baseline to a new value.
     */
    resetSavedBaseline: (nextValue: V) => void;
}

/**
 * Legacy overload that accepts an options object.
 *
 * @template K The todo field being saved.
 * @template V The field value type.
 */
export function useAutoSave<K extends keyof Todo, V = Todo[K]>(
    options: UseAutoSaveOptions<K, V>,
): UseAutoSaveResult<V>;

/**
 * Preferred overload that accepts the todo id, field name, value, and delay.
 *
 * @template K The todo field being saved.
 */
export function useAutoSave<K extends keyof Todo>(
    todoId: number | null,
    fieldName: K,
    value: Todo[K],
    delay?: number,
): UseAutoSaveResult<Todo[K]>;

/**
 * Debounced auto-save hook for individual todo fields.
 *
 * The hook initializes its saved baseline from the first value it receives for a
 * todo/field pair, so first render does not immediately trigger a save.
 */
export function useAutoSave<K extends keyof Todo, V = Todo[K]>(
    ...args:
        | [UseAutoSaveOptions<K, V>]
        | [number | null, K, V, number?]
): UseAutoSaveResult<V> {
    const options = useMemo((): UseAutoSaveOptions<K, V> => {
        if (typeof args[0] === 'object' && args[0] !== null && 'field' in args[0]) {
            return args[0];
        }

        return {
            todoId: args[0] as number | null,
            field: args[1] as K,
            value: args[2] as V,
            delay: args[3] as number | undefined,
        };
    }, [args]);

    const {
        delay = 500,
        enabled = true,
        field,
        onSuccess,
        todoId,
        value,
    } = options;

    const baselineValue = (
        options.initialValue === undefined ? value : options.initialValue
    ) as V;

    const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [lastSavedValue, setLastSavedValue] = useState<V>(baselineValue);

    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<number | null>(null);
    const idleTimerRef = useRef<number | null>(null);
    const fieldRef = useRef<K>(field);
    const onSuccessRef = useRef(onSuccess);
    const todoIdRef = useRef<number | null>(todoId);
    const valueRef = useRef<V>(value);
    const enabledRef = useRef(enabled);
    const lastSavedValueRef = useRef<V>(baselineValue);
    const identityRef = useRef<string | null>(null);

    fieldRef.current = field;
    onSuccessRef.current = onSuccess;
    todoIdRef.current = todoId;
    valueRef.current = value;
    enabledRef.current = enabled;

    const clearDebounceTimer = useCallback(() => {
        if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);

    const clearIdleTimer = useCallback(() => {
        if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }, []);

    const abortInFlightRequest = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const resetSavedBaseline = useCallback((nextValue: V) => {
        clearDebounceTimer();
        clearIdleTimer();
        abortInFlightRequest();
        lastSavedValueRef.current = nextValue;
        setLastSavedValue(nextValue);
        setSaveStatus('idle');
        setError(null);
    }, [abortInFlightRequest, clearDebounceTimer, clearIdleTimer]);

    const scheduleIdleReset = useCallback(() => {
        clearIdleTimer();

        idleTimerRef.current = window.setTimeout(() => {
            setSaveStatus((currentStatus) =>
                currentStatus === 'saved' ? 'idle' : currentStatus,
            );
        }, 2000);
    }, [clearIdleTimer]);

    const performSave = useCallback(async (force = false): Promise<V | undefined> => {
        const nextTodoId = todoIdRef.current;
        const nextValue = valueRef.current;

        clearDebounceTimer();
        clearIdleTimer();

        if (!nextTodoId || !enabledRef.current) {
            return undefined;
        }

        if (!force && Object.is(nextValue, lastSavedValueRef.current)) {
            return lastSavedValueRef.current;
        }

        abortInFlightRequest();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setSaveStatus('saving');
        setError(null);

        try {
            const response = await axios.patch(
                `/api/todos/${nextTodoId}`,
                { [fieldRef.current]: nextValue },
                { signal: controller.signal },
            );

            if (controller.signal.aborted) {
                return undefined;
            }

            abortControllerRef.current = null;
            lastSavedValueRef.current = nextValue;
            setLastSavedValue(nextValue);
            setSaveStatus('saved');
            onSuccessRef.current?.(response.data);
            scheduleIdleReset();

            return nextValue;
        } catch (error) {
            abortControllerRef.current = null;

            if (isAbortError(error)) {
                return undefined;
            }

            setSaveStatus('error');
            setError(getErrorMessage(error));
            showSaveErrorToast();

            return undefined;
        }
    }, [
        abortInFlightRequest,
        clearDebounceTimer,
        clearIdleTimer,
        scheduleIdleReset,
    ]);

    const retry = useCallback(async () => performSave(true), [performSave]);
    const save = useCallback(async () => performSave(true), [performSave]);

    useEffect(() => {
        const identity = `${todoId ?? 'null'}:${String(field)}`;

        if (identityRef.current !== identity) {
            identityRef.current = identity;
            resetSavedBaseline(baselineValue);
            return;
        }

        if (!todoId || !enabled) {
            clearDebounceTimer();
            abortInFlightRequest();
            setSaveStatus('idle');
            setError(null);
            return;
        }

        if (Object.is(value, lastSavedValueRef.current)) {
            return;
        }

        clearDebounceTimer();

        debounceTimerRef.current = window.setTimeout(() => {
            void performSave();
        }, delay);

        return clearDebounceTimer;
    }, [
        abortInFlightRequest,
        baselineValue,
        clearDebounceTimer,
        delay,
        enabled,
        field,
        performSave,
        resetSavedBaseline,
        todoId,
        value,
    ]);

    useEffect(() => {
        return () => {
            clearDebounceTimer();
            clearIdleTimer();
            abortInFlightRequest();
        };
    }, [abortInFlightRequest, clearDebounceTimer, clearIdleTimer]);

    return {
        saveStatus,
        saveState: saveStatus,
        lastSavedValue,
        error,
        errorMessage: error,
        save,
        retry,
        resetSavedBaseline,
    };
}

/**
 * Determines whether an error was caused by an aborted request.
 *
 * @param error The thrown error value.
 * @returns `true` when the error represents a cancellation.
 */
function isAbortError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        return error.code === 'ERR_CANCELED';
    }

    return (
        error instanceof Error
        && (error.name === 'AbortError' || error.name === 'CanceledError')
    );
}

/**
 * Extracts a user-friendly error message from an unknown API error.
 *
 * @param error The thrown error value.
 * @returns A safe, human-readable error message.
 */
function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;

        if (typeof responseData?.message === 'string') {
            return responseData.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Auto-save failed.';
}
