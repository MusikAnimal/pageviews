/**
 * @file Shared list-specific logic
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

/**
 * Shared list-specific logic
 * @param {class} superclass - base class
 * @returns {null} class extending superclass
 */
const ListHelpers = superclass => class extends superclass {
  constructor(appConfig) {
    super(appConfig);
  }

  /**
   * Copy default values over to class instance
   * Use JSON stringify/parsing so to make a deep clone of the defaults
   * @return {null} Nothing
   */
  assignDefaults() {
    Object.assign(this, JSON.parse(JSON.stringify(this.config.defaults.params)));
  }

  /**
   * Prepare chart options before showing chart view, based on current chart type
   * @return {null} Nothing
   */
  assignOutputDataChartOpts() {
    const color = this.config.colors[0];
    Object.assign(this.outputData.datasets[0], this.config.chartConfig[this.chartType].dataset(color));

    if (this.chartType === 'line') {
      this.outputData.datasets[0].fillColor = color.replace(/,\s*\d\)/, ', 0.2)');
    }
  }

  /**
   * Exports current lang data to JSON format and loads it in a new tab
   * @returns {string} stringified JSON
   */
  exportJSON() {
    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(this.outputData.listData),
      encodedUri = encodeURI(jsonContent);
    window.open(encodedUri);

    return jsonContent;
  }

  /**
   * Fills in zeros to a timeseries, see:
   * https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
   *
   * @param {object} items - entries fetched from Pageviews API
   * @param {moment} startDate - start date of range to filter through
   * @param {moment} endDate - end date of range
   * @returns {array} 0 = dataset with zeros where nulls were,
   *   1 = dates that met the edge case, meaning data is not yet available
   */
  fillInZeros(items, startDate, endDate) {
    /** Extract the dates that are already in the timeseries */
    let alreadyThere = {};
    items.forEach(elem => {
      let date = moment(elem.timestamp, this.config.timestampFormat);
      alreadyThere[date] = elem;
    });
    let data = [], datesWithoutData = [];

    /** Reconstruct with zeros instead of nulls */
    for (let date = moment(startDate); date <= endDate; date.add(1, 'd')) {
      if (alreadyThere[date]) {
        data.push(alreadyThere[date]);
      } else {
        let edgeCase = date.isSame(this.config.maxDate) || date.isSame(moment(this.config.maxDate).subtract(1, 'days'));
        data.push({
          timestamp: date.format(this.config.timestampFormat),
          views: edgeCase ? null : 0
        });
        if (edgeCase) datesWithoutData.push(date.format());
      }
    }

    return [data, datesWithoutData];
  }

  /**
   * Return cache key for current params
   * @return {String} key
   */
  getCacheKey() {
    return `lv-cache-${this.hashCode(
      JSON.stringify(this.getParams(true))
    )}`;
  }

  /**
   * Link to /pageviews for given article and chosen daterange
   * @param {String} project - base project, e.g. en.wikipedia.org
   * @param {String} page - page name
   * @returns {String} URL
   */
  // FIXME: should include agent and platform, and use special ranges as currently specified
  getPageviewsURL(project, page) {
    let startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate);
    const platform = $(this.config.platformSelector).val();

    if (endDate.diff(startDate, 'days') === 0) {
      startDate.subtract(3, 'days');
      endDate.add(3, 'days');
    }

    return `/pageviews?start=${startDate.format('YYYY-MM-DD')}` +
      `&end=${endDate.format('YYYY-MM-DD')}&project=${project}&platform=${platform}&pages=${page}`;
  }

  /**
   * Get params needed to create a permanent link of visible data
   * @return {Object} hash of params
   */
  getPermaLink() {
    let params = this.getParams(true);
    params.sort = this.sort;
    params.direction = this.direction;
    return params;
  }

  /**
   * Get current class name of <output>, representing the current state of the form
   * @return {String} state, one of this.config.formStates
   */
  getState() {
    const classList = $('main')[0].classList;
    return this.config.formStates.filter(stateName => {
      return classList.contains(stateName);
    })[0];
  }

  /**
   * Check simple storage to see if a request with the current params would be cached
   * @return {Boolean} cached or not
   */
  isRequestCached() {
    return simpleStorage.hasKey(this.getCacheKey());
  }

  /**
   * Render list of output data into view
   * @param {function} cb - block to call between initial setup and showing the output
   * @returns {null} nothing
   */
  renderData(cb) {
    const articleDatasets = this.outputData.listData;

    /** sort ascending by current sort setting */
    const sortedDatasets = articleDatasets.sort((a, b) => {
      const before = this.getSortProperty(a, this.sort),
        after = this.getSortProperty(b, this.sort);

      if (before < after) {
        return this.direction;
      } else if (before > after) {
        return -this.direction;
      } else {
        return 0;
      }
    });

    $('.sort-link span').removeClass('glyphicon-sort-by-alphabet-alt glyphicon-sort-by-alphabet').addClass('glyphicon-sort');
    const newSortClassName = parseInt(this.direction, 10) === 1 ? 'glyphicon-sort-by-alphabet-alt' : 'glyphicon-sort-by-alphabet';
    $(`.sort-link--${this.sort} span`).addClass(newSortClassName).removeClass('glyphicon-sort');

    try {
      cb(sortedDatasets);
    } catch (err) {
      this.setState('complete');
      this.showFatalErrors([err]);
    } finally {
      this.pushParams();
    }

    this.toggleView(this.view);
    /**
     * Setting the state to complete will call this.processEnded
     * We only want to this the first time, not after changing chart types, etc.
     */
    if (this.getState() !== 'complete') this.setState('complete');
  }

  /**
   * Toggle or set chart vs list view. All of the normal chart logic lives here
   * @param  {String} view - which view to set, either chart or list
   * @return {null} Nothing
   */
  toggleView(view) {
    $('.view-btn').removeClass('active');
    $(`.view-btn--${view}`).addClass('active');
    $('output').removeClass('list-mode')
      .removeClass('chart-mode')
      .addClass(`${view}-mode`);

    if (view === 'chart') {
      this.destroyChart();

      /** don't use circule charts */
      if (this.config.circularCharts.includes(this.chartType)) {
        this.chartType = 'bar';
      }

      let options = Object.assign({},
        this.config.chartConfig[this.chartType].opts,
        this.config.globalChartOpts
      );
      this.assignOutputDataChartOpts();
      this.setChartPointDetectionRadius();

      if (this.autoLogDetection === 'true') {
        const shouldBeLogarithmic = this.shouldBeLogarithmic([this.outputData.datasets[0].data]);
        $(this.config.logarithmicCheckbox).prop('checked', shouldBeLogarithmic);
      }

      if (this.isLogarithmic()) {
        options.scales = Object.assign({}, options.scales, {
          yAxes: [{
            type: 'logarithmic',
            ticks: {
              callback: (value, index, arr) => {
                const remain = value / (Math.pow(10, Math.floor(Chart.helpers.log10(value))));

                if (remain === 1 || remain === 2 || remain === 5 || index === 0 || index === arr.length - 1) {
                  return this.formatNumber(value);
                } else {
                  return '';
                }
              }
            }
          }]
        });
      }

      if (this.chartType === 'radar') {
        options.scale.ticks.beginAtZero = $('.begin-at-zero-option').is(':checked');
      } else {
        options.scales.yAxes[0].ticks.beginAtZero = $('.begin-at-zero-option').is(':checked');
      }

      const context = $(this.config.chart)[0].getContext('2d');
      this.chartObj = new Chart(context, {
        type: this.chartType,
        data: this.outputData,
        options
      });

      $('.chart-specific').show();
      $('#chart-legend').html(this.chartObj.generateLegend());
    } else {
      $('.chart-specific').hide();
    }

    this.pushParams();
  }

  /**
   * Set value of progress bar
   * @param  {Number} value - percentage as float
   * @return {null} nothing
   */
  updateProgressBar(value) {
    $('.progress-bar').css('width', `${value.toFixed(2)}%`);
  }
};

module.exports = ListHelpers;
