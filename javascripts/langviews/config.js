const config = {
  agentSelector: '#agent_select',
  articleInput: '#article_input',
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
    }
  },
  cookieExpiry: 30, // num days
  dateRangeSelector: '#range_input',
  defaults: {
    dateFormat: 'YYYY-MM-DD',
    dateRange: 'last-week',
    daysAgo: 7,
    localizeDateFormat: 'true',
    numericalFormatting: 'true',
    project: 'en.wikipedia.org',
    params: {
      sort: 'views',
      direction: 1,
      langData: [],
      totals: {
        titles: [],
        badges: {},
        views: 0
      }
    }
  },
  minDate: moment('2015-08-01'),
  maxDate: moment().subtract(1, 'days'),
  langProjects: [
    'wikipedia',
    'wiktionary',
    'wikibooks',
    'wikinews',
    'wikiquote',
    'wikisource',
    'wikiversity',
    'wikivoyage'
  ],
  platformSelector: '#platform_select',
  projectInput: '#project_input',
  specialRanges: {
    'last-week': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
    'this-month': [moment().startOf('month'), moment().subtract(1, 'days').startOf('day')],
    'last-month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
    latest(offset = config.daysAgo) {
      return [moment().subtract(offset, 'days').startOf('day'), config.maxDate];
    }
  },
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  timestampFormat: 'YYYYMMDD00'
};
module.exports = config;
