import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEditData, fetchPageviews, trimIncompleteTail } from './metricsApi.js';
import { getToken, refreshToken } from './apiToken.js';

vi.mock( './apiToken.js', () => ( {
	getToken: vi.fn( () => 'tok-1' ),
	refreshToken: vi.fn()
} ) );

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
	// Keeps mock implementations, resets call counts between tests.
	vi.clearAllMocks();
} );

describe( 'apiGet auth', () => {
	const okResponse = {
		ok: true,
		status: 200,
		json: () => Promise.resolve( chunkResponse( [ 'Cat' ] ) )
	};
	const unauthorized = {
		ok: false,
		status: 401,
		json: () => Promise.resolve( { error: {
			code: 'auth_expired', message: 'expired', i18n: [ 'api-error-auth' ]
		} } )
	};

	it( 'sends the access token on every request', async () => {
		const impl = vi.fn( () => Promise.resolve( okResponse ) );
		vi.stubGlobal( 'fetch', impl );

		await fetchPageviews( {
			project: 'en.wikipedia', pages: [ 'Cat' ], start: '2026-07-01', end: '2026-07-02'
		} );

		expect( impl.mock.calls[ 0 ][ 1 ].headers ).toEqual( {
			'X-Api-Token': 'tok-1'
		} );
	} );

	it( 'renews once on 401 and replays the request', async () => {
		const impl = vi.fn()
			.mockResolvedValueOnce( unauthorized )
			.mockResolvedValueOnce( okResponse );
		vi.stubGlobal( 'fetch', impl );
		refreshToken.mockResolvedValue( 'tok-2' );

		const result = await fetchPageviews( {
			project: 'en.wikipedia', pages: [ 'Cat' ], start: '2026-07-01', end: '2026-07-02'
		} );

		expect( refreshToken ).toHaveBeenCalledOnce();
		expect( impl ).toHaveBeenCalledTimes( 2 );
		expect( result.pages ).toHaveLength( 1 );
	} );

	it( 'surfaces the auth envelope when the replay fails too', async () => {
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( unauthorized ) ) );
		refreshToken.mockResolvedValue( 'tok-2' );

		await expect( fetchPageviews( {
			project: 'en.wikipedia', pages: [ 'Cat' ], start: '2026-07-01', end: '2026-07-02'
		} ) ).rejects.toMatchObject( { code: 'auth_expired', i18n: [ 'api-error-auth' ] } );
		// One renewal only — no loops.
		expect( refreshToken ).toHaveBeenCalledOnce();
	} );

	it( 'surfaces the original 401 when renewal itself fails', async () => {
		vi.stubGlobal( 'fetch', vi.fn( () => Promise.resolve( unauthorized ) ) );
		refreshToken.mockRejectedValue( new Error( 'renewal down' ) );

		await expect( fetchPageviews( {
			project: 'en.wikipedia', pages: [ 'Cat' ], start: '2026-07-01', end: '2026-07-02'
		} ) ).rejects.toMatchObject( { code: 'auth_expired' } );
		expect( getToken ).toHaveBeenCalled();
	} );
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

		// Chunks are sized for ~12 progress ticks: 120 pages => 12
		// chunks of 10.
		expect( impl ).toHaveBeenCalledTimes( 12 );
		expect( progress ).toContainEqual( [ 12, 12 ] );
		expect( result.pages ).toHaveLength( 120 );
		// Totals are recomputed across all chunks: 120 * [1, 2].
		expect( result.totals.counts ).toEqual( [ 120, 240 ] );
		expect( result.totals.total ).toBe( 360 );
	} );

	it( 'clamps the dynamic chunk size between 5 and the server cap', async () => {
		const sizes = [];
		const impl = vi.fn( ( url ) => {
			const requested = new URL( url, 'http://localhost' )
				.searchParams.get( 'pages' ).split( '|' );
			sizes.push( requested.length );
			return Promise.resolve( {
				ok: true,
				json: () => Promise.resolve( chunkResponse( requested ) )
			} );
		} );
		vi.stubGlobal( 'fetch', impl );
		const query = ( length ) => fetchPageviews( {
			project: 'en.wikipedia',
			pages: Array.from( { length }, ( _, i ) => `Page ${ i }` ),
			start: '2026-07-01',
			end: '2026-07-02'
		} );

		// Tiny sets never go below 5 pages per chunk.
		await query( 20 );
		expect( sizes ).toEqual( [ 5, 5, 5, 5 ] );

		// Large sets never exceed the server's 50-page cap.
		sizes.length = 0;
		await query( 1000 );
		expect( Math.max( ...sizes ) ).toBe( 50 );
		expect( sizes ).toHaveLength( 20 );
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

	it( 'keeps a partially-published day, ending the affected series early', () => {
		// en.wikipedia is populated for the last day, de/fr aren't yet:
		// the date is real data for one series, so it is not dropped —
		// the signal fires, and the unpublished series' trailing zero
		// becomes a chart gap with the day excluded from its average.
		const input = data( [ 10, 20, 30 ], [ 1, 2, 0 ] );
		const trimmed = trimIncompleteTail( input );
		expect( trimmed.trimmedDate ).toBe( '2026-07-21' );
		expect( trimmed.dates ).toBeUndefined();
		expect( trimmed.totals ).toBeUndefined();
		expect( trimmed.series[ 0 ].counts ).toEqual( [ 10, 20, 30 ] );
		expect( trimmed.series[ 1 ].counts ).toEqual( [ 1, 2, null ] );
		expect( trimmed.series[ 1 ].average ).toBe( 1.5 );
	} );

	it( 'keeps a genuine zero day (previous day also zero)', () => {
		expect( trimIncompleteTail( data( [ 10, 0, 0 ], [ 1, 0, 0 ] ) ) ).toBeNull();
	} );

	it( 'detects on the probe series when they differ from the shown ones', () => {
		// Redirect consolidation: Cat's own last day is unpublished but
		// an early-published redirect contributed, so the consolidated
		// sum masks the zero — the raw target series does not.
		const input = data( [ 10, 20, 2 ], [ 1, 2, 3 ] );
		expect( trimIncompleteTail( input ) ).toBeNull();

		const probed = trimIncompleteTail( {
			...input,
			probe: [ { title: 'Cat', counts: [ 10, 18, 0 ], total: 28, average: 0 } ]
		} );
		expect( probed.trimmedDate ).toBe( '2026-07-21' );
		// The shown data has real counts for the day: warn, no trim.
		expect( probed.series ).toBeUndefined();
	} );

	it( 'keeps a non-zero trailing day', () => {
		expect( trimIncompleteTail( data( [ 10, 20, 30 ], [ 1, 2, 3 ] ) ) ).toBeNull();
	} );

	it( 'never trims a single-day axis', () => {
		expect( trimIncompleteTail( data( [ 0 ], [ 0 ] ) ) ).toBeNull();
	} );
} );
