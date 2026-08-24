import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StatsTable from './StatsTable.vue';
import { usePageviewsStore } from '../../stores/pageviews.js';
import { useSettingsStore } from '../../stores/settings.js';

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
		pages: {
			Cat: {
				num_edits: '42',
				num_users: '7',
				assessment: {
					class: 'GA',
					badge: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Symbol_support_vote.svg',
					color: '#66ff66'
				}
			},
			Dog: { num_edits: '5', num_users: '2', assessment: null }
		},
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

	it( 'links each page to Langviews and Redirect Views with the report params', () => {
		seedStore();
		const settings = useSettingsStore();
		settings.setFromQuery( { start: '2026-07-01', end: '2026-07-20' } );
		const catRow = mountTable().findAll( 'tbody tr' )[ 0 ];
		for ( const [ app, label ] of [
			[ 'langviews', 'all-languages' ],
			[ 'redirectviews', 'redirects' ]
		] ) {
			const link = catRow.findAll( 'a' )
				.find( ( a ) => a.attributes( 'href' ).startsWith( `/${ app }` ) );

			expect( link.text() ).toBe( label );
			expect( link.attributes( 'href' ) ).toContain( 'project=en.wikipedia.org' );
			expect( link.attributes( 'href' ) ).toContain( 'start=2026-07-01' );
			expect( link.attributes( 'href' ) ).toContain( 'page=Cat' );
		}
	} );

	it( 'links the edit count to the revision history', () => {
		seedStore();
		const catRow = mountTable().findAll( 'tbody tr' )[ 0 ];
		const editsLink = catRow.findAll( 'a' )
			.find( ( a ) => a.attributes( 'href' ).includes( 'action=history' ) );

		expect( editsLink.text() ).toBe( '42' );
		expect( editsLink.attributes( 'href' ) )
			.toBe( 'https://en.wikipedia.org/w/index.php?title=Cat&action=history' );
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

	it( 'shows ? in edit columns when edit data is unavailable', () => {
		const store = seedStore();
		store.editData = null;
		const wrapper = mountTable();

		expect( wrapper.find( 'table' ).exists() ).toBe( true );
		// No assessments without edit data, so the Class column is
		// hidden: color, title, views, average, then edits.
		expect( wrapper.findAll( 'tbody tr' )[ 0 ].findAll( 'td' )[ 4 ].text() ).toBe( '?' );
	} );

	it( 'shows a color swatch matching each series position', () => {
		seedStore();
		const rows = mountTable().findAll( 'tbody tr' );
		// Sorted by views desc: Cat (series index 1) first.
		// jsdom normalizes rgba(…, 1) to rgb(…).
		expect( rows[ 0 ].find( '.app-stats__color' ).attributes( 'style' ) )
			.toContain( 'rgb(237, 181, 55)' );
		expect( rows[ 1 ].find( '.app-stats__color' ).attributes( 'style' ) )
			.toContain( 'rgb(75, 119, 214)' );
	} );

	it( 'shows size and watchers, marking hidden watcher counts', () => {
		const store = seedStore();
		store.pageInfo = {
			Cat: { title: 'Cat', length: 154321, watchers: 512, protection: [] },
			// Watchers hidden by the wiki: below the threshold.
			Dog: { title: 'Dog', length: 2048, protection: [] }
		};
		const wrapper = mountTable();
		const [ catRow, dogRow ] = wrapper.findAll( 'tbody tr' );

		expect( catRow.text() ).toContain( '154,321' );
		expect( catRow.text() ).toContain( '512' );
		expect( dogRow.text() ).toContain( 'Fewer than 30' );
		// Totals: sizes summed; hidden watcher counts contribute 0.
		expect( wrapper.find( 'tfoot' ).text() ).toContain( '156,369' );
	} );

	it( 'hides the Protection column when no page is protected', () => {
		const store = seedStore();
		store.pageInfo = {
			Cat: { title: 'Cat', length: 1, protection: [] },
			Dog: { title: 'Dog', length: 1, protection: [] }
		};
		const wrapper = mountTable();
		expect( wrapper.text() ).not.toContain( 'protection' );

		store.pageInfo.Cat.protection = [ { type: 'edit', level: 'sysop' } ];
		expect( mountTable().text() ).toContain( 'sysop' );
	} );

	it( 'shows a totals row for comparisons', () => {
		seedStore();
		const footer = mountTable().find( 'tfoot' );
		expect( footer.text() ).toContain( '1,033' );
		expect( footer.text() ).toContain( '47' );
	} );

	it( 'shows edit-protection levels once page info arrives', () => {
		const store = seedStore();
		store.pageInfo = {
			Cat: {
				title: 'Cat',
				length: 1,
				protection: [ { type: 'edit', level: 'autoconfirmed' }, { type: 'move', level: 'sysop' } ]
			},
			Dog: { title: 'Dog', length: 1, protection: [] }
		};

		const rows = mountTable().findAll( 'tbody tr' );
		// Sorted by views desc: Cat first.
		expect( rows[ 0 ].text() ).toContain( 'autoconfirmed' );
		// Loaded but unprotected renders the localized "none".
		expect( rows[ 1 ].text() ).toContain( 'none' );
	} );

	it( 'replaces the table with a summary line for a single page', () => {
		const store = seedStore();
		const settings = useSettingsStore();
		settings.setFromQuery( { start: '2026-07-01', end: '2026-07-20' } );
		store.series = [ store.series[ 1 ] ]; // Cat only
		store.totals = { counts: [], total: 1030, average: 515 };

		const wrapper = mountTable();

		expect( wrapper.find( 'table' ).exists() ).toBe( false );
		const summary = wrapper.find( '.app-page-summary' );
		// Assessment badge and class come first.
		expect( summary.find( '.app-page-summary__badge img' ).attributes( 'alt' ) ).toBe( 'GA' );
		// Linked title.
		expect( summary.find( 'a' ).attributes( 'href' ) )
			.toBe( 'https://en.wikipedia.org/wiki/Cat' );
		// Localized date range.
		expect( summary.find( '.app-page-summary__dates' ).text() )
			.toBe( 'Jul 1, 2026 – Jul 20, 2026' );
		// Pageviews in bold, via the num-pageviews message.
		expect( summary.find( 'strong' ).text() ).toBe( '1,030 pageviews' );
	} );

	it( 'shows the Topviews rank line when the page made the top list', () => {
		const store = seedStore();
		const settings = useSettingsStore();
		settings.setFromQuery( { start: '2026-06-01', end: '2026-06-30' } );
		store.series = [ store.series[ 1 ] ]; // Cat only
		store.topRank = { rank: 5, date: '2026-06' };

		const rank = mountTable().find( '.app-page-summary__rank' );
		expect( rank.text() ).toContain( '5' );
		expect( rank.text() ).toContain( 'June 2026' );
		expect( rank.find( 'a' ).attributes( 'href' ) )
			.toBe( '/topviews?project=en.wikipedia.org&platform=all-access&date=2026-06' );
	} );
} );
