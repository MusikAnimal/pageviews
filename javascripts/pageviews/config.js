const templates = require('./templates');

/**
 * Configuration for Pageviews application.
 * This includes selectors, defaults, and other constants specific to Pageviews
 * @type {Object}
 */
const config = {
  chartLegend: templates.chartLegend,
  defaults: {},
  templates,
  validateParams: ['project', 'platform', 'agent']
};

module.exports = config;
