/**
 * Log-scale auto-detection, ported verbatim from the legacy tool
 * (chart_helpers.js shouldBeLogarithmic): a Theil-index measure of
 * inequality within each series, with the overall max appended so a
 * series that is flat but dwarfed by another still registers.
 */

/**
 * @param {Array<Array<?number>>} datasets Raw series values
 *   (nulls/NaNs treated as zeros).
 * @return {boolean} Whether a logarithmic y-axis is advisable.
 */
export function shouldUseLogScale( datasets ) {
	const sets = datasets.map( ( set ) => set.map( ( value ) => value || 0 ) );
	const maxValue = Math.max( 0, ...sets.flat() );

	if ( maxValue <= 10 ) {
		return false;
	}

	return sets.some( ( set ) => {
		const values = [ ...set, maxValue ];
		const sum = values.reduce( ( a, b ) => a + b, 0 );
		const average = sum / values.length;
		const theil = values.reduce(
			( acc, value ) => acc + ( value ? value * Math.log( value / average ) : 0 ),
			0
		);
		return theil / sum > 0.5;
	} );
}
