/**
 * @file Shared chart-specific logic
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

/**
 * Shared chart-specific logic, used in all apps except Topviews
 * @param {class} superclass - base class
 * @returns {null} class extending superclass
 */
const ChartHelpers = superclass => class extends superclass {
  /**
   * Called from pv.constructor, setting common instance variables and
   *   initial set up for chart-related apps
   * @param {Object} appConfig - as defined in the app's config.js
   */
  constructor(appConfig) {
    super(appConfig);

    this.chartObj = null;
    this.prevChartType = null;
    this.autoChartType = true; // will become false when they manually change the chart type

    /** ensure we have a valid chart type in localStorage, result of Chart.js 1.0 to 2.0 migration */
    const storedChartType = this.getFromLocalStorage('pageviews-chart-preference');
    if (!this.config.linearCharts.includes(storedChartType) && !this.config.circularCharts.includes(storedChartType)) {
      this.setLocalStorage('pageviews-chart-preference', this.config.defaults.chartType());
    }

    // leave if there's no chart configured
    if (!this.config.chart) return;

    /**
     * add ability to disable auto-log detection
     * @type {String}
     */
    this.noLogScale = location.search.includes('autolog=false');

    /** copy over app-specific chart templates */
    this.config.linearCharts.forEach(linearChart => {
      this.config.chartConfig[linearChart].opts.legendTemplate = this.config.linearLegend;
    });
    this.config.circularCharts.forEach(circularChart => {
      this.config.chartConfig[circularChart].opts.legendTemplate = this.config.circularLegend;
    });

    /** changing of chart types */
    $('.modal-chart-type a').on('click', e => {
      this.chartType = $(e.currentTarget).data('type');
      this.autoChartType = false;

      $('.logarithmic-scale').toggle(this.isLogarithmicCapable());
      $('.begin-at-zero').toggle(this.config.linearCharts.includes(this.chartType));
      $('.show-labels').toggle(['bar', 'line'].includes(this.chartType));

      if (this.rememberChart === 'true') {
        this.setLocalStorage('pageviews-chart-preference', this.chartType);
      }

      this.isChartApp() ? this.updateChart() : this.renderData();
    });

    $(this.config.logarithmicCheckbox).on('click', () => {
      this.autoLogDetection = 'false';
      this.isChartApp() ? this.updateChart() : this.renderData();
    });

    /**
     * disabled/enable begin at zero checkbox accordingly,
     * but don't update chart since the log scale value can change pragmatically and not from user input
     */
    $(this.config.logarithmicCheckbox).on('change', () => {
      $('.begin-at-zero').toggleClass('disabled', this.checked);
    });

    if (this.beginAtZero === 'true') {
      $('.begin-at-zero-option').prop('checked', true);
    }

    $('.begin-at-zero-option').on('click', () => {
      this.isChartApp() ? this.updateChart() : this.renderData();
    });

    $('.show-labels-option').on('click', () => {
      this.isChartApp() ? this.updateChart() : this.renderData();
    });

    /** chart download listeners */
    $('.download-png').on('click', this.exportPNG.bind(this));
    $('.print-chart').on('click', this.printChart.bind(this));
  }

  /**
   * Set the default chart type or the one from localStorage, based on settings
   * @param {Number} [numDatasets] - number of datasets
   */
  setInitialChartType(numDatasets = 1) {
    if (this.rememberChart === 'true') {
      this.chartType = this.getFromLocalStorage('pageviews-chart-preference') || this.config.defaults.chartType(numDatasets);
    } else {
      this.chartType = this.config.defaults.chartType(numDatasets);
    }
  }

  /**
   * Destroy previous chart, if needed.
   */
  destroyChart() {
    if (this.chartObj) {
      this.chartObj.destroy();
      $('.chart-legend').html('');
    }
  }

  /**
   * Exports current chart data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   */
  exportCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,Date,';
    let titles = [];
    let dataRows = [];
    let dates = this.getDateHeadings(false);

    // Begin constructing the dataRows array by populating it with the dates
    dates.forEach((date, index) => {
      dataRows[index] = [date];
    });

    this.chartObj.data.datasets.forEach(site => {
      // Build an array of site titles for use in the CSV header
      let siteTitle = '"' + site.label.replace(/"/g, '""') + '"';
      titles.push(siteTitle);

      // Populate the dataRows array with the data for this site
      dates.forEach((date, index) => {
        dataRows[index].push(site.data[index]);
      });
    });

    // Finish the CSV header
    csvContent = csvContent + titles.join(',') + '\n';

    // Add the rows to the CSV
    dataRows.forEach(data => {
      csvContent += data.join(',') + '\n';
    });

    this.downloadData(csvContent, 'csv');
  }

  /**
   * Exports current chart data to JSON format and loads it in a new tab
   */
  exportJSON() {
    let data = [];

    this.chartObj.data.datasets.forEach((page, index) => {
      let entry = {
        page: page.label.replace(/"/g, '\"').replace(/'/g, "\'"),
        color: page.strokeColor,
        sum: page.sum,
        daily_average: Math.round(page.sum / this.numDaysInRange())
      };

      this.getDateHeadings(false).forEach((heading, index) => {
        entry[heading.replace(/\\/,'')] = page.data[index];
      });

      data.push(entry);
    });

    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(data);
    this.downloadData(jsonContent, 'json');
  }

  /**
   * Exports current data as PNG image, opening it in a new tab
   */
  exportPNG() {
    this.downloadData(this.chartObj.toBase64Image(), 'png');
  }

  /**
   * Fills in zero values to a timeseries, see:
   * https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
   *
   * @param {object} data fetched from API
   * @param {moment} startDate - start date of range to filter through
   * @param {moment} endDate - end date of range
   * @returns {object} dataset with zeros where nulls where
   */
  fillInZeros(data, startDate, endDate) {
    /** Extract the dates that are already in the timeseries */
    let alreadyThere = {};
    data.items.forEach(elem => {
      let date = moment(elem.timestamp, this.config.timestampFormat).format('YYYYMMDD');
      alreadyThere[date] = elem;
    });
    data.items = [];

    /** Reconstruct with zeros instead of nulls */
    for (let date = moment(startDate); date <= endDate; date.add(1, 'day')) {
      if (alreadyThere[date.format('YYYYMMDD')]) {
        data.items.push(alreadyThere[date.format('YYYYMMDD')]);
      } else {
        const edgeCase = date.isSame(this.config.maxDate) || date.isSame(moment(this.config.maxDate).subtract(1, 'days'));
        data.items.push({
          timestamp: date.format(this.config.timestampFormat),
          [this.isPageviews() ? 'views' : 'devices']: edgeCase ? null : 0
        });
      }
    }

    return data;
  }

  /**
   * Get data formatted for Chart.js and the legend templates
   * @param {Array} datasets - as retrieved by getPageViewsData
   * @param {Array} labels - corresponding labels for the datasets
   * @returns {object} - ready for chart rendering
   */
  buildChartData(datasets, labels) {
    let viewKey;

    // key to use in dataseries varies based on app
    if (this.isPageviews()) {
      viewKey = 'views';
    } else if (this.app === 'metaviews') {
      viewKey = 'count';
    } else {
      viewKey = 'devices';
    }

    return datasets.map((dataset, index) => {
      /** Build the article's dataset. */
      const dateHeadings = this.getDateHeadings(false); // false to be unlocalized
      let values = new Array(dateHeadings.length),
        sum = 0, min, max = 0;

      dataset.forEach(elem => {
        const value = elem[viewKey];
        let date;

        if (this.app === 'metaviews') {
          date = elem.date;
        } else {
          date = moment(elem.timestamp, this.config.timestampFormat).format('YYYY-MM-DD');
        }

        values[dateHeadings.indexOf(date)] = value;
        sum += value || 0;
        if (value > max) max = value;
        if (min === undefined || value < min) min = value;
      });

      const average = Math.round(sum / (values.filter(val => val !== null)).length),
        label = labels[index].descore();

      const entityInfo = this.entityInfo && this.entityInfo.entities ? this.entityInfo.entities[label] : {};

      dataset = Object.assign({
        label,
        data: values,
        value: sum, // duplicated because Chart.js wants a single `value` for circular charts
        sum,
        average,
        max,
        min
      }, entityInfo);

      return dataset;
    });
  }

  /**
   * Set colors for each dataset based on the config for that chart type.
   * This is because when removing entities from Select2, the only thing
   *   thing that needs doing is to set the colors based on how many entities we have
   * This function also sets null where there are zeros if we're showing a log chart,
   *   and otherwise fills in zeros where there are nulls (due to API caveat)
   * @param {Object} outputData - should be hte same as this.outputData
   * @returns {Object} transformed data
   */
  setColorsAndLogValues(outputData) {
    return outputData.map((dataset, index) => {
      // don't try to plot zeros on a logarithmic chart
      const startDate = moment(this.daterangepicker.startDate);
      const endDate = moment(this.daterangepicker.endDate);

      // Use zero instead of null for some data due to Gotcha in Pageviews API:
      //   https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
      // For today or yesterday, do use null as the data may not be available yet
      let counter = 0;
      for (let date = startDate; date <= endDate; date.add(1, 'd')) {
        if (!dataset.data[counter]) {
          const edgeCase = date.isSame(this.config.maxDate) || date.isSame(moment(this.config.maxDate).subtract(1, 'days'));
          const zeroValue = this.isLogarithmic() ? null : 0;
          dataset.data[counter] = edgeCase ? null : zeroValue;
        }
        counter++;
      }

      const color = this.config.colors[index % 10];
      return Object.assign(dataset, {
        color
      }, this.config.chartConfig[this.chartType].dataset(color));
    });
  }

  /**
   * Get url to query the API based on app and options
   * @param {String} entity - name of entity we're querying for (page name or project name)
   * @param {moment} startDate - start date
   * @param {moment} endDate - end date
   * @return {String} the URL
   */
  getApiUrl(entity, startDate, endDate) {
    const uriEncodedEntityName = encodeURIComponent(entity);

    if (this.app === 'siteviews') {
      return this.isPageviews() ? (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/${uriEncodedEntityName}` +
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      ) : (
        `https://wikimedia.org/api/rest_v1/metrics/unique-devices/${uriEncodedEntityName}/${$(this.config.platformSelector).val()}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
    } else {
      return (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${this.project}` +
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/${uriEncodedEntityName}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
    }
  }

  /**
   * Mother function for querying the API and processing data
   * @param  {Array}  entities - list of page names, or projects for Siteviews
   * @return {Deferred} Promise resolving with pageviews data and errors, if present
   */
  getPageViewsData(entities) {
    let dfd = $.Deferred(), count = 0, failureRetries = {},
      totalRequestCount = entities.length, failedEntities = [];

    /**
     * everything we need to keep track of for the promises
     * @type {Object}
     */
    let xhrData = {
      entities,
      labels: [], // Labels (dates) for the x-axis.
      datasets: new Array(totalRequestCount), // Data for each article timeseries
      errors: [], // Queue up errors to show after all requests have been made
      fatalErrors: [], // Unrecoverable JavaScript errors
      promises: []
    };

    const makeRequest = (entity, index) => {
      const startDate = this.daterangepicker.startDate.startOf('day'),
        endDate = this.daterangepicker.endDate.startOf('day'),
        url = this.getApiUrl(entity, startDate, endDate),
        promise = $.ajax({ url, dataType: 'json' });

      xhrData.promises.push(promise);

      promise.done(successData => {
        try {
          const entityIndex = xhrData.entities.indexOf(entity);
          xhrData.datasets[entityIndex] = successData.items;

          /** fetch the labels for the x-axis on success if we haven't already */
          if (successData.items && !xhrData.labels.length) {
            xhrData.labels = successData.items.map(elem => {
              return moment(elem.timestamp, this.config.timestampFormat).format(this.dateFormat);
            });
          }
        } catch (err) {
          return xhrData.fatalErrors.push(err);
        }
      }).fail(errorData => {
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const cassandraError = errorData.responseJSON.title === 'Error in Cassandra table storage backend';

        if (cassandraError) {
          if (failureRetries[entity]) {
            failureRetries[entity]++;
          } else {
            failureRetries[entity] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[entity] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, this.config.apiThrottle, this)(entity, index);
          }
        }

        // remove this article from the list of entities to analyze
        const entityIndex = xhrData.entities.indexOf(entity);
        xhrData.entities.splice(entityIndex, 1);
        xhrData.datasets.splice(entityIndex, 1);

        if (cassandraError) {
          failedEntities.push(entity);
        } else {
          let link = this.app === 'siteviews' ? this.getSiteLink(entity) : this.getPageLink(entity, this.project);
          xhrData.errors.push(
            `${link}: ${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`
          );
        }
      }).always(() => {
        if (++count === totalRequestCount) {
          this.pageViewsData = xhrData;
          dfd.resolve(xhrData);

          if (failedEntities.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedEntities.map(failedEntity => `<li>${this.getPageLink(failedEntity, this.project.escape())}</li>`).join('') +
              '</ul>'
            ));
          }
        }
      });
    };

    entities.forEach((entity, index) => makeRequest(entity, index));

    return dfd;
  }

  /**
   * Get params needed to create a permanent link of visible data
   * @return {Object} hash of params
   */
  getPermaLink() {
    let params = this.getParams(false);
    delete params.range;
    return params;
  }

  /**
   * Are we currently in logarithmic mode?
   * @returns {Boolean} true or false
   */
  isLogarithmic() {
    return $(this.config.logarithmicCheckbox).is(':checked') && this.isLogarithmicCapable();
  }

  /**
   * Test if the current chart type supports a logarithmic scale
   * @returns {Boolean} log-friendly or not
   */
  isLogarithmicCapable() {
    return ['line', 'bar'].includes(this.chartType);
  }

  /**
   * Are we trying to show data on pageviews (as opposed to unique devices)?
   * @return {Boolean} true or false
   */
  isPageviews() {
    return this.app === 'pageviews' || $(this.config.dataSourceSelector).val() === 'pageviews';
  }

  /**
   * Are we trying to show data on pageviews (as opposed to unique devices)?
   * @return {Boolean} true or false
   */
  isUniqueDevices() {
    return !this.isPageviews();
  }

  /**
   * Print the chart!
   */
  printChart() {
    let tab = window.open();
    tab.document.write(
      `<img src="${this.chartObj.toBase64Image()}" />`
    );
    tab.print();
    tab.close();
  }

  /**
   * Removes chart, messages, and resets site selections
   * @param {boolean} [select2] whether or not to clear the Select2 input
   * @param {boolean} [clearMessages] whether or not to clear any exisitng errors from view
   */
  resetView(select2 = false, clearMessages = true) {
    try {
      /** these can fail sometimes */
      this.destroyChart();
      if (select2) this.resetSelect2();
    } catch (e) { // nothing
    } finally {
      this.stopSpinny();
      $('body').addClass('initial');
      $(this.config.chart).hide();
      if (clearMessages) this.clearMessages();
    }
  }

  /**
   * Attempt to fine-tune the pointer detection spacing based on how cluttered the chart is
   */
  setChartPointDetectionRadius() {
    if (this.chartType !== 'line') return;

    if (this.numDaysInRange() > 50) {
      Chart.defaults.global.elements.point.hitRadius = 3;
    } else if (this.numDaysInRange() > 30) {
      Chart.defaults.global.elements.point.hitRadius = 5;
    } else if (this.numDaysInRange() > 20) {
      Chart.defaults.global.elements.point.hitRadius = 10;
    } else {
      Chart.defaults.global.elements.point.hitRadius = 30;
    }
  }

  /**
   * Determine if we should show a logarithmic chart for the given dataset, based on Theil index
   * @param  {Array} datasets - pageviews
   * @return {Boolean} yes or no
   */
  shouldBeLogarithmic(datasets) {
    if (!this.isLogarithmicCapable() || this.noLogScale) {
      return false;
    }

    let sets = [];
    // convert NaNs and nulls to zeros
    datasets.forEach(dataset => {
      sets.push(dataset.map(val => val || 0));
    });

    // overall max value
    const maxValue = Math.max(...[].concat(...sets));

    if (maxValue <= 10) return false;

    let logarithmicNeeded = false;

    sets.forEach(set => {
      set.push(maxValue);

      const sum = set.reduce((a, b) => a + b),
        average = sum / set.length;
      let theil = 0;
      set.forEach(v => theil += v ? v * Math.log(v / average) : 0);

      if (theil / sum > 0.5) {
        return logarithmicNeeded = true;
      }
    });

    return logarithmicNeeded;
  }

  /**
   * sets up the daterange selector and adds listeners
   */
  setupDateRangeSelector() {
    super.setupDateRangeSelector();

    /** prevent duplicate setup since the list view apps also use charts */
    if (!this.isChartApp()) return;

    const dateRangeSelector = $(this.config.dateRangeSelector);

    /** the "Latest N days" links */
    $('.date-latest a').on('click', e => {
      const value = $(e.target).data('value');
      this.setSpecialRange(`latest-${value}`);
      $('.latest-text').text(
        $.i18n('latest-days', value)
      );
    });

    dateRangeSelector.on('change', e => {
      this.setChartPointDetectionRadius(); // FIXME: is this needed?
      this.processInput();
      $('.latest-text').text($.i18n('latest'));

      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
    });
  }

  /**
   * Update the chart with data provided by processInput()
   * @param {Object} [xhrData] - data as constructed by processInput()
   *   data is ommitted if we already have everything we need in this.outputData
   * @returns {null}
   */
  updateChart(xhrData) {
    $('.chart-legend').html(''); // clear old chart legend
    const entityNames = xhrData ? xhrData.entities : $(this.config.select2Input).val();

    // show pending error messages if present, exiting if fatal
    if (xhrData && this.showErrors(xhrData)) return;

    if (!entityNames.length) {
      return this.stopSpinny();
    } else if (entityNames.length === 1) {
      $('.multi-page-chart-node').hide();
    } else {
      $('.multi-page-chart-node').show();
    }

    if (xhrData) {
      this.outputData = this.buildChartData(xhrData.datasets, entityNames);
    }

    // first figure out if we should use a log chart
    if (this.autoLogDetection === 'true') {
      const shouldBeLogarithmic = this.shouldBeLogarithmic(this.outputData.map(set => set.data));
      $(this.config.logarithmicCheckbox).prop('checked', shouldBeLogarithmic);
      $('.begin-at-zero').toggleClass('disabled', shouldBeLogarithmic);
    }

    // set colors for datasets, and fill in nulls where there are zeros if log chart
    this.outputData = this.setColorsAndLogValues(this.outputData);

    let options = Object.assign(
      {scales: {}},
      this.config.chartConfig[this.chartType].opts,
      this.config.globalChartOpts
    );

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

    this.stopSpinny();

    try {
      $('.chart-container').html('').append("<canvas class='aqs-chart'>");
      this.setChartPointDetectionRadius();
      const context = $(this.config.chart)[0].getContext('2d');
      const grandMin = Math.min(...this.outputData.map(d => d.min));

      if (this.config.linearCharts.includes(this.chartType)) {
        const linearData = {labels: this.getDateHeadings(), datasets: this.outputData};

        if (this.chartType === 'radar') {
          options.scale.ticks.beginAtZero = grandMin === 0 || $('.begin-at-zero-option').is(':checked');
        } else {
          options.scales.yAxes[0].ticks.beginAtZero = grandMin === 0 || $('.begin-at-zero-option').is(':checked');
        }

        // Show labels if option is checked (for linear charts only)
        if ($('.show-labels-option').is(':checked')) {
          options = this.showPointLabels(options);
        } else {
          delete options.animation.onComplete;
          delete options.animation.onProgress;
        }

        this.chartObj = new Chart(context, {
          type: this.chartType,
          data: linearData,
          options
        });
      } else {
        // in case these were set when changing from linear chart type
        delete options.animation.onComplete;
        delete options.animation.onProgress;
        this.chartObj = new Chart(context, {
          type: this.chartType,
          data: {
            labels: this.outputData.map(d => d.label),
            datasets: [{
              data: this.outputData.map(d => d.value),
              backgroundColor: this.outputData.map(d => d.backgroundColor),
              hoverBackgroundColor: this.outputData.map(d => d.hoverBackgroundColor),
              averages: this.outputData.map(d => d.average)
            }]
          },
          options
        });
      }
    } catch (err) {
      return this.showErrors({
        errors: [],
        fatalErrors: [err]
      });
    }

    $('.chart-legend').html(this.chartObj.generateLegend());
    $('.data-links').removeClass('invisible');

    if (['metaviews', 'pageviews', 'siteviews'].includes(this.app)) this.updateTable();
  }

  /**
   * Show the values each point in the series
   * Courtesy of Hung Tran: http://stackoverflow.com/a/38797712/604142
   * @param {Object} options - to be passed to Chart instantiation
   * @returns {Object} modified options
   */
  showPointLabels(options) {
    if (!['bar', 'line'].includes(this.chartType)) return;

    const modifyCtx = ctx => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#444';
      ctx.font = Chart.helpers.fontString(
        Chart.defaults.global.defaultFontSize,
        Chart.defaults.global.defaultFontStyle,
        Chart.defaults.global.defaultFontFamily
      );
      return ctx;
    };

    const drawValue = (context, step) => {
      const chartInstance = context.chart;
      let ctx = modifyCtx(chartInstance.ctx);

      Chart.helpers.each(context.data.datasets.forEach((dataset, i) => {
        const meta = chartInstance.controller.getDatasetMeta(i);
        Chart.helpers.each(meta.data.forEach((bar, index) => {
          ctx.fillStyle = `rgba(68,68,68,${step})`;
          const scaleMax = dataset._meta[Object.keys(dataset._meta)[0]].data[index]._yScale.maxHeight;
          const yPos = (scaleMax - bar._model.y) / scaleMax >= 0.93 ? bar._model.y + 5 : bar._model.y - 10;
          ctx.fillText(dataset.data[index], bar._model.x, yPos);
        }), context);
      }), context);
    };

    options.animation.onComplete = function() {
      drawValue(this, 1);
    };

    options.animation.onProgress = function(state) {
      const animation = state.animationObject;
      drawValue(this, animation.currentStep / animation.numSteps);
    };

    return options;
  }


  /**
   * Show errors built in this.processInput
   * @param {object} xhrData - as built by this.processInput, like `{ errors: [], fatalErrors: [] }`
   * @returns {boolean} whether or not fatal errors occured
   */
  showErrors(xhrData) {
    if (xhrData.fatalErrors.length) {
      this.resetView(true);
      const fatalErrors = xhrData.fatalErrors.unique();
      this.showFatalErrors(fatalErrors);

      return true;
    }

    if (xhrData.errors.length) {
      // if everything failed, reset the view, clearing out space taken up by empty chart
      if (xhrData.entities && (xhrData.errors.length === xhrData.entities.length || !xhrData.entities.length)) {
        this.resetView();
      }

      xhrData.errors.unique().forEach(error => this.writeMessage(error));
    }

    return false;
  }
};

module.exports = ChartHelpers;
