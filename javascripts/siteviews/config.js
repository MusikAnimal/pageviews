const templates = require('./templates');

/**
 * Configuration for Siteviews application.
 * This includes selectors, defaults, and other constants specific to Siteviews
 * @type {Object}
 */
const config = {
  chartLegend: templates.chartLegend,
  dataSourceSelector: '#data-source-select',
  defaults: {
    dateRange: 'latest-20',
    projects: ['fr.wikipedia.org', 'de.wikipedia.org'],
    source: 'pageviews'
  },
  select2Input: '.aqs-select2-selector',
  templates,
  validateParams: ['source', 'agent', 'platform'],
  validParams: {
    source: ['pageviews', 'unique-devices', 'pagecounts'],
    agent: ['all-agents', 'user', 'spider']
  }
};

module.exports = config;
