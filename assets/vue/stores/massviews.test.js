import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMassviewsStore } from './massviews.js';

describe( 'massviews store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'round-trips its own query serialization', () => {
		const store = useMassviewsStore();
		store.setFromQuery( {
			target: 'Some_list',
			view: 'chart'
		} );
		const serialized = { ...store.query };
		store.setFromQuery( serialized );
		expect( store.query ).toEqual( serialized );
	} );

	it( 'ignores unknown sources (none are wired up yet)', async () => {
		const store = useMassviewsStore();
		store.setFromQuery( { source: 'commons-category', target: 'UNESCO' } );

		expect( store.source ).toBe( '' );
		await store.load();
		expect( store.status ).toBe( 'initial' );
	} );
} );
