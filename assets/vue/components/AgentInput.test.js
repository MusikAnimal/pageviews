import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AgentInput from './AgentInput.vue';

const push = vi.hoisted( () => vi.fn() );
vi.mock( 'vue-router', () => ( {
	useRouter: () => ( { push } ),
	useRoute: () => ( { query: { project: 'de.wikipedia.org' } } )
} ) );

describe( 'AgentInput', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
		vi.clearAllMocks();
	} );

	it( 'opens the FAQ dialog at the agents section via the help icon', async () => {
		const wrapper = mount( AgentInput, {
			global: {
				config: {
					globalProperties: { $i18n: ( key ) => key }
				}
			}
		} );

		await wrapper.find( '.app-settings__agent-help' ).trigger( 'click' );

		expect( push ).toHaveBeenCalledWith( {
			path: '/faq',
			hash: '#agents',
			query: { project: 'de.wikipedia.org' }
		} );
	} );
} );
