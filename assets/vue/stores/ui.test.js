import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUiStore } from './ui.js';

describe( 'ui store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'stacks and dismisses messages', () => {
		const ui = useUiStore();
		const first = ui.notify( { type: 'error', text: 'Boom' } );
		ui.notify( { text: 'FYI' } );

		expect( ui.messages ).toHaveLength( 2 );
		expect( ui.messages[ 1 ].type ).toBe( 'notice' );

		ui.dismiss( first );
		expect( ui.messages ).toHaveLength( 1 );
		expect( ui.messages[ 0 ].text ).toBe( 'FYI' );

		ui.clearMessages();
		expect( ui.messages ).toHaveLength( 0 );
	} );

	it( 'tracks progress', () => {
		const ui = useUiStore();
		expect( ui.progress ).toBeNull();
		ui.setProgress( 2, 5 );
		expect( ui.progress ).toEqual( { done: 2, total: 5 } );
		ui.clearProgress();
		expect( ui.progress ).toBeNull();
	} );
} );
