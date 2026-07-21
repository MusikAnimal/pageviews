/**
 * Number and date formatting via Intl, replacing the legacy tool's
 * ~300-line locale-to-format lookup table.
 *
 * These are pure functions: the caller passes the locale and any
 * user-preference flags; nothing here reads stores or globals.
 */

const numberFormatters = new Map();
const dateFormatters = new Map();

/**
 * @param {number} value
 * @param {string} [locale]
 * @param {boolean} [localize] When false (user preference), plain
 *   unformatted digits are returned.
 * @return {string}
 */
export function formatNumber( value, locale = 'en', localize = true ) {
	if ( !localize ) {
		return String( value );
	}
	if ( !numberFormatters.has( locale ) ) {
		numberFormatters.set( locale, new Intl.NumberFormat( locale ) );
	}
	return numberFormatters.get( locale ).format( value );
}

/**
 * @param {Date} date
 * @param {Object} [options]
 * @param {string} [options.locale]
 * @param {boolean} [options.monthly] Format as a month rather than a day.
 * @param {boolean} [options.localize] When false (user preference),
 *   ISO YYYY-MM-DD / YYYY-MM is returned.
 * @return {string}
 */
export function formatDate( date, { locale = 'en', monthly = false, localize = true } = {} ) {
	if ( !localize ) {
		const iso = date.toISOString();
		return monthly ? iso.slice( 0, 7 ) : iso.slice( 0, 10 );
	}
	const key = `${ locale }|${ monthly }`;
	if ( !dateFormatters.has( key ) ) {
		dateFormatters.set( key, new Intl.DateTimeFormat( locale, {
			timeZone: 'UTC',
			year: 'numeric',
			month: monthly ? 'long' : 'short',
			...( monthly ? {} : { day: 'numeric' } )
		} ) );
	}
	return dateFormatters.get( key ).format( date );
}
