import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUserviewsStore } from './userviews.js';
import { useUiStore } from './ui.js';
import { fetchPagesCreated, fetchPageviews } from '../lib/metricsApi.js';
import { getSiteinfo } from '../projects.js';
import { mwApiGet } from '../lib/mwApi.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchPagesCreated: vi.fn(),
	fetchPageviews: vi.fn()
} ) );
vi.mock( '../projects.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getSiteinfo: vi.fn()
} ) );
vi.mock( '../lib/mwApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	mwApiGet: vi.fn()
} ) );

function mockCreated( pages, limit = 20000 ) {
	fetchPagesCreated.mockResolvedValue( {
		project: 'en.wikipedia',
		user: 'Jimbo Wales',
		namespace: 'all',
		redirects: '0',
		limit,
		pages
	} );
}

const SITEINFO = {
	general: {},
	namespaces: {
		0: { '*': '' },
		2: { '*': 'User' },
		118: { '*': 'Draft' }
	}
};

describe( 'userviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
		mwApiGet.mockResolvedValue( { query: { users: [ { editcount: 100 } ] } } );
		getSiteinfo.mockResolvedValue( SITEINFO );
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useUserviewsStore();
		store.setFromQuery( {
			user: 'Jimbo_Wales',
			project: 'de.wikipedia.org',
			platform: 'desktop',
			agent: 'spider',
			namespace: 'all',
			redirects: '2',
			sort: 'datestamp',
			direction: '-1',
			view: 'chart',
			autolog: 'false'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'prefixes titles by namespace and fans out one batched query', async () => {
		const store = useUserviewsStore();
		const ui = useUiStore();
		store.user = 'Jimbo_Wales';
		mockCreated( [
			{
				title: 'Shotgun', namespace: 0, created: '2001-03-27', redirect: false,
				length: 95716, assessment: { class: 'GA', badge: 'badge.svg', color: '#6f6' }
			},
			{ title: 'Ideas', namespace: 118, created: '2020-01-02', redirect: true, length: 36 }
		] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01', '2026-07-02' ],
			pages: [
				{ title: 'Shotgun', counts: [ 10, 20 ], total: 30, average: 15 },
				{ title: 'Draft:Ideas', counts: [ 1, 2 ], total: 3, average: 1.5 }
			],
			totals: {}
		} );

		await store.load();

		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			pages: [ 'Shotgun', 'Draft:Ideas' ]
		} ) );
		expect( store.pagesData ).toEqual( [
			expect.objectContaining( {
				title: 'Shotgun',
				created: '2001-03-27',
				size: 95716,
				redirect: false,
				assessment: { class: 'GA', badge: 'badge.svg', color: '#6f6' },
				sum: 30
			} ),
			expect.objectContaining( { title: 'Draft:Ideas', redirect: true, sum: 3 } )
		] );
		expect( store.totals ).toMatchObject( { counts: [ 11, 22 ], total: 33 } );
		expect( store.status ).toBe( 'complete' );
		expect( ui.progress ).toBeNull();
	} );

	it( 'returns to the form when the user created no pages', async () => {
		const store = useUserviewsStore();
		const ui = useUiStore();
		store.user = 'Nobody';
		mockCreated( [] );

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'warning' );
		expect( fetchPageviews ).not.toHaveBeenCalled();
	} );

	it( 'warns when the set was likely truncated', async () => {
		const store = useUserviewsStore();
		const ui = useUiStore();
		store.user = 'Prolific';
		mockCreated(
			[ { title: 'A', namespace: 0, created: '2020-01-01', redirect: false, length: 1 } ],
			1
		);
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [ { title: 'A', counts: [ 1 ], total: 1, average: 1 } ],
			totals: {}
		} );

		await store.load();

		expect( store.status ).toBe( 'complete' );
		expect( ui.messages[ 0 ].type ).toBe( 'warning' );
		expect( ui.messages[ 0 ].text ).toContain( 'Jimbo Wales' );
	} );

	it( 'signals the edit-count warning for prolific users', async () => {
		const store = useUserviewsStore();
		store.user = 'Jimbo_Wales';
		mwApiGet.mockResolvedValue( { query: { users: [ { editcount: 123456 } ] } } );
		mockCreated( [
			{ title: 'A', namespace: 0, created: '2020-01-01', redirect: false, length: 1 }
		] );
		// Keep the load pending so the store is still 'loading' when the
		// edit-count response lands.
		fetchPageviews.mockReturnValue( new Promise( () => {} ) );

		store.load();
		await vi.waitFor( () => {
			expect( store.editCountWarning ).toEqual( { user: 'Jimbo Wales', count: 123456 } );
		} );
	} );
} );
