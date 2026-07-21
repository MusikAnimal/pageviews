import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Totals from './Totals.vue';
import { usePageviewsStore } from '../../stores/pageviews.js';

function mountTotals() {
	return mount( Totals, {
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'Totals', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'renders nothing but the heading before data loads', () => {
		const wrapper = mountTotals();
		expect( wrapper.find( '.app-totals__stats' ).exists() ).toBe( false );
	} );

	it( 'renders formatted totals and averages', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 1234567, average: 41152.23 };
		store.series = [ { title: 'Cat', total: 1234567 } ];

		const wrapper = mountTotals();

		expect( wrapper.find( '.app-totals__stat dd' ).text() ).toBe( '1,234,567' );
		expect( wrapper.text() ).toContain( '41,152' );
		// Single page: no per-page breakdown list.
		expect( wrapper.find( '.app-totals__pages' ).exists() ).toBe( false );
	} );

	it( 'lists per-page sums for comparisons', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 40, average: 20 };
		store.series = [
			{ title: 'Cat', total: 30 },
			{ title: 'Dog', total: 10 }
		];

		const wrapper = mountTotals();
		const items = wrapper.findAll( '.app-totals__pages li' );

		expect( items ).toHaveLength( 2 );
		expect( items[ 0 ].text() ).toContain( 'Cat' );
		expect( items[ 0 ].text() ).toContain( '30' );
	} );
} );
