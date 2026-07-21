import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePageviewsStore } from './pageviews.js';

describe( 'pageviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'parses pipe-delimited pages from the query string', () => {
		const store = usePageviewsStore();
		store.setFromQuery( { pages: 'Cat|Dog' } );
		expect( store.pages ).toEqual( [ 'Cat', 'Dog' ] );
	} );

	it( 'serializes pages pipe-delimited and omits empty params', () => {
		const store = usePageviewsStore();
		store.pages = [ 'Cat', 'Dog' ];
		expect( store.query.pages ).toBe( 'Cat|Dog' );
		expect( store.query.redirects ).toBeUndefined();

		store.pages = [];
		expect( store.query.pages ).toBeUndefined();
	} );

	it( 'round-trips its own query serialization', () => {
		const store = usePageviewsStore();
		store.setFromQuery( { pages: 'Cat|Dog', redirects: '1' } );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'parses the redirects param', () => {
		const store = usePageviewsStore();
		store.setFromQuery( { pages: 'Cat', redirects: '1' } );
		expect( store.redirects ).toBe( true );
		store.setFromQuery( { pages: 'Cat' } );
		expect( store.redirects ).toBe( false );
	} );

	it( 'ignores empty page names', () => {
		const store = usePageviewsStore();
		store.setFromQuery( { pages: 'Cat||Dog|' } );
		expect( store.pages ).toEqual( [ 'Cat', 'Dog' ] );
	} );
} );
