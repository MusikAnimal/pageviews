import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMassviewsStore } from './massviews.js';
import { useUiStore } from './ui.js';
import { fetchCategoryMembers, fetchPageviews } from '../lib/metricsApi.js';
import { getSiteinfo } from '../projects.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchCategoryMembers: vi.fn(),
	fetchPageviews: vi.fn()
} ) );
vi.mock( '../projects.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getSiteinfo: vi.fn()
} ) );

const SITEINFO = {
	general: {},
	namespaces: {
		0: { '*': '' },
		1: { '*': 'Talk' },
		6: { '*': 'File' }
	}
};

function mockMembers( pages, limit = 20000 ) {
	fetchCategoryMembers.mockResolvedValue( {
		project: 'en.wikipedia',
		category: 'Hip-hop_groups',
		recursive: false,
		limit,
		pages
	} );
}

describe( 'massviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
		getSiteinfo.mockResolvedValue( SITEINFO );
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useMassviewsStore();
		store.setFromQuery( {
			source: 'category',
			target: 'https://en.wikipedia.org/wiki/Category:Hip-hop_groups',
			platform: 'desktop',
			agent: 'spider',
			subjectpage: '1',
			subcategories: '1',
			sort: 'title',
			direction: '-1',
			view: 'chart',
			autolog: 'false'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'rejects a target that is not a category URL', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.target = 'Hip-hop groups';

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'error' );
		expect( fetchCategoryMembers ).not.toHaveBeenCalled();
	} );

	it( 'resolves members, prefixes namespaces and fans out', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.target = 'https://en.wikipedia.org/wiki/Category:Hip-hop_groups';
		mockMembers( [
			{ title: 'Run-DMC', namespace: 0 },
			{ title: 'Beastie_Boys', namespace: 1 },
			{ title: 'Run-DMC.jpg', namespace: 6 }
		] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01', '2026-07-02' ],
			pages: [
				{ title: 'Run-DMC', counts: [ 10, 20 ], total: 30, average: 15 },
				{ title: 'Talk:Beastie_Boys', counts: [ 1, 2 ], total: 3, average: 1.5 },
				{ title: 'File:Run-DMC.jpg', counts: [ 0, 1 ], total: 1, average: 0.5 }
			],
			totals: {}
		} );

		await store.load();

		expect( fetchCategoryMembers ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			category: 'Hip-hop_groups',
			subcategories: '0'
		} ) );
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			pages: [ 'Run-DMC', 'Talk:Beastie_Boys', 'File:Run-DMC.jpg' ]
		} ) );
		expect( store.project ).toBe( 'en.wikipedia.org' );
		expect( store.category ).toBe( 'Hip-hop_groups' );
		expect( store.pagesData ).toEqual( [
			expect.objectContaining( { title: 'Run-DMC', sum: 30 } ),
			expect.objectContaining( { title: 'Talk:Beastie Boys', sum: 3 } ),
			expect.objectContaining( { title: 'File:Run-DMC.jpg', sum: 1 } )
		] );
		expect( store.totals ).toMatchObject( { counts: [ 11, 23 ], total: 34 } );
		expect( store.status ).toBe( 'complete' );
		expect( ui.progress ).toBeNull();
	} );

	it( 'maps talk pages to subject pages when the toggle is on', async () => {
		const store = useMassviewsStore();
		store.target = 'https://en.wikipedia.org/wiki/Category:Hip-hop_groups';
		store.subjectpage = '1';
		mockMembers( [ { title: 'Beastie_Boys', namespace: 1 } ] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [ { title: 'Beastie_Boys', counts: [ 5 ], total: 5, average: 5 } ],
			totals: {}
		} );

		await store.load();

		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			pages: [ 'Beastie_Boys' ]
		} ) );
	} );

	it( 'returns to the form when the category has no members', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.target = 'https://en.wikipedia.org/wiki/Category:Empty';
		mockMembers( [] );

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'warning' );
		expect( fetchPageviews ).not.toHaveBeenCalled();
	} );
} );
