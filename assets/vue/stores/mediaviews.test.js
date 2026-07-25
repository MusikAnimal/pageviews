import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMediaviewsStore } from './mediaviews.js';
import { useUiStore } from './ui.js';
import { fetchCommonsCategory, fetchMediarequests } from '../lib/metricsApi.js';
import { getFileInfo } from '../lib/mwApi.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	// trimIncompleteTail stays real (pure, tested separately).
	...await importOriginal(),
	fetchCommonsCategory: vi.fn(),
	fetchMediarequests: vi.fn()
} ) );
vi.mock( '../lib/mwApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	getFileInfo: vi.fn()
} ) );

describe( 'mediaviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useMediaviewsStore();
		store.setFromQuery( {
			files: 'Example.jpg|Example.webm',
			project: 'en.wikipedia.org',
			referer: 'external',
			agent: 'spider',
			autolog: 'false'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
		// 'automated' is not a mediarequests agent.
		store.setFromQuery( { agent: 'automated' } );
		expect( store.agent ).toBe( 'spider' );
	} );

	it( 'resolves names to paths, dropping missing files', async () => {
		const store = useMediaviewsStore();
		const ui = useUiStore();
		store.files = [ 'Example.jpg', 'No_such.png' ];
		getFileInfo.mockResolvedValue( {
			'Example.jpg': {
				title: 'File:Example.jpg',
				path: '/wikipedia/commons/a/a9/Example.jpg',
				mediatype: 'BITMAP',
				size: 9022
			},
			'No such.png': { title: 'File:No such.png', missing: true }
		} );
		fetchMediarequests.mockResolvedValue( {
			dates: [ '2026-07-01', '2026-07-02' ],
			files: [ {
				path: '/wikipedia/commons/a/a9/Example.jpg',
				counts: [ 1, 2 ],
				total: 3,
				average: 1.5
			} ],
			totals: { counts: [ 1, 2 ], total: 3, average: 1.5 }
		} );

		await store.load();

		expect( getFileInfo ).toHaveBeenCalledWith(
			'commons.wikimedia.org', [ 'Example.jpg', 'No_such.png' ], expect.any( AbortSignal )
		);
		expect( fetchMediarequests ).toHaveBeenCalledWith( expect.objectContaining( {
			files: [ '/wikipedia/commons/a/a9/Example.jpg' ],
			referer: 'all-referers'
		} ) );
		// Series keyed by file name; the missing file got a message.
		expect( store.series ).toHaveLength( 1 );
		expect( store.series[ 0 ].name ).toBe( 'Example.jpg' );
		expect( store.status ).toBe( 'complete' );
		expect( ui.messages[ 0 ].text ).toContain( 'No such.png' );
	} );

	it( 'resets to initial when no files resolve', async () => {
		const store = useMediaviewsStore();
		store.files = [ 'Gone.png' ];
		getFileInfo.mockResolvedValue( {
			'Gone.png': { title: 'File:Gone.png', missing: true }
		} );

		await store.load();

		expect( fetchMediarequests ).not.toHaveBeenCalled();
		expect( store.status ).toBe( 'initial' );
	} );

	it( 'fans out one aggregate request per category', async () => {
		const store = useMediaviewsStore();
		const ui = useUiStore();
		store.setFromQuery( {
			source: 'categories',
			categories: 'Media_from_NASA|UNESCO|Bogus_category',
			scope: 'shallow',
			wiki: 'en.wikipedia.org'
		} );
		const error = new Error( 'not loaded' );
		error.i18n = [ 'mediaviews-commons-category-unknown' ];
		error.retryable = false;
		fetchCommonsCategory.mockImplementation( ( { category } ) => {
			if ( category === 'Bogus_category' ) {
				return Promise.reject( error );
			}
			return Promise.resolve( {
				category,
				scope: 'shallow',
				wiki: 'en.wikipedia',
				granularity: 'monthly',
				start: '2025-01',
				end: '2025-02',
				dates: [ '2025-01', '2025-02' ],
				counts: category === 'UNESCO' ? [ 10, 20 ] : [ 100, 0 ],
				total: category === 'UNESCO' ? 30 : 100,
				average: category === 'UNESCO' ? 15 : 50
			} );
		} );

		await store.load();

		expect( fetchCommonsCategory ).toHaveBeenCalledTimes( 3 );
		expect( fetchMediarequests ).not.toHaveBeenCalled();
		// The unknown category gets a message and is dropped.
		expect( ui.messages[ 0 ].text ).toContain( 'Bogus category' );
		expect( store.series ).toEqual( [
			{ name: 'Media from NASA', counts: [ 100, 0 ], total: 100, average: 50 },
			{ name: 'UNESCO', counts: [ 10, 20 ], total: 30, average: 15 }
		] );
		expect( store.totals ).toMatchObject( { counts: [ 110, 20 ], total: 130 } );
		expect( store.status ).toBe( 'complete' );
		// The query drops the files params while the source is active.
		expect( store.query ).toEqual( {
			source: 'categories',
			categories: 'Media_from_NASA|UNESCO|Bogus_category',
			scope: 'shallow',
			wiki: 'en.wikipedia.org',
			autolog: undefined
		} );
	} );

} );
