import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from './download.js';

describe( 'downloadFile', () => {
	beforeEach( () => {
		// jsdom does not implement object URLs.
		vi.stubGlobal( 'URL', Object.assign( Object.create( URL ), {
			createObjectURL: vi.fn( () => 'blob:mock' ),
			revokeObjectURL: vi.fn()
		} ) );
	} );

	afterEach( () => {
		vi.unstubAllGlobals();
	} );

	it( 'clicks a temporary anchor and revokes the URL', () => {
		const click = vi.spyOn( HTMLAnchorElement.prototype, 'click' ).mockImplementation( () => {} );

		downloadFile( 'pageviews-2026-07-01-2026-07-20.csv', 'Date,Views', 'text/csv' );

		expect( URL.createObjectURL ).toHaveBeenCalledOnce();
		expect( click ).toHaveBeenCalledOnce();
		expect( URL.revokeObjectURL ).toHaveBeenCalledWith( 'blob:mock' );
		// The temporary anchor must not linger in the DOM.
		expect( document.querySelector( 'a[download]' ) ).toBeNull();

		click.mockRestore();
	} );
} );
