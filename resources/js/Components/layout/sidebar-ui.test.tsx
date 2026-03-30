import { describe, expect, it } from 'vitest';

import {
    getNextTheme,
    getThemeToggleTooltip,
    shouldShowSidebarBadge,
} from './Sidebar';

describe('getNextTheme', () => {
    it('cycles light to dark to system and back to light', () => {
        expect(getNextTheme('light')).toBe('dark');
        expect(getNextTheme('dark')).toBe('system');
        expect(getNextTheme('system')).toBe('light');
    });
});

describe('getThemeToggleTooltip', () => {
    it('describes the next theme mode', () => {
        expect(getThemeToggleTooltip('light')).toBe('Switch to Dark Mode');
        expect(getThemeToggleTooltip('dark')).toBe('Switch to System');
        expect(getThemeToggleTooltip('system')).toBe('Switch to Light Mode');
    });
});

describe('shouldShowSidebarBadge', () => {
    it('hides null and zero badges', () => {
        expect(shouldShowSidebarBadge(null)).toBe(false);
        expect(shouldShowSidebarBadge(0)).toBe(false);
    });

    it('shows positive badge counts', () => {
        expect(shouldShowSidebarBadge(4)).toBe(true);
    });
});
