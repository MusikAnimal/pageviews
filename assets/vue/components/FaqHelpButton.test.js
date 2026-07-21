import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FaqHelpButton from './FaqHelpButton.vue';

const push = vi.hoisted( () => vi.fn() );
vi.mock( 'vue-router', () => ( {
	useRouter: () => ( { push } ),
	useRoute: () => ( { query: { project: 'de.wikipedia.org', pages: 'Katze' } } )
} ) );

describe( 'FaqHelpButton', () => {
	beforeEach( () => {
		vi.clearAllMocks();
	} );

	it( 'opens the FAQ dialog at its section, keeping the query', async () => {
		const wrapper = mount( FaqHelpButton, {
			props: { section: 'redirects', ariaLabel: 'How are redirects counted?' }
		} );

		await wrapper.trigger( 'click' );

		expect( push ).toHaveBeenCalledWith( {
			path: '/faq',
			hash: '#redirects',
			query: { project: 'de.wikipedia.org', pages: 'Katze' }
		} );
		expect( wrapper.attributes( 'aria-label' ) ).toBe( 'How are redirects counted?' );
	} );
} );
