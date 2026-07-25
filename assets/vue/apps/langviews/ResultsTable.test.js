import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ResultsTable from './ResultsTable.vue';
import { useLangviewsStore } from '../../stores/langviews.js';

function mountTable() {
	return mount( ResultsTable, {
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

function seedStore() {
	const store = useLangviewsStore();
	store.project = 'en.wikipedia.org';
	store.langData = [
		{ lang: 'de', title: 'Katze', badges: [], counts: [ 25, 25 ], sum: 50, average: 25 },
		{ lang: 'en', title: 'Cat', badges: [ 'Q17437796' ], counts: [ 515, 515 ], sum: 1030, average: 515 }
	];
	store.totals = { counts: [ 540, 540 ], total: 1080, average: 540 };
	return store;
}

describe( 'Langviews ResultsTable', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'renders nothing without data', () => {
		expect( mountTable().find( 'table' ).exists() ).toBe( false );
	} );

	it( 'pins the totals row at the top of the body', () => {
		seedStore();
		const firstRow = mountTable().find( 'tbody tr' );

		expect( firstRow.classes() ).toContain( 'app-stats__totals' );
		expect( firstRow.text() ).toContain( '1,080' );
	} );

	it( 'sorts by pageviews descending by default, ranking by position', () => {
		seedStore();
		const dataRows = mountTable().findAll( 'tbody tr' ).slice( 1 );

		expect( dataRows[ 0 ].find( 'th' ).text() ).toBe( '1' );
		expect( dataRows[ 0 ].text() ).toContain( 'Cat' );
		expect( dataRows[ 1 ].find( 'th' ).text() ).toBe( '2' );
		expect( dataRows[ 1 ].text() ).toContain( 'Katze' );
	} );

	it( 'keeps the sort state in the store when headers are clicked', async () => {
		const store = seedStore();
		const wrapper = mountTable();
		const headers = wrapper.findAll( 'th button' );

		const langHeader = headers.find( ( h ) => /language/i.test( h.text() ) );
		await langHeader.trigger( 'click' );
		expect( store.sort ).toBe( 'lang' );
		expect( store.direction ).toBe( '-1' );
		expect( wrapper.findAll( 'tbody tr' )[ 1 ].text() ).toContain( 'Katze' );

		// Re-clicking the sorted column toggles the direction — Codex's
		// unsorted state never reaches the URL params.
		await langHeader.trigger( 'click' );
		expect( store.sort ).toBe( 'lang' );
		expect( store.direction ).toBe( '1' );
		expect( wrapper.findAll( 'tbody tr' )[ 1 ].text() ).toContain( 'Cat' );
	} );

	it( 'links each language to Pageviews and the article', () => {
		seedStore();
		const catRow = mountTable().findAll( 'tbody tr' )[ 1 ];
		const links = catRow.findAll( 'a' );

		expect( links[ 0 ].attributes( 'href' ) )
			.toBe( 'https://en.wikipedia.org/wiki/Cat' );
		expect( links[ 1 ].attributes( 'href' ) )
			.toContain( '/pageviews?project=en.wikipedia.org' );
		expect( links[ 1 ].attributes( 'href' ) ).toContain( 'pages=Cat' );
	} );

	it( 'shows sitelink badges with their localized names', () => {
		seedStore();
		const catRow = mountTable().findAll( 'tbody tr' )[ 1 ];
		const badge = catRow.find( '.app-stats__badge' );

		expect( badge.exists() ).toBe( true );
		expect( badge.attributes( 'alt' ) ).not.toBe( '' );
	} );
} );
