/**
 * Local chart-type icons, drawn on the Codex 20x20 icon grid. Codex
 * string icons are SVG markup (path elements), same format as the
 * @wikimedia/codex-icons exports; codex-icons (as of 2.6) ships bar,
 * line and pie chart icons, so only the remaining types live here.
 */

/**
 * A ring (pie with the center removed).
 */
export const iconChartDoughnut =
	'<path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a4 4 0 110 8 4 4 0 010-8z"/>';

/**
 * Three sectors of differing radii (Nightingale rose).
 */
export const iconChartPolarArea =
	'<path d="M10 10V2a8 8 0 018 8zm0 0h6a6 6 0 01-6 6zm0 0v4a4 4 0 01-4-4z"/>';

/**
 * A pentagon web with a data polygon inside.
 */
export const iconChartRadar =
	'<path d="M10 1 19 7.5 15.6 18H4.4L1 7.5zm0 2.4L3.3 8.2l2.5 7.9h8.4l2.5-7.9z"/>' +
	'<path d="M10 6.5l3.2 2.3-1.2 4.2-4-.6-.4-3.2z"/>';
