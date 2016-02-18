const config = require('../config');

let session = {
  localizeDateFormat: localStorage['pageviews-settings-localizeDateFormat'] || config.defaults.localizeDateFormat,
  numericalFormatting: localStorage['pageviews-settings-numericalFormatting'] || config.defaults.numericalFormatting,
  pageData: [],
  pageNames: [],
  params: null
};

module.exports = session;
