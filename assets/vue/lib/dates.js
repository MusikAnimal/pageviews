/**
 * UTC date helpers and the special date ranges shared by all apps.
 *
 * All calculations are in UTC: the pageviews data is bucketed by UTC day,
 * so browser-local dates would be off by a day for many users. The legacy
 * tool used local time here, which was a long-standing bug (at 10 PM in
 * New York, "yesterday"/"today" were computed for the wrong UTC day).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * First day with pageviews (AQS) data.
 */
export const PAGEVIEWS_MIN_DATE = '2015-07-01';
/**
 * The span of the legacy pagecounts dataset.
 */
export const PAGECOUNTS_MIN_DATE = '2007-12-09';
export const PAGECOUNTS_MAX_DATE = '2016-08-05';

/**
 * @param {string} value
 * @return {boolean} Whether the value is a YYYY-MM-DD date string.
 */
export function isYmd( value ) {
	return /^\d{4}-\d{2}-\d{2}$/.test( value );
}

/**
 * @param {string} value
 * @return {boolean} Whether the value is a YYYY-MM month string.
 */
export function isYm( value ) {
	return /^\d{4}-\d{2}$/.test( value );
}

/**
 * Parse a YYYY-MM-DD or YYYY-MM string as a UTC Date.
 * Months parse to their first day.
 *
 * @param {string} value
 * @return {Date|null} null if the value is not a valid date string.
 */
export function parseDate( value ) {
	if ( isYm( value ) ) {
		value += '-01';
	}
	if ( !isYmd( value ) ) {
		return null;
	}
	const date = new Date( `${ value }T00:00:00Z` );
	return isNaN( date.getTime() ) ? null : date;
}

/**
 * @param {Date} date
 * @return {string} YYYY-MM-DD (UTC).
 */
export function formatYmd( date ) {
	return date.toISOString().slice( 0, 10 );
}

/**
 * @param {Date} date
 * @return {string} YYYY-MM (UTC).
 */
export function formatYm( date ) {
	return date.toISOString().slice( 0, 7 );
}

/**
 * @param {Date} date
 * @param {number} days May be negative.
 * @return {Date} A new date, offset by the given number of days.
 */
export function addDays( date, days ) {
	return new Date( date.getTime() + ( days * DAY_MS ) );
}

/**
 * @param {Date} date
 * @param {number} months May be negative.
 * @return {Date} A new date, offset by the given number of months (UTC).
 */
export function addMonths( date, months ) {
	const result = new Date( date );
	result.setUTCMonth( result.getUTCMonth() + months );
	return result;
}

/**
 * @return {Date} Today, at 00:00 UTC.
 */
export function todayUtc() {
	const now = new Date();
	return new Date( Date.UTC( now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() ) );
}

/**
 * The latest complete day of data.
 *
 * @return {Date} Yesterday, at 00:00 UTC.
 */
export function yesterdayUtc() {
	return addDays( todayUtc(), -1 );
}

/**
 * @param {Date} date
 * @return {Date} The first day of the date's month (UTC).
 */
export function startOfMonth( date ) {
	return new Date( Date.UTC( date.getUTCFullYear(), date.getUTCMonth(), 1 ) );
}

/**
 * @param {Date} date
 * @return {Date} The last day of the date's month (UTC).
 */
export function endOfMonth( date ) {
	return new Date( Date.UTC( date.getUTCFullYear(), date.getUTCMonth() + 1, 0 ) );
}

/**
 * @param {Date} date
 * @return {Date} The Monday of the date's ISO week (UTC).
 */
export function startOfWeek( date ) {
	// getUTCDay(): Sunday = 0 ... Saturday = 6; ISO weeks start Monday.
	const offset = ( date.getUTCDay() + 6 ) % 7;
	return addDays( date, -offset );
}

/**
 * Names accepted by resolveSpecialRange(), not counting latest-N.
 */
export const SPECIAL_RANGES = [
	'current',
	'this-week',
	'last-week',
	'this-month',
	'last-month',
	'this-year',
	'last-year',
	'all-time'
];

/**
 * Resolve a special range name to concrete dates, replicating the legacy
 * tool's semantics — with two deliberate differences: everything is UTC,
 * and weeks are consistently ISO (Monday-based; legacy mixed locale weeks
 * for this-week with ISO weeks for last-week).
 *
 * @param {string} range e.g. 'latest-20', 'last-month', 'all-time'.
 * @param {Date} [maxDate] Latest day with data; defaults to yesterday (UTC).
 * @return {?{start: Date, end: Date}} null for unrecognized names.
 */
export function resolveSpecialRange( range, maxDate = yesterdayUtc() ) {
	const latest = /^latest(?:-(\d+))?$/.exec( range );
	if ( latest ) {
		const offset = Number( latest[ 1 ] || 30 );
		return { start: addDays( maxDate, -( offset - 1 ) ), end: maxDate };
	}

	const today = todayUtc();
	// For "this-*" ranges the period may have started after maxDate
	// (e.g. on the 1st of a month); the end clamps to whichever is later.
	const clamp = ( start ) => ( { start, end: start > maxDate ? start : maxDate } );

	switch ( range ) {
		case 'current':
			return { start: maxDate, end: maxDate };
		case 'this-week':
			return clamp( startOfWeek( today ) );
		case 'last-week': {
			const start = addDays( startOfWeek( today ), -7 );
			return { start, end: addDays( start, 6 ) };
		}
		case 'this-month':
			return clamp( startOfMonth( today ) );
		case 'last-month': {
			const start = startOfMonth( addMonths( today, -1 ) );
			return { start, end: endOfMonth( start ) };
		}
		case 'this-year':
			return clamp( new Date( Date.UTC( today.getUTCFullYear(), 0, 1 ) ) );
		case 'last-year': {
			const year = today.getUTCFullYear() - 1;
			return {
				start: new Date( Date.UTC( year, 0, 1 ) ),
				end: new Date( Date.UTC( year, 11, 31 ) )
			};
		}
		case 'all-time':
			return { start: parseDate( PAGEVIEWS_MIN_DATE ), end: maxDate };
		default:
			return null;
	}
}
