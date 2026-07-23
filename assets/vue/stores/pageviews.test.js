import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePageviewsStore } from './pageviews.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';
import { ApiError } from '../lib/errors.js';
import { fetchEditData, fetchPageviews, fetchTopviews } from '../lib/metricsApi.js';
import { getRedirects } from '../lib/redirects.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	// trimIncompleteTail stays real (pure, tested separately).
	...await importOriginal(),
	fetchPageviews: vi.fn(),
	fetchEditData: vi.fn( () => Promise.resolve( { pages: {} } ) ),
	fetchTopviews: vi.fn( () => Promise.resolve( { articles: [] } ) )
} ) );
vi.mock( '../lib/mwApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getPageInfo: vi.fn( () => Promise.resolve( {} ) )
} ) );
vi.mock( '../lib/redirects.js', async ( importOriginal ) => ( {
	// consolidateSeries stays real (pure, tested separately).
	...await importOriginal(),
	getRedirects: vi.fn()
} ) );

function metricsResult( pages ) {
	const dates = [ '2026-07-01', '2026-07-02' ];
	const totals = { counts: [ 0, 0 ], total: 0, average: 0 };
	for ( const page of pages ) {
		page.counts.forEach( ( count, i ) => {
			totals.counts[ i ] += count;
		} );
		totals.total += page.total;
	}
	return { dates, pages, totals };
}

describe( 'pageviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'parses pipe-delimited pages from the query string', () => {
		const store = usePageviewsStore();
		store.setFromQuery( { pages: 'Cat|Dog' } );
		expect( store.pages ).toEqual( [ 'Cat', 'Dog' ] );
	} );

	it( 'parses project, platform and agent, ignoring invalid values', () => {
		const store = usePageviewsStore();
		store.setFromQuery( {
			project: 'de.wikipedia.org',
			platform: 'desktop',
			agent: 'spider'
		} );
		expect( store.project ).toBe( 'de.wikipedia.org' );
		expect( store.platform ).toBe( 'desktop' );
		expect( store.agent ).toBe( 'spider' );

		store.setFromQuery( { platform: 'gopher', agent: 'alien' } );
		expect( store.platform ).toBe( 'desktop' );
		expect( store.agent ).toBe( 'spider' );
	} );

	it( 'accepts the interim all alias for platform and agent', () => {
		const store = usePageviewsStore();
		store.setFromQuery( { platform: 'all', agent: 'all' } );
		expect( store.platform ).toBe( 'all-access' );
		expect( store.agent ).toBe( 'all-agents' );
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
		store.setFromQuery( { pages: 'Cat|Dog', redirects: '1', autolog: 'false' } );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'carries autolog in the URL only when disabled', () => {
		const store = usePageviewsStore();
		expect( store.autolog ).toBe( true );
		expect( store.query.autolog ).toBeUndefined();

		store.setFromQuery( { autolog: 'false' } );
		expect( store.autolog ).toBe( false );
		expect( store.query.autolog ).toBe( 'false' );
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

	it( 'keeps the pages array identity when the query is unchanged', () => {
		const store = usePageviewsStore();
		store.setFromQuery( { pages: 'Cat|Dog' } );
		const before = store.pages;
		// Same params again (e.g. navigating to the FAQ dialog route)
		// must not replace the array, or the load watcher re-fires.
		store.setFromQuery( { pages: 'Cat|Dog' } );
		expect( store.pages ).toBe( before );
	} );

	describe( 'load', () => {
		it( 'fetches series and applies default dates', async () => {
			const store = usePageviewsStore();
			const settings = useSettingsStore();
			store.pages = [ 'Cat' ];
			fetchPageviews.mockResolvedValue( metricsResult( [
				{ title: 'Cat', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );

			await store.load();

			// ensureDefaultDates kicked in (latest-30).
			expect( settings.start ).toMatch( /^\d{4}-\d{2}-\d{2}$/ );
			expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
				project: 'en.wikipedia.org',
				pages: [ 'Cat' ],
				granularity: 'daily'
			} ) );
			expect( getRedirects ).not.toHaveBeenCalled();
			expect( store.status ).toBe( 'complete' );
			expect( store.dates ).toEqual( [ '2026-07-01', '2026-07-02' ] );
			expect( store.series ).toHaveLength( 1 );
			expect( store.totals.total ).toBe( 3 );
		} );

		it( 'expands and consolidates redirects when enabled', async () => {
			const store = usePageviewsStore();
			store.setFromQuery( { pages: 'Cat', redirects: '1' } );
			getRedirects.mockResolvedValue( { Cat: [ { title: 'Cats', fragment: null } ] } );
			fetchPageviews.mockResolvedValue( metricsResult( [
				{ title: 'Cat', counts: [ 10, 20 ], total: 30, average: 15 },
				{ title: 'Cats', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );

			await store.load();

			expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
				pages: [ 'Cat', 'Cats' ]
			} ) );
			expect( store.series ).toHaveLength( 1 );
			expect( store.series[ 0 ] ).toMatchObject( {
				title: 'Cat',
				counts: [ 11, 22 ],
				total: 33,
				consolidatedFrom: [ 'Cats' ]
			} );
		} );

		it( 'drops missing pages with an error, keeping zero-view ones', async () => {
			const { getPageInfo } = await import( '../lib/mwApi.js' );
			const store = usePageviewsStore();
			const ui = useUiStore();
			store.pages = [ 'Cat', 'No_such_page', 'Zero_views' ];
			fetchPageviews.mockResolvedValue( metricsResult( [
				{ title: 'Cat', counts: [ 1, 2 ], total: 3, average: 1.5 },
				{ title: 'No_such_page', counts: [ 0, 0 ], total: 0, average: 0, no_data: true },
				{ title: 'Zero_views', counts: [ 0, 0 ], total: 0, average: 0, no_data: true }
			] ) );
			getPageInfo.mockResolvedValue( {
				Cat: { title: 'Cat' },
				'No such page': { title: 'No such page', missing: true },
				'Zero views': { title: 'Zero views' }
			} );

			await store.load();

			// The AQS 404 for the existing page means zero pageviews and
			// is kept; the nonexistent page is dropped with a message.
			expect( store.series.map( ( page ) => page.title ) )
				.toEqual( [ 'Cat', 'Zero_views' ] );
			expect( ui.messages ).toHaveLength( 1 );
			expect( ui.messages[ 0 ].type ).toBe( 'error' );
			expect( ui.messages[ 0 ].text ).toContain( 'No such page' );
		} );

		it( 'drops a not-yet-published trailing date with a signal', async () => {
			const store = usePageviewsStore();
			store.pages = [ 'Cat' ];
			fetchPageviews.mockResolvedValue( {
				dates: [ '2026-07-19', '2026-07-20', '2026-07-21' ],
				pages: [ { title: 'Cat', counts: [ 10, 20, 0 ], total: 30, average: 10 } ],
				totals: { counts: [ 10, 20, 0 ], total: 30, average: 10 }
			} );

			await store.load();

			expect( store.dates ).toEqual( [ '2026-07-19', '2026-07-20' ] );
			expect( store.series[ 0 ].counts ).toEqual( [ 10, 20 ] );
			expect( store.totals.average ).toBe( 15 );
			expect( store.incompleteDate ).toBe( '2026-07-21' );
		} );

		it( 'looks up the Topviews rank for single-page queries', async () => {
			vi.useFakeTimers();
			vi.setSystemTime( new Date( '2026-07-21T12:00:00Z' ) );

			const store = usePageviewsStore();
			const settings = useSettingsStore();
			store.pages = [ 'Cat' ];
			settings.setFromQuery( { start: '2026-07-01', end: '2026-07-15' } );
			fetchPageviews.mockResolvedValue( metricsResult( [
				{ title: 'Cat', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );
			fetchTopviews.mockResolvedValue( {
				articles: [
					{ article: 'Dog', views: 500, rank: 1 },
					{ article: 'Cat', views: 400, rank: 2 }
				]
			} );

			await store.load();

			// July is incomplete: clamped to the last complete month.
			expect( fetchTopviews ).toHaveBeenCalledWith( expect.objectContaining( {
				project: 'en.wikipedia.org',
				date: '2026-06'
			} ) );
			expect( store.topRank ).toEqual( { rank: 2, date: '2026-06' } );

			// Multi-page queries don't get a rank.
			store.pages = [ 'Cat', 'Dog' ];
			fetchPageviews.mockResolvedValue( metricsResult( [
				{ title: 'Cat', counts: [ 1, 2 ], total: 3, average: 1.5 },
				{ title: 'Dog', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );
			await store.load();
			expect( store.topRank ).toBeNull();

			vi.useRealTimers();
		} );

		it( 'notifies with a localized message on ApiError', async () => {
			const store = usePageviewsStore();
			const ui = useUiStore();
			store.pages = [ 'Cat' ];
			fetchPageviews.mockRejectedValue( new ApiError( {
				code: 'upstream_error',
				message: 'AQS is down',
				i18n: [ 'api-error', 'Pageviews API' ]
			} ) );

			await store.load();

			expect( store.status ).toBe( 'error' );
			expect( ui.messages ).toHaveLength( 1 );
			expect( ui.messages[ 0 ].type ).toBe( 'error' );
			// The banana message 'api-error' is "Error querying $1."
			expect( ui.messages[ 0 ].text ).toBe( 'Error querying Pageviews API.' );
		} );

		it( 'offers a retry on retryable errors only', async () => {
			const store = usePageviewsStore();
			const ui = useUiStore();
			store.pages = [ 'Cat' ];

			// Retryable (e.g. an AQS timeout): the message carries a
			// callback that reruns the load.
			fetchPageviews.mockRejectedValueOnce( new ApiError( {
				code: 'upstream_error',
				message: 'AQS timed out',
				retryable: true
			} ) );
			await store.load();
			expect( ui.messages[ 0 ].onRetry ).toBeTypeOf( 'function' );

			fetchPageviews.mockResolvedValueOnce( metricsResult( [
				{ title: 'Cat', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );
			await ui.messages[ 0 ].onRetry();
			expect( store.status ).toBe( 'complete' );

			// Not retryable (e.g. invalid params): no callback.
			fetchPageviews.mockRejectedValueOnce( new ApiError( {
				code: 'invalid_date_range',
				message: 'Bad range',
				retryable: false
			} ) );
			await store.load();
			expect( ui.messages[ 0 ].onRetry ).toBeUndefined();

			// Errors without the flag (network failures) are retryable.
			fetchPageviews.mockRejectedValueOnce( new TypeError( 'Failed to fetch' ) );
			await store.load();
			expect( ui.messages[ 0 ].onRetry ).toBeTypeOf( 'function' );
		} );

		it( 'flags edit data as failed without failing the load', async () => {
			const store = usePageviewsStore();
			store.pages = [ 'Cat' ];
			fetchPageviews.mockResolvedValue( metricsResult( [
				{ title: 'Cat', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );
			fetchEditData.mockRejectedValueOnce( new Error( 'tunnels down' ) );

			await store.load();

			expect( store.status ).toBe( 'complete' );
			expect( store.editData ).toEqual( { pages: {}, totals: null, failed: true } );
		} );

		it( 'resets to initial with no pages', async () => {
			const store = usePageviewsStore();
			store.pages = [];
			store.status = 'complete';

			await store.load();

			expect( store.status ).toBe( 'initial' );
			expect( fetchPageviews ).not.toHaveBeenCalled();
		} );
	} );
} );
