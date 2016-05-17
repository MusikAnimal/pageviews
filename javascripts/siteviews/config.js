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
  circularLegend: templates.circularLegend,
  dataSourceSelector: '#data-source-select',
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'latest-20',
    projects: ['fr.wikipedia.org', 'de.wikipedia.org']
  },
  linearLegend: templates.linearLegend,
  platformSelector: '#platform-select',
  projectInput: '.aqs-project-input',
  select2Input: '.aqs-site-selector'
};

module.exports = config;
