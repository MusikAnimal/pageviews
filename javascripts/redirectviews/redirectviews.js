/**
 * Redirect Views Analysis tool
 * @link https://tools.wmflabs.org/redirectviews
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');
const ListHelpers = require('../shared/list_helpers');

/** Main RedirectViews class */
class RedirectViews extends mix(Pv).with(ChartHelpers, ListHelpers) {
  /**
   * set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'redirectviews';
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   */
  initialize() {
    this.assignDefaults();
    this.setupDateRangeSelector();
    this.popParams();
    this.setupListeners();
    this.updateInterAppLinks();

    /** only show options for line, bar and radar charts */
    $('.multi-page-chart-node').hide();
  }

  /**
   * Add general event listeners
   * @override
   */
  setupListeners() {
    super.setupListeners();

    $('#pv_form').on('submit', e => {
      e.preventDefault(); // prevent page from reloading
      this.processInput();
    });

    $('.another-query').on('click', () => {
      this.setState('initial');
      this.pushParams(true);
    });

    $('.sort-link').on('click', e => {
      const sortType = $(e.currentTarget).data('type');
      this.direction = this.sort === sortType ? -this.direction : 1;
      this.sort = sortType;
      this.renderData();
    });

    $('.view-btn').on('click', e => {
      document.activeElement.blur();
      this.view = e.currentTarget.dataset.value;
      this.toggleView(this.view);
    });
  }

  /**
   * Copy necessary default values to class instance.
   * Called when the view is reset.
   */
  assignDefaults() {
    ['sort', 'direction', 'outputData', 'hadFailure', 'total', 'view'].forEach(defaultKey => {
      this[defaultKey] = this.config.defaults[defaultKey];
    });
  }

  /**
   * Build our mother data set, from which we can draw a chart,
   *   render a list of data, whatever our heart desires :)
   * @param  {string} label - label for the dataset
   * @param  {string} link - HTML anchor tag for the label
   * @param  {array} datasets - array of datasets for each article, as returned by the Pageviews API
   * @return {object} mother data set, also stored in this.outputData
   */
  buildMotherDataset(label, link, datasets) {
    /**
     * `datasets` structure:
     *
     * [{
     *   title: page,
     *   items: [
     *     {
     *       access: '',
     *       agent: '',
     *       article: '',
     *       granularity: '',
     *       project: '',
     *       timestamp: '',
     *       views: 10
     *     }
     *   ]
     * }]
     *
     * output structure:
     *
     * {
     *   labels: [''],
     *   listData: [
     *     {
     *       label: '',
     *       data: [1,2,3,4],
     *       sum: 10,
     *       average: 2,
     *       index: 0
     *       ...
     *       MERGE in this.config.chartConfig[this.chartType].dataset(this.config.colors[0])
     *     }
     *   ],
     *   totalViewsSet: [1,2,3,4],
     *   sum: 10,
     *   average: 2,
     *   datesWithoutData: ['2016-05-16T00:00:00-00:00']
     * }
     */

    this.outputData = {
      link,
      listData: [],
      source: label
    };
    const startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate),
      length = this.numDaysInRange();

    let totalViewsSet = new Array(length).fill(0),
      datesWithoutData = [],
      totalTitles = [],
      sectionCount = 0;

    datasets.forEach((dataset, index) => {

      totalTitles.push(dataset.title);
      if (dataset.section) sectionCount++;

      /**
       * Ensure we have data for each day, using null as the view count when data is actually not available yet
       * See fillInZeros() comments for more info.
       */
      const [viewsSet, incompleteDates] = this.fillInZeros(dataset.items, startDate, endDate);
      incompleteDates.forEach(date => {
        if (!datesWithoutData.includes(date)) datesWithoutData.push(date);
      });

      const data = viewsSet.map(item => item.views),
        sum = data.reduce((a, b) => a + b);

      this.outputData.listData.push({
        data,
        label: dataset.title,
        section: dataset.section || '',
        url: `https://${this.project}.org/wiki/${dataset.title.score()}`,
        sum,
        average: sum / length,
        index
      });

      totalViewsSet = totalViewsSet.map((num, i) => num + viewsSet[i].views);
    });

    const grandSum = totalViewsSet.reduce((a, b) => (a || 0) + (b || 0));

    Object.assign(this.outputData, {
      datasets: [{
        label,
        data: totalViewsSet,
        sum: grandSum,
        average: grandSum / length
      }],
      datesWithoutData,
      sum: grandSum, // nevermind the duplication
      average: grandSum / length,
      titles: totalTitles,
      sectionCount
    });

    if (datesWithoutData.length) {
      const dateList = datesWithoutData.map(date => moment(date).format(this.dateFormat));
      this.writeMessage($.i18n('api-incomplete-data', dateList.sort().join(' &middot; '), dateList.length));
    }

    /**
     * If there were no failures, cache the result as some datasets can be very large.
     * There is server cache but there is also processing time that local caching can eliminate
     */
    if (!this.hadFailure) {
      // 10 minutes, TTL is milliseconds
      simpleStorage.set(this.getCacheKey(), this.outputData, {TTL: 600000});
    }

    return this.outputData;
  }

  /**
   * Get the base project name (without language and the .org)
   * @returns {boolean} projectname
   */
  get baseProject() {
    return this.project.split('.')[1];
  }

  /**
   * Get instance of Typeahead plugin
   * @returns {Typeahead} instance
   */
  get typeahead() {
    return this.$sourceInput.data('typeahead');
  }

  /**
   * Get informative filename without extension to be used for export options
   * @override
   * @return {string} filename without an extension
   */
  getExportFilename() {
    const params = this.getParams(true);
    return `${this.outputData.source}-${params.start.replace(/-/g, '')}-${params.end.replace(/-/g, '')}`;
  }

  /**
   * Get all user-inputted parameters
   * @param {boolean} [forCacheKey] whether or not to exclude sort, direction and other parameters irrelevant to the query
   *   in the returned object. This is for the purposes of generating a unique cache key for params affecting the API queries
   * @return {Object} project, platform, agent, etc.
   */
  getParams(forCacheKey = false) {
    let params = {
      project: this.$projectInput.val(),
      platform: this.$platformSelector.val(),
      agent: this.$agentSelector.val()
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in this.config.specialRanges, constructed like `{range: 'last-month'}`,
     *   or a relative range like `{range: 'latest-N'}` where N is the number of days.
     */
    if (this.specialRange && !forCacheKey) {
      params.range = this.specialRange.range;
    } else {
      params.start = this.daterangepicker.startDate.format('YYYY-MM-DD');
      params.end = this.daterangepicker.endDate.format('YYYY-MM-DD');
    }

    if (forCacheKey) {
      // Page name needed to make a unique cache key for the query.
      // For other purposes (e.g. this.pushParams()), we want to do special escaping of the page name
      params.page = this.$sourceInput.val().score();
    } else {
      params.sort = this.sort;
      params.direction = this.direction;
      params.view = this.view;

      /** add autolog param only if it was passed in originally, and only if it was false (true would be default) */
      if (this.noLogScale) params.autolog = 'false';
    }

    return params;
  }

  /**
   * Push relevant class properties to the query string
   * @param {Boolean} clear - wheter to clear the query string entirely
   * @return {null}
   */
  pushParams(clear = false) {
    if (!window.history || !window.history.replaceState) return;

    if (clear) {
      return history.replaceState(null, document.title, location.href.split('?')[0]);
    }

    const escapedPageName = this.$sourceInput.val().score().replace(/[&%?+]/g, encodeURIComponent);

    window.history.replaceState({}, document.title, `?${$.param(this.getParams())}&page=${escapedPageName}`);

    $('.permalink').prop('href', `/redirectviews?${$.param(this.getPermaLink())}&page=${escapedPageName}`);
  }

  /**
   * Render list of redirectviews into view
   */
  renderData() {
    super.renderData(sortedDatasets => {
      const numRedirects = this.outputData.titles.length - 1;
      $('.output-totals').html(
        `<th scope='row'>${$.i18n('totals')}</th>
         <th>${$.i18n('num-redirects', this.formatNumber(numRedirects), numRedirects)}</th>
         <th>${$.i18n('num-sections', this.formatNumber(this.outputData.sectionCount), this.outputData.sectionCount)}</th>
         <th>${this.formatNumber(this.outputData.sum)}</th>
         <th>${this.formatNumber(Math.round(this.outputData.average))}</th>`
      );
      $('#output_list').html('');

      sortedDatasets.forEach((item, index) => {
        const isSource = item.label === this.outputData.source;

        let sectionMarkup = '';

        if (item.section) {
          sectionMarkup = this.getPageLink(this.outputData.source, this.project, '#' + item.section, item.section);
        }

        $('#output_list').append(
          `<tr>
           <th scope='row'>${index + 1}</th>
           <td>
             ${this.getPageLink(item.label, `${this.project}.org`)}
             ${isSource ? '(' + $.i18n('target') + ')' : ''}
           </td>
           <td>${sectionMarkup}</a></td>
           <td><a target='_blank' href='${this.getPageviewsURL(`${this.project}.org`, item.label)}'>${this.formatNumber(item.sum)}</a></td>
           <td>${this.formatNumber(Math.round(item.average))}</td>
           </tr>`
        );
      });
    });
  }

  /**
   * Get value of given langview entry for the purposes of column sorting
   * @param  {object} item - langview entry within this.outputData
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    switch (type) {
    case 'title':
      return item.label;
    case 'section':
      return item.section;
    case 'views':
      return Number(item.sum);
    }
  }

  /**
   * Loop through given pages and query the pageviews API for each
   *   Also updates this.outputData with result
   * @param  {Array} redirectData - as given by the getRedirects promise
   * @return {Deferred} - Promise resolving with data ready to be rendered to view
   */
  getPageViewsData(redirectData) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    let dfd = $.Deferred(), promises = [], count = 0, failureRetries = {},
      totalRequestCount = redirectData.length, failedPages = [], pageViewsData = [];

    const makeRequest = page => {
      const uriEncodedPageName = encodeURIComponent(page.title);

      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${this.project}` +
        `/${this.$platformSelector.val()}/${this.$agentSelector.val()}/${uriEncodedPageName}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({ url, dataType: 'json' });
      promises.push(promise);

      promise.done(pvData => {
        pageViewsData.push({
          title: page.title,
          section: page.fragment,
          items: pvData.items
        });
      }).fail(errorData => {
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const errorMessage = errorData.responseJSON && errorData.responseJSON.title
          ? errorData.responseJSON.title
          : $.i18n('unknown');
        const cassandraError = errorMessage === 'Error in Cassandra table storage backend',
          failedPageLink = this.getPageLink(page.title, `${this.project}.org`);

        if (cassandraError) {
          if (failureRetries[page.title]) {
            failureRetries[page.title]++;
          } else {
            failureRetries[page.title] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[page.title] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, this.config.apiThrottle, this)(page);
          }

          /** retries exceeded */
          failedPages.push(failedPageLink);
        } else {
          this.writeMessage(
            `${failedPageLink}: ${$.i18n('api-error', 'Pageviews API')} - ${errorMessage}`
          );
        }

        // unless it was a 404, don't cache this series of requests
        if (errorData.status !== 404) this.hadFailure = true;
      }).always(() => {
        this.updateProgressBar(++count, totalRequestCount);

        if (count === totalRequestCount) {
          if (failedPages.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedPages.map(failedPage => `<li>${failedPage}</li>`).join('') +
              '</ul>'
            ));
          }

          dfd.resolve(pageViewsData);
        }
      });
    };

    const requestFn = this.rateLimit(makeRequest, this.config.apiThrottle, this);

    redirectData.forEach(page => {
      requestFn(page);
    });

    return dfd;
  }

  /**
   * Get all redirects of a page
   * @param  {String} pageName - name of page we want to get data about
   * @return {Deferred} - Promise resolving with redirect data
   */
  getRedirects(pageName) {
    const dfd = $.Deferred();

    const promise = $.ajax({
      url: `https://${this.project}.org/w/api.php`,
      jsonp: 'callback',
      dataType: 'jsonp',
      data: {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'redirects',
        rdprop: 'title|fragment',
        rdlimit: 500,
        titles: pageName
      }
    });

    promise.done(data => {
      if (data.error) {
        return this.setState('initial', () => {
          this.writeMessage(
            `${$.i18n('api-error', 'Redirect API')}: ${data.error.info.escape()}`
          );
        });
      }

      const redirects = [{
        title: pageName
      }].concat(data.query.pages[0].redirects || []);

      return dfd.resolve(redirects);
    });

    return dfd;
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   */
  popParams() {
    let params = this.validateParams(
      this.parseQueryString('pages')
    );

    this.$projectInput.val(params.project);
    this.validateDateRange(params);

    // If there are invalid params, remove page from params so we don't process the defaults.
    // FIXME: we're checking for site messages because super.validateParams doesn't return a boolean
    //   or any indication the validations failed. This is hacky but necessary.
    if ($('.site-notice .alert-danger').length) {
      delete params.page;
    }

    this.$platformSelector.val(params.platform);
    this.$agentSelector.val(params.agent);

    /** export necessary params to outer scope */
    ['sort', 'direction', 'view'].forEach(key => {
      this[key] = params[key];
    });

    this.setupSourceInput();

    /** start up processing if page name is present */
    if (params.page) {
      this.getPageInfo([params.page]).done(data => {
        // throw errors if page is missing
        const normalizedPage = Object.keys(data)[0];
        if (data[normalizedPage].missing) {
          this.setState('initial');
          return this.writeMessage(`${this.getPageLink(normalizedPage)}: ${$.i18n('api-error-no-data')}`);
        }
        // fill in value for the page
        this.$sourceInput.val(normalizedPage);
        this.processInput();
      }).fail(() => {
        this.writeMessage($.i18n('api-error-unknown', 'Info'));
      });
    } else {
      this.$sourceInput.focus();
    }
  }

  /**
   * Helper to set a CSS class on the `main` node,
   *   styling the document based on a 'state'
   * @param {String} state - class to be added;
   *   should be one of ['initial', 'processing', 'complete']
   */
  setState(state) {
    $('main').removeClass(this.config.formStates.join(' ')).addClass(state);

    switch (state) {
    case 'initial':
      this.clearMessages();
      this.assignDefaults();
      this.destroyChart();
      $('.output').removeClass('list-mode').removeClass('chart-mode');
      $('.data-links').addClass('invisible');
      if (this.typeahead) this.typeahead.hide();
      this.$sourceInput.val('').focus();
      break;
    case 'processing':
      this.processStarted();
      this.clearMessages();
      document.activeElement.blur();
      $('.progress-bar').addClass('active');
      break;
    case 'complete':
      this.processEnded();
      /** stop hidden animation for slight performance improvement */
      this.updateProgressBar(0);
      $('.progress-bar').removeClass('active');
      $('.data-links').removeClass('invisible');
      break;
    case 'invalid':
      break;
    }
  }

  /**
   * Process the redirectviews for the article and options entered
   * Called when submitting the form
   * @returns {null}
   */
  processInput() {
    this.patchUsage();

    const page = this.$sourceInput.val();

    this.setState('processing');

    const readyForRendering = () => {
      $('.output-title').html(this.outputData.link);
      $('.output-params').html(this.$dateRangeSelector.val());
      this.setInitialChartType();
      this.renderData();
    };

    if (this.isRequestCached()) {
      $('.progress-bar').css('width', '100%');
      $('.progress-counter').text($.i18n('loading-cache'));
      return setTimeout(() => {
        this.outputData = simpleStorage.get(this.getCacheKey());
        readyForRendering();
      }, 500);
    }

    $('.progress-counter').text($.i18n('fetching-data', 'Redirects API'));
    this.getRedirects(page).done(redirectData => {
      this.getPageViewsData(redirectData).done(pageViewsData => {
        $('.progress-bar').css('width', '100%');
        $('.progress-counter').text($.i18n('building-dataset'));
        const pageLink = this.getPageLink(page, this.project);
        setTimeout(() => {
          this.buildMotherDataset(page, pageLink, pageViewsData);
          readyForRendering();
        }, 250);
      });
    }).fail(error => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (typeof error === 'string') {
        this.writeMessage(error);
      } else {
        this.writeMessage($.i18n('api-error-unknown', 'Wikidata'));
      }
    });
  }

  /**
   * Setup typeahead on the article input, killing the prevous instance if present
   */
  setupSourceInput() {
    if (this.typeahead) this.typeahead.destroy();

    this.$sourceInput.typeahead({
      ajax: {
        url: `https://${this.project}.org/w/api.php`,
        timeout: 200,
        triggerLength: 1,
        method: 'get',
        preDispatch: query => {
          return {
            action: 'opensearch',
            redirects: 'resolve',
            format: 'json',
            search: query
          };
        },
        preProcess: data => data[1]
      }
    });
  }

  /**
   * Calls parent setupProjectInput and updates the view if validations passed
   *   reverting to the old value if the new one is invalid
   * @override
   */
  validateProject() {
    if (super.validateProject()) {
      this.setState('initial');

      /** kill and re-init typeahead to point to new project */
      this.setupSourceInput();
    }
  }

  /**
   * Exports current lang data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   */
  exportCSV() {
    let csvContent = `data:text/csv;charset=utf-8,Title,${this.getDateHeadings(false).join(',')}\n`;

    // Add the rows to the CSV
    this.outputData.listData.forEach(page => {
      const pageName = '"' + page.label.descore().replace(/"/g, '""') + '"';

      csvContent += [
        pageName,
      ].concat(page.data).join(',') + '\n';
    });

    this.downloadData(csvContent, 'csv');
  }
}

$(() => {
  new RedirectViews();
});
