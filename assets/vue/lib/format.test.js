import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber } from './format.js';

describe( 'formatNumber', () => {
	it( 'localizes with group separators', () => {
		expect( formatNumber( 1234567, 'en' ) ).toBe( '1,234,567' );
		expect( formatNumber( 1234567, 'de' ) ).toBe( '1.234.567' );
	} );

	it( 'returns plain digits when localization is off', () => {
		expect( formatNumber( 1234567, 'en', false ) ).toBe( '1234567' );
	} );
} );

describe( 'formatDate', () => {
	const date = new Date( '2026-07-21T00:00:00Z' );

	it( 'localizes days and months', () => {
		expect( formatDate( date, { locale: 'en' } ) ).toBe( 'Jul 21, 2026' );
		expect( formatDate( date, { locale: 'en', monthly: true } ) ).toBe( 'July 2026' );
	} );

	it( 'returns ISO format when localization is off', () => {
		expect( formatDate( date, { localize: false } ) ).toBe( '2026-07-21' );
		expect( formatDate( date, { localize: false, monthly: true } ) ).toBe( '2026-07' );
	} );

	it( 'formats in UTC regardless of system timezone', () => {
		// One second before midnight UTC must not roll into the next day.
		const edge = new Date( '2026-07-21T23:59:59Z' );
		expect( formatDate( edge, { localize: false } ) ).toBe( '2026-07-21' );
	} );
} );
