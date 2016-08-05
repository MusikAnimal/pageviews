/**
 * @file Shared chart-specific logic
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

/**
 * Shared chart-specific logic
 * @param {class} superclass - base class
 * @returns {null} class extending superclass
 */
const ChartHelpers = superclass => class extends superclass {
  constructor(appConfig) {
    super(appConfig);

    this.chartObj = null;
    this.prevChartType = null;

    /** ensure we have a valid chart type in localStorage, result of Chart.js 1.0 to 2.0 migration */
    const storedChartType = this.getFromLocalStorage('pageviews-chart-preference');
    if (!this.config.linearCharts.includes(storedChartType) && !this.config.circularCharts.includes(storedChartType)) {
      this.setLocalStorage('pageviews-chart-preference', this.config.defaults.chartType());
    }

    // leave if there's no chart configured
    if (!this.config.chart) return;

    /** @type {Boolean} add ability to disable auto-log detection */
    this.noLogScale = location.search.includes('autolog=false');

    /** copy over app-specific chart templates */
    this.config.linearCharts.forEach(linearChart => {
      this.config.chartConfig[linearChart].opts.legendTemplate = this.config.linearLegend;
    });
    this.config.circularCharts.forEach(circularChart => {
      this.config.chartConfig[circularChart].opts.legendTemplate = this.config.circularLegend;
    });

    Object.assign(Chart.defaults.global, {animation: false, responsive: true});

    /** changing of chart types */
    $('.modal-chart-type a').on('click', e => {
      this.chartType = $(e.currentTarget).data('type');

      $('.logarithmic-scale').toggle(this.isLogarithmicCapable());

      if (this.rememberChart === 'true') {
        this.setLocalStorage('pageviews-chart-preference', this.chartType);
      }

      this.isChartApp() ? this.processInput() : this.renderData();
    });

    $(this.config.logarithmicCheckbox).on('click', () => {
      this.autoLogDetection = 'false';
      this.isChartApp() ? this.processInput(true) : this.renderData();
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
      this.isChartApp() ? this.processInput(true) : this.renderData();
    });

    /** chart download listeners */
    $('.download-png').on('click', this.exportPNG.bind(this));
    $('.print-chart').on('click', this.printChart.bind(this));
  }

  /**
   * Set the default chart type or the one from localStorage, based on settings
   * @param {Number} [numDatasets] - number of datasets
   * @returns {null} nothing
   */
  setInitialChartType(numDatasets) {
    if (this.rememberChart === 'true') {
      this.chartType = this.getFromLocalStorage('pageviews-chart-preference') || this.config.defaults.chartType(numDatasets);
    } else {
      this.chartType = this.config.defaults.chartType(numDatasets);
    }
  }

  /**
   * Destroy previous chart, if needed.
   * @returns {null} nothing
   */
  destroyChart() {
    if (this.chartObj) {
      this.chartObj.destroy();
      $('#chart-legend').html('');
    }
  }

  /**
   * Exports current chart data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @returns {null} Nothing
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
   * @returns {null} Nothing
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
   * @returns {null} nothing
   */
  exportPNG() {
    this.downloadData(this.chartObj.toBase64Image(), 'png');
  }

  /**
   * Fills in zero value to a timeseries, see:
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
      let date = moment(elem.timestamp, this.config.timestampFormat);
      alreadyThere[date] = elem;
    });
    data.items = [];

    /** Reconstruct with zeros instead of nulls */
    for (let date = moment(startDate); date <= endDate; date.add(1, 'd')) {
      if (alreadyThere[date]) {
        data.items.push(alreadyThere[date]);
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
   * Get data formatted for a circular chart (Pie, Doughnut, PolarArea)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} entity - title of entity (page or site)
   * @param {integer} index - where we are in the list of entities to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getCircularData(data, entity, index) {
    const values = data.items.map(elem => this.isPageviews() ? elem.views : elem.devices),
      color = this.config.colors[index],
      value = values.reduce((a, b) => a + b),
      average = Math.round(value / values.length);

    return Object.assign({
      label: entity.descore(),
      value,
      average
    }, this.config.chartConfig[this.chartType].dataset(color));
  }

  /**
   * Get data formatted for a linear chart (line, bar, radar)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} entity - title of entity
   * @param {integer} index - where we are in the list of entities to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getLinearData(data, entity, index) {
    const values = data.items.map(elem => this.isPageviews() ? elem.views : elem.devices),
      sum = values.reduce((a, b) => a + b),
      average = Math.round(sum / values.length),
      max = Math.max(...values),
      min = Math.min(...values),
      color = this.config.colors[index % 10];

    return Object.assign({
      label: entity.descore(),
      data: values,
      sum,
      average,
      max,
      min,
      color
    }, this.config.chartConfig[this.chartType].dataset(color));
  }

  /**
   * Mother function for querying the API and processing data
   * @param  {Array}  entities - list of page names, or projects for Siteviews
   * @return {Deferred} Promise resolving with pageviews data and errors, if present
   */
  getPageViewsData(entities) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    let dfd = $.Deferred(), count = 0, failureRetries = {},
      totalRequestCount = entities.length, failedEntities = [];

    /** @type {Object} everything we need to keep track of for the promises */
    let xhrData = {
      entities,
      labels: [], // Labels (dates) for the x-axis.
      datasets: [], // Data for each article timeseries
      errors: [], // Queue up errors to show after all requests have been made
      fatalErrors: [], // Unrecoverable JavaScript errors
      promises: []
    };

    const makeRequest = (entity, index) => {
      const uriEncodedEntityName = encodeURIComponent(entity);
      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${this.project}` +
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/${uriEncodedEntityName}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({ url, dataType: 'json' });
      xhrData.promises.push(promise);

      promise.done(successData => {
        try {
          successData = this.fillInZeros(successData, startDate, endDate);

          /** Build the article's dataset. */
          if (this.config.linearCharts.includes(this.chartType)) {
            xhrData.datasets.push(this.getLinearData(successData, entity, index));
          } else {
            xhrData.datasets.push(this.getCircularData(successData, entity, index));
          }

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
          if (failureRetries[this.project]) {
            failureRetries[this.project]++;
          } else {
            failureRetries[this.project] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[this.project] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, 100, this)(entity, index);
          }
        }

        // remove this article from the list of entities to analyze
        xhrData.entities = xhrData.entities.filter(el => el !== entity);

        if (cassandraError) {
          failedEntities.push(entity);
        } else {
          // FIXME: use getSiteLink for siteviews
          this.writeMessage(`${this.getPageLink(entity, this.project)}: ${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`);
        }
      }).always(() => {
        if (++count === totalRequestCount) {
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
   * Print the chart!
   * @returns {null} Nothing
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
   * @returns {null} nothing
   */
  resetView(select2 = false) {
    try {
      /** these can fail sometimes */
      this.destroyChart();
      if (select2) this.resetSelect2();
    } catch (e) { // nothing
    } finally {
      this.stopSpinny();
      $('.data-links').addClass('invisible');
      $(this.config.chart).hide();
      this.clearMessages();
    }
  }

  /**
   * Attempt to fine-tune the pointer detection spacing based on how cluttered the chart is
   * @returns {Number} radius
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
   * @returns {null} - nothing
   */
  setupDateRangeSelector() {
    super.setupDateRangeSelector();

    /** prevent duplicate setup since the list view apps also use charts */
    if (!this.isChartApp()) return;

    const dateRangeSelector = $(this.config.dateRangeSelector);

    /** the "Latest N days" links */
    $('.date-latest a').on('click', e => {
      this.setSpecialRange(`latest-${$(e.target).data('value')}`);
    });

    dateRangeSelector.on('change', e => {
      this.setChartPointDetectionRadius();
      this.processInput();

      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
    });
  }

  /**
   * Update the chart with data provided by processInput()
   * @param {Object} xhrData - data as constructed by processInput()
   * @returns {null} - nothin
   */
  updateChart(xhrData) {
    $('#chart-legend').html(''); // clear old chart legend

    // show pending error messages if present, exiting if fatal
    if (this.showErrors(xhrData)) return;

    if (!xhrData.entities.length) {
      return this.stopSpinny();
    } else if (xhrData.entities.length === 1) {
      $('.multi-page-chart-node').hide();
    } else {
      $('.multi-page-chart-node').show();
    }

    if (this.autoLogDetection === 'true') {
      const shouldBeLogarithmic = this.shouldBeLogarithmic(xhrData.datasets.map(set => set.data));
      $(this.config.logarithmicCheckbox).prop('checked', shouldBeLogarithmic);
      $('.begin-at-zero').toggleClass('disabled', shouldBeLogarithmic);
    }

    /** preserve order of datasets due to asyn calls */
    let sortedDatasets = new Array(xhrData.entities.length);
    xhrData.datasets.forEach(dataset => {
      if (this.isLogarithmic()) dataset.data = dataset.data.map(view => view || null);
      sortedDatasets[xhrData.entities.indexOf(dataset.label.score())] = dataset;
    });

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

      if (this.config.linearCharts.includes(this.chartType)) {
        const linearData = {labels: xhrData.labels, datasets: sortedDatasets};

        if (this.chartType === 'radar') {
          options.scale.ticks.beginAtZero = $('.begin-at-zero-option').is(':checked');
        } else {
          options.scales.yAxes[0].ticks.beginAtZero = $('.begin-at-zero-option').is(':checked');
        }

        this.chartObj = new Chart(context, {
          type: this.chartType,
          data: linearData,
          options
        });
      } else {
        this.chartObj = new Chart(context, {
          type: this.chartType,
          data: {
            labels: sortedDatasets.map(d => d.label),
            datasets: [{
              data: sortedDatasets.map(d => d.value),
              backgroundColor: sortedDatasets.map(d => d.backgroundColor),
              hoverBackgroundColor: sortedDatasets.map(d => d.hoverBackgroundColor),
              averages: sortedDatasets.map(d => d.average)
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

    $('#chart-legend').html(this.chartObj.generateLegend());
    $('.data-links').removeClass('invisible');
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
      const errorMessages = xhrData.errors.unique().map(error => `<li>${error}</li>`).join('');

      /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
      // const cassandraError = errorMessages.some(message => message === 'Error in Cassandra table storage backend');

      this.writeMessage(
        `${$.i18n('api-error', 'Pageviews API')}<ul>${errorMessages}</ul>`
      );

      if (xhrData.entities && xhrData.errors.length === xhrData.entities.length) {
        return false; // everything failed!
      }
    }

    return false;
  }
};

module.exports = ChartHelpers;
