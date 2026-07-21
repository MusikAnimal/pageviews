import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import Chart from './Chart.vue';
import { echarts } from '../charts/echarts.js';

const mockChart = vi.hoisted( () => ( {
	setOption: vi.fn(),
	resize: vi.fn(),
	dispose: vi.fn(),
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

	it( 'labels the chart for assistive tech', () => {
		const wrapper = mount( Chart, { props: { option: {}, ariaLabel: 'Views over time' } } );
		expect( wrapper.attributes( 'role' ) ).toBe( 'img' );
		expect( wrapper.attributes( 'aria-label' ) ).toBe( 'Views over time' );
	} );
} );
