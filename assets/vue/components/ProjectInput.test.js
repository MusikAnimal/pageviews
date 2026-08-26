import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ProjectInput from './ProjectInput.vue';
import { getProjects } from '../projects.js';

vi.mock( '../projects.js', () => ( {
	getProjects: vi.fn()
} ) );

async function mountInput( props = {} ) {
	const wrapper = mount( ProjectInput, {
		// checkValidity() needs the input in the document.
		attachTo: document.body,
		props: { modelValue: 'en.wikipedia.org', ...props },
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
	// Let onMounted's project list land.
	await nextTick();
	await nextTick();
	return wrapper;
}

describe( 'ProjectInput', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
		getProjects.mockResolvedValue( { 'en.wikipedia': 'enwiki', 'fr.wikipedia': 'frwiki' } );
	} );

	it( 'reflects an externally set project in the input', async () => {
		// The Mediaviews flow: "All projects" starts checked (empty
		// model), unchecking restores the default project.
		const wrapper = await mountInput( {
			modelValue: '',
			allProjectsToggle: true,
			allProjects: true
		} );
		expect( wrapper.find( '.cdx-lookup input' ).element.value ).toBe( '' );

		await wrapper.setProps( { allProjects: false, modelValue: 'en.wikipedia.org' } );
		await nextTick();

		expect( wrapper.find( '.cdx-lookup input' ).element.value ).toBe( 'en.wikipedia.org' );
	} );

	it( 'flags an unknown project', async () => {
		const wrapper = await mountInput();
		const input = wrapper.find( '.cdx-lookup input' );

		await input.setValue( 'bogus.example.org' );
		await input.trigger( 'change' );
		await nextTick();
		await nextTick();

		expect( wrapper.text() ).toContain( 'unsupported' );
	} );

	it( 'clears the error when All projects is checked', async () => {
		const wrapper = await mountInput( { allProjectsToggle: true, allProjects: false } );
		const input = wrapper.find( '.cdx-lookup input' );
		await input.setValue( 'bogus.example.org' );
		await input.trigger( 'change' );
		await nextTick();
		await nextTick();
		expect( wrapper.text() ).toContain( 'unsupported' );

		await wrapper.setProps( { allProjects: true, modelValue: '' } );
		await nextTick();

		expect( wrapper.text() ).not.toContain( 'unsupported' );
		expect( input.element.disabled ).toBe( true );
	} );
} );
