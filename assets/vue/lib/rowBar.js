/**
 * Table rows that double as a bar chart (the shared .app-row-bar
 * class): a background-image sized to the row's share of the table's
 * largest value, grown in on render. A background rather than a
 * positioned child, since a <tr> can't anchor absolute positioning on
 * our whole browser matrix.
 */

/**
 * The inline background-size carrying the row's share.
 *
 * @param {number} value
 * @param {number} max The largest value in the table.
 * @return {Object} Style object for the row.
 */
export function rowBarStyle( value, max ) {
	return { backgroundSize: `${ max > 0 ? ( 100 * value ) / max : 0 }% 100%` };
}
