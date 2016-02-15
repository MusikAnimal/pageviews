const config = {
  colors: [
    'rgba(188, 203, 218, 1)',
    'rgba(224, 173, 145, 1)',
    'rgba(193, 170, 120, 1)',
    'rgba(141, 160, 117, 1)',
    'rgba(153, 138, 111, 1)',
    'rgba(242, 66, 54, 1)',
    'rgba(245, 247, 73, 1)',
    'rgba(239, 189, 235, 1)',
    'rgba(46, 134, 171, 1)',
    'rgba(86, 85, 84, 1)'
  ],
  chartType: localStorage['pageviews-chart-preference'] || 'Line',
  projectInput: '.aqs-project-input',
  dateRangeSelector: '.aqs-date-range-selector',
  articleSelector: '.aqs-article-selector',
  chart: '.aqs-chart',
  minDate: moment('2015-10-01'),
  maxDate: moment().subtract(1, 'days'),
  timestampFormat: 'YYYYMMDD00',
  daysAgo: 20,
  linearCharts: ['Line', 'Bar', 'Radar'],
  circularCharts: ['Pie', 'Doughnut', 'PolarArea'],
  chartConfig: {
    Line: {
      opts: {
        bezierCurve: false,
        legendTemplate: templates.linearLegend
      },
      dataset(color) {
        return {
          fillColor: 'rgba(0,0,0,0)',
          strokeColor: color,
          pointColor: color,
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: color,
        };
      }
    },
    Bar: {
      opts: {
        legendTemplate: templates.linearLegend,
        barValueSpacing : 0,
        barDatasetSpacing : 0
      },
      dataset(color) {
        return {
          fillColor: rgba(color, .5),
          strokeColor: rgba(color, .8),
          highlightFill: rgba(color, .75),
          highlightStroke: color
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
          highlight: rgba(color, 0.8)
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
          highlight: rgba(color, 0.8)
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
          highlight: rgba(color, 0.8)
        };
      }
    },
    Radar: {
      opts: {
        legendTemplate: templates.linearLegend
      },
      dataset(color) {
        return {
          fillColor: rgba(color, 0.1),
          strokeColor: color,
          pointColor: color,
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: color
        };
      }
    }
  },
  globalChartOpts: {
    animation: true,
    animationEasing: "easeInOutQuart",
    animationSteps: 30,
    scaleLabel: "<%= pv.n(value) %>",
    tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%= pv.n(value) %>",
    multiTooltipTemplate: "<%= pv.n(value) %>"
  }
};
