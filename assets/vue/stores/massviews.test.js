import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMassviewsStore } from './massviews.js';
import { useUiStore } from './ui.js';
import {
	fetchCategoryMembers,
	fetchHashtagPages,
	fetchPageviews,
	fetchWikiprojectPages
} from '../lib/metricsApi.js';
import {
	getExternalLinkUsage,
	getSearchResults,
	getSubpages,
	getTranscludedIn,
	getWikilinks
} from '../lib/mwApi.js';
import { getQuarryTitles } from '../lib/quarry.js';
import { getProjects, getSiteinfo } from '../projects.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchCategoryMembers: vi.fn(),
	fetchHashtagPages: vi.fn(),
	fetchPageviews: vi.fn(),
	fetchWikiprojectPages: vi.fn()
} ) );
vi.mock( '../projects.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getProjects: vi.fn(),
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
		getProjects.mockResolvedValue( { 'en.wikipedia': 'enwiki', 'fr.wikipedia': 'frwiki' } );
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
			namespace: '6',
			sort: 'title',
			direction: '-1',
			view: 'chart'
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

	it( 'filters the results to the selected namespace', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.target = 'https://en.wikipedia.org/wiki/Category:Hip-hop_groups';
		store.namespace = '6';
		mockMembers( [
			{ title: 'Run-DMC', namespace: 0 },
			{ title: 'Beastie_Boys', namespace: 1 },
			{ title: 'Run-DMC.jpg', namespace: 6 }
		] );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [ { title: 'File:Run-DMC.jpg', counts: [ 3 ], total: 3, average: 3 } ],
			totals: {}
		} );

		await store.load();

		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			pages: [ 'File:Run-DMC.jpg' ]
		} ) );
		expect( store.pagesData ).toHaveLength( 1 );
		expect( store.status ).toBe( 'complete' );

		// Nothing in the namespace: back to the form with a warning.
		store.namespace = '1';
		mockMembers( [ { title: 'Run-DMC', namespace: 0 } ] );
		await store.load();
		expect( store.status ).toBe( 'initial' );
		expect( ui.messages.at( -1 ).type ).toBe( 'warning' );
	} );

	it( 'aligns rows and reports skipped pages from failed chunks', async () => {
		const store = useMassviewsStore();
		store.target = 'https://en.wikipedia.org/wiki/Category:Hip-hop_groups';
		mockMembers( [
			{ title: 'Run-DMC', namespace: 0 },
			{ title: 'Beastie_Boys', namespace: 0 },
			{ title: 'Public_Enemy', namespace: 0 }
		] );
		// The middle page's chunk failed: only the survivors return,
		// in input order.
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01' ],
			pages: [
				{ title: 'Run-DMC', counts: [ 10 ], total: 10, average: 10 },
				{ title: 'Public_Enemy', counts: [ 2 ], total: 2, average: 2 }
			],
			totals: {},
			skipped: [ 'Beastie_Boys' ]
		} );

		await store.load();

		expect( store.pagesData.map( ( row ) => row.title ) )
			.toEqual( [ 'Run-DMC', 'Public Enemy' ] );
		expect( store.skipped ).toEqual( [
			{ project: 'en.wikipedia.org', title: 'Beastie Boys' }
		] );
		expect( store.status ).toBe( 'complete' );
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
		getWikilinks.mockResolvedValue( [
			{ project: 'en.wikipedia.org', title: 'Cat' },
			{ project: 'en.wikipedia.org', title: 'Dog' },
			// An interwiki link, fanned out to its own wiki.
			{ project: 'fr.wikipedia.org', title: 'Chat' },
			// Duplicate and unsupported-wiki links are dropped.
			{ project: 'en.wikipedia.org', title: 'Cat' },
			{ project: 'starwars.fandom.com', title: 'Loth-cat' }
		] );
		fetchPageviews.mockImplementation( ( { project: wiki } ) => Promise.resolve( wiki === 'en.wikipedia.org' ?
			{
				dates: [ '2026-07-01' ],
				pages: [
					{ title: 'Cat', counts: [ 5 ], total: 5, average: 5 },
					{ title: 'Dog', counts: [ 2 ], total: 2, average: 2 }
				],
				totals: {}
			} :
			{
				dates: [ '2026-07-01' ],
				pages: [ { title: 'Chat', counts: [ 1 ], total: 1, average: 1 } ],
				totals: {}
			}
		) );

		await store.load();

		expect( getWikilinks ).toHaveBeenCalledWith(
			'en.wikipedia.org', 'Wikipedia:Vital articles', expect.any( AbortSignal )
		);
		expect( fetchCategoryMembers ).not.toHaveBeenCalled();
		expect( store.targetTitle ).toBe( 'Wikipedia:Vital_articles' );
		expect( fetchPageviews ).toHaveBeenCalledTimes( 2 );
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			pages: [ 'Cat', 'Dog' ]
		} ) );
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'fr.wikipedia.org',
			pages: [ 'Chat' ]
		} ) );
		expect( store.pagesData ).toHaveLength( 3 );
		expect( store.totals ).toMatchObject( { total: 8 } );
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

	it( 'resolves a WikiProject and keeps the assessment metadata', async () => {
		const store = useMassviewsStore();
		store.setFromQuery( {
			source: 'wikiproject',
			target: 'Volcanoes',
			project: 'en.wikipedia.org'
		} );
		fetchWikiprojectPages.mockResolvedValue( {
			project: 'en.wikipedia',
			name: 'Volcanoes',
			limit: 20000,
			pages: [
				{
					title: 'Mauna_Loa',
					namespace: 0,
					assessment: { class: 'FA', weight: 20 },
					importance: { importance: 'Top', weight: 5 }
				},
				{ title: 'Volcano_lair', namespace: 1, assessment: null, importance: null }
			]
		} );
		fetchPageviews.mockResolvedValue( {
			dates: [ '2026-07-01', '2026-07-02' ],
			pages: [
				{ title: 'Mauna_Loa', counts: [ 10, 20 ], total: 30, average: 15 },
				{ title: 'Talk:Volcano_lair', counts: [ 1, 2 ], total: 3, average: 1.5 }
			],
			totals: {}
		} );

		await store.load();

		expect( fetchWikiprojectPages ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			name: 'Volcanoes'
		} ) );
		// Namespace prefixes come from siteinfo, like the category source.
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'en.wikipedia.org',
			pages: [ 'Mauna_Loa', 'Talk:Volcano_lair' ]
		} ) );
		expect( store.targetTitle ).toBe( 'Volcanoes' );
		expect( store.targetUrl ).toContain( 'Special:PageAssessments' );
		// The metadata is keyed by display title for the results table.
		expect( store.pageMeta[ 'Mauna Loa' ] ).toEqual( {
			assessment: { class: 'FA', weight: 20 },
			importance: { importance: 'Top', weight: 5 }
		} );
		expect( store.pageMeta[ 'Talk:Volcano lair' ] ).toEqual( {
			assessment: null,
			importance: null
		} );
		expect( store.status ).toBe( 'complete' );
	} );

	it( 'returns to the form when the WikiProject has no pages', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.setFromQuery( {
			source: 'wikiproject',
			target: 'Empty project',
			project: 'en.wikipedia.org'
		} );
		fetchWikiprojectPages.mockResolvedValue( {
			project: 'en.wikipedia',
			name: 'Empty project',
			limit: 20000,
			pages: []
		} );

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'warning' );
		expect( fetchPageviews ).not.toHaveBeenCalled();
	} );

	it( 'does not query a project source whose project was cleared', async () => {
		const store = useMassviewsStore();
		store.setFromQuery( {
			source: 'wikiproject',
			target: 'Volcanoes',
			project: 'en.wikipedia.org'
		} );
		// The project input's X button clears the model to null.
		store.project = null;

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( fetchWikiprojectPages ).not.toHaveBeenCalled();
		expect( fetchPageviews ).not.toHaveBeenCalled();
	} );

	it( 'round-trips the wikiproject source with its project', () => {
		const store = useMassviewsStore();
		store.setFromQuery( {
			source: 'wikiproject',
			target: 'Volcanoes',
			project: 'de.wikipedia.org',
			sort: 'importance'
		} );
		expect( store.query ).toMatchObject( {
			source: 'wikiproject',
			target: 'Volcanoes',
			project: 'de.wikipedia.org',
			sort: 'importance'
		} );
	} );

} );
