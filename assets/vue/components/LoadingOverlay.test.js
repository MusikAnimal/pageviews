import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoadingOverlay from './LoadingOverlay.vue';

function mountOverlay( props = {} ) {
	return mount( LoadingOverlay, {
		props,
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key === 'loading' ? 'Loading...' : key }
			}
		}
	} );
}

describe( 'LoadingOverlay', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.useFakeTimers();
	} );

	afterEach( () => {
		vi.useRealTimers();
	} );

	it( 'counts up from the first second when the timer is on', async () => {
		const wrapper = mountOverlay( { showTimer: true } );
		const label = () => wrapper.find( '.app-progress-bar__loading' ).text();

		expect( label() ).toBe( 'Loading...' );
		await vi.advanceTimersByTimeAsync( 1000 );
		expect( label() ).toBe( 'Loading... 0:01' );
		await vi.advanceTimersByTimeAsync( 1000 );
		expect( label() ).toBe( 'Loading... 0:02' );
		await vi.advanceTimersByTimeAsync( 63000 );
		expect( label() ).toBe( 'Loading... 1:05' );
	} );

	it( 'shows no timer by default', async () => {
		const wrapper = mountOverlay();

		await vi.advanceTimersByTimeAsync( 2000 );

		expect( wrapper.find( '.app-progress-bar__loading' ).text() ).toBe( 'Loading...' );
	} );
} );
