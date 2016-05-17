/**
 * @file Configuration for Massviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

/**
 * Configuration for Massviews application.
 * This includes selectors, defaults, and other constants specific to Massviews
 * @type {Object}
 */
const config = {
  agentSelector: '#agent_select',
  chart: '.aqs-chart',
  dateRangeSelector: '#range_input',
  defaults: {
    dateRange: 'latest-20',
    project: 'en.wikipedia.org',
    params: {
      sort: 'views',
      sourceProject: '',
      direction: 1,
      massData: [],
      total: 0
    }
  },
  pageLimit: 500,
  platformSelector: '#platform_select',
  sourceButton: '#source_button',
  sourceInput: '#source_input',
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  timestampFormat: 'YYYYMMDD00',
  validSources: ['pagepile', 'category']
};

module.exports = config;
