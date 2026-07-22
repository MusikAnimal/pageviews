import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FaqHelpButton from './FaqHelpButton.vue';

const push = vi.hoisted( () => vi.fn() );
const routeMock = vi.hoisted( () => ( {
	path: '/pageviews',
	query: { project: 'de.wikipedia.org', pages: 'Katze' }
} ) );
vi.mock( 'vue-router', () => ( {
	useRouter: () => ( { push } ),
	useRoute: () => routeMock
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

		// Other apps own a prefixed FAQ route.
		routeMock.path = '/siteviews';
		await wrapper.trigger( 'click' );
		expect( push ).toHaveBeenLastCalledWith( expect.objectContaining( {
			path: '/siteviews/faq'
		} ) );
		routeMock.path = '/pageviews';
	} );
} );
