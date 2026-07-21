import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from './settings.js';

describe( 'settings store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'populates all params from the query string', () => {
		const store = useSettingsStore();
		store.setFromQuery( {
			project: 'de.wikipedia.org',
			start: '2026-06-01',
			end: '2026-06-30',
			platform: 'desktop',
			agent: 'spider'
		} );
		expect( store.project ).toBe( 'de.wikipedia.org' );
		expect( store.start ).toBe( '2026-06-01' );
		expect( store.end ).toBe( '2026-06-30' );
		expect( store.dateType ).toBe( 'daily' );
		expect( store.platform ).toBe( 'desktop' );
		expect( store.agent ).toBe( 'spider' );
	} );

	it( 'detects monthly ranges from YYYY-MM dates', () => {
		const store = useSettingsStore();
		store.setFromQuery( { start: '2026-01', end: '2026-06' } );
		expect( store.dateType ).toBe( 'monthly' );
	} );

	it( 'ignores invalid values, keeping defaults', () => {
		const store = useSettingsStore();
		store.setFromQuery( {
			start: 'yesterday',
			platform: 'gopher',
			agent: 'alien'
		} );
		expect( store.start ).toBe( '' );
		expect( store.platform ).toBe( 'all' );
		expect( store.agent ).toBe( 'user' );
	} );

	it( 'serializes params for the URL, omitting empty dates', () => {
		const store = useSettingsStore();
		expect( store.query ).toEqual( {
			project: 'en.wikipedia.org',
			start: undefined,
			end: undefined,
			platform: 'all',
			agent: 'user'
		} );
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useSettingsStore();
		store.setFromQuery( {
			project: 'commons.wikimedia.org',
			start: '2026-05',
			end: '2026-06',
			platform: 'mobile-web',
			agent: 'all'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );
} );
