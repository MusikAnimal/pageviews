/**
 * Chart colors derived from the Codex design tokens' CSS custom
 * properties, read at option-build time. Because the dark-mode stylesheet
 * overrides the same custom properties under prefers-color-scheme, this
 * automatically yields the right values for the active mode — rebuild the
 * chart option when the mode changes (see usePrefersDark()).
 */

const FALLBACKS = {
	text: '#202122',
	subtleText: '#54595d',
	border: '#a2a9b1',
	grid: '#c8ccd1',
	background: '#fff'
};

/**
 * @return {Object} Named colors for chart options.
 */
export function chartTheme() {
	const style = getComputedStyle( document.documentElement );
	const get = ( name, fallback ) => style.getPropertyValue( name ).trim() || fallback;
	return {
		text: get( '--color-base', FALLBACKS.text ),
		subtleText: get( '--color-subtle', FALLBACKS.subtleText ),
		border: get( '--border-color-base', FALLBACKS.border ),
		grid: get( '--border-color-subtle', FALLBACKS.grid ),
		background: get( '--background-color-base', FALLBACKS.background )
	};
}
