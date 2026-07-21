import { describe, expect, it } from 'vitest';
import { buildCsv } from './csv.js';

describe( 'buildCsv', () => {
	it( 'joins rows and fields', () => {
		expect( buildCsv( [ [ 'Date', 'Views' ], [ '2026-07-20', 123 ] ] ) )
			.toBe( 'Date,Views\n2026-07-20,123' );
	} );

	it( 'quotes fields containing delimiters, quotes or newlines', () => {
		expect( buildCsv( [ [ 'Foo, Bar', 'He said "hi"', 'a\nb' ] ] ) )
			.toBe( '"Foo, Bar","He said ""hi""","a\nb"' );
	} );

	it( 'serializes null and undefined as empty', () => {
		expect( buildCsv( [ [ null, undefined, 0 ] ] ) ).toBe( ',,0' );
	} );
} );
