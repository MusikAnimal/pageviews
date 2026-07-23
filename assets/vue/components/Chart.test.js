import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import Chart from './Chart.vue';
import { echarts } from '../charts/echarts.js';

const mockChart = vi.hoisted( () => ( {
	setOption: vi.fn(),
	resize: vi.fn(),
	dispose: vi.fn(),
	dispatchAction: vi.fn(),
	on: vi.fn(),
	getOption: vi.fn( () => ( {} ) ),
	getDataURL: vi.fn( () => 'data:image/png;base64,mock' )
} ) );

vi.mock( '../charts/echarts.js', () => ( {
	echarts: { init: vi.fn( () => mockChart ) }
} ) );

describe( 'Chart', () => {
	beforeEach( () => {
		// jsdom has no ResizeObserver.
		vi.stubGlobal( 'ResizeObserver', class {
			observe = vi.fn();

			disconnect = vi.fn();
		} );
	} );

	afterEach( () => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	} );

	it( 'initializes echarts on mount and applies the option', () => {
		const option = { series: [] };
		mount( Chart, { props: { option, ariaLabel: 'Pageviews chart' } } );

		expect( echarts.init ).toHaveBeenCalledOnce();
		expect( mockChart.setOption ).toHaveBeenCalledWith( option, { notMerge: true } );
	} );

	it( 'replaces the option wholesale on prop change', async () => {
		const wrapper = mount( Chart, { props: { option: { a: 1 } } } );
		await wrapper.setProps( { option: { a: 2 } } );
		await nextTick();

		expect( mockChart.setOption ).toHaveBeenLastCalledWith(
			{ a: 2 }, { notMerge: true }
		);
	} );

	it( 'disposes the instance on unmount', () => {
		const wrapper = mount( Chart, { props: { option: {} } } );
		wrapper.unmount();
		expect( mockChart.dispose ).toHaveBeenCalledOnce();
	} );

	it( 'exposes PNG export', () => {
		const wrapper = mount( Chart, { props: { option: {} } } );
		expect( wrapper.vm.getPngDataUrl() ).toBe( 'data:image/png;base64,mock' );
		expect( mockChart.getDataURL ).toHaveBeenCalledWith(
			{ type: 'png', pixelRatio: 2 }
		);
	} );

	it( 'keeps drag-select zoom active across option changes', async () => {
		const wrapper = mount( Chart, { props: { option: { a: 1 } } } );
		const activation = { type: 'takeGlobalCursor', key: 'dataZoomSelect', dataZoomSelectActive: true };
		expect( mockChart.dispatchAction ).toHaveBeenCalledWith( activation );

		mockChart.dispatchAction.mockClear();
		await wrapper.setProps( { option: { a: 2 } } );
		await nextTick();
		// notMerge resets interaction state; it must be re-activated.
		expect( mockChart.dispatchAction ).toHaveBeenCalledWith( activation );
	} );

	it( 'emits range-select with the drag-selected axis indices', () => {
		const wrapper = mount( Chart, { props: { option: {} } } );
		const onDataZoom = mockChart.on.mock.calls
			.find( ( [ event ] ) => event === 'datazoom' )[ 1 ];

		// Toolbox select-zoom reports through a batch entry.
		onDataZoom( { batch: [ { startValue: 3, endValue: 11 } ] } );
		expect( wrapper.emitted( 'range-select' ) ).toEqual( [ [ 3, 11 ] ] );

		// Events without a usable range are ignored.
		onDataZoom( { batch: [ {} ] } );
		expect( wrapper.emitted( 'range-select' ) ).toHaveLength( 1 );
	} );

	it( 'labels the chart for assistive tech', () => {
		const wrapper = mount( Chart, { props: { option: {}, ariaLabel: 'Views over time' } } );
		expect( wrapper.attributes( 'role' ) ).toBe( 'img' );
		expect( wrapper.attributes( 'aria-label' ) ).toBe( 'Views over time' );
	} );
} );
