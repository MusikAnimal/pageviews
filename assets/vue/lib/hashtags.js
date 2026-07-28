/**
 * Client for the Wikimedia hashtag search tool (the Massviews hashtag
 * source), fetched directly from the browser like the legacy tool —
 * though via the JSON endpoint; the legacy CSV one no longer works.
 */

/**
 * The unique pages with an edit tagged with the hashtag, across all
 * wikis.
 *
 * @param {string} tag Without the leading #.
 * @param {AbortSignal} [signal]
 * @return {Promise<Array<{project: string, title: string}>>} Titles
 *   are prefixed and underscored.
 * @throws {Error} On HTTP failure.
 */
export async function getHashtagPages( tag, signal = undefined ) {
	const response = await fetch(
		`https://hashtags.wmcloud.org/json/?query=${ encodeURIComponent( tag ) }`,
		{ signal }
	);
	if ( !response.ok ) {
		const error = new Error( `Hashtags API returned ${ response.status }` );
		error.i18n = [ 'api-error-unknown', 'Hashtags API' ];
		error.retryable = response.status >= 500;
		throw error;
	}
	const data = await response.json();
	// One row per edit; several edits often hit the same page.
	const pages = new Map();
	for ( const row of data.Rows || [] ) {
		const title = String( row.Page_title ).replace( / /g, '_' );
		pages.set( `${ row.Domain }|${ title }`, { project: row.Domain, title } );
	}
	return [ ...pages.values() ];
}
