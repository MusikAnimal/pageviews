/**
 * @file Configuration for Mediaviews application
 * @author MusikAnimal
 * @copyright 2016-17 MusikAnimal
 */

const templates = require('./templates');

/**
 * Configuration for Mediaviews application.
 * This includes selectors, defaults, and other constants specific to Mediaviews
 * @type {Object}
 */
const config = {
  chart: '.aqs-chart',
  chartLegend: templates.chartLegend,
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'latest-20',
    files: ['How_Wikipedia_contributes_to_free_knowledge.webm'],
    source: 'pageviews'
  },
  logarithmicCheckbox: '.logarithmic-scale-option',
  minDate: moment('2015-01-01').startOf('day'),
  mpcDateFormat: 'YYYYMMDD',
  select2Input: '.aqs-select2-selector',
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  templates,
  validateParams: []
};

module.exports = config;
