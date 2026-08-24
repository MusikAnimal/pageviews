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

	it( 'overlays a dashed moving average per series when enabled', () => {
		const option = buildTimeseriesOption( {
			...base,
			chartType: 'bar',
			movingAverage: true,
			movingAverageSuffix: 'moving average'
		} );

		expect( option.series ).toHaveLength( 2 );
		const [ , overlay ] = option.series;
		expect( overlay.name ).toBe( 'Cat (moving average)' );
		expect( overlay.type ).toBe( 'line' );
		expect( overlay.lineStyle.type ).toBe( 'dashed' );
		// Trailing 7-day window over [ 5, 0, 12 ].
		expect( overlay.data ).toEqual( [ 5, 2.5, 5.67 ] );

		// Off by default, and no overlay series.
		expect( buildTimeseriesOption( base ).series ).toHaveLength( 1 );
	} );

	it( 'smooths over a 3-month window in monthly mode', () => {
		const option = buildTimeseriesOption( {
			dates: [ '2026-03', '2026-04', '2026-05', '2026-06' ],
			series: [ { label: 'Cat', data: [ 3, 6, 9, 30 ] } ],
			monthly: true,
			movingAverage: true
		} );
		// The last point averages only the last three months.
		expect( option.series[ 1 ].data ).toEqual( [ 3, 4.5, 6, 15 ] );
	} );

	it( 'converts zeros to gaps on a log axis', () => {
		const option = buildTimeseriesOption( { ...base, logScale: true } );
		expect( option.yAxis.type ).toBe( 'log' );
		expect( option.series[ 0 ].data ).toEqual( [ 5, null, 12 ] );
	} );

	it( 'never shows fractional ticks (pageviews are integers)', () => {
		expect( buildTimeseriesOption( base ).yAxis.minInterval ).toBe( 1 );
		// minInterval does not apply to log axes.
		expect( buildTimeseriesOption( { ...base, logScale: true } ).yAxis.minInterval )
			.toBeUndefined();
	} );

	it( 'starts at zero with headroom by default', () => {
		const { yAxis } = buildTimeseriesOption( base );
		// scale: false is what actually pins an ECharts value axis to
		// zero; the top gap keeps lines off the ceiling.
		expect( yAxis.scale ).toBe( false );
		expect( yAxis.boundaryGap ).toEqual( [ 0, '10%' ] );
	} );

	it( 'lifts the baseline when the data is compressed near the top', () => {
		const compressed = {
			dates: base.dates,
			series: [ { label: 'Cat', data: [ 900, 950, 1000 ] } ]
		};
		const { yAxis } = buildTimeseriesOption( compressed );
		expect( yAxis.scale ).toBe( true );
		expect( yAxis.boundaryGap ).toEqual( [ '10%', '10%' ] );

		// The always-zero preference suppresses the heuristic…
		expect( buildTimeseriesOption( { ...compressed, beginAtZero: true } ).yAxis.scale )
			.toBe( false );
		// …and truncated bars would mislead, so bars always hit zero.
		expect( buildTimeseriesOption( { ...compressed, chartType: 'bar' } ).yAxis.scale )
			.toBe( false );
		// A log axis has neither knob.
		expect( buildTimeseriesOption( { ...compressed, logScale: true } ).yAxis.scale )
			.toBeUndefined();
	} );

	it( 'toggles data labels', () => {
		expect( buildTimeseriesOption( base ).series[ 0 ].label.show ).toBe( false );
		const labeled = buildTimeseriesOption( { ...base, showValues: true } );
		expect( labeled.series[ 0 ].label.show ).toBe( true );
		// Log-scale gaps must not render a label.
		expect( labeled.series[ 0 ].label.formatter( { value: null } ) ).toBe( '' );
		expect( labeled.series[ 0 ].label.formatter( { value: 1234 } ) ).toBe( '1,234' );
	} );

	it( 'rotates date labels and draws vertical grid lines', () => {
		const option = buildTimeseriesOption( base );
		expect( option.xAxis.axisLabel.rotate ).toBe( 45 );
		// Off by default on category axes; must be explicitly on.
		expect( option.xAxis.splitLine.show ).toBe( true );
	} );

	it( 'places line points on the grid lines, bars in bands', () => {
		expect( buildTimeseriesOption( base ).xAxis.boundaryGap ).toBe( false );
		expect( buildTimeseriesOption( { ...base, chartType: 'bar' } ).xAxis.boundaryGap )
			.toBe( true );
	} );

	it( 'marks Mondays on the x-axis in daily mode', () => {
		const option = buildTimeseriesOption( { ...base, localizeDates: false } );
		expect( option.xAxis.data ).toEqual( [ '2026-07-19', '• 2026-07-20', '2026-07-21' ] );
	} );

	it( 'does not mark Mondays in monthly mode', () => {
		const option = buildTimeseriesOption( {
			dates: [ '2026-06', '2026-07' ],
			series: base.series,
			monthly: true,
			localizeDates: false
		} );
		expect( option.xAxis.data ).toEqual( [ '2026-06', '2026-07' ] );
	} );

	it( 'honors the separate number and date localization preferences', () => {
		const option = buildTimeseriesOption( {
			...base,
			showValues: true,
			localizeDates: false,
			localizeNumbers: false
		} );
		expect( option.xAxis.data[ 0 ] ).toBe( '2026-07-19' );
		expect( option.series[ 0 ].label.formatter( { value: 1234 } ) ).toBe( '1234' );
	} );

	it( 'keeps the toolbox dataZoom feature registered but off-canvas', () => {
		const option = buildTimeseriesOption( base );
		// show: false would make ECharts skip feature creation, which
		// silently breaks the always-on drag-zoom (takeGlobalCursor).
		expect( option.toolbox.show ).toBe( true );
		expect( option.toolbox.top ).toBeLessThan( 0 );
		expect( option.toolbox.feature.dataZoom ).toBeTruthy();
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
		expect( option.series[ 0 ].itemStyle.color ).toBe( 'rgba(75, 119, 214, 0.6)' );
		expect( option.series[ 0 ].itemStyle.borderColor ).toBe( 'rgba(75, 119, 214, 1)' );
	} );
} );
