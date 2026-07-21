import { beforeEach, describe, expect, it, vi } from 'vitest';
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

	it( 'resolves range params to concrete dates, keeping range in the URL', () => {
		vi.useFakeTimers();
		vi.setSystemTime( new Date( '2026-07-21T12:00:00Z' ) );

		const store = useSettingsStore();
		store.setFromQuery( { range: 'latest-20' } );
		expect( store.start ).toBe( '2026-07-01' );
		expect( store.end ).toBe( '2026-07-20' );
		// Like the legacy tool, the URL carries range, not start/end.
		expect( store.query.range ).toBe( 'latest-20' );
		expect( store.query.start ).toBeUndefined();
		expect( store.query.end ).toBeUndefined();

		vi.useRealTimers();
	} );

	it( 'drops the range once dates are edited manually', () => {
		const store = useSettingsStore();
		store.setSpecialRange( 'last-month' );
		expect( store.query.range ).toBe( 'last-month' );

		store.start = '2026-01-01';
		expect( store.specialRange ).toBeNull();
		expect( store.query.range ).toBeUndefined();
		expect( store.query.start ).toBe( '2026-01-01' );
	} );

	it( 'rejects unknown range names', () => {
		const store = useSettingsStore();
		expect( store.setSpecialRange( 'fortnight' ) ).toBe( false );
		expect( store.specialRange ).toBeNull();
	} );

	it( 'applies default dates only when unset', () => {
		const store = useSettingsStore();
		store.ensureDefaultDates();
		expect( store.start ).toMatch( /^\d{4}-\d{2}-\d{2}$/ );

		store.setFromQuery( { start: '2026-01-01', end: '2026-01-31' } );
		store.ensureDefaultDates();
		expect( store.start ).toBe( '2026-01-01' );
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
