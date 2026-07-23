import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEditData, fetchPageviews, trimIncompleteTail } from './metricsApi.js';

function chunkResponse( titles ) {
	return {
		project: 'en.wikipedia',
		dates: [ '2026-07-01', '2026-07-02' ],
		pages: titles.map( ( title ) => ( {
			title, counts: [ 1, 2 ], total: 3, average: 1.5
		} ) ),
		totals: { counts: [ titles.length, 2 * titles.length ], total: 3 * titles.length }
	};
}

afterEach( () => {
	vi.unstubAllGlobals();
} );

describe( 'fetchPageviews', () => {
	it( 'fetches a single chunk directly', async () => {
		const impl = vi.fn( () => Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( chunkResponse( [ 'Cat' ] ) )
		} ) );
		vi.stubGlobal( 'fetch', impl );

		const result = await fetchPageviews( {
			project: 'en.wikipedia',
			pages: [ 'Cat' ],
			start: '2026-07-01',
			end: '2026-07-02'
		} );

		expect( impl ).toHaveBeenCalledOnce();
		const url = new URL( impl.mock.calls[ 0 ][ 0 ], 'http://localhost' );
		expect( url.pathname ).toBe( '/api/metrics/pageviews/en.wikipedia' );
		expect( url.searchParams.get( 'pages' ) ).toBe( 'Cat' );
		expect( result.pages ).toHaveLength( 1 );
	} );

	it( 'chunks large lists, reports progress, and merges results', async () => {
		const progress = [];
		const impl = vi.fn( ( url ) => {
			const requested = new URL( url, 'http://localhost' )
				.searchParams.get( 'pages' ).split( '|' );
			return Promise.resolve( {
				ok: true,
				json: () => Promise.resolve( chunkResponse( requested ) )
			} );
		} );
		vi.stubGlobal( 'fetch', impl );

		const pages = Array.from( { length: 120 }, ( _, i ) => `Page ${ i }` );
		const result = await fetchPageviews( {
			project: 'en.wikipedia',
			pages,
			start: '2026-07-01',
			end: '2026-07-02',
			onProgress: ( done, total ) => progress.push( [ done, total ] )
		} );

		// 120 pages => chunks of 50 + 50 + 20.
		expect( impl ).toHaveBeenCalledTimes( 3 );
		expect( progress ).toContainEqual( [ 3, 3 ] );
		expect( result.pages ).toHaveLength( 120 );
		// Totals are recomputed across all chunks: 120 * [1, 2].
		expect( result.totals.counts ).toEqual( [ 120, 240 ] );
		expect( result.totals.total ).toBe( 360 );
	} );

	it( 'surfaces the error envelope as ApiError', async () => {
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( {
			ok: false,
			status: 400,
			json: () => Promise.resolve( {
				error: { code: 'too_many_pages', message: 'Too many.', i18n: [ 'param-error-3', 'pages' ] }
			} )
		} ) ) );

		await expect( fetchPageviews( {
			project: 'en.wikipedia',
			pages: [ 'Cat' ],
			start: '2026-07-01',
			end: '2026-07-02'
		} ) ).rejects.toMatchObject( {
			name: 'ApiError',
			code: 'too_many_pages',
			i18n: [ 'param-error-3', 'pages' ]
		} );
	} );

	it( 'fetches edit data from the pages endpoint', async () => {
		const impl = vi.fn( () => Promise.resolve( {
			ok: true,
			json: () => Promise.resolve( { pages: { Cat: { num_edits: '1' } } } )
		} ) );
		vi.stubGlobal( 'fetch', impl );

		const result = await fetchEditData( {
			project: 'en.wikipedia.org',
			pages: [ 'Cat', 'Dog' ],
			start: '2026-07-01',
			end: '2026-07-02'
		} );

		const url = new URL( impl.mock.calls[ 0 ][ 0 ], 'http://localhost' );
		expect( url.pathname ).toBe( '/api/pages/en.wikipedia.org/edits' );
		expect( url.searchParams.get( 'pages' ) ).toBe( 'Cat|Dog' );
		expect( url.searchParams.get( 'totals' ) ).toBe( '1' );
		expect( result.pages.Cat.num_edits ).toBe( '1' );
	} );

	it( 'copes with non-JSON error responses', async () => {
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( {
			ok: false,
			status: 502,
			json: () => Promise.reject( new SyntaxError( 'not json' ) )
		} ) ) );

		await expect( fetchPageviews( {
			project: 'en.wikipedia',
			pages: [ 'Cat' ],
			start: '2026-07-01',
			end: '2026-07-02'
		} ) ).rejects.toMatchObject( { name: 'ApiError', retryable: true } );
	} );
} );

describe( 'trimIncompleteTail', () => {
	const data = ( counts1, counts2 ) => {
		const totals = counts1.map( ( value, i ) => value + counts2[ i ] );
		return {
			dates: [ '2026-07-19', '2026-07-20', '2026-07-21' ].slice( 0, counts1.length ),
			series: [
				{ title: 'Cat', counts: counts1, total: counts1.reduce( ( a, b ) => a + b ), average: 0 },
				{ title: 'Dog', counts: counts2, total: counts2.reduce( ( a, b ) => a + b ), average: 0 }
			],
			totals: { counts: totals, total: totals.reduce( ( a, b ) => a + b ), average: 0 }
		};
	};

	it( 'drops an all-zero trailing day after a non-zero one', () => {
		const trimmed = trimIncompleteTail( data( [ 10, 20, 0 ], [ 1, 2, 0 ] ) );
		expect( trimmed.trimmedDate ).toBe( '2026-07-21' );
		expect( trimmed.dates ).toEqual( [ '2026-07-19', '2026-07-20' ] );
		expect( trimmed.series[ 0 ].counts ).toEqual( [ 10, 20 ] );
		expect( trimmed.totals.counts ).toEqual( [ 11, 22 ] );
		// Averages recomputed over the shorter axis.
		expect( trimmed.series[ 0 ].average ).toBe( 15 );
		expect( trimmed.totals.average ).toBe( 16.5 );
	} );

	it( 'warns without trimming when only some series are missing the day', () => {
		// en.wikipedia is populated for the last day, de/fr aren't yet:
		// the date is real data for one series, so nothing is dropped —
		// but the signal still fires so the UI can warn.
		const input = data( [ 10, 20, 30 ], [ 1, 2, 0 ] );
		const trimmed = trimIncompleteTail( input );
		expect( trimmed.trimmedDate ).toBe( '2026-07-21' );
		expect( trimmed.dates ).toBeUndefined();
		expect( trimmed.series ).toBeUndefined();
		expect( trimmed.totals ).toBeUndefined();
	} );

	it( 'keeps a genuine zero day (previous day also zero)', () => {
		expect( trimIncompleteTail( data( [ 10, 0, 0 ], [ 1, 0, 0 ] ) ) ).toBeNull();
	} );

	it( 'keeps a non-zero trailing day', () => {
		expect( trimIncompleteTail( data( [ 10, 20, 30 ], [ 1, 2, 3 ] ) ) ).toBeNull();
	} );

	it( 'never trims a single-day axis', () => {
		expect( trimIncompleteTail( data( [ 0 ], [ 0 ] ) ) ).toBeNull();
	} );
} );
