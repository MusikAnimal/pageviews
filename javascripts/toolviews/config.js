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
    dateRange: 'yesterday',
    excludes: []
  },
  formStates: ['processing', 'complete', 'search', 'reset'],
  maxDate: moment().subtract(1, 'day').startOf('day').utc().toDate(),
  pageSize: 100,
  platformSelector: '#platform-select',
  projectInput: '.aqs-project-input',
  validateParams: ['project', 'platform'],
  timestampFormat: 'YYYYMMDD00'
};

module.exports = config;
