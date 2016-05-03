/**
 * @file Configuration for Topviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

const pv = require('../shared/pv');

/**
 * Configuration for Topviews application.
 * This includes selectors, defaults, and other constants specific to Topviews
 * @type {Object}
 */
const config = {
  articleSelector: '.aqs-article-selector',
  dateRangeSelector: '.aqs-date-range-selector',
  cookieExpiry: 30, // num days
  defaults: {
    dateFormat: 'YYYY-MM-DD',
    dateRange: 'last-week',
    daysAgo: 7,
    excludes: [],
    localizeDateFormat: 'true',
    numericalFormatting: 'true',
    project: 'en.wikipedia.org'
  },
  minDate: moment('2015-08-01'),
  maxDate: moment().subtract(1, 'days'),
  pageSize: 20,
  projectInput: '.aqs-project-input',
  specialRanges: {
    'last-week': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
    'this-month': [moment().startOf('month'), moment().subtract(1, 'days').startOf('day')],
    'last-month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
    latest(offset = config.daysAgo) {
      return [moment().subtract(offset, 'days').startOf('day'), config.maxDate];
    }
  },
  timestampFormat: 'YYYYMMDD00'
};
module.exports = config;
