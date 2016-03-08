const pv = require('../shared/pv');

const config = {
  articleSelector: '.aqs-article-selector',
  dateRangeSelector: '.aqs-date-range-selector',
  daysAgo: 7,
  defaults: {
    excludes: [],
    localizeDateFormat: 'true',
    numericalFormatting: 'true',
    project: 'en.wikipedia.org'
  },
  minDate: moment('2015-10-01'),
  maxDate: moment().subtract(1, 'days'),
  pageSize: 20,
  projectInput: '.aqs-project-input',
  timestampFormat: 'YYYYMMDD00'
};
module.exports = config;
