import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { CdxMenuButton } from '@wikimedia/codex';
import ExportMenu from './ExportMenu.vue';
import { downloadFile } from '../lib/download.js';

vi.mock( '../lib/download.js', () => ( {
	downloadFile: vi.fn()
} ) );

const toastSuccess = vi.hoisted( () => vi.fn() );
vi.mock( '@wikimedia/codex', async ( importOriginal ) => ( {
	...await importOriginal(),
	useToast: () => ( { success: toastSuccess } )
} ) );

const props = {
	dates: [ '2026-07-01', '2026-07-02' ],
	series: [
		{ title: 'Cat', counts: [ 10, 20 ], total: 30, average: 15 },
		{ title: 'Dog, the "best"', counts: [ 1, 2 ], total: 3, average: 1.5 }
	],
	filename: 'pageviews-2026-07-01-2026-07-02'
};

const globalConfig = {
	config: {
		globalProperties: { $i18n: ( key ) => key }
	}
};

function select( wrapper, value ) {
	return wrapper.findComponent( CdxMenuButton ).vm.$emit( 'update:selected', value );
}

describe( 'ExportMenu', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	afterEach( () => {
		vi.unstubAllGlobals();
	} );

	it( 'exports CSV with dates as rows and pages as columns', () => {
		const wrapper = mount( ExportMenu, { props, global: globalConfig } );
		select( wrapper, 'csv' );

		expect( downloadFile ).toHaveBeenCalledWith(
			'pageviews-2026-07-01-2026-07-02.csv',
			'Date,Cat,"Dog, the ""best"""\n2026-07-01,10,1\n2026-07-02,20,2',
			'text/csv'
		);
	} );

	it( 'exports JSON keyed by date', () => {
		const wrapper = mount( ExportMenu, { props, global: globalConfig } );
		select( wrapper, 'json' );

		const [ filename, content, type ] = downloadFile.mock.calls[ 0 ];
		expect( filename ).toBe( 'pageviews-2026-07-01-2026-07-02.json' );
		expect( type ).toBe( 'application/json' );
		expect( JSON.parse( content )[ 0 ] ).toEqual( {
			title: 'Cat',
			total: 30,
			average: 15,
			views: { '2026-07-01': 10, '2026-07-02': 20 }
		} );
	} );

	it( 'offers PNG only when a chart source is provided', () => {
		const without = mount( ExportMenu, { props, global: globalConfig } );
		expect( without.findComponent( CdxMenuButton ).props( 'menuItems' )
			.map( ( item ) => item.value ) ).not.toContain( 'png' );

		const withPng = mount( ExportMenu, {
			global: globalConfig,
			props: { ...props, getPng: () => 'data:image/png;base64,x' }
		} );
		expect( withPng.findComponent( CdxMenuButton ).props( 'menuItems' )
			.map( ( item ) => item.value ) ).toContain( 'png' );
	} );

	it( 'has a dedicated permalink button that copies and toasts', async () => {
		const writeText = vi.fn( () => Promise.resolve() );
		vi.stubGlobal( 'navigator', { clipboard: { writeText } } );

		const wrapper = mount( ExportMenu, { props, global: globalConfig } );

		// Permalink is not a download menu entry.
		expect( wrapper.findComponent( CdxMenuButton ).props( 'menuItems' )
			.map( ( item ) => item.value ) ).not.toContain( 'permalink' );

		await wrapper.find( '.app-export__permalink' ).trigger( 'click' );
		await vi.waitFor( () => expect( toastSuccess ).toHaveBeenCalled() );

		expect( writeText ).toHaveBeenCalledWith( location.href );
		expect( toastSuccess ).toHaveBeenCalledWith(
			'Permalink copied to clipboard',
			{ autoDismiss: true }
		);
	} );
} );
