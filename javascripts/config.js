/**
 * @file Configuration for Pageviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

const templates = require('./templates');
const pv = require('./shared/pv');

/**
 * Configuration for Pageviews application.
 * This includes selectors, defaults, and other constants specific to Pageviews
 * @type {Object}
 */
const config = {
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
        barDatasetSpacing: 0,
        barValueSpacing: 0,
        legendTemplate: templates.linearLegend
      },
      dataset(color) {
        return {
          fillColor: pv.rgba(color, 0.5),
          highlightFill: pv.rgba(color, 0.75),
          highlightStroke: color,
          strokeColor: pv.rgba(color, 0.8)
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
  colors: ['rgba(171, 212, 235, 1)', 'rgba(178, 223, 138, 1)', 'rgba(251, 154, 153, 1)', 'rgba(253, 191, 111, 1)', 'rgba(202, 178, 214, 1)', 'rgba(207, 182, 128, 1)', 'rgba(141, 211, 199, 1)', 'rgba(252, 205, 229, 1)', 'rgba(255, 247, 161, 1)', 'rgba(217, 217, 217, 1)'],
  cookieExpiry: 30, // num days
  defaults: {
    autocomplete: 'autocomplete',
    chartType: 'Line',
    dateFormat: 'YYYY-MM-DD',
    dateRange: 'latest-20',
    daysAgo: 20,
    localizeDateFormat: 'true',
    numericalFormatting: 'true',
    project: 'en.wikipedia.org'
  },
  dateRangeSelector: '.aqs-date-range-selector',
  globalChartOpts: {
    animation: true,
    animationEasing: 'easeInOutQuart',
    animationSteps: 30,
    labelsFilter: (value, index, labels) => {
      if (labels.length >= 60) {
        return (index + 1) % Math.ceil(labels.length / 60 * 2) !== 0;
      } else {
        return false;
      }
    },
    multiTooltipTemplate: '<%= formatNumber(value) %>',
    scaleLabel: '<%= formatNumber(value) %>',
    tooltipTemplate: '<%if (label){%><%=label%>: <%}%><%= formatNumber(value) %>'
  },
  linearCharts: ['Line', 'Bar', 'Radar'],
  minDate: moment('2015-07-01').startOf('day'),
  maxDate: moment().subtract(1, 'days').startOf('day'),
  platformSelector: '#platform-select',
  projectInput: '.aqs-project-input',
  select2Input: '.aqs-article-selector',
  specialRanges: {
    'last-week': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
    'this-month': [moment().startOf('month'), moment().subtract(1, 'days').startOf('day')],
    'last-month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
    latest(offset = config.daysAgo) {
      return [moment().subtract(offset, 'days').startOf('day'), config.maxDate];
    }
  },
  timestampFormat: 'YYYYMMDD00'
};

module.exports = config;
