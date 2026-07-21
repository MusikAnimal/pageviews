import { describe, expect, it } from 'vitest';
import { buildRadarOption } from './radar.js';

const input = {
	dates: [ '2026-07-01', '2026-07-02', '2026-07-03' ],
	series: [
		{ label: 'Cat', data: [ 10, null, 30 ] },
		{ label: 'Dog', data: [ 1, 2, 3 ] }
	],
	localizeFormats: false
};

describe( 'buildRadarOption', () => {
	it( 'creates one indicator per date with a shared max', () => {
		const option = buildRadarOption( input );
		expect( option.radar.indicator ).toHaveLength( 3 );
		expect( option.radar.indicator[ 0 ] ).toEqual( { name: '2026-07-01', max: 30 } );
	} );

	it( 'creates one polygon per page with nulls as zeros', () => {
		const option = buildRadarOption( input );
		expect( option.series[ 0 ].data ).toHaveLength( 2 );
		expect( option.series[ 0 ].data[ 0 ].name ).toBe( 'Cat' );
		expect( option.series[ 0 ].data[ 0 ].value ).toEqual( [ 10, 0, 30 ] );
	} );

	it( 'never produces a zero max', () => {
		const option = buildRadarOption( {
			...input,
			series: [ { label: 'Empty', data: [ 0, 0, 0 ] } ]
		} );
		expect( option.radar.indicator[ 0 ].max ).toBe( 1 );
	} );
} );
