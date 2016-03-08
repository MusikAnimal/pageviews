const config = require('./config');

let session = {
  excludes: [],
  localizeDateFormat: localStorage['pageviews-settings-localizeDateFormat'] || config.defaults.localizeDateFormat,
  numericalFormatting: localStorage['pageviews-settings-numericalFormatting'] || config.defaults.numericalFormatting,
  offset: 0,
  max: null,
  pageData: [],
  pageNames: [],
  params: null
};

module.exports = session;
