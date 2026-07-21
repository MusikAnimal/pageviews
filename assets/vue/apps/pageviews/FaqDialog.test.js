import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FaqDialog from './FaqDialog.vue';
import UrlStructureDialog from './UrlStructureDialog.vue';

function mountDialog( component ) {
	return mount( component, {
		props: { open: true },
		global: {
			stubs: { teleport: true },
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

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
			'platform', 'agent', 'redirects', 'autolog', 'mutevalidations'
		] );
		// The special ranges list is rendered inside the range param.
		expect( wrapper.text() ).toContain( 'all-time' );
		expect( wrapper.text() ).not.toContain( '$1' );
	} );
} );
