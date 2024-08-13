import templates from './templates.js';

/**
 * Configuration for Pageviews application.
 * This includes selectors, defaults, and other constants specific to Pageviews
 * @type {Object}
 */
export default {
	chartLegend: templates.chartLegend,
	defaults: {},
	templates,
	validateParams: [ 'project', 'platform', 'agent' ]
};
