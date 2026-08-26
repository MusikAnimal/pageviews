import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FaqDialog from './FaqDialog.vue';
import UrlStructureDialog from './UrlStructureDialog.vue';

const routeMock = vi.hoisted( () => ( { hash: '' } ) );
vi.mock( 'vue-router', () => ( {
	useRoute: () => routeMock
} ) );

function mountDialog( component, options = {} ) {
	return mount( component, {
		props: { open: true },
		global: {
			stubs: { teleport: true },
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		},
		...options
	} );
}

afterEach( () => {
	routeMock.hash = '';
	vi.useRealTimers();
} );

describe( 'FaqDialog', () => {
	it( 'renders all FAQ entries with substituted messages', () => {
		const wrapper = mountDialog( FaqDialog );
		const items = wrapper.findAll( '.app-dialog-list > li' );

		expect( items ).toHaveLength( 15 );
		// Parameter substitution happened (no leading $1s).
		expect( wrapper.text() ).toContain( 'July 2015' );
		expect( wrapper.text() ).not.toContain( '$1' );
		// Links got injected as markup.
		expect( wrapper.find( '#anomaly a[href*="phabricator"]' ).exists() ).toBe( true );
	} );

	it( 'renders anchors embedded in message text', () => {
		const wrapper = mountDialog( FaqDialog );
		// banana's sanitizer escapes <a> in message content; these
		// entries go through rawI18n instead.
		expect( wrapper.find( '#agents a[href*="Web_crawler"]' ).exists() ).toBe( true );
		expect( wrapper.find( '#feedback a[href*="meta.wikimedia.org"]' ).exists() ).toBe( true );
		expect( wrapper.find( '#agents' ).html() ).not.toContain( '&lt;a' );
	} );

	it( 'scrolls to and flashes the section for a hash deep link', async () => {
		vi.useFakeTimers();
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		routeMock.hash = '#agents';

		const wrapper = mountDialog( FaqDialog, { attachTo: document.body } );
		// The scroll waits out Codex's own 500ms focus-scroll pass.
		await vi.advanceTimersByTimeAsync( 700 );

		expect( scrollIntoView ).toHaveBeenCalled();
		const section = wrapper.find( '#agents' );
		expect( section.classes() ).toContain( 'app-flash' );

		await vi.advanceTimersByTimeAsync( 2100 );
		expect( section.classes() ).not.toContain( 'app-flash' );

		wrapper.unmount();
	} );

	it( 'emits update:open on close', () => {
		const wrapper = mountDialog( FaqDialog );
		wrapper.findComponent( { name: 'CdxDialog' } ).vm.$emit( 'update:open', false );
		expect( wrapper.emitted( 'update:open' ) ).toEqual( [ [ false ] ] );
	} );
} );

describe( 'UrlStructureDialog', () => {
	it( 'documents every URL parameter', () => {
		const wrapper = mountDialog( UrlStructureDialog );
		const terms = wrapper.findAll( 'dt' ).map( ( dt ) => dt.text() );

		expect( terms ).toEqual( [
			'project', 'pages', 'range', 'start', 'end',
			'platform', 'agent', 'redirects', 'charttype', 'showvalues', 'logarithmic', 'movingaverage'
		] );
		// The special ranges list is rendered inside the range param.
		expect( wrapper.text() ).toContain( 'all-time' );
		expect( wrapper.text() ).not.toContain( '$1' );
	} );
} );
