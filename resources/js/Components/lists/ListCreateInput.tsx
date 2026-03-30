import axios from 'axios';
import { Check } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

import { LIST_COLOR_PALETTE } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

/**
 * Props accepted by the inline sidebar list-creation form.
 */
export interface ListCreateInputProps {
    /**
     * Persists a new list with the provided name and color.
     */
    onSubmit: (name: string, color: string) => Promise<unknown> | unknown;
    /**
     * Cancels the inline creation flow.
     */
    onCancel: () => void;
}

/**
 * Validates a proposed list name.
 *
 * @param name The list name to validate.
 * @returns A user-facing validation error, or `null` when valid.
 */
export function getListCreateValidationError(name: string): string | null {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
        return 'List name is required';
    }

    if (trimmedName.length > 50) {
        return 'List name must be 50 characters or fewer';
    }

    return null;
}

/**
 * Returns a random initial list color from the shared palette.
 *
 * @param randomValue Optional deterministic random value for tests.
 * @returns A palette color.
 */
export function getRandomInitialListColor(
    randomValue: number = Math.random(),
): string {
    const nextIndex = Math.floor(randomValue * LIST_COLOR_PALETTE.length);

    return LIST_COLOR_PALETTE[nextIndex] ?? LIST_COLOR_PALETTE[0];
}

function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        const firstNameError = responseData?.errors?.name?.[0];

        if (typeof firstNameError === 'string') {
            return firstNameError;
        }

        if (typeof responseData?.message === 'string') {
            return responseData.message;
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Unable to create list';
}

/**
 * Inline sidebar form used to create a new custom list.
 *
 * @param props The component props.
 * @returns The rendered list-create form.
 */
export default function ListCreateInput({
    onCancel,
    onSubmit,
}: ListCreateInputProps) {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(() =>
        getRandomInitialListColor(),
    );

    async function handleSubmit() {
        const validationError = getListCreateValidationError(name);

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit(name.trim(), selectedColor);
        } catch (submitError) {
            setError(getErrorMessage(submitError));
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
            void handleSubmit();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
        }
    }

    return (
        <div className="space-y-3 rounded-md border border-border bg-background p-2">
            <div className="grid grid-cols-4 gap-2">
                {LIST_COLOR_PALETTE.map((color) => {
                    const isSelected = color === selectedColor;

                    return (
                        <button
                            key={color}
                            type="button"
                            aria-label={`Select list color ${color}`}
                            className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-105',
                                'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                isSelected && 'ring-2 ring-white ring-offset-1',
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => setSelectedColor(color)}
                        >
                            {isSelected ? (
                                <Check className="h-3.5 w-3.5 text-white" />
                            ) : null}
                        </button>
                    );
                })}
            </div>

            <div className="space-y-1">
                <Input
                    autoFocus
                    value={name}
                    placeholder="List name…"
                    className={cn(
                        error && 'border-destructive focus-visible:ring-destructive',
                    )}
                    maxLength={50}
                    onChange={(event) => {
                        if (error) {
                            setError(null);
                        }

                        setName(event.target.value);
                    }}
                    onKeyDown={handleKeyDown}
                />

                {error ? (
                    <p className="text-xs text-destructive">{error}</p>
                ) : null}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => {
                        void handleSubmit();
                    }}
                >
                    Add
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={onCancel}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}
