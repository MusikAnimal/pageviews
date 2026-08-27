import { describe, expect, it } from 'vitest';
import { ApiError, errorText } from './errors.js';

describe( 'errorText', () => {
	it( 'renders the envelope i18n message', () => {
		const error = new ApiError( {
			code: 'missing_param',
			message: 'The name parameter is required.',
			i18n: [ 'param-error-3', 'name' ]
		} );
		expect( errorText( error ) ).toContain( 'name' );
		expect( errorText( error ) ).not.toContain( '$1' );
	} );

	it( 'fills the noun-phrase param the invalid-project message needs', () => {
		// The server only sends the project ($1); $2 is localized text.
		const error = new ApiError( {
			code: 'invalid_project',
			i18n: [ 'invalid-project', 'foo.bar' ]
		} );
		const text = errorText( error );
		expect( text ).toContain( 'foo.bar' );
		expect( text ).not.toContain( '$2' );
	} );

	it( 'fills the extension link text for the WikiProject gate', () => {
		const error = new ApiError( {
			code: 'unsupported_project',
			i18n: [ 'massviews-wikiproject-unsupported', 'de.wikipedia' ]
		} );
		const text = errorText( error );
		expect( text ).toContain( 'de.wikipedia' );
		expect( text ).not.toContain( '$2' );
	} );

	it( 'falls back to the plain message without an envelope', () => {
		expect( errorText( new Error( 'boom' ) ) ).toBe( 'boom' );
	} );
} );
