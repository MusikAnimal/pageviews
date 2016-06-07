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
      source: 'category',
      sourceProject: '',
      direction: 1,
      massData: [],
      total: 0,
      view: 'list',
      subjectpage: 0
    }
  },
  linearLegend: `
    <strong><%= $.i18n('totals') %>:</strong>
    <%= formatNumber(chartData.sum) %> (<%= formatNumber(Math.round(chartData.average)) %>/<%= $.i18n('day') %>)
  `,
  pageLimit: 500,
  sources: {
    category: {
      placeholder: 'https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York',
      type: 'text'
    },
    pagepile: {
      placeholder: '12345',
      type: 'number'
    },
    transclusions: {
      placeholder: 'https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games',
      type: 'text'
    }
  },
  platformSelector: '#platform_select',
  sourceButton: '#source_button',
  sourceInput: '#source_input',
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  timestampFormat: 'YYYYMMDD00',
  validParams: {
    direction: ['-1', '1'],
    sort: ['title', 'views', 'original'],
    source: ['pagepile', 'category'],
    view: ['list', 'chart'],
    subjectpage: ['0', '1']
  }
};

module.exports = config;
