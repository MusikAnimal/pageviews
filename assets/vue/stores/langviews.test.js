import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLangviewsStore } from './langviews.js';
import { useUiStore } from './ui.js';
import { fetchPageviews } from '../lib/metricsApi.js';
import { getLangLinks } from '../lib/wikidata.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchPageviews: vi.fn()
} ) );
vi.mock( '../lib/wikidata.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getLangLinks: vi.fn()
} ) );

describe( 'langviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useLangviewsStore();
		store.setFromQuery( {
			page: 'Cat_food',
			project: 'de.wikipedia.org',
			platform: 'desktop',
			agent: 'spider',
			sort: 'lang',
			direction: '-1',
			view: 'chart',
			autolog: 'false'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'fans out one pageviews query per language', async () => {
		const store = useLangviewsStore();
		const ui = useUiStore();
		store.page = 'Cat';
		getLangLinks.mockResolvedValue( [
			{ lang: 'en', title: 'Cat', badges: [ 'Q17437796' ] },
			{ lang: 'fr', title: 'Chat', badges: [] }
		] );
		fetchPageviews.mockImplementation( ( { project, pages } ) => Promise.resolve( {
			dates: [ '2026-07-01', '2026-07-02' ],
			pages: [ {
				title: pages[ 0 ],
				counts: project.startsWith( 'en.' ) ? [ 10, 20 ] : [ 1, 2 ],
				total: project.startsWith( 'en.' ) ? 30 : 3,
				average: 0
			} ],
			totals: {}
		} ) );

		await store.load();

		expect( fetchPageviews ).toHaveBeenCalledTimes( 2 );
		expect( fetchPageviews ).toHaveBeenCalledWith( expect.objectContaining( {
			project: 'fr.wikipedia.org',
			pages: [ 'Chat' ]
		} ) );
		expect( store.langData ).toHaveLength( 2 );
		expect( store.totals ).toMatchObject( { counts: [ 11, 22 ], total: 33 } );
		expect( store.status ).toBe( 'complete' );
		expect( ui.progress ).toBeNull();
	} );

	it( 'errors gracefully when the page has no Wikidata item', async () => {
		const store = useLangviewsStore();
		const ui = useUiStore();
		store.page = 'Nonexistent_page';
		getLangLinks.mockResolvedValue( null );

		await store.load();

		expect( store.status ).toBe( 'initial' );
		expect( ui.messages[ 0 ].type ).toBe( 'error' );
		expect( ui.messages[ 0 ].text ).toContain( 'Nonexistent page' );
	} );
} );
