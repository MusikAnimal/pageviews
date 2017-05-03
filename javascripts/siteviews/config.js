/**
 * @file Configuration for Siteviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

const templates = require('./templates');

/**
 * Configuration for Siteviews application.
 * This includes selectors, defaults, and other constants specific to Siteviews
 * @type {Object}
 */
const config = {
  agentSelector: '#agent-select',
  chart: '.aqs-chart',
  chartLegend: templates.chartLegend,
  dataSourceSelector: '#data-source-select',
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'latest-20',
    projects: ['fr.wikipedia.org', 'de.wikipedia.org'],
    source: 'pageviews'
  },
  logarithmicCheckbox: '.logarithmic-scale-option',
  platformSelector: '#platform-select',
  projectInput: '.aqs-project-input',
  select2Input: '.aqs-select2-selector',
  templates,
  validateParams: ['source', 'agent', 'platform'],
  validParams: {
    source: ['pageviews', 'unique-devices', 'pagecounts'],
    agent: ['all-agents', 'user', 'spider']
  }
};

module.exports = config;
