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
