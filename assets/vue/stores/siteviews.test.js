import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { DEFAULT_SITES, useSiteviewsStore } from './siteviews.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';
import { fetchSiteEdits, fetchSiteviews } from '../lib/metricsApi.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	// trimIncompleteTail stays real (pure, tested separately).
	...await importOriginal(),
	fetchSiteviews: vi.fn(),
	fetchSiteEdits: vi.fn( () => Promise.resolve( {
		dataThrough: '2026-06-30',
		sites: [ { site: 'fr.wikipedia.org', counts: [], total: 1234, average: 0 } ],
		totals: { counts: [], total: 1234, average: 0 }
	} ) )
} ) );

function siteviewsResult( sites ) {
	const dates = [ '2026-07-01', '2026-07-02' ];
	const totals = { counts: [ 0, 0 ], total: 0, average: 0 };
	for ( const site of sites ) {
		site.counts.forEach( ( count, i ) => {
			totals.counts[ i ] += count;
		} );
		totals.total += site.total;
	}
	return { dates, sites, totals };
}

describe( 'siteviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'parses the query string, capping at 10 sites', () => {
		const store = useSiteviewsStore();
		store.setFromQuery( {
			sites: 'fr.wikipedia.org|de.wikipedia.org',
			source: 'unique-devices',
			platform: 'mobile-site'
		} );
		expect( store.sites ).toEqual( [ 'fr.wikipedia.org', 'de.wikipedia.org' ] );
		expect( store.source ).toBe( 'unique-devices' );
		expect( store.platform ).toBe( 'mobile-site' );

		const many = Array.from( { length: 12 }, ( _, i ) => `w${ i }.org` ).join( '|' );
		store.setFromQuery( { sites: many } );
		expect( store.sites ).toHaveLength( 10 );
	} );

	it( 'validates platform against the source vocabulary', () => {
		const store = useSiteviewsStore();
		// desktop is a pageviews value, not a unique-devices one.
		store.setFromQuery( { source: 'unique-devices', platform: 'desktop' } );
		expect( store.platform ).toBe( 'all-sites' );

		store.setFromQuery( { source: 'pageviews', platform: 'mobile-web' } );
		expect( store.platform ).toBe( 'mobile-web' );
	} );

	it( 'remaps the platform when the source changes', () => {
		const store = useSiteviewsStore();
		store.platform = 'mobile-web';
		store.source = 'unique-devices';
		expect( store.platform ).toBe( 'mobile-site' );

		store.source = 'pageviews';
		expect( store.platform ).toBe( 'mobile-web' );
	} );

	it( 'serializes the agent only for the pageviews source', () => {
		const store = useSiteviewsStore();
		store.sites = [ 'fr.wikipedia.org' ];
		expect( store.query.agent ).toBe( 'user' );

		store.source = 'unique-devices';
		expect( store.query.agent ).toBeUndefined();
		expect( store.query.source ).toBe( 'unique-devices' );
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useSiteviewsStore();
		store.setFromQuery( {
			sites: 'fr.wikipedia.org',
			source: 'pagecounts',
			platform: 'desktop-site',
			'editor-type': 'group-bot',
			'page-type': 'all-page-types',
			autolog: 'false'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'falls back from pagecounts when the dates rule it out', () => {
		const store = useSiteviewsStore();
		const settings = useSettingsStore();

		// Within the legacy dataset's span: pagecounts is honored.
		settings.setFromQuery( { start: '2015-01-01', end: '2015-01-31' } );
		store.setFromQuery( { source: 'pagecounts', platform: 'desktop-site' } );
		expect( store.pagecountsAvailable ).toBe( true );
		expect( store.source ).toBe( 'pagecounts' );
		expect( store.unsupportedSource ).toBeNull();

		// Dates move past 2016-08-05: fall back, one-shot signal set.
		settings.setFromQuery( { start: '2026-06-01', end: '2026-06-30' } );
		expect( store.pagecountsAvailable ).toBe( false );
		expect( store.source ).toBe( 'pageviews' );
		// The source watch also remapped the platform vocabulary.
		expect( store.platform ).toBe( 'desktop' );
		expect( store.unsupportedSource ).toBe( 'pagecounts' );
	} );

	it( 'rejects a pagecounts URL request outside the dataset span', () => {
		const store = useSiteviewsStore();
		const settings = useSettingsStore();

		// useQuerySync parses settings (dates) before the app store.
		settings.setFromQuery( { start: '2026-06-01', end: '2026-06-30' } );
		store.setFromQuery( { sites: 'fr.wikipedia.org', source: 'pagecounts' } );

		expect( store.source ).toBe( 'pageviews' );
		expect( store.unsupportedSource ).toBe( 'pagecounts' );
	} );

	it( 'parses and validates the editor and page types', () => {
		const store = useSiteviewsStore();
		store.setFromQuery( { 'editor-type': 'anonymous', 'page-type': 'non-content' } );
		expect( store.editorType ).toBe( 'anonymous' );
		expect( store.pageType ).toBe( 'non-content' );

		store.setFromQuery( { 'editor-type': 'vandals', 'page-type': 'talk' } );
		expect( store.editorType ).toBe( 'anonymous' );
		expect( store.pageType ).toBe( 'non-content' );
	} );

	it( 'treats all-projects as a pageviews-only mode', () => {
		const store = useSiteviewsStore();
		store.setFromQuery( { sites: 'all-projects' } );
		expect( store.isAllProjects ).toBe( true );

		// Switching away from pageviews falls back to the defaults.
		store.source = 'unique-devices';
		expect( store.isAllProjects ).toBe( false );
		expect( store.sites ).toEqual( DEFAULT_SITES );
	} );

	describe( 'load', () => {
		it( 'fetches series and edit counts', async () => {
			const store = useSiteviewsStore();
			store.sites = [ 'fr.wikipedia.org' ];
			fetchSiteviews.mockResolvedValue( siteviewsResult( [
				{ site: 'fr.wikipedia.org', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );

			await store.load();

			expect( fetchSiteviews ).toHaveBeenCalledWith( expect.objectContaining( {
				sites: [ 'fr.wikipedia.org' ],
				source: 'pageviews',
				platform: 'all-access',
				granularity: 'daily'
			} ) );
			expect( store.status ).toBe( 'complete' );
			expect( store.series ).toHaveLength( 1 );
			expect( store.totals.total ).toBe( 3 );

			// Edit counts land as a non-fatal side fetch.
			await Promise.resolve();
			expect( fetchSiteEdits ).toHaveBeenCalledWith( expect.objectContaining( {
				sites: [ 'fr.wikipedia.org' ],
				editorType: 'user',
				pageType: 'content'
			} ) );
			expect( store.editsData ).toMatchObject( {
				sites: { 'fr.wikipedia.org': 1234 },
				total: 1234,
				dataThrough: '2026-06-30',
				noData: false,
				failed: false
			} );
		} );

		it( 'flags edits data as unavailable without failing the load', async () => {
			const store = useSiteviewsStore();
			store.sites = [ 'fr.wikipedia.org' ];
			fetchSiteviews.mockResolvedValue( siteviewsResult( [
				{ site: 'fr.wikipedia.org', counts: [ 1, 2 ], total: 3, average: 1.5 }
			] ) );
			fetchSiteEdits.mockRejectedValueOnce( new TypeError( 'Failed to fetch' ) );

			await store.load();
			await Promise.resolve();

			expect( store.status ).toBe( 'complete' );
			expect( store.editsData ).toMatchObject( { noData: true, failed: true } );
		} );

		it( 'drops a not-yet-published trailing date with a signal', async () => {
			const store = useSiteviewsStore();
			store.sites = [ 'fr.wikipedia.org' ];
			fetchSiteviews.mockResolvedValue( {
				dates: [ '2026-07-20', '2026-07-21' ],
				sites: [ { site: 'fr.wikipedia.org', counts: [ 10, 0 ], total: 10, average: 5 } ],
				totals: { counts: [ 10, 0 ], total: 10, average: 5 }
			} );

			await store.load();

			expect( store.dates ).toEqual( [ '2026-07-20' ] );
			expect( store.incompleteDate ).toBe( '2026-07-21' );
		} );

		it( 'notifies with a retryable error message on failure', async () => {
			const store = useSiteviewsStore();
			const ui = useUiStore();
			store.sites = [ 'fr.wikipedia.org' ];
			fetchSiteviews.mockRejectedValue( new TypeError( 'Failed to fetch' ) );

			await store.load();

			expect( store.status ).toBe( 'error' );
			expect( ui.messages[ 0 ].type ).toBe( 'error' );
			expect( ui.messages[ 0 ].onRetry ).toBeTypeOf( 'function' );
		} );

		it( 'resets to initial with no sites', async () => {
			const store = useSiteviewsStore();
			await store.load();
			expect( store.status ).toBe( 'initial' );
			expect( fetchSiteviews ).not.toHaveBeenCalled();
		} );
	} );
} );
