import { describe, expect, it } from 'vitest';
import { shouldUseLogScale } from './logScale.js';

describe( 'shouldUseLogScale', () => {
	it( 'declines flat series', () => {
		expect( shouldUseLogScale( [ [ 100, 110, 105, 95 ] ] ) ).toBe( false );
	} );

	it( 'detects extreme spikes', () => {
		expect( shouldUseLogScale( [ [ 10, 12, 500000, 11, 9 ] ] ) ).toBe( true );
	} );

	it( 'detects a flat series dwarfed by another series', () => {
		// The overall max is appended to each set, so a tiny flat series
		// alongside a huge one registers as needing log scale.
		expect( shouldUseLogScale( [
			[ 2, 3, 2, 3, 2, 3 ],
			[ 900000, 950000, 910000 ]
		] ) ).toBe( true );
	} );

	it( 'declines when everything is small', () => {
		expect( shouldUseLogScale( [ [ 0, 1, 10, 2 ] ] ) ).toBe( false );
	} );

	it( 'treats nulls as zeros', () => {
		expect( shouldUseLogScale( [ [ null, null, null ] ] ) ).toBe( false );
	} );
} );
