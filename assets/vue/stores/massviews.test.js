import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMassviewsStore } from './massviews.js';
import { useSettingsStore } from './settings.js';
import { useUiStore } from './ui.js';
import { fetchCommonsCategory } from '../lib/metricsApi.js';

vi.mock( '../lib/metricsApi.js', async ( importOriginal ) => ( {
	...await importOriginal(),
	fetchCommonsCategory: vi.fn()
} ) );

describe( 'massviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useMassviewsStore();
		store.setFromQuery( {
			source: 'commons-category',
			target: 'Media_from_NASA',
			scope: 'shallow',
			project: 'en.wikipedia.org',
			view: 'list'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'forces monthly date params within the dataset bounds', () => {
		const store = useMassviewsStore();
		const settings = useSettingsStore();
		settings.setFromQuery( { start: '2015-08-01', end: '2026-06-15' } );

		store.ensureMonthlyDefaults();

		expect( settings.dateType ).toBe( 'monthly' );
		// Truncated to months, clamped to the dataset start.
		expect( settings.start ).toBe( '2023-01' );
		expect( settings.end ).toBe( '2026-06' );
	} );

	it( 'loads the monthly aggregate for the category', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.target = 'UNESCO';
		fetchCommonsCategory.mockResolvedValue( {
			category: 'UNESCO',
			scope: 'deep',
			wiki: 'all-wikis',
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
			category: 'UNESCO',
			scope: 'deep',
			wiki: 'all-wikis'
		} ) );
		expect( store.dates ).toEqual( [ '2025-01', '2025-02', '2025-03' ] );
		expect( store.totals ).toEqual( { counts: [ 100, 0, 50 ], total: 150, average: 50 } );
		expect( store.status ).toBe( 'complete' );
		expect( ui.messages ).toHaveLength( 0 );
	} );

	it( 'surfaces a non-retryable unknown-category error without retry', async () => {
		const store = useMassviewsStore();
		const ui = useUiStore();
		store.target = 'Not_a_dataset_category';
		const error = new Error( 'not loaded' );
		error.i18n = [ 'massviews-commons-category-unknown' ];
		error.retryable = false;
		fetchCommonsCategory.mockRejectedValue( error );

		await store.load();

		expect( store.status ).toBe( 'error' );
		expect( ui.messages[ 0 ].type ).toBe( 'error' );
		expect( ui.messages[ 0 ].onRetry ).toBeUndefined();
	} );
} );
