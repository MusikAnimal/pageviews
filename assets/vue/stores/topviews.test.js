import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTopviewsStore } from './topviews.js';
import { fetchEditData, fetchPageviews, fetchTopviews } from '../lib/metricsApi.js';
import { getSiteinfo } from '../projects.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchEditData: vi.fn(),
	fetchPageviews: vi.fn(),
	fetchTopviews: vi.fn()
} ) );
vi.mock( '../projects.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getSiteinfo: vi.fn()
} ) );

const SITEINFO = {
	general: { mainpage: 'Main Page' },
	namespaces: {
		0: { '*': '' },
		1: { '*': 'Talk' }
	}
};

function mockTop( articles, excluded = [] ) {
	fetchTopviews.mockResolvedValue( { articles, excluded } );
}

describe( 'topviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
		getSiteinfo.mockResolvedValue( SITEINFO );
		fetchEditData.mockResolvedValue( { pages: {} } );
		fetchPageviews.mockResolvedValue( { dates: [], pages: [], totals: {} } );
	} );

	it( 'keeps a URL-provided search across the load', async () => {
		const store = useTopviewsStore();
		store.setFromQuery( { search: 'euro' } );
		mockTop( [ { article: 'Euro_2026', views: 100, rank: 1 } ] );

		await store.load();

		expect( store.search ).toBe( 'euro' );
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useTopviewsStore();
		store.setFromQuery( {
			project: 'de.wikipedia.org',
			platform: 'desktop',
			date: '2026-06',
			excludes: 'Foo_Bar|Baz',
			mainspace: 'false',
			search: 'euro'
		} );
		expect( store.excludes ).toEqual( [ 'Foo Bar', 'Baz' ] );
		expect( store.search ).toBe( 'euro' );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'resolves the legacy special date names', () => {
		const store = useTopviewsStore();
		store.setFromQuery( { date: 'last-month' } );
		expect( store.date ).toMatch( /^\d{4}-\d{2}$/ );
		expect( store.dateType ).toBe( 'monthly' );
		store.setFromQuery( { date: 'yesterday' } );
		expect( store.dateType ).toBe( 'daily' );
		store.setFromQuery( { date: 'last-year' } );
		expect( store.dateType ).toBe( 'yearly' );
		store.setFromQuery( { date: 'bogus' } );
		expect( store.dateType ).toBe( 'yearly' );
	} );

	it( 'filters non-mainspace titles and the main page, reranking', async () => {
		const store = useTopviewsStore();
		mockTop( [
			{ article: 'Cat', views: 100, rank: 1 },
			{ article: 'Talk:Dog', views: 90, rank: 2 },
			{ article: 'Main Page', views: 80, rank: 3 },
			{ article: 'Dog', views: 70, rank: 4 }
		] );

		await store.load();

		expect( store.status ).toBe( 'complete' );
		expect( store.pageData.map( ( entry ) => [ entry.article, entry.rank ] ) )
			.toEqual( [ [ 'Cat', 1 ], [ 'Dog', 2 ] ] );

		store.mainspace = false;
		expect( store.pageData ).toHaveLength( 4 );
	} );

	it( 'applies user excludes reactively and searches with full-list ranks', async () => {
		const store = useTopviewsStore();
		mockTop( [
			{ article: 'Cat', views: 100, rank: 1 },
			{ article: 'Dog', views: 90, rank: 2 },
			{ article: 'Dogma', views: 80, rank: 3 }
		] );

		await store.load();

		store.excludes = [ 'Cat' ];
		expect( store.pageData.map( ( entry ) => entry.article ) ).toEqual( [ 'Dog', 'Dogma' ] );
		expect( store.query.excludes ).toBe( 'Cat' );

		store.search = 'dogma';
		expect( store.displayed ).toEqual( [
			expect.objectContaining( { article: 'Dogma', rank: 2 } )
		] );
	} );

	it( 'fetches mobile views in chunks so rows fill in progressively', async () => {
		const store = useTopviewsStore();
		store.date = '2026-06';
		mockTop( Array.from( { length: 15 }, ( unused, i ) => (
			{ article: `Page ${ i }`, views: 100 - i, rank: i + 1 }
		) ) );

		await store.load();
		store.showMobile = true;
		await store.ensureEnrichment();

		const mobileCalls = fetchPageviews.mock.calls
			.map( ( [ params ] ) => params )
			.filter( ( params ) => params.platform === 'mobile-web' );
		expect( mobileCalls.map( ( params ) => params.pages.length ) ).toEqual( [ 10, 5 ] );
	} );

	it( 'shows the mobile column for yearly or opted-in all-access', () => {
		const store = useTopviewsStore();
		store.date = '2026-06';
		expect( store.shouldShowMobile ).toBe( false );
		store.showMobile = true;
		expect( store.shouldShowMobile ).toBe( true );
		store.platform = 'desktop';
		expect( store.shouldShowMobile ).toBe( false );
		store.date = '2025';
		expect( store.shouldShowMobile ).toBe( true );
	} );

	it( 'derives the covered period from the date type', () => {
		const store = useTopviewsStore();
		store.date = '2026-02-14';
		expect( store.periodDates() ).toEqual( [ '2026-02-14', '2026-02-14' ] );
		store.date = '2026-06';
		expect( store.periodDates() ).toEqual( [ '2026-06-01', '2026-06-30' ] );
		store.date = '2025';
		expect( store.periodDates() ).toEqual( [ '2025-01-01', '2025-12-31' ] );
	} );
} );
