import { describe, expect, it } from 'vitest';

import { LIST_COLOR_PALETTE } from '../../types';
import {
    getListCreateValidationError,
    getRandomInitialListColor,
} from './ListCreateInput';

describe('ListCreateInput helpers', () => {
    it('validates empty and overlong names', () => {
        expect(getListCreateValidationError('   ')).toBe('List name is required');
        expect(getListCreateValidationError('a'.repeat(51))).toBe(
            'List name must be 50 characters or fewer',
        );
        expect(getListCreateValidationError('Personal')).toBeNull();
    });

    it('chooses an initial color from the shared palette', () => {
        expect(LIST_COLOR_PALETTE).toHaveLength(12);
        expect(LIST_COLOR_PALETTE).toContain(getRandomInitialListColor());
    });
});
