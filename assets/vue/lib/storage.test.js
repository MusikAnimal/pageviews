import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { cacheGet, cacheSet, persistentRef } from './storage.js';

beforeEach( () => {
	localStorage.clear();
} );

describe( 'persistentRef', () => {
	it( 'uses the default when nothing is stored', () => {
		expect( persistentRef( 'pageviews-settings-test', 'fallback' ).value ).toBe( 'fallback' );
	} );

	it( 'restores a stored value', () => {
		localStorage.setItem( 'pageviews-settings-test', JSON.stringify( { a: 1 } ) );
		expect( persistentRef( 'pageviews-settings-test', {} ).value ).toEqual( { a: 1 } );
	} );

	it( 'persists changes, including deep ones', async () => {
		const value = persistentRef( 'pageviews-settings-test', { count: 0 } );
		value.value.count = 5;
		await nextTick();
		expect( JSON.parse( localStorage.getItem( 'pageviews-settings-test' ) ) )
			.toEqual( { count: 5 } );
	} );

	it( 'falls back to the default on corrupt storage', () => {
		localStorage.setItem( 'pageviews-settings-test', '{not json' );
		expect( persistentRef( 'pageviews-settings-test', 'fallback' ).value ).toBe( 'fallback' );
	} );
} );

describe( 'cache', () => {
	beforeEach( () => {
		vi.useFakeTimers();
	} );

	afterEach( () => {
		vi.useRealTimers();
	} );

	it( 'round-trips within the TTL', () => {
		cacheSet( 'query', { rows: [ 1, 2 ] } );
		expect( cacheGet( 'query' ) ).toEqual( { rows: [ 1, 2 ] } );
	} );

	it( 'expires after the TTL', () => {
		cacheSet( 'query', 'value', 10 );
		vi.advanceTimersByTime( 11 * 60 * 1000 );
		expect( cacheGet( 'query' ) ).toBeNull();
		// The expired entry is also removed from storage.
		expect( localStorage.getItem( 'pv-cache-query' ) ).toBeNull();
	} );

	it( 'misses on unknown keys', () => {
		expect( cacheGet( 'never-set' ) ).toBeNull();
	} );
} );
