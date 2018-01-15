/**
 * @file Configuration for Userviews application
 * @author MusikAnimal
 * @copyright 2016-2018 MusikAnimal
 */

/**
 * Configuration for Userviews application.
 * This includes selectors, defaults, and other constants specific to Userviews
 * @type {Object}
 */
const config = {
  agentSelector: '#agent_select',
  chart: '.aqs-chart',
  badges: {
    'Q17437796': {
      image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Cscr-featured.svg',
      name: 'Featured article'
    },
    'Q17437798': {
      image: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Symbol_support_vote.svg',
      name: 'Good article'
    },
    'Q17559452': {
      image: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Art%C3%ADculo_bueno-blue.svg',
      name: 'Recommended article'
    },
    'Q17506997': {
      image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Cscr-featured.svg',
      name: 'Featured list'
    },
    'Q17580674': {
      image: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Cscr-featured.svg',
      name: 'Featured portal'
    },
    'Q20748092': {
      image: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Featured_article_star_-_check.svg',
      name: 'Proofread'
    },
    'Q20748093': {
      image: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Symbol_support_vote.svg',
      name: 'Validated'
    }
  },
  dateRangeSelector: '#range_input',
  defaults: {
    dateRange: 'latest-20',
    sort: 'views',
    direction: 1,
    redirects: 0,
    namespace: 0,
    outputData: [],
    hadFailure: false,
    total: 0,
    view: 'list'
  },
  chartLegend: scope => {
    return `<strong>${$.i18n('totals')}:</strong> ${scope.formatNumber(scope.outputData.sum)}
      (${scope.formatNumber(Math.round(scope.outputData.average))}/${$.i18n('day')})`;
  },
  logarithmicCheckbox: '.logarithmic-scale-option',
  platformSelector: '#platform_select',
  projectInput: '#project_input',
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  sourceInput: '#source_input',
  timestampFormat: 'YYYYMMDD00',
  validateParams: ['project', 'platform', 'agent', 'direction', 'sort', 'view', 'redirects'],
  validParams: {
    direction: ['-1', '1'],
    sort: ['title', 'views', 'datestamp', 'size'], // 'badges'],
    view: ['list', 'chart'],
    redirects: ['0', '1', '2']
  }
};

module.exports = config;
