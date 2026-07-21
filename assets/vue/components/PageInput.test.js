import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { CdxMultiselectLookup } from '@wikimedia/codex';
import PageInput from './PageInput.vue';
import { usePageviewsStore } from '../stores/pageviews.js';
import { useUiStore } from '../stores/ui.js';
import { mwApiGet } from '../lib/mwApi.js';

vi.mock( '../lib/mwApi.js', () => ( {
	mwApiGet: vi.fn()
} ) );

function mountInput() {
	return mount( PageInput, {
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'PageInput', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.useFakeTimers();
		vi.clearAllMocks();
	} );

	afterEach( () => {
		vi.useRealTimers();
	} );

	it( 'debounces prefixsearch autocomplete', async () => {
		mwApiGet.mockResolvedValue( {
			query: { prefixsearch: [ { title: 'Cat' }, { title: 'Cattle' } ] }
		} );
		const wrapper = mountInput();
		const lookup = wrapper.findComponent( CdxMultiselectLookup );

		lookup.vm.$emit( 'input', 'ca' );
		lookup.vm.$emit( 'input', 'cat' );
		await vi.advanceTimersByTimeAsync( 250 );
		await nextTick();

		// Only the trailing keystroke queries the API.
		expect( mwApiGet ).toHaveBeenCalledOnce();
		expect( mwApiGet ).toHaveBeenCalledWith( 'en.wikipedia.org', expect.objectContaining( {
			list: 'prefixsearch',
			pssearch: 'cat'
		} ) );
		expect( lookup.props( 'menuItems' ) ).toEqual( [
			{ value: 'Cat', label: 'Cat' },
			{ value: 'Cattle', label: 'Cattle' }
		] );
	} );

	it( 'syncs selections into the store', async () => {
		const wrapper = mountInput();
		const store = usePageviewsStore();

		wrapper.findComponent( CdxMultiselectLookup )
			.vm.$emit( 'update:input-chips', [ { value: 'Cat' }, { value: 'Dog' } ] );
		await nextTick();
		await nextTick();

		expect( store.pages ).toEqual( [ 'Cat', 'Dog' ] );
	} );

	it( 'reflects URL-driven store changes', async () => {
		const wrapper = mountInput();
		const store = usePageviewsStore();

		store.setFromQuery( { pages: 'Apple|Banana' } );
		await nextTick();

		expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'selected' ) )
			.toEqual( [ 'Apple', 'Banana' ] );
	} );

	it( 'caps the selection at 10 pages with a Massviews hint', async () => {
		const wrapper = mountInput();
		const store = usePageviewsStore();
		const ui = useUiStore();
		const eleven = Array.from(
			{ length: 11 },
			( _, i ) => ( { value: `Page ${ i }` } )
		);

		wrapper.findComponent( CdxMultiselectLookup )
			.vm.$emit( 'update:input-chips', eleven );
		await nextTick();
		await nextTick();

		expect( store.pages ).toHaveLength( 10 );
		expect( ui.messages ).toHaveLength( 1 );
		expect( ui.messages[ 0 ].type ).toBe( 'warning' );
		expect( ui.messages[ 0 ].text ).toContain( 'Massviews' );
	} );
} );
