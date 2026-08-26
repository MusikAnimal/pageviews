/**
 * Browser capability checks.
 */

/**
 * Whether the browser has a native widget for the given input type.
 * type=month notably has none in desktop Firefox: the input degrades
 * to a plain text field that accepts any keystrokes.
 *
 * @param {string} type
 * @return {boolean}
 */
export function supportsInputType( type ) {
	const probe = document.createElement( 'input' );
	probe.setAttribute( 'type', type );
	return probe.type === type;
}
