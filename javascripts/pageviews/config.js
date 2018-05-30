/**
 * @file Configuration for Pageviews application
 * @author MusikAnimal
 * @copyright 2016-2018 MusikAnimal
 */

const templates = require('./templates');

/**
 * Configuration for Pageviews application.
 * This includes selectors, defaults, and other constants specific to Pageviews
 * @type {Object}
 */
const config = {
  agentSelector: '#agent-select',
  chart: '.aqs-chart',
  chartLegend: templates.chartLegend,
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'latest-20'
  },
  logarithmicCheckbox: '.logarithmic-scale-option',
  platformSelector: '#platform-select',
  projectInput: '.aqs-project-input',
  select2Input: '.aqs-select2-selector',
  templates,
  validateParams: ['project', 'platform', 'agent']
};

module.exports = config;
