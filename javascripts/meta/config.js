/**
 * @file Configuration for Metaviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

const templates = require('./templates');

/**
 * Configuration for Metaviews application.
 * This includes selectors, defaults, and other constants specific to Metaviews
 * @type {Object}
 */
const config = {
  chart: '.aqs-chart',
  circularLegend: templates.circularLegend,
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'latest-20'
  },
  linearLegend: templates.linearLegend,
  logarithmicCheckbox: '.logarithmic-scale-option',
  select2Input: '.aqs-select2-selector',
  validateParams: ['tools'],
  validParams: {
    tools: ['pageviews', 'topviews', 'langviews', 'siteviews', 'massviews', 'redirectviews']
  }
};

module.exports = config;
