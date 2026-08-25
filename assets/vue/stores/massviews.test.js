import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMassviewsStore } from './massviews.js';
import { useUiStore } from './ui.js';
import { fetchCategoryMembers, fetchHashtagPages, fetchPageviews } from '../lib/metricsApi.js';
import {
	getExternalLinkUsage,
	getSearchResults,
	getSubpages,
	getTranscludedIn,
	getWikilinks
} from '../lib/mwApi.js';
import { getQuarryTitles } from '../lib/quarry.js';
import { getSiteinfo } from '../projects.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchCategoryMembers: vi.fn(),
	fetchHashtagPages: vi.fn(),
	fetchPageviews: vi.fn()
} ) );
vi.mock( '../projects.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getSiteinfo: vi.fn()
} ) );
vi.mock( '../lib/mwApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getExternalLinkUsage: vi.fn(),
	getSearchResults: vi.fn(),
	getSubpages: vi.fn(),
	getTranscludedIn: vi.fn(),
	getWikilinks: vi.fn()
} ) );
vi.mock( '../lib/quarry.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getQuarryTitles: vi.fn()
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
		expect( store.targetTitle ).toBe( 'Category:Hip-hop_groups' );
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

	it( 'aborts the load cycle when the fan-out fails', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.target = 'https://en.wikipedia.org/wiki/Category:Hip-hop_groups';
		mockMembers( [ { title: 'Run-DMC', namespace: 0 } ] );
		fetchPageviews.mockRejectedValue( Object.assign(
			new Error( 'The replica database could not be reached.' ),
			{ i18n: [ 'api-error-upstream-unreachable', 'the replica database' ], retryable: true }
		) );

		await store.load();

		expect( store.status ).toBe( 'error' );
		expect( ui.messages[ 0 ].type ).toBe( 'error' );
		// The cycle's signal is aborted so in-flight requests cancel.
		expect( fetchPageviews.mock.calls[ 0 ][ 0 ].signal.aborted ).toBe( true );
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

	it( 'resolves wikilinks via the Action API', async () => {
		const store = useMassviewsStore();
		store.source = 'wikilinks';
		store.target = 'https://en.wikipedia.org/wiki/Wikipedia:Vital_articles';
		getWikilinks.mockResolvedValue( [ 'Cat', 'Dog' ] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [
				{ title: 'Cat', counts: [ 5 ], total: 5, average: 5 },
				{ title: 'Dog', counts: [ 2 ], total: 2, average: 2 }
			],
			totals: {}
		} );

		await store.load();

		expect( getWikilinks ).toHaveBeenCalledWith(
			'en.wikipedia.org', 'Wikipedia:Vital articles', expect.any( AbortSignal )
		);
		expect( fetchCategoryMembers ).not.toHaveBeenCalled();
		expect( store.targetTitle ).toBe( 'Wikipedia:Vital_articles' );
		expect( store.pagesData ).toHaveLength( 2 );
		expect( store.totals ).toMatchObject( { total: 7 } );
		expect( store.status ).toBe( 'complete' );
	} );

	it( 'reports an empty wikilinks set and returns to the form', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.source = 'wikilinks';
		store.target = 'https://en.wikipedia.org/wiki/Empty_page';
		getWikilinks.mockResolvedValue( [] );

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'warning' );
		expect( fetchPageviews ).not.toHaveBeenCalled();
	} );

	it( 'resolves transclusions via the Action API', async () => {
		const store = useMassviewsStore();
		store.source = 'transclusions';
		store.target = 'https://en.wikipedia.org/wiki/Template:Citation_needed';
		getTranscludedIn.mockResolvedValue( [ 'Cat' ] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [ { title: 'Cat', counts: [ 5 ], total: 5, average: 5 } ],
			totals: {}
		} );

		await store.load();

		expect( getTranscludedIn ).toHaveBeenCalledWith(
			'en.wikipedia.org', 'Template:Citation needed', expect.any( AbortSignal )
		);
		expect( store.status ).toBe( 'complete' );
	} );

	it( 'resolves subpages, including the page itself', async () => {
		const store = useMassviewsStore();
		store.source = 'subpages';
		store.target = 'https://en.wikipedia.org/wiki/User:Example';
		getSubpages.mockResolvedValue( [ 'User:Example/sandbox', 'User talk:Example/Archive' ] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [
				{ title: 'User:Example', counts: [ 1 ], total: 1, average: 1 },
				{ title: 'User:Example/sandbox', counts: [ 2 ], total: 2, average: 2 },
				{ title: 'User talk:Example/Archive', counts: [ 3 ], total: 3, average: 3 }
			],
			totals: {}
		} );

		await store.load();

		expect( getSubpages ).toHaveBeenCalledWith(
			'en.wikipedia.org', 'User:Example', SITEINFO.namespaces, expect.any( AbortSignal )
		);
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			pages: [ 'User:Example', 'User:Example/sandbox', 'User talk:Example/Archive' ]
		} ) );
		expect( store.status ).toBe( 'complete' );
	} );

	it( 'rejects a non-URL target for the page-based sources too', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.source = 'wikilinks';
		store.target = 'Some page';

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'error' );
		expect( getWikilinks ).not.toHaveBeenCalled();
	} );

	it( 'resolves a Quarry result set against the chosen project', async () => {
		const store = useMassviewsStore();
		store.setFromQuery( { source: 'quarry', target: '12345', project: 'de.wikipedia.org' } );
		getQuarryTitles.mockResolvedValue( [ 'Katze', 'Hund' ] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [
				{ title: 'Katze', counts: [ 5 ], total: 5, average: 5 },
				{ title: 'Hund', counts: [ 2 ], total: 2, average: 2 }
			],
			totals: {}
		} );

		await store.load();

		expect( getQuarryTitles ).toHaveBeenCalledWith( '12345', expect.any( AbortSignal ) );
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'de.wikipedia.org',
			pages: [ 'Katze', 'Hund' ]
		} ) );
		expect( store.targetTitle ).toBe( 'Quarry 12345' );
		expect( store.targetUrl ).toBe( 'https://quarry.wmcloud.org/query/12345' );
		expect( store.status ).toBe( 'complete' );
	} );

	it( 'resolves a hashtag and fans out per wiki', async () => {
		const store = useMassviewsStore();
		store.setFromQuery( { source: 'hashtag', target: '#moiswikif' } );
		fetchHashtagPages.mockResolvedValue( { tag: 'moiswikif', pages: [
			{ project: 'fr.wikipedia.org', title: 'Jacques_Servin' },
			{ project: 'fr.wikipedia.org', title: 'Henri_Yav_Mulang' },
			{ project: 'en.wikipedia.org', title: 'Jacques_Servin' }
		] } );
		fetchPageviews
			.mockResolvedValueOnce( {
				dates: [ '2026-07-01' ],
				pages: [
					{ title: 'Jacques_Servin', counts: [ 5 ], total: 5, average: 5 },
					{ title: 'Henri_Yav_Mulang', counts: [ 2 ], total: 2, average: 2 }
				],
				totals: {}
			} )
			.mockResolvedValueOnce( {
				dates: [ '2026-07-01' ],
				pages: [ { title: 'Jacques_Servin', counts: [ 1 ], total: 1, average: 1 } ],
				totals: {}
			} );

		await store.load();

		expect( fetchHashtagPages ).toHaveBeenCalledWith( expect.objectContaining( {
			tag: 'moiswikif'
		} ) );
		expect( fetchPageviews ).toHaveBeenCalledTimes( 2 );
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'fr.wikipedia.org',
			pages: [ 'Jacques_Servin', 'Henri_Yav_Mulang' ]
		} ) );
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			pages: [ 'Jacques_Servin' ]
		} ) );
		expect( store.pagesData ).toEqual( [
			expect.objectContaining( {
				title: 'Jacques Servin', project: 'fr.wikipedia.org', sum: 5
			} ),
			expect.objectContaining( {
				title: 'Henri Yav Mulang', project: 'fr.wikipedia.org', sum: 2
			} ),
			expect.objectContaining( {
				title: 'Jacques Servin', project: 'en.wikipedia.org', sum: 1
			} )
		] );
		expect( store.totals ).toMatchObject( { counts: [ 8 ], total: 8 } );
		expect( store.targetTitle ).toBe( '#moiswikif' );
		expect( store.targetUrl ).toBe( 'https://hashtags.wmcloud.org/?query=moiswikif' );
		// The hashtag spans wikis, so no single project is serialized.
		expect( store.query.project ).toBeUndefined();
		expect( store.status ).toBe( 'complete' );
	} );

	it( 'reports an empty hashtag result set and returns to the form', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.setFromQuery( { source: 'hashtag', target: 'nosuchtag' } );
		fetchHashtagPages.mockResolvedValue( { tag: 'nosuchtag', pages: [] } );

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'warning' );
		expect( ui.messages[ 0 ].text ).toContain( '#nosuchtag' );
		expect( fetchPageviews ).not.toHaveBeenCalled();
	} );

	it( 'rejects a Quarry result set without a page_title column', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.setFromQuery( { source: 'quarry', target: '99' } );
		getQuarryTitles.mockResolvedValue( null );

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'error' );
		expect( ui.messages[ 0 ].text ).toContain( 'page_title' );
		expect( ui.messages[ 0 ].text ).not.toContain( '<code>' );
		expect( fetchPageviews ).not.toHaveBeenCalled();
	} );

	it( 'resolves external link usage on the chosen project', async () => {
		const store = useMassviewsStore();
		store.setFromQuery( {
			source: 'external-link',
			target: '*.nycgo.com',
			project: 'en.wikipedia.org'
		} );
		getExternalLinkUsage.mockResolvedValue( [ 'New York City' ] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [ { title: 'New York City', counts: [ 9 ], total: 9, average: 9 } ],
			totals: {}
		} );

		await store.load();

		expect( getExternalLinkUsage ).toHaveBeenCalledWith(
			'en.wikipedia.org', '*.nycgo.com', expect.any( AbortSignal )
		);
		expect( store.targetUrl ).toContain( 'Special:LinkSearch' );
		expect( store.status ).toBe( 'complete' );
	} );

	it( 'resolves search results, truncating long queries in the heading', async () => {
		const store = useMassviewsStore();
		const query = 'insource:"a very long search query that keeps going and going"';
		store.setFromQuery( { source: 'search', target: query, project: 'en.wikipedia.org' } );
		getSearchResults.mockResolvedValue( [ 'UNESCO' ] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [ { title: 'UNESCO', counts: [ 3 ], total: 3, average: 3 } ],
			totals: {}
		} );

		await store.load();

		expect( getSearchResults ).toHaveBeenCalledWith(
			'en.wikipedia.org', query, expect.any( AbortSignal )
		);
		expect( store.targetTitle.endsWith( '…' ) ).toBe( true );
		expect( store.targetUrl ).toContain( 'Special:Search' );
		expect( store.status ).toBe( 'complete' );
	} );

} );
