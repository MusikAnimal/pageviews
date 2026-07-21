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

	it( 'shows a muted note when edit data is unavailable', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.editData = { pages: {}, totals: null, failed: true };

		const wrapper = mountTotals();

		// The Revisions section still renders, with the note instead
		// of numbers.
		expect( wrapper.text() ).toContain( 'revisions' );
		expect( wrapper.find( '.app-totals__unavailable' ).text() )
			.toBe( 'data-unavailable' );
		expect( wrapper.text() ).not.toContain( 'edits' );
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

	it( 'shows protection for a single page, None when unprotected', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.pageInfo = {
			Cat: {
				title: 'Cat',
				length: 100,
				protection: [ { type: 'edit', level: 'autoconfirmed' } ]
			}
		};
		expect( mountTotals().text() ).toContain( 'autoconfirmed' );

		store.pageInfo = { Cat: { title: 'Cat', length: 100, protection: [] } };
		expect( mountTotals().find( '.app-totals__protection' ).text() ).toBe( 'none' );
	} );

	it( 'omits protection for multi-page queries', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.pageInfo = {
			Cat: { title: 'Cat', length: 1, protection: [ { type: 'edit', level: 'sysop' } ] },
			Dog: { title: 'Dog', length: 1, protection: [] }
		};

		const wrapper = mountTotals();
		expect( wrapper.find( '.app-totals__protection' ).exists() ).toBe( false );
	} );

	it( 'shows "fewer than 30" when the API withholds watcher counts', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.pageInfo = {
			Obscure: { title: 'Obscure', length: 5000 }
		};

		const wrapper = mountTotals();
		expect( wrapper.text() ).toContain( 'watchers' );
		expect( wrapper.text() ).toContain( 'fewer-than' );
		expect( wrapper.text() ).toContain( '5,000' );
	} );

	it( 'shows the median only for spiky data', () => {
		const store = usePageviewsStore();
		// Flat series: no median.
		store.series = [ { title: 'Cat', counts: [ 100, 100, 100 ] } ];
		store.totals = { counts: [ 100, 100, 100 ], total: 300, average: 100 };
		expect( mountTotals().text() ).not.toContain( 'median' );

		// A big spike trips the log-scale heuristic.
		const spiky = [ 2, 3, 2, 90000, 3, 2, 4 ];
		store.series = [ { title: 'Cat', counts: spiky } ];
		store.totals = {
			counts: spiky,
			total: 90016,
			average: 12859.43
		};
		const wrapper = mountTotals();
		expect( wrapper.text() ).toContain( 'median' );
		expect( wrapper.text() ).toContain( '3' );
	} );

	it( 'links the edit count to the history for a single page only', () => {
		const store = usePageviewsStore();
		store.totals = { counts: [], total: 10, average: 5 };
		store.series = [ { title: 'Cat', counts: [ 10 ] } ];
		store.editData = {
			pages: { Cat: { num_edits: '42', num_users: '7', assessment: null } },
			totals: null
		};

		const link = mountTotals().find( 'a' );
		expect( link.attributes( 'href' ) )
			.toBe( 'https://en.wikipedia.org/w/index.php?title=Cat&action=history' );
		expect( link.text() ).toBe( '42' );

		store.series = [
			{ title: 'Cat', counts: [ 10 ] },
			{ title: 'Dog', counts: [ 5 ] }
		];
		store.editData.totals = { num_edits: 47, num_users: 8 };
		expect( mountTotals().find( 'a' ).exists() ).toBe( false );
	} );
} );
