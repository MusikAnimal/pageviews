/**
 * @file Configuration for Redirectviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

/**
 * Configuration for Redirectviews application.
 * This includes selectors, defaults, and other constants specific to Redirectviews
 * @type {Object}
 */
const config = {
  agentSelector: '#agent_select',
  chart: '.aqs-chart',
  chartLegend: scope => {
    return `<strong>${$.i18n('totals')}:</strong> ${scope.formatNumber(scope.outputData.sum)}
      (${scope.formatNumber(Math.round(scope.outputData.average))}/${$.i18n('day')})`;
  },
  dateRangeSelector: '#range_input',
  defaults: {
    dateRange: 'latest-20',
    sort: 'views',
    direction: 1,
    outputData: [],
    hadFailure: false,
    total: 0,
    view: 'list'
  },
  linearLegend: (datasets, scope) => {
    const numRedirects = scope.outputData.listData.length - 1;
    return `<strong>${$.i18n('totals')}:</strong>
      ${$.i18n('num-redirects', this.formatNumber(numRedirects), numRedirects)}
      &bullet;
      ${$.i18n('num-pageviews', scope.formatNumber(scope.outputData.sum), scope.outputData.sum)}
      (${scope.formatNumber(Math.round(scope.outputData.average))}/${$.i18n('day')})`;
  },
  logarithmicCheckbox: '.logarithmic-scale-option',
  platformSelector: '#platform_select',
  projectInput: '#project_input',
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  sourceInput: '#source_input',
  timestampFormat: 'YYYYMMDD00',
  validateParams: ['project', 'platform', 'agent', 'direction', 'sort', 'view'],
  validParams: {
    direction: ['-1', '1'],
    sort: ['title', 'views', 'section'],
    view: ['list', 'chart']
  }
};

module.exports = config;
