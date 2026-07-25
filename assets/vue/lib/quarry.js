/**
 * Client for the Quarry results API (the Massviews quarry source),
 * fetched directly from the browser like the legacy tool.
 */

/**
 * The page_title column of a Quarry query's latest result set.
 *
 * @param {string} id Quarry query ID.
 * @param {AbortSignal} [signal]
 * @return {Promise<?string[]>} Titles, or null when the result set has
 *   no page_title column.
 * @throws {Error} On HTTP failure.
 */
export async function getQuarryTitles( id, signal = undefined ) {
	const response = await fetch(
		`https://quarry.wmcloud.org/query/${ encodeURIComponent( id ) }/result/latest/0/json`,
		{ signal }
	);
	if ( !response.ok ) {
		const error = new Error( `Quarry API returned ${ response.status }` );
		error.i18n = [ 'api-error-unknown', 'Quarry API' ];
		error.retryable = response.status >= 500;
		throw error;
	}
	const data = await response.json();
	const titleIndex = ( data.headers || [] ).indexOf( 'page_title' );
	if ( titleIndex === -1 ) {
		return null;
	}
	return ( data.rows || [] ).map( ( row ) => String( row[ titleIndex ] ) );
}
