const siteMap = require('./site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);

/**
 * Configuration for all Pageviews applications, along with some formatting methods,
 * cached jQuery getters, and logic used only in this file.
 * Some properties may be overridden by app-specific configs.
 */
class PvConfig {
  /** set instance variable (config), also defining any private methods */
  constructor() {
    let self = this;
    const formatXAxisTick = value => {
      const dayOfWeek = moment(value, this.dateFormat).isoWeekday();
      const monthly = $('#date-type-select').val() === 'monthly';
      if (dayOfWeek === 1 && !monthly) {
        return `• ${value}`;
      } else {
        return value;
      }
    };

    const maxDate = moment().subtract(1, 'day').startOf('day'),
      maxMonth = moment().subtract(1, 'month').subtract(2, 'days').startOf('month').toDate();

    const maxDatePagecounts = moment('2016-08-05').endOf('day'),
      maxMonthPagecounts = moment('2016-07-01').toDate();

    this.config = {
      apiLimit: 20000,
      apiThrottle: 10,
      apps: [
        'pageviews', 'topviews', 'langviews', 'siteviews',
        'massviews', 'redirectviews', 'userviews', 'mediaviews'
      ],
      chartConfig: {
        line: {
          opts: {
            scales: {
              yAxes: [{
                ticks: {
                  callback: value => this.formatYAxisNumber(value)
                }
              }],
              xAxes: [{
                ticks: {
                  callback: value => {
                    return formatXAxisTick(value);
                  }
                }
              }]
            },
            legendCallback: () => this.config.chartLegend(self),
            tooltips: this.linearTooltips()
          },
          dataset(color) {
            return {
              color,
              backgroundColor: 'rgba(0,0,0,0)',
              borderWidth: 2,
              borderColor: color,
              pointColor: color,
              pointBackgroundColor: color,
              pointBorderColor: self.rgba(color, 0.2),
              pointHoverBackgroundColor: color,
              pointHoverBorderColor: color,
              pointHoverBorderWidth: 2,
              pointHoverRadius: 5,
              tension: self.bezierCurve === 'true' ? 0.4 : 0
            };
          }
        },
        bar: {
          opts: {
            scales: {
              yAxes: [{
                ticks: {
                  callback: value => this.formatYAxisNumber(value)
                }
              }],
              xAxes: [{
                barPercentage: 1.0,
                categoryPercentage: 0.85,
                ticks: {
                  callback: value => {
                    return formatXAxisTick(value);
                  }
                }
              }]
            },
            legendCallback: () => this.config.chartLegend(self),
            tooltips: this.linearTooltips('label')
          },
          dataset(color) {
            return {
              color,
              backgroundColor: self.rgba(color, 0.6),
              borderColor: self.rgba(color, 0.9),
              borderWidth: 2,
              hoverBackgroundColor: self.rgba(color, 0.75),
              hoverBorderColor: color
            };
          }
        },
        radar: {
          opts: {
            scale: {
              ticks: {
                callback: value => this.formatNumber(value)
              }
            },
            legendCallback: () => this.config.chartLegend(self),
            tooltips: this.linearTooltips()
          },
          dataset(color) {
            return {
              color,
              backgroundColor: self.rgba(color, 0.1),
              borderColor: color,
              borderWidth: 2,
              pointBackgroundColor: color,
              pointBorderColor: self.rgba(color, 0.8),
              pointHoverBackgroundColor: color,
              pointHoverBorderColor: color,
              pointHoverRadius: 5
            };
          }
        },
        pie: {
          opts: {
            legendCallback: () => this.config.chartLegend(self),
            tooltips: this.circularTooltips
          },
          dataset(color) {
            return {
              color,
              backgroundColor: color,
              hoverBackgroundColor: self.rgba(color, 0.8)
            };
          }
        },
        doughnut: {
          opts: {
            legendCallback: () => this.config.chartLegend(self),
            tooltips: this.circularTooltips
          },
          dataset(color) {
            return {
              color: color,
              backgroundColor: color,
              hoverBackgroundColor: self.rgba(color, 0.8)
            };
          }
        },
        polarArea: {
          opts: {
            scale: {
              ticks: {
                beginAtZero: true,
                callback: value => this.formatNumber(value)
              }
            },
            legendCallback: () => this.config.chartLegend(self),
            tooltips: this.circularTooltips
          },
          dataset(color) {
            return {
              color: color,
              backgroundColor: self.rgba(color, 0.7),
              hoverBackgroundColor: self.rgba(color, 0.9)
            };
          }
        }
      },
      circularCharts: ['pie', 'doughnut', 'polarArea'],
      colors: ['rgba(171, 212, 235, 1)', 'rgba(178, 223, 138, 1)', 'rgba(251, 154, 153, 1)', 'rgba(253, 191, 111, 1)', 'rgba(202, 178, 214, 1)', 'rgba(207, 182, 128, 1)', 'rgba(141, 211, 199, 1)', 'rgba(252, 205, 229, 1)', 'rgba(255, 247, 161, 1)', 'rgba(217, 217, 217, 1)'],
      defaults: {
        autocomplete: 'autocomplete',
        chartType: numDatasets => numDatasets > 1 ? 'line' : 'bar',
        dateFormat: 'YYYY-MM-DD',
        localizeDateFormat: 'true',
        numericalFormatting: 'true',
        bezierCurve: 'false',
        autoLogDetection: 'false',
        beginAtZero: 'false',
        rememberChart: 'false',
        agent: 'user',
        platform: 'all-access',
        project: 'en.wikipedia.org'
      },
      globalChartOpts: {
        animation: {
          duration: 500,
          easing: 'easeInOutQuart'
        },
        hover: {
          animationDuration: 0
        },
        legend: {
          display: false
        }
      },
      linearCharts: ['line', 'bar', 'radar'],
      linearOpts: {
        scales: {
          yAxes: [{
            ticks: {
              callback: value => this.formatNumber(value)
            }
          }]
        },
        legendCallback: chart => this.config.chartLegend(chart.data.datasets, self)
      },
      daysAgo: 20,
      minDate: moment('2015-07-01').startOf('day'),
      minDatePagecounts: moment('2007-12-09').startOf('day'),
      maxDate,
      maxMonth,
      maxDatePagecounts,
      maxMonthPagecounts,
      specialRanges: {
        'current': [maxDate, maxDate],
        'this-week': [moment().startOf('week'), moment().startOf('week').isAfter(maxDate) ? moment().startOf('week') : maxDate],
        'last-week': [moment().subtract(1, 'week').startOf('isoweek'), moment().subtract(1, 'week').endOf('isoweek')],
        'this-month': [moment().startOf('month'), moment().startOf('month').isAfter(maxDate) ? moment().startOf('month') : maxDate],
        'last-month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
        'this-year': [moment().startOf('year'), moment().startOf('year').isAfter(maxDate) ? moment().startOf('year') : maxDate],
        'last-year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
        'all-time': [moment('2015-07-01').startOf('day'), maxDate],
        latest(offset = self.config.daysAgo) {
          const target = self.isPagecounts() ? maxDatePagecounts : maxDate;
          return [moment(target).subtract(offset, 'days').startOf('day'), target];
        }
      },
      timestampFormat: 'YYYYMMDD00',
      validParams: {
        agent: ['all-agents', 'user', 'spider'],
        platform: ['all-access', 'desktop', 'mobile-app', 'mobile-web'],
        project: siteDomains
      },
      rtlLangs: ['ar', 'he', 'fa', 'ps', 'ur']
    };
  }

  /**
   * Show every other number in the y-axis.
   * @param  {Number} num - numerical value
   * @return {String|null} formatted number or null if an even number
   */
  formatYAxisNumber(num) {
    if (num % 1 === 0) {
      return this.formatNumber(num);
    } else {
      return null;
    }
  }

  /**
   * Get config for tooltips shown on linear charts, used by Chart.js
   * @param {String} [mode] - x-axis or label depending on chart type
   * @return {Object}
   */
  linearTooltips(mode) {
    return {
      mode: mode || 'x-axis',
      callbacks: {
        label: tooltipItem => {
          if (Number.isNaN(tooltipItem.yLabel)) {
            return ' ' + $.i18n('unknown');
          } else {
            return ' ' + this.formatNumber(tooltipItem.yLabel);
          }
        }
      },
      bodyFontSize: 14,
      bodySpacing: 7,
      caretSize: 0,
      titleFontSize: 14
    };
  }

  /**
   * Get config for tooltips shown on circular charts, used by Chart.js
   * @return {Object}
   */
  get circularTooltips() {
    return {
      callbacks: {
        label: (tooltipItem, chartInstance) => {
          const value = chartInstance.datasets[tooltipItem.datasetIndex].data[tooltipItem.index],
            label = chartInstance.labels[tooltipItem.index];

          if (Number.isNaN(value)) {
            return `${label}: ${$.i18n('unknown')}`;
          } else {
            return `${label}: ${this.formatNumber(value)}`;
          }
        }
      },
      bodyFontSize: 14,
      bodySpacing: 7,
      caretSize: 0,
      titleFontSize: 14
    };
  }

  /**
   * Format number based on current settings, e.g. localize with comma delimeters
   * @param {number|string} num - number to format
   * @returns {string} formatted number
   */
  formatNumber(num) {
    const numericalFormatting = localStorage.getItem('pageviews-settings-numericalFormatting') || this.config.defaults.numericalFormatting;
    if (numericalFormatting === 'true') {
      return this.n(num);
    } else {
      return num;
    }
  }

  /**
   * get date format for the browser's locale
   * @return {String} format to be passed to moment.format()
   */
  getLocaleDateString() {
    if (!navigator.language) {
      return this.config.defaults.dateFormat;
    }

    const formats = {
      'ar-sa': 'DD/MM/YY',
      'bg-bg': 'DD.M.YYYY',
      'ca-es': 'DD/MM/YYYY',
      'zh-tw': 'YYYY/M/D',
      'cs-cz': 'D.M.YYYY',
      'da-dk': 'DD-MM-YYYY',
      'de-de': 'DD.MM.YYYY',
      'el-gr': 'D/M/YYYY',
      'en-us': 'M/D/YYYY',
      'fi-fi': 'D.M.YYYY',
      'fr-fr': 'DD/MM/YYYY',
      'he-il': 'DD/MM/YYYY',
      'hu-hu': 'YYYY. MM. DD.',
      'is-is': 'D.M.YYYY',
      'it-it': 'DD/MM/YYYY',
      'ja-jp': 'YYYY/MM/DD',
      'ko-kr': 'YYYY-MM-DD',
      'nl-nl': 'D-M-YYYY',
      'nb-no': 'DD.MM.YYYY',
      'pl-pl': 'YYYY-MM-DD',
      'pt-br': 'D/M/YYYY',
      'ro-ro': 'DD.MM.YYYY',
      'ru-ru': 'DD.MM.YYYY',
      'hr-hr': 'D.M.YYYY',
      'sk-sk': 'D. M. YYYY',
      'sq-al': 'YYYY-MM-DD',
      'sv-se': 'YYYY-MM-DD',
      'th-th': 'D/M/YYYY',
      'tr-tr': 'DD.MM.YYYY',
      'ur-pk': 'DD/MM/YYYY',
      'id-id': 'DD/MM/YYYY',
      'uk-ua': 'DD.MM.YYYY',
      'be-by': 'DD.MM.YYYY',
      'sl-si': 'D.M.YYYY',
      'et-ee': 'D.MM.YYYY',
      'lv-lv': 'YYYY.MM.DD.',
      'lt-lt': 'YYYY.MM.DD',
      'fa-ir': 'MM/DD/YYYY',
      'vi-vn': 'DD/MM/YYYY',
      'hy-am': 'DD.MM.YYYY',
      'az-latn-az': 'DD.MM.YYYY',
      'eu-es': 'YYYY/MM/DD',
      'mk-mk': 'DD.MM.YYYY',
      'af-za': 'YYYY/MM/DD',
      'ka-ge': 'DD.MM.YYYY',
      'fo-fo': 'DD-MM-YYYY',
      'hi-in': 'DD-MM-YYYY',
      'ms-my': 'DD/MM/YYYY',
      'kk-kz': 'DD.MM.YYYY',
      'ky-kg': 'DD.MM.YY',
      'sw-ke': 'M/d/YYYY',
      'uz-latn-uz': 'DD/MM YYYY',
      'tt-ru': 'DD.MM.YYYY',
      'pa-in': 'DD-MM-YY',
      'gu-in': 'DD-MM-YY',
      'ta-in': 'DD-MM-YYYY',
      'te-in': 'DD-MM-YY',
      'kn-in': 'DD-MM-YY',
      'mr-in': 'DD-MM-YYYY',
      'sa-in': 'DD-MM-YYYY',
      'mn-mn': 'YY.MM.DD',
      'gl-es': 'DD/MM/YY',
      'kok-in': 'DD-MM-YYYY',
      'syr-sy': 'DD/MM/YYYY',
      'dv-mv': 'DD/MM/YY',
      'ar-iq': 'DD/MM/YYYY',
      'zh-cn': 'YYYY/M/D',
      'de-ch': 'DD.MM.YYYY',
      'en-gb': 'DD/MM/YYYY',
      'es-mx': 'DD/MM/YYYY',
      'fr-be': 'D/MM/YYYY',
      'it-ch': 'DD.MM.YYYY',
      'nl-be': 'D/MM/YYYY',
      'nn-no': 'DD.MM.YYYY',
      'pt-pt': 'DD-MM-YYYY',
      'sr-latn-cs': 'D.M.YYYY',
      'sv-fi': 'D.M.YYYY',
      'az-cyrl-az': 'DD.MM.YYYY',
      'ms-bn': 'DD/MM/YYYY',
      'uz-cyrl-uz': 'DD.MM.YYYY',
      'ar-eg': 'DD/MM/YYYY',
      'zh-hk': 'D/M/YYYY',
      'de-at': 'DD.MM.YYYY',
      'en-au': 'D/MM/YYYY',
      'es-es': 'DD/MM/YYYY',
      'fr-ca': 'YYYY-MM-DD',
      'sr-cyrl-cs': 'D.M.YYYY',
      'ar-ly': 'DD/MM/YYYY',
      'zh-sg': 'D/M/YYYY',
      'de-lu': 'DD.MM.YYYY',
      'en-ca': 'DD/MM/YYYY',
      'es-gt': 'DD/MM/YYYY',
      'fr-ch': 'DD.MM.YYYY',
      'ar-dz': 'DD-MM-YYYY',
      'zh-mo': 'D/M/YYYY',
      'de-li': 'DD.MM.YYYY',
      'en-nz': 'D/MM/YYYY',
      'es-cr': 'DD/MM/YYYY',
      'fr-lu': 'DD/MM/YYYY',
      'ar-ma': 'DD-MM-YYYY',
      'en-ie': 'DD/MM/YYYY',
      'es-pa': 'MM/DD/YYYY',
      'fr-mc': 'DD/MM/YYYY',
      'ar-tn': 'DD-MM-YYYY',
      'en-za': 'YYYY/MM/DD',
      'es-do': 'DD/MM/YYYY',
      'ar-om': 'DD/MM/YYYY',
      'en-jm': 'DD/MM/YYYY',
      'es-ve': 'DD/MM/YYYY',
      'ar-ye': 'DD/MM/YYYY',
      'en-029': 'MM/DD/YYYY',
      'es-co': 'DD/MM/YYYY',
      'ar-sy': 'DD/MM/YYYY',
      'en-bz': 'DD/MM/YYYY',
      'es-pe': 'DD/MM/YYYY',
      'ar-jo': 'DD/MM/YYYY',
      'en-tt': 'DD/MM/YYYY',
      'es-ar': 'DD/MM/YYYY',
      'ar-lb': 'DD/MM/YYYY',
      'en-zw': 'M/D/YYYY',
      'es-ec': 'DD/MM/YYYY',
      'ar-kw': 'DD/MM/YYYY',
      'en-ph': 'M/D/YYYY',
      'es-cl': 'DD-MM-YYYY',
      'ar-ae': 'DD/MM/YYYY',
      'es-uy': 'DD/MM/YYYY',
      'ar-bh': 'DD/MM/YYYY',
      'es-py': 'DD/MM/YYYY',
      'ar-qa': 'DD/MM/YYYY',
      'es-bo': 'DD/MM/YYYY',
      'es-sv': 'DD/MM/YYYY',
      'es-hn': 'DD/MM/YYYY',
      'es-ni': 'DD/MM/YYYY',
      'es-pr': 'DD/MM/YYYY',
      'am-et': 'D/M/YYYY',
      'tzm-latn-dz': 'DD-MM-YYYY',
      'iu-latn-ca': 'D/MM/YYYY',
      'sma-no': 'DD.MM.YYYY',
      'mn-mong-cn': 'YYYY/M/D',
      'gd-gb': 'DD/MM/YYYY',
      'en-my': 'D/M/YYYY',
      'prs-af': 'DD/MM/YY',
      'bn-bd': 'DD-MM-YY',
      'wo-sn': 'DD/MM/YYYY',
      'rw-rw': 'M/D/YYYY',
      'qut-gt': 'DD/MM/YYYY',
      'sah-ru': 'MM.DD.YYYY',
      'gsw-fr': 'DD/MM/YYYY',
      'co-fr': 'DD/MM/YYYY',
      'oc-fr': 'DD/MM/YYYY',
      'mi-nz': 'DD/MM/YYYY',
      'ga-ie': 'DD/MM/YYYY',
      'se-se': 'YYYY-MM-DD',
      'br-fr': 'DD/MM/YYYY',
      'smn-fi': 'D.M.YYYY',
      'moh-ca': 'M/D/YYYY',
      'arn-cl': 'DD-MM-YYYY',
      'ii-cn': 'YYYY/M/D',
      'dsb-de': 'D. M. YYYY',
      'ig-ng': 'D/M/YYYY',
      'kl-gl': 'DD-MM-YYYY',
      'lb-lu': 'DD/MM/YYYY',
      'ba-ru': 'DD.MM.YY',
      'nso-za': 'YYYY/MM/DD',
      'quz-bo': 'DD/MM/YYYY',
      'yo-ng': 'D/M/YYYY',
      'ha-latn-ng': 'D/M/YYYY',
      'fil-ph': 'M/D/YYYY',
      'ps-af': 'DD/MM/YY',
      'fy-nl': 'D-M-YYYY',
      'ne-np': 'M/D/YYYY',
      'se-no': 'DD.MM.YYYY',
      'iu-cans-ca': 'D/M/YYYY',
      'sr-latn-rs': 'D.M.YYYY',
      'si-lk': 'YYYY-MM-DD',
      'sr-cyrl-rs': 'D.M.YYYY',
      'lo-la': 'DD/MM/YYYY',
      'km-kh': 'YYYY-MM-DD',
      'cy-gb': 'DD/MM/YYYY',
      'bo-cn': 'YYYY/M/D',
      'sms-fi': 'D.M.YYYY',
      'as-in': 'DD-MM-YYYY',
      'ml-in': 'DD-MM-YY',
      'en-in': 'DD-MM-YYYY',
      'or-in': 'DD-MM-YY',
      'bn-in': 'DD-MM-YY',
      'tk-tm': 'DD.MM.YY',
      'bs-latn-ba': 'D.M.YYYY',
      'mt-mt': 'DD/MM/YYYY',
      'sr-cyrl-me': 'D.M.YYYY',
      'se-fi': 'D.M.YYYY',
      'zu-za': 'YYYY/MM/DD',
      'xh-za': 'YYYY/MM/DD',
      'tn-za': 'YYYY/MM/DD',
      'hsb-de': 'D. M. YYYY',
      'bs-cyrl-ba': 'D.M.YYYY',
      'tg-cyrl-tj': 'DD.MM.yy',
      'sr-latn-ba': 'D.M.YYYY',
      'smj-no': 'DD.MM.YYYY',
      'rm-ch': 'DD/MM/YYYY',
      'smj-se': 'YYYY-MM-DD',
      'quz-ec': 'DD/MM/YYYY',
      'quz-pe': 'DD/MM/YYYY',
      'hr-ba': 'D.M.YYYY.',
      'sr-latn-me': 'D.M.YYYY',
      'sma-se': 'YYYY-MM-DD',
      'en-sg': 'D/M/YYYY',
      'ug-cn': 'YYYY-M-D',
      'sr-cyrl-ba': 'D.M.YYYY',
      'es-us': 'M/D/YYYY'
    };

    const key = navigator.language.toLowerCase();
    return formats[key] || this.config.defaults.dateFormat;
  }

  /**
   * Set and get cached jQuery element.
   * @param {String} selector
   * @returns {jQuery}
   */
  cachedElement(selector) {
    if (this.jQueryCache[selector]) {
      return this.jQueryCache[selector];
    }
    return this.jQueryCache[selector] = $(selector);
  }

  /**
   * Get the initial month to show (when they switch from daily to monthly view)
   * @return {Date}
   */
  get initialMonthStart() {
    return moment(this.maxMonth).subtract(11, 'months').toDate();
  }

  /**
   * Get the date range selector.
   * @returns {jQuery}
   */
  get $dateRangeSelector() {
    return this.cachedElement('.date-range-selector');
  }

  /**
   * Get the agent selector.
   * @returns {jQuery}
   */
  get $agentSelector() {
    return this.cachedElement('#agent-select');
  }

  /**
   * Get the platform selector.
   * @returns {jQuery}
   */
  get $platformSelector() {
    return this.cachedElement('#platform-select');
  }

  /**
   * Get the project input.
   * @returns {jQuery}
   */
  get $projectInput() {
    return this.cachedElement('#project-input');
  }

  /**
   * Get the chart canvas element. This jQuery object cannot be cached.
   * @returns {jQuery}
   */
  get $chart() {
    return $('#chart');
  }

  /**
   * Get the select2 input.
   * @returns {jQuery}
   */
  get $select2Input() {
    return this.cachedElement('#select2-input');
  }
}

module.exports = PvConfig;
