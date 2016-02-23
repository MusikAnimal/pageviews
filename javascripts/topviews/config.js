const pv = require('../shared/pv');

const config = {
  articleSelector: '.aqs-article-selector',
  dateRangeSelector: '.aqs-date-range-selector',
  daysAgo: 20,
  defaults: {
    excludes: ['Main Page', 'Special:Search'],
    localizeDateFormat: 'true',
    project: 'en.wikipedia.org'
  },
  localizeDateFormat: 'true',
  minDate: moment('2015-10-01'),
  maxDate: moment().subtract(1, 'days'),
  pageSize: 20,
  projectInput: '.aqs-project-input',
  timestampFormat: 'YYYYMMDD00'
};

module.exports = config;
