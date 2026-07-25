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

	it( 'loads the Commons category aggregate for the categories source', async () => {
		const store = useMediaviewsStore();
		store.setFromQuery( {
			source: 'categories',
			category: 'Media_from_NASA',
			scope: 'shallow',
			wiki: 'en.wikipedia.org'
		} );
		fetchCommonsCategory.mockResolvedValue( {
			category: 'Media_from_NASA',
			scope: 'shallow',
			wiki: 'en.wikipedia',
			granularity: 'monthly',
			start: '2025-01',
			end: '2025-03',
			dates: [ '2025-01', '2025-02', '2025-03' ],
			counts: [ 100, 0, 50 ],
			total: 150,
			average: 50
		} );

		await store.load();

		expect( fetchCommonsCategory ).toHaveBeenCalledWith( expect.objectContaining( {
			category: 'Media_from_NASA',
			scope: 'shallow',
			wiki: 'en.wikipedia.org'
		} ) );
		expect( fetchMediarequests ).not.toHaveBeenCalled();
		expect( store.series ).toEqual( [ {
			name: 'Media from NASA',
			counts: [ 100, 0, 50 ],
			total: 150,
			average: 50
		} ] );
		expect( store.totals ).toMatchObject( { total: 150 } );
		expect( store.status ).toBe( 'complete' );
		// The query drops the files params while the source is active.
		expect( store.query ).toEqual( {
			source: 'categories',
			category: 'Media_from_NASA',
			scope: 'shallow',
			wiki: 'en.wikipedia.org',
			autolog: undefined
		} );
	} );

} );
