import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePreferencesStore } from './preferences.js';

describe( 'preferences store', () => {
	beforeEach( () => {
		localStorage.clear();
		setActivePinia( createPinia() );
	} );

	it( 'provides sensible defaults', () => {
		const preferences = usePreferencesStore();
		expect( preferences.numericalFormatting ).toBe( true );
		expect( preferences.localizeDateFormat ).toBe( true );
		expect( preferences.autoLogDetection ).toBe( true );
		expect( preferences.beginAtZero ).toBe( true );
		expect( preferences.rememberChart ).toBe( false );
		expect( preferences.bezierCurve ).toBe( false );
		expect( preferences.alwaysRedirects ).toBe( false );
		expect( preferences.autocomplete ).toBe( 'autocomplete' );
	} );

	it( 'reads values persisted by the legacy tool', () => {
		// Legacy stored raw 'true'/'false' strings, which JSON-parse
		// into the intended booleans.
		localStorage.setItem( 'pageviews-settings-numericalFormatting', 'false' );
		localStorage.setItem( 'pageviews-settings-beginAtZero', 'false' );

		const preferences = usePreferencesStore();
		expect( preferences.numericalFormatting ).toBe( false );
		expect( preferences.beginAtZero ).toBe( false );
	} );

	it( 'persists changes to localStorage', async () => {
		const preferences = usePreferencesStore();
		preferences.bezierCurve = true;
		// persistentRef writes on watch flush.
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 0 );
		} );
		expect( localStorage.getItem( 'pageviews-settings-bezierCurve' ) ).toBe( 'true' );
	} );
} );
