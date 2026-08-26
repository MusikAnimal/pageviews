import { banana } from '../i18n.js';

/**
 * Shared fragments for the per-app URL-structure dialogs, mirroring
 * the legacy views/url_parts/ partials. Everything is a function:
 * messages must not resolve before loadMessages() has run.
 */

export const code = ( text ) => `<code>${ text }</code>`;

export const defaultMsg = () => `(${ banana.i18n( 'default' ).toLowerCase() })`;

/**
 * @param {string} label Localized, lowercased by the caller if needed.
 * @return {string} Link to the pageview allowlist (valid projects).
 */
export const sitematrixLink = ( label ) => '<a target="_blank" href="https://gerrit.wikimedia.org/r/plugins/' +
	'gitiles/analytics/refinery/+/refs/heads/master/static_data/pageview/allowlist/allowlist.tsv">' +
	`${ label }</a>`;

/**
 * @param {string} label Localized, lowercased by the caller if needed.
 * @return {string} Link to the built-in namespaces manual.
 */
export const namespaceManualLink = ( label ) => '<a target="_blank" ' +
	'href="https://www.mediawiki.org/wiki/Special:MyLanguage/Manual:Namespace#Built-in_namespaces">' +
	`${ label }</a>`;

/**
 * @param {string[]} values Pre-formatted (code-wrapped) values.
 * @return {string} "One of: a, b, c" via the list-values message.
 */
export function listValues( values ) {
	return banana.i18n(
		'list-values',
		values.join( `${ banana.i18n( 'comma-character' ) } ` ),
		values.length
	);
}

/**
 * The range/start/end params every app shares (legacy _date_ranges).
 *
 * @return {Array<{name: string, html: string}>}
 */
export function dateRangeParams() {
	const rangesList = '<ul>' + [
		[ `${ code( 'latest' ) } ${ defaultMsg() }`, banana.i18n( 'url-structure-special-range-latest' ) ],
		[ code( 'latest-<i>N</i>' ), banana.i18n( 'url-structure-special-range-latest-n' ) ],
		[ code( 'current' ), banana.i18n( 'url-structure-current' ) ],
		...[ 'this-week', 'last-week', 'this-month', 'last-month', 'this-year', 'last-year' ]
			.map( ( range ) => [ code( range ), banana.i18n( range ) ] ),
		[ code( 'all-time' ), banana.i18n( 'all-time' ) ]
	].map( ( [ term, description ] ) => `<li>${ term } ${ description }</li>` ).join( '' ) + '</ul>';

	return [
		{
			name: 'range',
			html: banana.i18n( 'url-structure-special-range', code( 'start' ), code( 'end' ) ) +
				rangesList
		},
		{
			name: 'start',
			html: [
				banana.i18n( 'url-structure-start-date', code( 'YYYY-MM-DD' ), code( 'end' ) ),
				banana.i18n( 'url-structure-start-month', code( 'YYYY-MM' ) ),
				banana.i18n( 'url-structure-start-date-earliest', code( 'earliest' ) )
			].join( '<br>' )
		},
		{
			name: 'end',
			html: [
				banana.i18n( 'url-structure-end-date', code( 'YYYY-MM-DD' ) ),
				banana.i18n( 'url-structure-end-month', code( 'YYYY-MM' ) ),
				banana.i18n( 'url-structure-end-date-latest', code( 'latest' ) )
			].join( '<br>' )
		}
	];
}

/**
 * @return {{name: string, html: string}} The agent param (legacy _agent).
 */
export function agentParam() {
	return {
		name: 'agent',
		html: banana.i18n(
			'url-structure-agent',
			code( 'user' ), code( 'spider' ), code( 'automated' ), code( 'all-agents' )
		)
	};
}

/**
 * @return {{name: string, html: string}} The autolog param (legacy _autolog).
 */
export function autologParam() {
	return {
		name: 'autolog',
		html: banana.i18n(
			'url-structure-autolog',
			code( 'false' ),
			`"${ banana.i18n( 'logarithmic-scale' ) }"`
		)
	};
}

/**
 * @return {{name: string, html: string}} The mutevalidations param
 *   (legacy _mute_validations).
 */
export function muteValidationsParam() {
	return {
		name: 'mutevalidations',
		html: banana.i18n( 'url-structure-mute-validations', code( 'true' ) )
	};
}
