import { afterEach, describe, expect, it } from 'vitest';
import { chartTheme } from './theme.js';

describe( 'chartTheme', () => {
	afterEach( () => {
		document.documentElement.style.cssText = '';
	} );

	it( 'falls back to Codex light-mode colors when no tokens are set', () => {
		expect( chartTheme() ).toEqual( {
			text: '#202122',
			subtleText: '#54595d',
			border: '#a2a9b1',
			grid: '#c8ccd1',
			background: '#fff'
		} );
	} );

	it( 'reads the Codex custom properties when present', () => {
		document.documentElement.style.setProperty( '--color-base', '#eaecf0' );
		document.documentElement.style.setProperty( '--background-color-base', '#101418' );
		const theme = chartTheme();
		expect( theme.text ).toBe( '#eaecf0' );
		expect( theme.background ).toBe( '#101418' );
	} );
} );
