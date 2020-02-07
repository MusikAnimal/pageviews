/**
 * Shared list-specific logic (for Langviews and Massviews)
 * @param {class} superclass - base class
 * @returns {null} class extending superclass
 */
const ListHelpers = superclass => class extends superclass {
  /**
   * Called from pv.constructor, setting common instance variables and
   *   initial set up for list-related apps
   * @param {Object} appConfig - as defined in the app's config.js
   */
  constructor(appConfig) {
    super(appConfig);
  }

  /**
   * Get search input element.
   * @returns {jQuery}
   */
  get $sourceInput() {
    return this.cachedElement('#source-input');
  }

  /**
   * Prepare chart options before showing chart view, based on current chart type
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
   */
  exportJSON() {
    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(this.outputData.listData);
    this.downloadData(jsonContent, 'json');
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
        let edgeCase = date.isSame(this.maxDate) || date.isSame(moment(this.maxDate).subtract(1, 'days'));
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
    return `pv-cache-${this.hashCode(
      this.app + JSON.stringify(this.getParams(true))
    )}`;
  }

  /**
   * Link to /pageviews for given article and chosen daterange
   * @param {String} project - base project, e.g. en.wikipedia.org
   * @param {String} page - page name
   * @returns {String} URL
   * FIXME: should include agent and platform, and use special ranges as currently specified
   */
  getPageviewsURL(project, page) {
    let startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate);
    const platform = this.$platformSelector.val();

    if (endDate.diff(startDate, 'days') === 0) {
      startDate.subtract(3, 'days');
      endDate.add(3, 'days');
    }

    return `/pageviews?start=${startDate.format('YYYY-MM-DD')}&end=${endDate.format('YYYY-MM-DD')}` +
      `&project=${project}&platform=${platform}&pages=${encodeURIComponent(page.score()).replace("'", escape)}`;
  }

  /**
   * Get params needed to create a permanent link of visible data
   * @return {Object} hash of params
   */
  getPermaLink() {
    let params = this.getParams(true);
    params.sort = this.sort;
    params.direction = this.direction;
    params.view = this.view;
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
    return !this.debug && simpleStorage.hasKey(this.getCacheKey());
  }

  /**
   * Render list of output data into view
   * @param {function} cb - block to call between initial setup and showing the output
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

    $('.sort-link .glyphicon').removeClass('glyphicon-sort-by-alphabet-alt glyphicon-sort-by-alphabet').addClass('glyphicon-sort');
    const newSortClassName = parseInt(this.direction, 10) === 1 ? 'glyphicon-sort-by-alphabet-alt' : 'glyphicon-sort-by-alphabet';
    $(`.sort-link--${this.sort} .glyphicon`).addClass(newSortClassName).removeClass('glyphicon-sort');

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
   */
  toggleView(view) {
    $('.view-btn').removeClass('active');
    $(`.view-btn--${view}`).addClass('active');
    $('.output').removeClass('list-mode')
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
        this.$logarithmicCheckbox.prop('checked', shouldBeLogarithmic);
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

      // Show labels if option is checked
      if ($('.show-labels-option').is(':checked')) {
        options = this.showPointLabels(options);
      } else {
        delete options.animation.onComplete;
        delete options.animation.onProgress;
      }

      if (this.chartType === 'radar') {
        options.scale.ticks.beginAtZero = $('.begin-at-zero-option').is(':checked');
      } else {
        options.scales.yAxes[0].ticks.beginAtZero = $('.begin-at-zero-option').is(':checked');
      }

      // list-based apps cache the data, so we need to refresh the date headings
      //  in case they changed the localization options
      this.outputData.labels = this.getDateHeadings();

      const context = this.$chart[0].getContext('2d');
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
   * @param  {Number} value - current iteration
   * @param  {Number} total - total number of iterations
   * @return {null}
   */
  updateProgressBar(value, total) {
    if (!total) {
      $('.progress-bar').css('width', '0%');
      return $('.progress-counter').text('');
    }

    const percentage = (value / total) * 100;
    $('.progress-bar').css('width', `${percentage.toFixed(2)}%`);

    if (value === total) {
      $('.progress-counter').text('Building dataset...');
    } else {
      $('.progress-counter').text(
        $.i18n('processing-page', value, total)
      );
    }
  }

  /**
   * Listeners specific to list-based apps.
   * @override
   */
  setupListeners() {
    super.setupListeners();

    $('.another-query').on('click', () => {
      this.setState('initial');
      this.pushParams(true);
    });

    $('.view-btn').on('click', e => {
      document.activeElement.blur();
      this.view = e.currentTarget.dataset.value;
      this.toggleView(this.view);
    });

    $('#pv_form').on('submit', e => {
      e.preventDefault(); // prevent page from reloading
      this.processInput();
    });
  }
};

module.exports = ListHelpers;
