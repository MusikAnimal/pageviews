import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SinglePageInput from './SinglePageInput.vue';

vi.mock( '../lib/mwApi.js', () => ( {
	mwApiGet: vi.fn()
} ) );

function mountInput() {
	return mount( SinglePageInput, {
		props: { project: 'en.wikipedia.org' },
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'SinglePageInput', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'opts the input out of password managers', () => {
		const input = mountInput().find( 'input' );
		// Codex hard-codes autocomplete=off on combobox inputs.
		expect( input.attributes( 'autocomplete' ) ).toBe( 'off' );
		expect( input.attributes( 'data-1p-ignore' ) ).toBeDefined();
		expect( input.attributes( 'data-lpignore' ) ).toBe( 'true' );
		expect( input.attributes( 'data-bwignore' ) ).toBeDefined();
		expect( input.attributes( 'data-form-type' ) ).toBe( 'other' );
	} );
} );
