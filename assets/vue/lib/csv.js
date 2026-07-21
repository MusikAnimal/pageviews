/**
 * Minimal CSV serialization for data exports.
 */

/**
 * @param {*} value
 * @return {string} The value, quoted if it contains a delimiter,
 *   quote or newline (RFC 4180).
 */
function serializeField( value ) {
	const str = String( value ?? '' );
	if ( /[",\n\r]/.test( str ) ) {
		return `"${ str.replace( /"/g, '""' ) }"`;
	}
	return str;
}

/**
 * @param {Array<Array>} rows Including the header row, if any.
 * @return {string} CSV text with \n line endings.
 */
export function buildCsv( rows ) {
	return rows.map( ( row ) => row.map( serializeField ).join( ',' ) ).join( '\n' );
}
