/**
 * @file Configuration for Metaviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

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
  select2Input: '.aqs-select2-selector',
  validateParams: ['tools'],
  validParams: {
    tools: ['pageviews', 'topviews', 'langviews', 'siteviews', 'massviews', 'redirectviews']
  }
};

module.exports = config;
