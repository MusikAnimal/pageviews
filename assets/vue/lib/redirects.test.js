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
				// eslint-disable-next-line camelcase -- field name from the API contract
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
