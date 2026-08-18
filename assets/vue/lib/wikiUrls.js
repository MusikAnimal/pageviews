/**
 * URL builders for links into the wikis themselves.
 */

/**
 * A page's revision-history URL. Given the queried period's end and
 * the edit count within it, the history view opens at that point in
 * time showing exactly those revisions (capped at MediaWiki's 500
 * per page), like the legacy tool.
 *
 * @param {string} project E.g. 'en.wikipedia.org'.
 * @param {string} title Prefixed page title, spaced or underscored.
 * @param {Object} [options]
 * @param {string} [options.end] Period end, YYYY-MM-DD.
 * @param {?number} [options.edits] Edit count within the period.
 * @return {string}
 */
export function historyUrl( project, title, { end, edits } = {} ) {
	let url = `https://${ project }/w/index.php?title=` +
		`${ encodeURIComponent( title.replace( / /g, '_' ) ) }&action=history`;
	if ( end && edits ) {
		url += `&offset=${ end.replace( /-/g, '' ) }235959&limit=${ Math.min( edits, 500 ) }`;
	}
	return url;
}
