/**
 * @file Shared config amongst all apps (Pageviews, Topviews, Langviews, Siteviews)
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

/**
 * Change alpha level of an rgba value
 *
 * @param {string} value - rgba value
 * @param {float|string} alpha - transparency as float value
 * @returns {string} rgba value
 */
const rgba = (value, alpha) => {
  return value.replace(/,\s*\d\)/, `, ${alpha})`);
};

/**
 * Configuration for all Pageviews applications.
 * Some properties may be overriden by app-specific configs
 * @type {Object}
 */
const pvConfig = {
  chartConfig: {
    Line: {
      opts: {
        bezierCurve: false
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
        barValueSpacing: 0
      },
      dataset(color) {
        return {
          fillColor: rgba(color, 0.5),
          highlightFill: rgba(color, 0.75),
          highlightStroke: color,
          strokeColor: rgba(color, 0.8)
        };
      }
    },
    Pie: {
      opts: {},
      dataset(color) {
        return {
          color: color,
          highlight: rgba(color, 0.8)
        };
      }
    },
    Doughnut: {
      opts: {},
      dataset(color) {
        return {
          color: color,
          highlight: rgba(color, 0.8)
        };
      }
    },
    PolarArea: {
      opts: {},
      dataset(color) {
        return {
          color: color,
          highlight: rgba(color, 0.8)
        };
      }
    },
    Radar: {
      opts: {},
      dataset(color) {
        return {
          fillColor: rgba(color, 0.1),
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
    daysAgo: 20,
    dateFormat: 'YYYY-MM-DD',
    localizeDateFormat: 'true',
    numericalFormatting: 'true'
  },
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
  specialRanges: {
    'last-week': [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
    'this-month': [moment().startOf('month'), moment().subtract(1, 'days').startOf('day')],
    'last-month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
    latest(offset = pvConfig.daysAgo) {
      return [moment().subtract(offset, 'days').startOf('day'), pvConfig.maxDate];
    }
  },
  timestampFormat: 'YYYYMMDD00'
};

module.exports = pvConfig;
