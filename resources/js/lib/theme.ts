import type { ThemeMode } from '../stores/useAppStore';

export const THEME_STORAGE_KEY = 'theme';
export const ACCENT_COLOR_STORAGE_KEY = 'accent_color';
export const FONT_SIZE_STORAGE_KEY = 'font_size';
export const DEFAULT_SORT_STORAGE_KEY = 'default_sort';
export const DEFAULT_FILTER_STORAGE_KEY = 'default_filter';
export const COMPLETE_TO_BOTTOM_STORAGE_KEY = 'complete_to_bottom';
export const CONFIRM_DELETE_STORAGE_KEY = 'confirm_delete';
export const AUTO_COLLAPSE_COMPLETED_STORAGE_KEY = 'auto_collapse_completed';

export const FONT_SIZE_OPTIONS = [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
] as const;

export const FONT_SIZE_MAP = {
    large: '18px',
    medium: '16px',
    small: '14px',
} as const;

export const ACCENT_COLOR_OPTIONS = [
    {
        channels: '243 75% 59%',
        foregroundChannels: '0 0% 100%',
        hex: '#6366f1',
        label: 'Indigo',
        value: 'indigo',
    },
    {
        channels: '32 95% 44%',
        foregroundChannels: '222 47% 11%',
        hex: '#f59e0b',
        label: 'Amber',
        value: 'amber',
    },
    {
        channels: '161 94% 30%',
        foregroundChannels: '222 47% 11%',
        hex: '#10b981',
        label: 'Emerald',
        value: 'emerald',
    },
    {
        channels: '0 72% 51%',
        foregroundChannels: '0 0% 100%',
        hex: '#ef4444',
        label: 'Red',
        value: 'red',
    },
    {
        channels: '221 83% 53%',
        foregroundChannels: '0 0% 100%',
        hex: '#3b82f6',
        label: 'Blue',
        value: 'blue',
    },
    {
        channels: '262 83% 58%',
        foregroundChannels: '0 0% 100%',
        hex: '#8b5cf6',
        label: 'Purple',
        value: 'purple',
    },
    {
        channels: '333 71% 51%',
        foregroundChannels: '0 0% 100%',
        hex: '#ec4899',
        label: 'Pink',
        value: 'pink',
    },
    {
        channels: '175 77% 26%',
        foregroundChannels: '0 0% 100%',
        hex: '#14b8a6',
        label: 'Teal',
        value: 'teal',
    },
] as const;

export type AccentColorOption = (typeof ACCENT_COLOR_OPTIONS)[number];
export type AccentColorName = AccentColorOption['value'];
export type FontSizeOption = keyof typeof FONT_SIZE_MAP;

function resolveTheme(theme: ThemeMode) {
    if (typeof window === 'undefined') {
        return 'light';
    }

    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }

    return theme;
}

export function getAccentColorOption(value: string | null | undefined) {
    return (
        ACCENT_COLOR_OPTIONS.find(
            (option) =>
                option.value === value ||
                option.hex === value,
        ) ?? ACCENT_COLOR_OPTIONS[0]
    );
}

export function applyTheme(theme: ThemeMode) {
    if (typeof window === 'undefined') {
        return;
    }

    document.documentElement.classList.toggle(
        'dark',
        resolveTheme(theme) === 'dark',
    );
}

export function applyAccentColor(value: string | null | undefined) {
    if (typeof window === 'undefined') {
        return;
    }

    const accent = getAccentColorOption(value);

    document.documentElement.style.setProperty('--accent', accent.channels);
    document.documentElement.style.setProperty(
        '--accent-foreground',
        accent.foregroundChannels,
    );
    document.documentElement.style.setProperty('--primary', accent.channels);
    document.documentElement.style.setProperty(
        '--primary-foreground',
        accent.foregroundChannels,
    );
    document.documentElement.style.setProperty('--ring', accent.channels);
}

export function applyFontSize(fontSize: FontSizeOption | null | undefined) {
    if (typeof window === 'undefined' || !fontSize) {
        return;
    }

    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize];
}
