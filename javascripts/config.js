const templates = require('./templates');
const pv = require('./shared/pv');

const config = {
  articleSelector: '.aqs-article-selector',
  chart: '.aqs-chart',
  chartConfig: {
    Line: {
      opts: {
        bezierCurve: false,
        legendTemplate: templates.linearLegend
      },
      dataset(color) {
        return {
          fillColor: 'rgba(0,0,0,0)',
          pointColor: color,
          pointHighlightFill: '#fff',
          pointHighlightStroke: color,
          pointStrokeColor: '#fff',
          strokeColor: color
        };
      }
    },
    Bar: {
      opts: {
        barDatasetSpacing : 0,
        barValueSpacing : 0,
        legendTemplate: templates.linearLegend
      },
      dataset(color) {
        return {
          fillColor: pv.rgba(color, .5),
          highlightFill: pv.rgba(color, .75),
          highlightStroke: color,
          strokeColor: pv.rgba(color, .8)
        };
      }
    },
    Pie: {
      opts: {
        legendTemplate: templates.circularLegend
      },
      dataset(color) {
        return {
          color: color,
          highlight: pv.rgba(color, 0.8)
        };
      }
    },
    Doughnut: {
      opts: {
        legendTemplate: templates.circularLegend
      },
      dataset(color) {
        return {
          color: color,
          highlight: pv.rgba(color, 0.8)
        };
      }
    },
    PolarArea: {
      opts: {
        legendTemplate: templates.circularLegend
      },
      dataset(color) {
        return {
          color: color,
          highlight: pv.rgba(color, 0.8)
        };
      }
    },
    Radar: {
      opts: {
        legendTemplate: templates.linearLegend
      },
      dataset(color) {
        return {
          fillColor: pv.rgba(color, 0.1),
          pointColor: color,
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: color,
          strokeColor: color
        };
      }
    }
  },
  circularCharts: ['Pie', 'Doughnut', 'PolarArea'],
  colors: {
    '1': ['rgba(188, 203, 218, 1)', 'rgba(224, 173, 145, 1)', 'rgba(193, 170, 120, 1)', 'rgba(141, 160, 117, 1)', 'rgba(153, 138, 111, 1)', 'rgba(242, 66, 54, 1)', 'rgba(245, 247, 73, 1)', 'rgba(239, 189, 235, 1)', 'rgba(46, 134, 171, 1)', 'rgba(86, 85, 84, 1)'],
    '2': ['rgba(166, 206, 227, 1)', 'rgba(178, 223, 138, 1)', 'rgba(251, 154, 153, 1)', 'rgba(253, 191, 111, 1)', 'rgba(202, 178, 214, 1)', 'rgba(31, 119, 180, 1)', 'rgba(51, 160, 44, 1)', 'rgba(227, 26, 28, 1)', 'rgba(255, 127, 0, 1)', 'rgba(106, 61, 154, 1)'],
    '3': ['rgba(141, 211, 199, 1)', 'rgba(255, 255, 179, 1)', 'rgba(190, 186, 218, 1)', 'rgba(251, 128, 114, 1)', 'rgba(128, 177, 211, 1)', 'rgba(253, 180, 98, 1)', 'rgba(179, 222, 105, 1)', 'rgba(252, 205, 229, 1)', 'rgba(217, 217, 217, 1)', 'rgba(188, 128, 189, 1)']
  },
  daysAgo: 20,
  defaults: {
    autocomplete: 'autocomplete',
    chartType: 'Line',
    colorPalette: '1',
    dateFormat: 'YYYY-MM-DD',
    localizeDateFormat: 'true',
    numericalFormatting: 'true',
    project: 'en.wikipedia.org'
  },
  dateRangeSelector: '.aqs-date-range-selector',
  globalChartOpts: {
    animation: true,
    animationEasing: "easeInOutQuart",
    animationSteps: 30,
    multiTooltipTemplate: "<%= formatNumber(value) %>",
    scaleLabel: "<%= formatNumber(value) %>",
    tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%= formatNumber(value) %>"
  },
  linearCharts: ['Line', 'Bar', 'Radar'],
  minDate: moment('2015-10-01'),
  maxDate: moment().subtract(1, 'days'),
  projectInput: '.aqs-project-input',
  timestampFormat: 'YYYYMMDD00'
};

module.exports = config;
