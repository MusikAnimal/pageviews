let session = {
  chartObj: null,
  chartType: localStorage['pageviews-chart-preference'] || config.defaultChart,
  params: null,
  prevChartType: null
};
