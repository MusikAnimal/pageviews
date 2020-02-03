/**
 * Configuration for Metaviews application.
 * This includes selectors, defaults, and other constants specific to Metaviews
 * @type {Object}
 */
const config = {
  chart: '.aqs-chart',
  chartLegend: $.noop,
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'latest-20'
  },
  logarithmicCheckbox: '.logarithmic-scale-option',
  maxDate: moment().utc(), // overrides maxDate in pv_config.js
  select2Input: '.aqs-select2-selector',
  validateParams: ['tools'],
  validParams: {
    tools: ['pageviews', 'topviews', 'langviews', 'siteviews', 'massviews', 'redirectviews', 'userviews']
  }
};

module.exports = config;
