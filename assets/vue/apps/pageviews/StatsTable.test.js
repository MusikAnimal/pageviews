import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StatsTable from './StatsTable.vue';
import { usePageviewsStore } from '../../stores/pageviews.js';

function mountTable() {
	return mount( StatsTable, {
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

function seedStore() {
	const store = usePageviewsStore();
	store.series = [
		{ title: 'Dog', counts: [ 1, 2 ], total: 3, average: 1.5 },
		{ title: 'Cat', counts: [ 10, 20 ], total: 1030, average: 515 }
	];
	store.totals = { counts: [ 11, 22 ], total: 1033, average: 516.5 };
	store.editData = {
		Cat: {
			num_edits: '42',
			num_users: '7',
			assessment: {
				class: 'GA',
				badge: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Symbol_support_vote.svg',
				color: '#66ff66'
			}
		},
		Dog: { num_edits: '5', num_users: '2', assessment: null },
		totals: { num_edits: 47, num_users: 9 }
	};
	return store;
}

describe( 'StatsTable', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'renders nothing without data', () => {
		expect( mountTable().find( 'table' ).exists() ).toBe( false );
	} );

	it( 'sorts by views descending by default, with formatted numbers', () => {
		seedStore();
		const wrapper = mountTable();
		const cells = wrapper.findAll( 'tbody tr' ).map( ( row ) => row.text() );

		expect( cells[ 0 ] ).toContain( 'Cat' );
		expect( cells[ 0 ] ).toContain( '1,030' );
		expect( cells[ 0 ] ).toContain( '42' );
		expect( cells[ 1 ] ).toContain( 'Dog' );
	} );

	it( 'renders the assessment badge and class', () => {
		seedStore();
		const wrapper = mountTable();
		const catRow = wrapper.findAll( 'tbody tr' )[ 0 ];

		const badge = catRow.find( '.app-stats__badge' );
		expect( badge.attributes( 'src' ) ).toContain( 'Symbol_support_vote.svg' );
		expect( badge.attributes( 'alt' ) ).toBe( 'GA' );
		expect( catRow.text() ).toContain( 'GA' );
		// Dog has no assessment: cell stays empty, no broken image.
		expect( wrapper.findAll( 'tbody tr' )[ 1 ].find( '.app-stats__badge' ).exists() )
			.toBe( false );
	} );

	it( 'links titles to the article on the selected project', () => {
		seedStore();
		const link = mountTable().find( 'tbody a' );
		expect( link.attributes( 'href' ) )
			.toBe( 'https://en.wikipedia.org/wiki/Cat' );
	} );

	it( 'toggles sort direction and column on header clicks', async () => {
		seedStore();
		const wrapper = mountTable();
		// Column labels are real banana messages, not raw keys.
		const headers = wrapper.findAll( 'th button' );
		const viewsHeader = headers.find( ( h ) => /^views$/i.test( h.text() ) );

		await viewsHeader.trigger( 'click' );
		expect( wrapper.find( 'tbody tr' ).text() ).toContain( 'Dog' );

		const titleHeader = headers.find( ( h ) => /page.title/i.test( h.text() ) );
		await titleHeader.trigger( 'click' );
		expect( wrapper.find( 'tbody tr' ).text() ).toContain( 'Cat' );
	} );

	it( 'omits edit columns gracefully when edit data is unavailable', () => {
		const store = seedStore();
		store.editData = null;
		const wrapper = mountTable();

		expect( wrapper.find( 'table' ).exists() ).toBe( true );
		// Rows render; edit cells are simply empty.
		expect( wrapper.findAll( 'tbody tr' )[ 0 ].findAll( 'td' )[ 4 ].text() ).toBe( '' );
	} );

	it( 'shows a totals row for comparisons', () => {
		seedStore();
		const footer = mountTable().find( 'tfoot' );
		expect( footer.text() ).toContain( '1,033' );
		expect( footer.text() ).toContain( '47' );
	} );
} );
