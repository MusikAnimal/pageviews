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
  select2Input: '.aqs-select2-selector',
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'last-month',
    excludes: []
  },
  maxDate: moment(moment().utc().subtract(1, 'day').startOf('day').toDate()).startOf('day').toDate(),
  pageSize: 100,
  platformSelector: '#platform-select',
  projectInput: '.aqs-project-input',
  validateParams: ['project', 'platform'],
  timestampFormat: 'YYYYMMDD00'
};

module.exports = config;
