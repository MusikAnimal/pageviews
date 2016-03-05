const config = require('./config');

let session = {
  autocomplete: localStorage['pageviews-settings-autocomplete'] || config.defaults.autocomplete,
  chartObj: null,
  chartType: localStorage['pageviews-chart-preference'] || config.defaults.chartType,
  localizeDateFormat: localStorage['pageviews-settings-localizeDateFormat'] || config.defaults.localizeDateFormat,
  numericalFormatting: localStorage['pageviews-settings-numericalFormatting'] || config.defaults.numericalFormatting,
  params: null,
  prevChartType: null
};

module.exports = session;
