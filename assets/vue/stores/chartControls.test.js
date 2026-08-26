import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useChartControlsStore } from './chartControls.js';

describe( 'chartControls store', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'seeds the toolbar state from one-shot permalink params', () => {
		const controls = useChartControlsStore();
		controls.setFromQuery( {
			charttype: 'bar',
			showvalues: '1',
			logarithmic: '0',
			movingaverage: '1'
		} );

		expect( controls.userChartType ).toBe( 'bar' );
		expect( controls.showValues ).toBe( true );
		expect( controls.userLogScale ).toBe( false );
		expect( controls.userMovingAverage ).toBe( true );
	} );

	it( 'ignores absent and invalid params', () => {
		const controls = useChartControlsStore();
		controls.setFromQuery( { charttype: 'sparkline' } );

		expect( controls.userChartType ).toBeNull();
		expect( controls.showValues ).toBe( false );
		expect( controls.userLogScale ).toBeNull();
		expect( controls.userMovingAverage ).toBeNull();
	} );
} );
