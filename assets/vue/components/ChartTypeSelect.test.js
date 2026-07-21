import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { CdxMenuButton } from '@wikimedia/codex';
import ChartTypeSelect from './ChartTypeSelect.vue';

function mountSelect( modelValue = 'line' ) {
	return mount( ChartTypeSelect, {
		props: { modelValue },
		global: {
			config: {
				globalProperties: { $i18n: ( key ) => key }
			}
		}
	} );
}

describe( 'ChartTypeSelect', () => {
	it( 'offers all six chart types, each with an icon', () => {
		const items = mountSelect().findComponent( CdxMenuButton ).props( 'menuItems' );
		expect( items.map( ( item ) => item.value ) ).toEqual(
			[ 'line', 'bar', 'radar', 'pie', 'doughnut', 'polarArea' ]
		);
		for ( const item of items ) {
			expect( item.icon ).toBeTruthy();
		}
	} );

	it( 'marks the active type as selected and emits changes', () => {
		const wrapper = mountSelect( 'bar' );
		const menuButton = wrapper.findComponent( CdxMenuButton );

		expect( menuButton.props( 'selected' ) ).toBe( 'bar' );

		menuButton.vm.$emit( 'update:selected', 'pie' );
		expect( wrapper.emitted( 'update:modelValue' ) ).toEqual( [ [ 'pie' ] ] );
	} );
} );
