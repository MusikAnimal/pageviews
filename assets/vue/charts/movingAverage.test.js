import { describe, expect, it } from 'vitest';
import { movingAverage } from './movingAverage.js';

describe( 'movingAverage', () => {
	it( 'averages a trailing window', () => {
		expect( movingAverage( [ 1, 2, 3, 4, 5 ], 3 ) )
			.toEqual( [ 1, 1.5, 2, 3, 4 ] );
	} );

	it( 'keeps gaps and excludes them from windows', () => {
		expect( movingAverage( [ 3, null, 6 ], 3 ) )
			.toEqual( [ 3, null, 4.5 ] );
	} );

	it( 'rounds to two decimals', () => {
		expect( movingAverage( [ 1, 1, 2 ], 3 ) )
			.toEqual( [ 1, 1, 1.33 ] );
	} );
} );
