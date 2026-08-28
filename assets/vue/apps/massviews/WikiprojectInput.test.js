import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import WikiprojectInput from './WikiprojectInput.vue';
import { getWikiprojects } from '../../lib/mwApi.js';

vi.mock( '../../lib/mwApi.js', () => ( {
	getWikiprojects: vi.fn()
} ) );

async function mountInput() {
	// What matters is the model value AT the moment submit fires —
	// the model also settles correctly a tick later, which must not
	// mask a stale submission.
	const state = { value: '', atSubmit: null };
	const wrapper = mount( WikiprojectInput, {
		// The teleported menu and focus handling need a real document.
		attachTo: document.body,
		props: {
			modelValue: '',
			project: 'en.wikipedia.org',
			placeholder: 'Volcanoes',
			'onUpdate:modelValue': ( value ) => {
				state.value = value;
			},
			onSubmit: () => {
				state.atSubmit = state.value;
			}
		},
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
	// Let the suggestion list land.
	await nextTick();
	await nextTick();
	return { wrapper, state };
}

describe( 'WikiprojectInput', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
		getWikiprojects.mockResolvedValue( [ 'Volcanoes', 'Volleyball', 'Military history' ] );
	} );

	it( 'submits the typed name on Enter', async () => {
		const { wrapper, state } = await mountInput();
		const input = wrapper.find( 'input' );

		await input.setValue( 'Military history' );
		await input.trigger( 'keydown', { key: 'Enter' } );

		expect( wrapper.emitted( 'submit' ) ).toHaveLength( 1 );
		expect( state.atSubmit ).toBe( 'Military history' );
	} );

	it( 'submits a suggestion picked with the arrow keys, not the stale text', async () => {
		const { wrapper, state } = await mountInput();
		const input = wrapper.find( 'input' );

		await input.trigger( 'focus' );
		await input.setValue( 'Volc' );
		await nextTick();
		// Highlight "Volcanoes" and pick it — Codex selects on the
		// same Enter that submits the form, updating the selection
		// model synchronously but the input text only a tick later.
		await input.trigger( 'keydown', { key: 'ArrowDown' } );
		await input.trigger( 'keydown', { key: 'Enter' } );

		expect( wrapper.emitted( 'submit' ) ).toHaveLength( 1 );
		expect( state.atSubmit ).toBe( 'Volcanoes' );
	} );
} );
