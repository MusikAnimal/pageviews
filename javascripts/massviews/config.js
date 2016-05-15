/**
 * @file Configuration for Langviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

/**
 * Configuration for Langviews application.
 * This includes selectors, defaults, and other constants specific to Langviews
 * @type {Object}
 */
const config = {
  agentSelector: '#agent_select',
  cookieExpiry: 30, // num days
  dateRangeSelector: '#range_input',
  defaults: {
    dateFormat: 'YYYY-MM-DD',
    dateRange: 'latest-20',
    daysAgo: 20,
    localizeDateFormat: 'true',
    numericalFormatting: 'true',
    project: 'en.wikipedia.org',
    params: {
      sort: 'views',
      sourceProject: '',
      direction: 1,
      massData: [],
      total: 0
    }
  },
  minDate: moment('2015-08-01'),
  maxDate: moment().subtract(1, 'days'),
  pageLimit: 500,
  platformSelector: '#platform_select',
  sourceButton: '#source_button',
  sourceInput: '#source_input',
  specialRanges: {
    'last-week': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
    'this-month': [moment().startOf('month'), moment().subtract(1, 'days').startOf('day')],
    'last-month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
    latest(offset = config.daysAgo) {
      return [moment().subtract(offset, 'days').startOf('day'), config.maxDate];
    }
  },
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  timestampFormat: 'YYYYMMDD00',
  validSources: ['pagepile', 'category']
};
module.exports = config;
