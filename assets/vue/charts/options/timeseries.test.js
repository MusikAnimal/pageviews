import { describe, expect, it } from 'vitest';
import { buildTimeseriesOption } from './timeseries.js';

const base = {
	// 2026-07-20 is a Monday.
	dates: [ '2026-07-19', '2026-07-20', '2026-07-21' ],
	series: [ { label: 'Cat', data: [ 5, 0, 12 ] } ]
};

describe( 'buildTimeseriesOption', () => {
	it( 'builds a line chart by default', () => {
		const option = buildTimeseriesOption( base );
		expect( option.series[ 0 ].type ).toBe( 'line' );
		expect( option.series[ 0 ].name ).toBe( 'Cat' );
		expect( option.series[ 0 ].data ).toEqual( [ 5, 0, 12 ] );
		expect( option.yAxis.type ).toBe( 'value' );
	} );

	it( 'converts zeros to gaps on a log axis', () => {
		const option = buildTimeseriesOption( { ...base, logScale: true } );
		expect( option.yAxis.type ).toBe( 'log' );
		expect( option.series[ 0 ].data ).toEqual( [ 5, null, 12 ] );
	} );

	it( 'pins the axis to zero only when compatible', () => {
		expect( buildTimeseriesOption( { ...base, beginAtZero: true } ).yAxis.min ).toBe( 0 );
		expect(
			buildTimeseriesOption( { ...base, beginAtZero: true, logScale: true } ).yAxis.min
		).toBeUndefined();
	} );

	it( 'toggles data labels', () => {
		expect( buildTimeseriesOption( base ).series[ 0 ].label.show ).toBe( false );
		const labeled = buildTimeseriesOption( { ...base, showValues: true } );
		expect( labeled.series[ 0 ].label.show ).toBe( true );
		// Log-scale gaps must not render a label.
		expect( labeled.series[ 0 ].label.formatter( { value: null } ) ).toBe( '' );
		expect( labeled.series[ 0 ].label.formatter( { value: 1234 } ) ).toBe( '1,234' );
	} );

	it( 'marks Mondays on the x-axis in daily mode', () => {
		const option = buildTimeseriesOption( { ...base, localizeFormats: false } );
		expect( option.xAxis.data ).toEqual( [ '2026-07-19', '• 2026-07-20', '2026-07-21' ] );
	} );

	it( 'does not mark Mondays in monthly mode', () => {
		const option = buildTimeseriesOption( {
			dates: [ '2026-06', '2026-07' ],
			series: base.series,
			monthly: true,
			localizeFormats: false
		} );
		expect( option.xAxis.data ).toEqual( [ '2026-06', '2026-07' ] );
	} );

	it( 'hides the legend unless explicitly requested', () => {
		const comparison = {
			...base,
			series: [ ...base.series, { label: 'Dog', data: [ 1, 2, 3 ] } ]
		};
		// Off by default: the colored page chips act as the legend.
		expect( buildTimeseriesOption( comparison ).legend.show ).toBe( false );
		expect( buildTimeseriesOption( { ...comparison, showLegend: true } ).legend.show )
			.toBe( true );
		// Even when requested, a single series needs no legend.
		expect( buildTimeseriesOption( { ...base, showLegend: true } ).legend.show )
			.toBe( false );
	} );

	it( 'styles bars with translucent fill and solid border', () => {
		const option = buildTimeseriesOption( { ...base, chartType: 'bar' } );
		expect( option.series[ 0 ].type ).toBe( 'bar' );
		expect( option.series[ 0 ].itemStyle.color ).toBe( 'rgba(171, 212, 235, 0.6)' );
		expect( option.series[ 0 ].itemStyle.borderColor ).toBe( 'rgba(171, 212, 235, 1)' );
	} );
} );
