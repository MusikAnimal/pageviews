import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from './settings.js';

describe( 'settings store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'populates the date params from the query string', () => {
		const store = useSettingsStore();
		store.setFromQuery( {
			start: '2026-06-01',
			end: '2026-06-30'
		} );
		expect( store.start ).toBe( '2026-06-01' );
		expect( store.end ).toBe( '2026-06-30' );
		expect( store.dateType ).toBe( 'daily' );
	} );

	it( 'detects monthly ranges from YYYY-MM dates', () => {
		const store = useSettingsStore();
		store.setFromQuery( { start: '2026-01', end: '2026-06' } );
		expect( store.dateType ).toBe( 'monthly' );
	} );

	it( 'converts dates to YYYY-MM when switching to monthly', async () => {
		vi.useFakeTimers();
		vi.setSystemTime( new Date( '2026-07-21T12:00:00Z' ) );

		const store = useSettingsStore();
		store.setFromQuery( { start: '2026-05-10', end: '2026-07-15' } );
		store.dateType = 'monthly';
		await nextTick();
		expect( store.start ).toBe( '2026-05' );
		// Clamped: July isn't a complete month yet.
		expect( store.end ).toBe( '2026-06' );
		expect( store.query.start ).toBe( '2026-05' );

		vi.useRealTimers();
	} );

	it( 'defaults to the past six months when switching to monthly without dates', () => {
		vi.useFakeTimers();
		vi.setSystemTime( new Date( '2026-07-21T12:00:00Z' ) );

		const store = useSettingsStore();
		store.dateType = 'monthly';
		expect( store.start ).toBe( '2026-01' );
		expect( store.end ).toBe( '2026-06' );

		vi.useRealTimers();
	} );

	it( 'applies presets as months in monthly mode', () => {
		vi.useFakeTimers();
		vi.setSystemTime( new Date( '2026-07-21T12:00:00Z' ) );

		const store = useSettingsStore();
		store.setFromQuery( { start: '2026-01', end: '2026-03' } );
		expect( store.dateType ).toBe( 'monthly' );

		store.setSpecialRange( 'last-year' );
		expect( store.start ).toBe( '2025-01' );
		expect( store.end ).toBe( '2025-12' );
		expect( store.dateType ).toBe( 'monthly' );

		// Clamped to the last complete month.
		store.setSpecialRange( 'all-time' );
		expect( store.start ).toBe( '2015-07' );
		expect( store.end ).toBe( '2026-06' );

		vi.useRealTimers();
	} );

	it( 'converts months back to full dates when switching to daily', async () => {
		vi.useFakeTimers();
		vi.setSystemTime( new Date( '2026-07-21T12:00:00Z' ) );

		const store = useSettingsStore();
		store.setFromQuery( { start: '2026-05', end: '2026-07' } );
		store.dateType = 'daily';
		await nextTick();
		expect( store.start ).toBe( '2026-05-01' );
		// End of month, clamped to yesterday.
		expect( store.end ).toBe( '2026-07-20' );

		vi.useRealTimers();
	} );

	it( 'ignores invalid values, keeping defaults', () => {
		const store = useSettingsStore();
		store.setFromQuery( { start: 'yesterday' } );
		expect( store.start ).toBe( '' );
	} );

	it( 'serializes params for the URL, omitting empty dates', () => {
		const store = useSettingsStore();
		expect( store.query ).toEqual( {
			range: undefined,
			start: undefined,
			end: undefined
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
			start: '2026-05',
			end: '2026-06'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );
} );
