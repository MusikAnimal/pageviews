const templates = require('./templates');

/**
 * Configuration for Pageviews application.
 * This includes selectors, defaults, and other constants specific to Pageviews
 * @type {Object}
 */
const config = {
  chartLegend: templates.chartLegend,
  defaults: {
    dateRange: 'latest-20'
  },
  templates,
  validateParams: ['project', 'platform', 'agent']
};

module.exports = config;
