import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { CdxMultiselectLookup } from '@wikimedia/codex';
import SiteInput from './SiteInput.vue';
import { useSiteviewsStore } from '../stores/siteviews.js';

vi.mock( '../projects.js', () => ( {
	getProjects: vi.fn( () => Promise.resolve( {
		'fr.wikipedia': {},
		'de.wikipedia': {},
		'fr.wiktionary': {}
	} ) )
} ) );

function mountInput() {
	return mount( SiteInput, {
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'SiteInput', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'suggests matching site domains from the projects list', async () => {
		const wrapper = mountInput();
		// Let the mounted getProjects() resolve.
		await nextTick();
		await nextTick();

		const lookup = wrapper.findComponent( CdxMultiselectLookup );
		lookup.vm.$emit( 'input', 'fr.wik' );
		await nextTick();

		expect( lookup.props( 'menuItems' ) ).toEqual( [
			{ value: 'fr.wikipedia.org', label: 'fr.wikipedia.org' },
			{ value: 'fr.wiktionary.org', label: 'fr.wiktionary.org' }
		] );
	} );

	it( 'syncs selections into the store', async () => {
		const wrapper = mountInput();
		const store = useSiteviewsStore();

		wrapper.findComponent( CdxMultiselectLookup )
			.vm.$emit( 'update:input-chips', [ { value: 'fr.wikipedia.org' } ] );
		await nextTick();
		await nextTick();

		expect( store.sites ).toEqual( [ 'fr.wikipedia.org' ] );
	} );
} );
