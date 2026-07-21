import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { CdxCheckbox, CdxDialog } from '@wikimedia/codex';
import PreferencesDialog from './PreferencesDialog.vue';
import { usePreferencesStore } from '../stores/preferences.js';

function checkboxInput( wrapper, messageKey ) {
	return wrapper.findAllComponents( CdxCheckbox )
		.find( ( checkbox ) => checkbox.text().includes( messageKey ) )
		.find( 'input' );
}

function mountDialog() {
	return mount( PreferencesDialog, {
		props: { open: true },
		global: {
			stubs: { teleport: true },
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'PreferencesDialog', () => {
	beforeEach( () => {
		localStorage.clear();
		setActivePinia( createPinia() );
	} );

	it( 'only commits staged edits on Save', async () => {
		const wrapper = mountDialog();
		const preferences = usePreferencesStore();

		// Toggle "bezier curve" in the dialog; the store must not
		// change until Save.
		await checkboxInput( wrapper, 'bezier-curve-option' ).setValue( true );
		expect( preferences.bezierCurve ).toBe( false );

		wrapper.findComponent( CdxDialog ).vm.$emit( 'primary' );
		expect( preferences.bezierCurve ).toBe( true );
		expect( wrapper.emitted( 'update:open' ) ).toContainEqual( [ false ] );
	} );

	it( 'discards staged edits on Cancel', async () => {
		const wrapper = mountDialog();
		const preferences = usePreferencesStore();

		await checkboxInput( wrapper, 'autolog-option' ).setValue( false );

		wrapper.findComponent( CdxDialog ).vm.$emit( 'default' );
		expect( preferences.autoLogDetection ).toBe( true );
		expect( wrapper.emitted( 'update:open' ) ).toContainEqual( [ false ] );
	} );

	it( 'offers the two supported autocomplete modes', () => {
		const wrapper = mountDialog();
		const radios = wrapper.findAll( 'input[type="radio"]' );
		expect( radios.map( ( radio ) => radio.element.value ) )
			.toEqual( [ 'autocomplete', 'autocomplete_redirects' ] );
	} );
} );
