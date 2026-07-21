import { describe, expect, it } from 'vitest';
import { PALETTE, seriesColor } from './palette.js';

describe( 'seriesColor', () => {
	it( 'returns rgba colors from the legacy palette', () => {
		expect( seriesColor( 0 ) ).toBe( 'rgba(171, 212, 235, 1)' );
		expect( seriesColor( 2, 0.6 ) ).toBe( 'rgba(251, 154, 153, 0.6)' );
	} );

	it( 'wraps around beyond the palette size', () => {
		expect( seriesColor( PALETTE.length ) ).toBe( seriesColor( 0 ) );
		expect( seriesColor( PALETTE.length + 3 ) ).toBe( seriesColor( 3 ) );
	} );
} );
