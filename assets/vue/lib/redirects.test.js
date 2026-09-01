import { afterEach, describe, expect, it, vi } from 'vitest';
import { consolidateSeries, getRedirects } from './redirects.js';

afterEach( () => {
	vi.unstubAllGlobals();
} );

describe( 'getRedirects', () => {
	it( 'maps redirects to their targets, with fragments', async () => {
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( {
				query: {
					pages: [
						{
							title: 'Cat',
							redirects: [
								{ title: 'Cats' },
								{ title: 'Felines', fragment: 'Domestic' }
							]
						},
						{ title: 'Dog' }
					]
				}
			} )
		} ) ) );

		expect( await getRedirects( 'en.wikipedia.org', [ 'Cat', 'Dog' ] ) ).toEqual( {
			Cat: [
				{ title: 'Cats', fragment: null },
				{ title: 'Felines', fragment: 'Domestic' }
			],
			Dog: []
		} );
	} );

	it( 'chunks large title sets at the Action API limit', async () => {
		const impl = vi.fn( () => Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( { query: { pages: [] } } )
		} ) );
		vi.stubGlobal( 'fetch', impl );
		const titles = Array.from( { length: 120 }, ( _, i ) => `Page ${ i }` );

		const map = await getRedirects( 'en.wikipedia.org', titles );

		expect( impl ).toHaveBeenCalledTimes( 3 );
		expect( Object.keys( map ) ).toHaveLength( 120 );
		// Each request carries at most 50 titles.
		const url = new URL( String( impl.mock.calls[ 0 ][ 0 ] ) );
		expect( url.searchParams.get( 'titles' ).split( '|' ) ).toHaveLength( 50 );
	} );
} );

describe( 'consolidateSeries', () => {
	const redirectMap = { Cat: [ { title: 'Cats', fragment: null } ], Dog: [] };
	const pages = [
		{ title: 'Cat', counts: [ 10, 20 ], total: 30, average: 15 },
		{ title: 'Cats', counts: [ 1, 2 ], total: 3, average: 1.5 },
		{ title: 'Dog', counts: [ 5, 5 ], total: 10, average: 5 }
	];

	it( 'sums redirect series into targets and drops redirect rows', () => {
		const result = consolidateSeries( [ 'Cat', 'Dog' ], redirectMap, pages );

		expect( result ).toHaveLength( 2 );
		expect( result[ 0 ] ).toMatchObject( {
			title: 'Cat',
			counts: [ 11, 22 ],
			total: 33,
			average: 16.5,
			consolidatedFrom: [ 'Cats' ]
		} );
		expect( result[ 1 ] ).toMatchObject( {
			title: 'Dog',
			counts: [ 5, 5 ],
			total: 10,
			consolidatedFrom: []
		} );
	} );

	it( 'ignores redirects with no data', () => {
		const result = consolidateSeries(
			[ 'Cat' ],
			{ Cat: [ { title: 'Ghost', fragment: null } ] },
			[
				{ title: 'Cat', counts: [ 10 ], total: 10, average: 10 },

				{ title: 'Ghost', counts: [ 0 ], total: 0, average: 0, no_data: true }
			]
		);
		expect( result[ 0 ].counts ).toEqual( [ 10 ] );
		expect( result[ 0 ].consolidatedFrom ).toEqual( [] );
	} );

	it( 'does not mutate its inputs', () => {
		consolidateSeries( [ 'Cat', 'Dog' ], redirectMap, pages );
		expect( pages[ 0 ].counts ).toEqual( [ 10, 20 ] );
	} );
} );
