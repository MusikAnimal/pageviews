/**
 * Configuration for Metaviews application.
 * This includes selectors, defaults, and other constants specific to Metaviews
 * @type {Object}
 */
const config = {
  chartLegend: $.noop,
  defaults: {
    dateRange: 'latest-20'
  },
  maxDate: moment().utc(), // overrides maxDate in pv_config.js
  select2Input: '.aqs-select2-selector',
  validateParams: ['tools'],
  validParams: {
    tools: ['pageviews', 'topviews', 'langviews', 'siteviews', 'massviews', 'redirectviews', 'userviews']
  }
};

module.exports = config;
