/**
 * Configuration for all Pageviews applications, along with some formatting methods,
 * cached jQuery getters, and logic used only in this file.
 * Some properties may be overridden by app-specific configs.
 */
class Config {
	/**
	 * Set instance variable (config), also defining any private methods
	 *
	 * @param {App} app Reference to the App instance.
	 * @param {Object} [appConfig] App-specific config to override defaults.
	 */
	constructor( app, appConfig = {} ) {
		this.i18n = app.i18n;
		this.templates = appConfig.templates || {};
		const formatXAxisTick = value => {
			const dayOfWeek = moment(value, app.dateFormat).isoWeekday();
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

		this.jQueryCache = {}; // Cache jQuery selectors

		this.apiLimit = 20000;
		this.apiThrottle = 10; // FIXME: probably to be removed
		this.apps = [
			'pageviews', 'topviews', 'langviews', 'siteviews',
			'massviews', 'redirectviews', 'userviews', 'mediaviews'
		];
		/**
		 * @type {Function}
		 */
		this.chartLegend = appConfig.chartLegend.bind( app ) ||
			( () => { throw new Error( 'No chart legend function defined in config!' ) } );
		this.chartConfig = {
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
					legendCallback: () => this.chartLegend.bind( app ),
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
						pointBorderColor: app.rgba(color, 0.2),
						pointHoverBackgroundColor: color,
						pointHoverBorderColor: color,
						pointHoverBorderWidth: 2,
						pointHoverRadius: 5,
						tension: this.bezierCurve === 'true' ? 0.4 : 0
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
					legendCallback: () => this.chartLegend.bind( app ),
					tooltips: this.linearTooltips('label')
				},
				dataset(color) {
					return {
						color,
						backgroundColor: app.rgba(color, 0.6),
						borderColor: app.rgba(color, 0.9),
						borderWidth: 2,
						hoverBackgroundColor: app.rgba(color, 0.75),
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
					legendCallback: () => this.chartLegend.bind( app ),
					tooltips: this.linearTooltips()
				},
				dataset(color) {
					return {
						color,
						backgroundColor: app.rgba(color, 0.1),
						borderColor: color,
						borderWidth: 2,
						pointBackgroundColor: color,
						pointBorderColor: app.rgba(color, 0.8),
						pointHoverBackgroundColor: color,
						pointHoverBorderColor: color,
						pointHoverRadius: 5
					};
				}
			},
			pie: {
				opts: {
					legendCallback: this.chartLegend.bind( app ),
					tooltips: this.circularTooltips
				},
				dataset(color) {
					return {
						color,
						backgroundColor: color,
						hoverBackgroundColor: app.rgba(color, 0.8)
					};
				}
			},
			doughnut: {
				opts: {
					legendCallback: this.chartLegend.bind( app ),
					tooltips: this.circularTooltips
				},
				dataset(color) {
					return {
						color: color,
						backgroundColor: color,
						hoverBackgroundColor: app.rgba(color, 0.8)
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
					legendCallback: this.chartLegend.bind( app ),
					tooltips: this.circularTooltips
				},
				dataset(color) {
					return {
						color: color,
						backgroundColor: app.rgba(color, 0.7),
						hoverBackgroundColor: app.rgba(color, 0.9)
					};
				}
			}
		};
		this.circularCharts = ['pie', 'doughnut', 'polarArea'];
		this.defaults = {
			alwaysRedirects: false,
			autocomplete: 'autocomplete',
			chartType: numDatasets => numDatasets > 1 ? 'line' : 'bar',
			localizeDateFormat: 'true',
			numericalFormatting: 'true',
			bezierCurve: 'false',
			autoLogDetection: 'false',
			beginAtZero: 'false',
			rememberChart: 'false',
			agent: 'user',
			platform: 'all-access',
			project: 'en.wikipedia.org',
			dateRange: 'latest-30',
		};
		this.globalChartOpts = {
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
		};
		this.linearCharts = ['line', 'bar', 'radar'];
		this.linearOpts = {
			scales: {
				yAxes: [{
					ticks: {
						callback: value => this.formatNumber(value)
					}
				}]
			},
			legendCallback: chart => this.chartLegend.bind( app, chart.data.datasets )
		};
		this.daysAgo = 30;
		this.minDate = moment('2015-07-01').startOf('day');
		this.minDatePagecounts = moment('2007-12-09').startOf('day');
		this.maxDate = maxDate;
		this.maxMonth = maxMonth;
		this.maxDatePagecounts = maxDatePagecounts;
		this.maxMonthPagecounts = maxMonthPagecounts;
		this.specialRanges = {
			'current': [maxDate, maxDate],
			'this-week': [moment().startOf('week'), moment().startOf('week').isAfter(maxDate) ? moment().startOf('week') : maxDate],
			'last-week': [moment().subtract(1, 'week').startOf('isoweek'), moment().subtract(1, 'week').endOf('isoweek')],
			'this-month': [moment().startOf('month'), moment().startOf('month').isAfter(maxDate) ? moment().startOf('month') : maxDate],
			'last-month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
			'this-year': [moment().startOf('year'), moment().startOf('year').isAfter(maxDate) ? moment().startOf('year') : maxDate],
			'last-year': [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
			'all-time': [moment('2015-07-01').startOf('day'), maxDate],
			latest(offset = this.daysAgo) {
				const target = app.isPagecounts() ? maxDatePagecounts : maxDate;
				return [moment(target).subtract(offset - 1, 'days').startOf('day'), target];
			}
		};
		this.timestampFormat = 'YYYYMMDD00';
		this.validParams = {
			agent: ['all-agents', 'user', 'spider', 'automated'],
			platform: ['all-access', 'desktop', 'mobile-app', 'mobile-web'],
			project: []
		};
		/**
		 * Params to validate for this app.
		 * @type {Array<String>}
		 */
		this.validateParams = appConfig.validateParams || [];
		this.rtlLangs = ['ar', 'he', 'fa', 'ps', 'ur']
	}

	get colors() {
		return [
			'rgba(171, 212, 235, 1)',
			'rgba(178, 223, 138, 1)',
			'rgba(251, 154, 153, 1)',
			'rgba(253, 191, 111, 1)',
			'rgba(202, 178, 214, 1)',
			'rgba(207, 182, 128, 1)',
			'rgba(141, 211, 199, 1)',
			'rgba(252, 205, 229, 1)',
			'rgba(255, 247, 161, 1)',
			'rgba(217, 217, 217, 1)'
		]
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
						return ' ' + this.i18n('unknown');
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
						return `${label}: ${this.i18n('unknown')}`;
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
		const numericalFormatting = localStorage.getItem('pageviews-settings-numericalFormatting') || this.defaults.numericalFormatting;
		if (numericalFormatting === 'true') {
			return Number( num ).toLocaleString();
		} else {
			return num;
		}
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

	/**
	 * Get the 'Data source' selector.
	 * @return {jQuery}
	 */
	get $dataSourceSelector() {
		return this.cachedElement('#data-source-select');
	}

	/**
	 * Get the 'Include redirects' checkbox.
	 * @return {jQuery}
	 */
	get $redirectsCheckbox() {
		return this.cachedElement('#redirects-checkbox');
	}
}

export default Config;
