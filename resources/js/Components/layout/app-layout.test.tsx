import { describe, expect, it } from 'vitest';

import {
    getAccentThemeVariables,
    getAppLayoutMode,
    getInitialSidebarCollapsed,
    shouldUseDarkTheme,
} from './AppLayout';

describe('getAppLayoutMode', () => {
    it('returns mobile below 768px', () => {
        expect(getAppLayoutMode(640)).toBe('mobile');
    });

    it('returns tablet between 768px and 1024px', () => {
        expect(getAppLayoutMode(900)).toBe('tablet');
    });

    it('returns desktop above 1024px', () => {
        expect(getAppLayoutMode(1280)).toBe('desktop');
    });
});

describe('getInitialSidebarCollapsed', () => {
    it('uses local storage when present', () => {
        expect(getInitialSidebarCollapsed('true', 1400)).toBe(true);
        expect(getInitialSidebarCollapsed('false', 900)).toBe(false);
    });

    it('defaults to collapsed on tablet and expanded elsewhere', () => {
        expect(getInitialSidebarCollapsed(null, 900)).toBe(true);
        expect(getInitialSidebarCollapsed(null, 640)).toBe(false);
        expect(getInitialSidebarCollapsed(null, 1280)).toBe(false);
    });
});

describe('shouldUseDarkTheme', () => {
    it('resolves explicit light and dark modes directly', () => {
        expect(shouldUseDarkTheme('dark', false)).toBe(true);
        expect(shouldUseDarkTheme('light', true)).toBe(false);
    });

    it('resolves system mode from the media query value', () => {
        expect(shouldUseDarkTheme('system', true)).toBe(true);
        expect(shouldUseDarkTheme('system', false)).toBe(false);
    });
});

describe('getAccentThemeVariables', () => {
    it('returns the mapped CSS variable channels for the active accent color', () => {
        expect(getAccentThemeVariables('amber')).toMatchObject({
            '--accent': '32 95% 44%',
            '--primary': '32 95% 44%',
            '--ring': '32 95% 44%',
        });
    });
});
