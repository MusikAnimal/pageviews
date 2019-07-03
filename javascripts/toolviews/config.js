/**
 * @file Configuration for Toolviews application
 * @author MusikAnimal
 * @copyright 2019 MusikAnimal
 */

const pv = require('../shared/pv');

/**
 * Configuration for Toolviews application.
 * This includes selectors, defaults, and other constants specific to Toolviews
 * @type {Object}
 */
const config = {
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    dateRange: 'yesterday'
  },
  formStates: ['processing', 'complete', 'search', 'reset'],
  minDate: moment('2018-04-29').startOf('day'),
  maxDate: moment().startOf('day').utc().toDate(),
  pageSize: 100,
  timestampFormat: 'YYYY-MM-DD',
  validateParams: []
};

module.exports = config;
