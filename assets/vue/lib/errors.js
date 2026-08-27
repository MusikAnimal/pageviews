import { banana } from '../i18n.js';

/**
 * An error from our API layer or an upstream MediaWiki API, carrying the
 * machine-readable code and banana-i18n key + params from the /api/*
 * error envelope so the UI can render a localized message.
 */
export class ApiError extends Error {
	/**
	 * @param {Object} error
	 * @param {string} error.code e.g. 'invalid_param', 'upstream_error'.
	 * @param {string} [error.message] English description.
	 * @param {string[]} [error.i18n] Message key followed by its params.
	 * @param {?string} [error.upstream]
	 * @param {boolean} [error.retryable]
	 */
	constructor( { code, message, i18n = [], upstream = null, retryable = false } ) {
		super( message || code );
		this.name = 'ApiError';
		this.code = code;
		this.i18n = i18n;
		this.upstream = upstream;
		this.retryable = retryable;
	}
}

/**
 * The localized text for an error carrying an i18n envelope (see
 * ApiError), falling back to its plain message. All the stores render
 * caught errors through this.
 *
 * @param {Error} error
 * @return {string}
 */
export function errorText( error ) {
	if ( !error.i18n?.length ) {
		return error.message;
	}
	const params = [ ...error.i18n ];
	// The server only sends data params; these messages also take a
	// noun phrase ($2 — a link in richer contexts, plain text here).
	const nounPhrases = {
		'invalid-project': 'invalid-project-link',
		'massviews-wikiproject-unsupported': 'massviews-wikiproject-unsupported-link'
	};
	if ( nounPhrases[ params[ 0 ] ] && params.length === 2 ) {
		params.push( banana.i18n( nounPhrases[ params[ 0 ] ] ) );
	}
	return banana.i18n( ...params );
}
