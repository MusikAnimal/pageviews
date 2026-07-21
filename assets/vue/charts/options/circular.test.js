import { describe, expect, it } from 'vitest';
import { buildCircularOption } from './circular.js';

const series = [
	{ label: 'Cat', total: 1000 },
	{ label: 'Dog', total: 500 }
];

describe( 'buildCircularOption', () => {
	it( 'plots per-page totals as slices', () => {
		const option = buildCircularOption( { series } );
		expect( option.series[ 0 ].type ).toBe( 'pie' );
		expect( option.series[ 0 ].data ).toEqual( [
			{ name: 'Cat', value: 1000 },
			{ name: 'Dog', value: 500 }
		] );
		expect( option.series[ 0 ].radius ).toBeUndefined();
	} );

	it( 'renders doughnut as a pie with an inner radius', () => {
		const option = buildCircularOption( { series, chartType: 'doughnut' } );
		expect( option.series[ 0 ].radius ).toEqual( [ '45%', '70%' ] );
		expect( option.series[ 0 ].roseType ).toBeUndefined();
	} );

	it( 'renders polarArea as a Nightingale rose', () => {
		const option = buildCircularOption( { series, chartType: 'polarArea' } );
		expect( option.series[ 0 ].roseType ).toBe( 'area' );
	} );

	it( 'uses the shared palette in series order', () => {
		const option = buildCircularOption( { series } );
		expect( option.color[ 0 ] ).toBe( 'rgba(171, 212, 235, 1)' );
		expect( option.color[ 1 ] ).toBe( 'rgba(178, 223, 138, 1)' );
	} );

	it( 'labels slices with formatted values', () => {
		const option = buildCircularOption( { series } );
		expect( option.series[ 0 ].label.formatter( { name: 'Cat', value: 1000 } ) )
			.toBe( 'Cat: 1,000' );
	} );
} );
