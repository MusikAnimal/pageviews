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

	it( 'renders formatted view totals without a per-page list', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 1234567, average: 41152.23 };
		store.series = [
			{ title: 'Cat', total: 1000000 },
			{ title: 'Dog', total: 234567 }
		];

		const wrapper = mountTotals();

		expect( wrapper.find( '.app-totals__stat dd' ).text() ).toBe( '1,234,567' );
		expect( wrapper.text() ).toContain( '41,152' );
		// The per-page breakdown lives in the stats table, not here.
		expect( wrapper.find( '.app-totals__pages' ).exists() ).toBe( false );
	} );

	it( 'shows combined edits/editors under a Revisions section', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.editData = {
			pages: {
				Cat: { num_edits: '42', num_users: '7', assessment: null },
				Dog: { num_edits: '5', num_users: '2', assessment: null }
			},
			totals: { num_edits: 47, num_users: 8 }
		};

		const text = mountTotals().text();
		expect( text ).toContain( 'revisions' );
		expect( text ).toContain( '47' );
		// Distinct editors from the combined query, not 7 + 2.
		expect( text ).toContain( '8' );
	} );

	it( 'uses the single page as its own edit totals', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.editData = {
			pages: {
				Cat: { num_edits: '42', num_users: '7', assessment: null }
			},
			totals: null
		};

		const text = mountTotals().text();
		expect( text ).toContain( '42' );
		expect( text ).toContain( '7' );
	} );

	it( 'sums watchers and size in basic information', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.pageInfo = {
			Cat: { title: 'Cat', length: 150000, watchers: 800 },
			Dog: { title: 'Dog', length: 100000, watchers: 500 }
		};

		const text = mountTotals().text();
		expect( text ).toContain( 'basic-information' );
		expect( text ).toContain( '1,300' );
		expect( text ).toContain( '250,000' );
	} );

	it( 'omits watchers when the API withholds them', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.pageInfo = {
			Obscure: { title: 'Obscure', length: 5000 }
		};

		const wrapper = mountTotals();
		expect( wrapper.text() ).not.toContain( 'watchers' );
		expect( wrapper.text() ).toContain( '5,000' );
	} );
} );
