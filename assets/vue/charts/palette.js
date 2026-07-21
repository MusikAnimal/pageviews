/**
 * The 10-color series palette carried over from the legacy tool
 * (pv_config.js), for visual continuity in charts and exports.
 */

export const PALETTE = [
	[ 171, 212, 235 ],
	[ 178, 223, 138 ],
	[ 251, 154, 153 ],
	[ 253, 191, 111 ],
	[ 202, 178, 214 ],
	[ 207, 182, 128 ],
	[ 141, 211, 199 ],
	[ 252, 205, 229 ],
	[ 255, 247, 161 ],
	[ 217, 217, 217 ]
];

/**
 * @param {number} index Series position; wraps beyond the palette size.
 * @param {number} [alpha]
 * @return {string} rgba() color.
 */
export function seriesColor( index, alpha = 1 ) {
	const [ r, g, b ] = PALETTE[ index % PALETTE.length ];
	return `rgba(${ r }, ${ g }, ${ b }, ${ alpha })`;
}
