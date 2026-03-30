import { describe, expect, it } from 'vitest';

import {
    formatTodoDetailMetadataDate,
    getDetailPanelMode,
    getNextMondayDate,
} from './TodoDetailPanel';

describe('TodoDetailPanel helpers', () => {
    it('maps viewport widths to the correct panel mode', () => {
        expect(getDetailPanelMode(390)).toBe('mobile');
        expect(getDetailPanelMode(900)).toBe('tablet');
        expect(getDetailPanelMode(1280)).toBe('desktop');
    });

    it('formats metadata timestamps for the panel footer', () => {
        expect(
            formatTodoDetailMetadataDate('2026-03-30T14:32:00.000Z'),
        ).toBe('Monday, March 30 2026 at 2:32 PM');
    });

    it('returns the next monday date for quick date selection', () => {
        expect(
            getNextMondayDate(new Date('2026-03-30T10:00:00.000Z')).toISOString(),
        ).toBe('2026-04-06T10:00:00.000Z');
    });
});
