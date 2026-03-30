import { describe, expect, it } from 'vitest';

import {
    buildSettingsExportFilename,
    isTodoImportPayload,
} from './Index';

describe('buildSettingsExportFilename', () => {
    it('uses the expected export filename format', () => {
        expect(
            buildSettingsExportFilename(new Date('2026-03-30T10:00:00.000Z')),
        ).toBe('todoapp-export-2026-03-30.json');
    });
});

describe('isTodoImportPayload', () => {
    it('accepts a valid exported payload shape', () => {
        expect(
            isTodoImportPayload({
                exported_at: '2026-03-30T10:00:00.000Z',
                lists: [
                    {
                        name: 'Work',
                        color: '#f59e0b',
                        todos: [
                            {
                                title: 'Imported todo',
                            },
                        ],
                    },
                ],
            }),
        ).toBe(true);
    });

    it('rejects invalid payload shapes', () => {
        expect(isTodoImportPayload(null)).toBe(false);
        expect(isTodoImportPayload({ lists: [{}] })).toBe(false);
    });
});
