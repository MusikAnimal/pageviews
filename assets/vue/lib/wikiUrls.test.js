import { describe, expect, it } from 'vitest';
import { historyUrl } from './wikiUrls.js';

describe( 'historyUrl', () => {
	it( 'links the history view, underscored and encoded', () => {
		expect( historyUrl( 'en.wikipedia.org', 'Café au lait' ) ).toBe(
			'https://en.wikipedia.org/w/index.php?title=Caf%C3%A9_au_lait&action=history'
		);
	} );

	it( 'pins the queried period via offset and limit', () => {
		expect( historyUrl( 'en.wikipedia.org', 'Cat', { end: '2026-06-30', edits: 42 } ) ).toBe(
			'https://en.wikipedia.org/w/index.php?title=Cat&action=history' +
				'&offset=20260630235959&limit=42'
		);
	} );

	it( 'caps the limit at 500 and omits the params for zero edits', () => {
		expect( historyUrl( 'en.wikipedia.org', 'Cat', { end: '2026-06-30', edits: 1234 } ) )
			.toContain( '&limit=500' );
		expect( historyUrl( 'en.wikipedia.org', 'Cat', { end: '2026-06-30', edits: 0 } ) )
			.not.toContain( 'offset' );
	} );
} );
