/**
 * URL query-string helpers.
 */

/**
 * Serialize a param only when it differs from its default: URLs stay
 * short, and an absent param parses back to the same default.
 *
 * @param {*} value
 * @param {*} defaultValue
 * @return {*} The value, or undefined when it matches the default.
 */
export function omitDefault( value, defaultValue ) {
	return value === defaultValue ? undefined : value;
}
