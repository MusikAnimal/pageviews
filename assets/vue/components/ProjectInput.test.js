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

	it( 'blanks the field on an explicit external clear', async () => {
		const wrapper = await mountInput();
		const input = wrapper.find( '.cdx-lookup input' );
		expect( input.element.value ).toBe( 'en.wikipedia.org' );

		// An empty string is a deliberate parent-side clear (unlike
		// null, which Codex emits while typing).
		await wrapper.setProps( { modelValue: '' } );
		await nextTick();
		await nextTick();

		expect( input.element.value ).toBe( '' );
	} );

	it( 'leaves the pending state when the input is emptied', async () => {
		const wrapper = await mountInput();
		const input = wrapper.find( '.cdx-lookup input' );

		// Typing filters the menu; clearing must not leave the lookup
		// waiting for menu items that will never come.
		await input.setValue( 'en.wik' );
		await input.setValue( '' );
		await nextTick();

		expect( wrapper.find( '.cdx-lookup' ).classes() )
			.not.toContain( 'cdx-lookup--pending' );
	} );

	it( 'validates against a restricted project list with a custom message', async () => {
		const wrapper = await mountInput( {
			projects: [ 'en.wikipedia.org' ],
			invalidHtml: ( domain ) => `${ domain } lacks PageAssessments`
		} );
		const input = wrapper.find( '.cdx-lookup input' );

		// On the allow-list but not the restricted list.
		await input.setValue( 'fr.wikipedia.org' );
		await input.trigger( 'change' );
		await nextTick();
		await nextTick();
		expect( wrapper.text() ).toContain( 'fr.wikipedia.org lacks PageAssessments' );

		// Lifting the restriction re-judges the same text.
		await wrapper.setProps( { projects: null, invalidHtml: null } );
		await nextTick();
		await nextTick();
		expect( wrapper.text() ).not.toContain( 'lacks PageAssessments' );
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
