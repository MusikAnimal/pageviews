const config = require('./config');

let session = {
  chartObj: null,
  chartType: localStorage['pageviews-chart-preference'] || config.defaultChart,
  colors: localStorage['pageviews-colors'] || config.colors['1'],
  params: null,
  prevChartType: null
};

module.exports = session;
