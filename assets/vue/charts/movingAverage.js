/**
 * Trailing moving average over up to `window` points, the current one
 * included (the leading edge averages what exists so far). Nulls —
 * gapped dates — stay null and are excluded from neighboring windows.
 *
 * @param {Array<?number>} values
 * @param {number} window
 * @return {Array<?number>}
 */
export function movingAverage( values, window ) {
	return values.map( ( value, i ) => {
		if ( typeof value !== 'number' ) {
			return null;
		}
		const slice = values
			.slice( Math.max( 0, i - window + 1 ), i + 1 )
			.filter( ( neighbor ) => typeof neighbor === 'number' );
		const sum = slice.reduce( ( a, b ) => a + b, 0 );
		return Math.round( ( sum / slice.length ) * 100 ) / 100;
	} );
}
