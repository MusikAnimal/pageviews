const templates = require('./templates');

/**
 * Configuration for Mediaviews application.
 * This includes selectors, defaults, and other constants specific to Mediaviews
 * @type {Object}
 */
const config = {
  chartLegend: templates.chartLegend,
  defaults: {
    dateRange: 'latest-20',
    referer: 'all-referers',
    project: 'commons.wikimedia.org'
  },
  validParams: {
    referer: ['all-referers', 'internal', 'external', 'search-engine', 'unknown', 'none']
  },
  minDate: moment('2015-01-01').startOf('day'),
  select2Input: '.aqs-select2-selector',
  templates,
  validateParams: ['project', 'referer', 'agent']
};

module.exports = config;
