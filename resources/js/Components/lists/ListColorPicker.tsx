import { Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { LIST_COLOR_PALETTE } from '../../types';
import { cn } from '../../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

/**
 * Props accepted by the list color picker.
 */
export interface ListColorPickerProps {
    /**
     * The currently selected list color.
     */
    currentColor: string;
    /**
     * Callback fired when the user selects a new color.
     */
    onColorSelect: (hex: string) => Promise<unknown> | unknown;
    /**
     * Optional custom trigger element. Defaults to the small color swatch.
     */
    trigger?: ReactNode;
}

/**
 * Popover-based list color picker.
 *
 * @param props The component props.
 * @returns The rendered color picker.
 */
export default function ListColorPicker({
    currentColor,
    onColorSelect,
    trigger,
}: ListColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {trigger ?? (
                    <button
                        type="button"
                        aria-label="Change list color"
                        className="h-4 w-4 rounded-full ring-1 ring-border transition-transform hover:scale-110"
                        style={{ backgroundColor: currentColor }}
                    />
                )}
            </PopoverTrigger>

            <PopoverContent align="end" className="w-36 p-3">
                <div className="grid grid-cols-4 gap-2">
                    {LIST_COLOR_PALETTE.map((color) => {
                        const isSelected = color === currentColor;

                        return (
                            <button
                                key={color}
                                type="button"
                                aria-label={`Choose ${color}`}
                                className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110',
                                    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                )}
                                style={{ backgroundColor: color }}
                                onClick={async () => {
                                    await onColorSelect(color);
                                    setIsOpen(false);
                                }}
                            >
                                {isSelected ? (
                                    <Check className="h-3 w-3 text-white" />
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
