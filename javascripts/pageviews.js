/**
 * Pageviews Analysis tool
 * @file Main file for Pageviews application
 * @author MusikAnimal, Kaldari, Marcelrf
 * @copyright 2016 MusikAnimal, Kaldari, Marcelrf
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('./shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('./shared/pv');

/** Main PageViews class */
class PageViews extends Pv {
  constructor() {
    super(config);
    this.app = 'pageviews';

    this.normalized = false; /** let's us know if the page names have been normalized via the API yet */
    this.specialRange = null;

    /**
     * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
     * caused by race conditions between consecutive ajax calls. They are actually
     * not critical and can be avoided with this empty function.
     */
    window.articleSuggestionCallback = $.noop;
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   * @return {null} Nothing
   */
  initialize() {
    this.setupProjectInput();
    this.setupDateRangeSelector();
    this.setupSelect2();
    this.setupSelect2Colors();
    this.popParams();
    this.setupListeners();
    this.updateInterAppLinks();
  }

  /**
   * Exports current chart data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @returns {string} CSV content
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

    this.chartObj.data.datasets.forEach(page => {
      // Build an array of page titles for use in the CSV header
      let pageTitle = '"' + page.label.replace(/"/g, '""') + '"';
      titles.push(pageTitle);

      // Populate the dataRows array with the data for this page
      dates.forEach((date, index) => {
        dataRows[index].push(page.data[index]);
      });
    });

    // Finish the CSV header
    csvContent = csvContent + titles.join(',') + '\n';

    // Add the rows to the CSV
    dataRows.forEach(data => {
      csvContent += data.join(',') + '\n';
    });

    // Output the CSV file to the browser
    const encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
  }

  /**
   * Exports current chart data to JSON format and loads it in a new tab
   * @returns {string} stringified JSON
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

    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(data),
      encodedUri = encodeURI(jsonContent);
    window.open(encodedUri);

    return jsonContent;
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
          views: edgeCase ? null : 0
        });
      }
    }

    return data;
  }

  /**
   * Get data formatted for a circular chart (Pie, Doughnut, PolarArea)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} article - title of page
   * @param {integer} index - where we are in the list of pages to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getCircularData(data, article, index) {
    const values = data.items.map(elem => elem.views),
      color = this.config.colors[index],
      value = values.reduce((a, b) => a + b),
      average = Math.round(value / values.length);

    return Object.assign(
      {
        label: article.descore(),
        value,
        average
      },
      this.config.chartConfig[this.chartType].dataset(color)
    );
  }

  /**
   * Link to /langviews for given page and chosen daterange
   * @param {String} page - page title
   * @returns {String} URL
   */
  getLangviewsURL(page) {
    return `/langviews?${$.param(this.getParams())}&page=${page.replace(/[&%]/g, escape).score()}`;
  }

  /**
   * Get data formatted for a linear chart (line, bar, radar)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} article - title of page
   * @param {integer} index - where we are in the list of pages to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getLinearData(data, article, index) {
    const values = data.items.map(elem => elem.views),
      sum = values.reduce((a, b) => a + b),
      average = Math.round(sum / values.length),
      max = Math.max(...values),
      color = this.config.colors[index % 10];

    return Object.assign(
      {
        label: article.descore(),
        data: values,
        sum,
        average,
        max,
        color
      },
      this.config.chartConfig[this.chartType].dataset(color)
    );
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
   * Construct query for API based on what type of search we're doing
   * @param {Object} query - as returned from Select2 input
   * @returns {Object} query params to be handed off to API
   */
  getSearchParams(query) {
    if (this.autocomplete === 'autocomplete') {
      return {
        action: 'query',
        list: 'prefixsearch',
        format: 'json',
        pssearch: query || '',
        cirrusUseCompletionSuggester: 'yes'
      };
    } else if (this.autocomplete === 'autocomplete_redirects') {
      return {
        action: 'query',
        generator: 'prefixsearch',
        format: 'json',
        gpssearch: query || '',
        gpslimit: '10',
        redirects: 'true',
        cirrusUseCompletionSuggester: 'no'
      };
    }
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    let startDate, endDate, params = this.parseQueryString('pages');

    $(this.config.projectInput).val(params.project || this.config.defaults.project);
    if (this.validateProject()) return;

    this.patchUsage('pv');

    /**
     * Check if we're using a valid range, and if so ignore any start/end dates.
     * If an invalid range, throw and error and use default dates.
     */
    if (params.range) {
      if (!this.setSpecialRange(params.range)) {
        this.addSiteNotice('danger', $.i18n('param-error-3'), $.i18n('invalid-params'), true);
        this.setSpecialRange(this.config.defaults.dateRange);
      }
    } else if (params.start) {
      startDate = moment(params.start || moment().subtract(this.config.defaults.daysAgo, 'days'));
      endDate = moment(params.end || Date.now());
      if (startDate < this.config.minDate || endDate < this.config.minDate) {
        this.addSiteNotice('danger', $.i18n('param-error-1', `${$.i18n('july')} 2015`), $.i18n('invalid-params'), true);
        this.resetView();
        return;
      } else if (startDate > endDate) {
        this.addSiteNotice('warning', $.i18n('param-error-2'), $.i18n('invalid-params'), true);
        this.resetView();
        return;
      }
      /** directly assign startDate before calling setEndDate so events will be fired once */
      this.daterangepicker.startDate = startDate;
      this.daterangepicker.setEndDate(endDate);
    } else {
      this.setSpecialRange(this.config.defaults.dateRange);
    }

    $(this.config.platformSelector).val(params.platform || 'all-access');
    $('#agent-select').val(params.agent || 'user');

    this.resetSelect2();

    if (!params.pages || params.pages.length === 1 && !params.pages[0]) {
      // only set default of Cat and Dog for enwiki
      if (this.project === 'en.wikipedia') {
        params.pages = ['Cat', 'Dog'];
        this.setSelect2Defaults(params.pages);
      } else {
        this.focusSelect2();
      }
    } else if (this.normalized) {
      params.pages = this.underscorePageNames(params.pages);
      this.setSelect2Defaults(params.pages);
    } else {
      this.normalizePageNames(params.pages).then(data => {
        this.normalized = true;

        params.pages = data;

        if (params.pages.length === 1) {
          this.chartType = this.getFromLocalStorage('pageviews-chart-preference') || 'bar';
        }

        this.setSelect2Defaults(this.underscorePageNames(params.pages));
      });
    }
  }

  /**
   * Processes Mediawiki API results into Select2 format based on settings
   * @param {Object} data - data as received from the API
   * @returns {Object} data ready to handed over to Select2
   */
  processSearchResults(data) {
    const query = data ? data.query : {};
    let results = [];

    if (!query) return {results};

    if (this.autocomplete === 'autocomplete') {
      if (query.prefixsearch.length) {
        results = query.prefixsearch.map(function(elem) {
          return {
            id: elem.title.score(),
            text: elem.title
          };
        });
      }
    } else if (this.autocomplete === 'autocomplete_redirects') {
      /** first merge in redirects */
      if (query.redirects) {
        results = query.redirects.map(red => {
          return {
            id: red.from.score(),
            text: red.from
          };
        });
      }

      Object.keys(query.pages).forEach(pageId => {
        const pageData = query.pages[pageId];
        results.push({
          id: pageData.title.score(),
          text: pageData.title
        });
      });
    }

    return {results: results};
  }

  /**
   * Get all user-inputted parameters except the pages
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} project, platform, agent, etc.
   */
  getParams(specialRange = true) {
    let params = {
      project: $(this.config.projectInput).val(),
      platform: $(this.config.platformSelector).val(),
      agent: $('#agent-select').val()
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in config.specialRanges, constructed like `{range: 'last-month'}`,
     *   or a relative range like `{range: 'latest-N'}` where N is the number of days.
     */
    if (this.specialRange && specialRange) {
      params.range = this.specialRange.range;
    } else {
      params.start = this.daterangepicker.startDate.format('YYYY-MM-DD');
      params.end = this.daterangepicker.endDate.format('YYYY-MM-DD');
    }

    return params;
  }

  /**
   * Replaces history state with new URL query string representing current user input
   * Called whenever we go to update the chart
   * @returns {null} nothing
   */
  pushParams() {
    const pages = $(this.config.select2Input).select2('val') || [],
      escapedPages = pages.join('|').replace(/[&%]/g, escape);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&pages=${escapedPages}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&pages=${escapedPages}`);
  }

  /**
   * Removes chart, messages, and resets article selections
   * @param {boolean} [select2] whether or not to clear the Select2 input
   * @returns {null} nothing
   */
  resetView(select2 = false) {
    $('.chart-container').removeClass('loading');
    $('.data-links').addClass('invisible');
    $(this.config.chart).hide();
    this.destroyChart();
    this.clearMessages();
    if (select2) this.resetSelect2();
  }

  /**
   * Sets up the article selector and adds listener to update chart
   * @returns {null} - nothing
   */
  setupSelect2() {
    const $select2Input = $(this.config.select2Input);

    let params = {
      ajax: this.getArticleSelectorAjax(),
      tags: this.autocomplete === 'no_autocomplete',
      placeholder: $.i18n('article-placeholder'),
      maximumSelectionLength: 10,
      minimumInputLength: 1
    };

    $select2Input.select2(params);
    $select2Input.on('change', this.processInput.bind(this));
  }

  /**
   * Get ajax parameters to be used in setupSelect2, based on this.autocomplete
   * @return {object|null} to be passed in as the value for `ajax` in setupSelect2
   */
  getArticleSelectorAjax() {
    if (this.autocomplete !== 'no_autocomplete') {
      /**
       * This ajax call queries the Mediawiki API for article name
       * suggestions given the search term inputed in the selector.
       * We ultimately want to make the endpoint configurable based on whether they want redirects
       */
      return {
        url: `https://${this.project}.org/w/api.php`,
        dataType: 'jsonp',
        delay: 200,
        jsonpCallback: 'articleSuggestionCallback',
        data: search => this.getSearchParams(search.term),
        processResults: this.processSearchResults.bind(this),
        cache: true
      };
    } else {
      return null;
    }
  }

  /**
   * sets up the daterange selector and adds listeners
   * @returns {null} - nothing
   */
  setupDateRangeSelector() {
    super.setupDateRangeSelector();

    const dateRangeSelector = $(this.config.dateRangeSelector);

    /** the "Latest N days" links */
    $('.date-latest a').on('click', e => {
      this.setSpecialRange(`latest-${$(e.target).data('value')}`);
    });

    dateRangeSelector.on('apply.daterangepicker', (e, action) => {
      if (action.chosenLabel === $.i18n('custom-range')) {
        this.specialRange = null;

        /** force events to re-fire since apply.daterangepicker occurs before 'change' event */
        this.daterangepicker.updateElement();
      }
    });

    dateRangeSelector.on('change', e => {
      this.processInput();

      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
    });
  }

  /**
   * General place to add page-wide listeners
   * @returns {null} - nothing
   */
  setupListeners() {
    super.setupListeners();

    $('.download-csv').on('click', this.exportCSV.bind(this));
    $('.download-json').on('click', this.exportJSON.bind(this));
    $('#platform-select, #agent-select').on('change', this.processInput.bind(this));
  }

  /**
   * Setup listeners for project input
   * @returns {null} - nothing
   */
  setupProjectInput() {
    $(this.config.projectInput).on('change', e => {
      if (!e.target.value) {
        e.target.value = this.config.defaults.project;
        return;
      }
      if (this.validateProject()) return;
      this.resetView(true); // TODO: load default articles

      this.updateInterAppLinks();
    });
  }

  /**
   * Query the API for each page, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @returns {null} - nothin
   */
  processInput(force) {
    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && location.search === this.params && this.prevChartType === this.chartType) {
      return;
    }

    /** @type {Object} everything we need to keep track of for the promises */
    let xhrData = {
      articles: $(config.select2Input).select2('val') || [],
      labels: [], // Labels (dates) for the x-axis.
      datasets: [], // Data for each article timeseries
      errors: [], // Queue up errors to show after all requests have been made
      promises: []
    };

    if (!xhrData.articles.length) {
      return this.resetView();
    }

    this.params = location.search;
    this.prevChartType = this.chartType;
    this.clearMessages(); // clear out old error messages
    this.destroyChart();
    $('.chart-container').addClass('loading');

    /** Collect parameters from inputs. */
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    /**
     * Asynchronously collect the data from RESTBase API,
     * process it to Chart.js format and initialize the chart.
     */
    xhrData.articles.forEach((article, index) => {
      const uriEncodedArticle = encodeURIComponent(article);

      /** @type {String} Url to query the API. */
      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${this.project}` +
        `/${$(this.config.platformSelector).val()}/${$('#agent-select').val()}/${uriEncodedArticle}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({
        url: url,
        dataType: 'json'
      });
      xhrData.promises.push(promise);

      promise.success(successData => {
        successData = this.fillInZeros(successData, startDate, endDate);

        /** Build the article's dataset. */
        if (this.config.linearCharts.includes(this.chartType)) {
          xhrData.datasets.push(this.getLinearData(successData, article, index));
        } else {
          xhrData.datasets.push(this.getCircularData(successData, article, index));
        }

        /** fetch the labels for the x-axis on success if we haven't already */
        if (successData.items && !xhrData.labels.length) {
          xhrData.labels = successData.items.map(elem => {
            return moment(elem.timestamp, this.config.timestampFormat).format(this.dateFormat);
          });
        }
      }).fail(data => {
        if (data.status === 404) {
          this.writeMessage(
            `<a href='${this.getPageURL(article)}'>${article.descore()}</a> - ${$.i18n('api-error-no-data')}`
          );
          xhrData.articles = xhrData.articles.filter(el => el !== article);

          if (!xhrData.articles.length) {
            $('.chart-container').html('');
            $('.chart-container').removeClass('loading');
          }
        } else {
          xhrData.errors.push(data.responseJSON.title);
        }
      });
    });

    $.when(...xhrData.promises).always(this.renderData.bind(this, xhrData));
  }

  /**
   * Update the chart with data provided by processInput()
   * @param {Object} xhrData - data as constructed by processInput()
   * @returns {null} - nothin
   */
  renderData(xhrData) {
    $('#chart-legend').html(''); // clear old chart legend

    if (xhrData.errors.length && xhrData.errors.length === xhrData.articles.length) {
      /** something went wrong */
      $('.chart-container').removeClass('loading');
      const errorMessages = Array.from(new Set(xhrData.errors)).map(error => `<li>${error}</li>`).join('');
      return this.writeMessage(
        `${$.i18n('api-error', 'Pageviews API')}<ul>${errorMessages}</ul>`,
        true
      );
    }

    if (!xhrData.articles.length) {
      return;
    } else if (xhrData.articles.length === 1) {
      $('.multi-page-chart-node').hide();
    } else {
      $('.multi-page-chart-node').show();
    }

    if (this.autoLogDetection) {
      const shouldBeLogarithmic = this.shouldBeLogarithmic(xhrData.datasets.map(set => set.data));
      $(this.config.logarithmicCheckbox).prop('checked', shouldBeLogarithmic);
    }

    /** preserve order of datasets due to asyn calls */
    let sortedDatasets = new Array(xhrData.articles.length);
    xhrData.datasets.forEach(dataset => {
      if (this.isLogarithmic()) dataset.data = dataset.data.map(view => view || null);
      sortedDatasets[xhrData.articles.indexOf(dataset.label.score())] = dataset;
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

    $('.chart-container').removeClass('loading')
      .html('').append("<canvas class='aqs-chart'>");
    this.setChartPointDetectionRadius();
    const context = $(this.config.chart)[0].getContext('2d');

    if (this.config.linearCharts.includes(this.chartType)) {
      const linearData = {labels: xhrData.labels, datasets: sortedDatasets};

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

    $('#chart-legend').html(this.chartObj.generateLegend());
    $('.data-links').removeClass('invisible');
  }

  /**
   * Checks value of project input and validates it against site map
   * @returns {boolean} whether the currently input project is INvalid
   */
  validateProject() {
    let project = $(this.config.projectInput).val();

    /** Remove www hostnames since the pageviews API doesn't expect them. */
    if (project.startsWith('www.')) {
      project = project.substring(4);
      $(this.config.projectInput).val(project);
    }

    if (siteDomains.includes(project)) {
      $('.validate').remove();
      $('.select2-selection--multiple').removeClass('disabled');
    } else {
      this.resetView(true);
      this.writeMessage(
        $.i18n('invalid-project', `<a href='//${project}'>${project}</a>`),
        true
      );
      $('.select2-selection--multiple').addClass('disabled');
      return true;
    }
  }
}

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new PageViews();
});
