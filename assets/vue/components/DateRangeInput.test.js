import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DateRangeInput from './DateRangeInput.vue';
import { useSettingsStore } from '../stores/settings.js';
import { supportsInputType } from '../lib/browser.js';

vi.mock( '../lib/browser.js', () => ( {
	supportsInputType: vi.fn()
} ) );

function mountInput() {
	return mount( DateRangeInput, {
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'DateRangeInput without native month support', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
		supportsInputType.mockReturnValue( false );
		store = useSettingsStore();
		store.setFromQuery( { start: '2026-01', end: '2026-05' } );
	} );

	it( 'buffers keystrokes and reverts an invalid value on change', async () => {
		const wrapper = mountInput();
		const input = wrapper.find( '.app-settings__dates-inputs__start input' );

		// Free editing (e.g. backspacing) never touches the store.
		await input.setValue( '2026-0' );
		expect( store.start ).toBe( '2026-01' );
		await input.setValue( 'garbage' );
		expect( store.start ).toBe( '2026-01' );

		await input.trigger( 'change' );

		expect( store.start ).toBe( '2026-01' );
		expect( input.element.value ).toBe( '2026-01' );
	} );

	it( 'commits a valid month on change', async () => {
		const wrapper = mountInput();
		const input = wrapper.find( '.app-settings__dates-inputs__start input' );

		await input.setValue( '2025-11' );
		await input.trigger( 'change' );

		expect( store.start ).toBe( '2025-11' );
	} );

	it( 'clamps out-of-range months to the allowed bounds', async () => {
		const wrapper = mountInput();
		const input = wrapper.find( '.app-settings__dates-inputs__start input' );

		await input.setValue( '2010-01' );
		await input.trigger( 'change' );

		// Pageviews data begins July 2015.
		expect( store.start ).toBe( '2015-07' );
		expect( input.element.value ).toBe( '2015-07' );
	} );

	it( 'rejects an impossible month like 2026-13', async () => {
		const wrapper = mountInput();
		const input = wrapper.find( '.app-settings__dates-inputs__end input' );

		await input.setValue( '2026-13' );
		await input.trigger( 'blur' );

		expect( store.end ).toBe( '2026-05' );
		expect( input.element.value ).toBe( '2026-05' );
	} );

	it( 'writes straight through with native support', async () => {
		supportsInputType.mockReturnValue( true );
		const wrapper = mountInput();
		const input = wrapper.find( '.app-settings__dates-inputs__start input' );

		await input.setValue( '2025-11' );

		expect( store.start ).toBe( '2025-11' );
	} );
} );
