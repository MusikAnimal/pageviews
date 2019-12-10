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
    referer: 'all-referers',
    project: 'commons.wikimedia.org'
  },
  validParams: {
    referer: ['all-referers', 'internal', 'external', 'search-engine', 'unknown', 'none']
  },
  logarithmicCheckbox: '.logarithmic-scale-option',
  minDate: moment('2015-01-01').startOf('day'),
  projectInput: '.aqs-project-input',
  select2Input: '.aqs-select2-selector',
  templates,
  validateParams: ['project', 'referer', 'agent']
};

module.exports = config;
