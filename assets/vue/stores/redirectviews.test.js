import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRedirectviewsStore } from './redirectviews.js';
import { useUiStore } from './ui.js';
import { fetchPageviews } from '../lib/metricsApi.js';
import { getRedirects } from '../lib/redirects.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchPageviews: vi.fn()
} ) );
vi.mock( '../lib/redirects.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getRedirects: vi.fn()
} ) );

describe( 'redirectviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useRedirectviewsStore();
		store.setFromQuery( {
			page: 'Cat_food',
			project: 'de.wikipedia.org',
			platform: 'desktop',
			agent: 'spider',
			sort: 'section',
			direction: '-1',
			view: 'chart'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'queries the target and every redirect, keeping sections', async () => {
		const store = useRedirectviewsStore();
		const ui = useUiStore();
		store.page = 'New_York_City';
		getRedirects.mockResolvedValue( {
			'New York City': [
				{ title: 'NYC', fragment: null },
				{ title: 'The Big Apple', fragment: 'Nicknames' }
			]
		} );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01', '2026-07-02' ],
			pages: [
				{ title: 'New York City', counts: [ 100, 200 ], total: 300, average: 150 },
				{ title: 'NYC', counts: [ 10, 20 ], total: 30, average: 15 },
				{ title: 'The Big Apple', counts: [ 1, 2 ], total: 3, average: 1.5 }
			],
			totals: {}
		} );

		await store.load();

		expect( getRedirects ).toHaveBeenCalledWith(
			'en.wikipedia.org', [ 'New York City' ], expect.any( AbortSignal )
		);
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			pages: [ 'New York City', 'NYC', 'The Big Apple' ]
		} ) );
		expect( store.redirectData ).toEqual( [
			expect.objectContaining( { title: 'New York City', isTarget: true, sum: 300 } ),
			expect.objectContaining( { title: 'NYC', section: '', sum: 30 } ),
			expect.objectContaining( { title: 'The Big Apple', section: 'Nicknames', sum: 3 } )
		] );
		expect( store.totals ).toMatchObject( { counts: [ 111, 222 ], total: 333 } );
		expect( store.status ).toBe( 'complete' );
		expect( ui.progress ).toBeNull();
	} );

	it( 'drops a not-yet-published trailing date with a signal', async () => {
		const store = useRedirectviewsStore();
		store.page = 'Cat';
		getRedirects.mockResolvedValue( { Cat: [ { title: 'Cats', fragment: null } ] } );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01', '2026-07-02', '2026-07-03' ],
			pages: [
				{ title: 'Cat', counts: [ 100, 200, 0 ], total: 300, average: 100 },
				{ title: 'Cats', counts: [ 10, 20, 0 ], total: 30, average: 10 }
			],
			totals: {}
		} );

		await store.load();

		expect( store.incompleteDate ).toBe( '2026-07-03' );
		expect( store.dates ).toEqual( [ '2026-07-01', '2026-07-02' ] );
		expect( store.redirectData[ 0 ].counts ).toEqual( [ 100, 200 ] );
		expect( store.redirectData[ 0 ].average ).toBe( 150 );
		expect( store.totals.counts ).toEqual( [ 110, 220 ] );
	} );

	it( 'still works for a page with no redirects', async () => {
		const store = useRedirectviewsStore();
		store.page = 'Lonely_page';
		getRedirects.mockResolvedValue( { 'Lonely page': [] } );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [ { title: 'Lonely page', counts: [ 5 ], total: 5, average: 5 } ],
			totals: {}
		} );

		await store.load();

		expect( store.redirectData ).toHaveLength( 1 );
		expect( store.redirectData[ 0 ].isTarget ).toBe( true );
		expect( store.status ).toBe( 'complete' );
	} );
} );
