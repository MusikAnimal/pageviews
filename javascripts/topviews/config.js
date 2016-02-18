const pv = require('../shared/pv');

const config = {
  articleSelector: '.aqs-article-selector',
  dateRangeSelector: '.aqs-date-range-selector',
  defaults: {
    excludedPages: ['Main Page', 'Special:Search']
  },
  projectInput: '.aqs-project-input',
  timestampFormat: 'YYYYMMDD00'
};

module.exports = config;
