import tokens from '@wikimedia/codex-design-tokens/theme-wikimedia-ui.json';

/**
 * The 10-color series palette, drawn from the Codex design tokens
 * (replacing the legacy tool's pastel palette).
 */
const SERIES_TOKENS = [
	'blue600',
	'yellow300',
	'red400',
	'green300',
	'lime500',
	'blue300',
	'purple500',
	'pink300',
	'yellow500',
	'gray400'
];

export const PALETTE = SERIES_TOKENS.map( ( name ) => {
	const hex = tokens.color[ name ].value;
	return [ 1, 3, 5 ].map( ( offset ) => parseInt( hex.slice( offset, offset + 2 ), 16 ) );
} );

/**
 * @param {number} index Series position; wraps beyond the palette size.
 * @param {number} [alpha]
 * @return {string} rgba() color.
 */
export function seriesColor( index, alpha = 1 ) {
	const [ r, g, b ] = PALETTE[ index % PALETTE.length ];
	return `rgba(${ r }, ${ g }, ${ b }, ${ alpha })`;
}

/**
 * A pastel take on a series color for tinted backgrounds (the input
 * chips): blended toward white — rather than an actual alpha, which
 * would sink into the dark-mode background — so the chips stay light
 * and their dark text readable in both color modes.
 *
 * @param {number} index Series position; wraps beyond the palette size.
 * @param {number} [strength] The series color's share of the blend.
 * @return {string} rgb() color.
 */
export function seriesTint( index, strength = 0.5 ) {
	const [ r, g, b ] = PALETTE[ index % PALETTE.length ]
		.map( ( channel ) => Math.round( channel * strength + 255 * ( 1 - strength ) ) );
	return `rgb(${ r }, ${ g }, ${ b })`;
}
