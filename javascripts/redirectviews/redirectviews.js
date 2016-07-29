/**
 * Redirectviews Analysis tool
 * @file Main file for Redirectviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');
const ListHelpers = require('../shared/list_helpers');

/** Main RedirectViews class */
class RedirectViews extends mix(Pv).with(ChartHelpers, ListHelpers) {
  constructor() {
    super(config);
    this.app = 'redirectviews';
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   * @return {null} Nothing
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
   * @returns {null} nothing
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

    $(this.config.projectInput).on('change', () => {
      this.validateProject();
      this.updateInterAppLinks();
    });

    $('.download-csv').on('click', this.exportCSV.bind(this));
    $('.download-json').on('click', this.exportJSON.bind(this));

    $('.view-btn').on('click', e => {
      document.activeElement.blur();
      this.view = e.currentTarget.dataset.value;
      this.toggleView(this.view);
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
      labels: this.getDateHeadings(true), // labels needed for Charts.js, even though we'll only have one dataset
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
      const data = dataset.items.map(item => item.views),
        sum = data.reduce((a, b) => a + b);

      totalTitles.push(dataset.title);
      if (dataset.section) sectionCount++;

      this.outputData.listData.push({
        data,
        label: dataset.title,
        section: dataset.section || '',
        url: `https://${this.project}.org/wiki/${dataset.title.score()}`,
        sum,
        average: sum / length,
        index
      });

      /**
       * Ensure we have data for each day, using null as the view count when data is actually not available yet
       * See fillInZeros() comments for more info.
       */
      const [viewsSet, incompleteDates] = this.fillInZeros(dataset.items, startDate, endDate);
      incompleteDates.forEach(date => {
        if (!datesWithoutData.includes(date)) datesWithoutData.push(date);
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
   * @returns {Typeahead} instance
   */
  get typeahead() {
    return $(this.config.sourceInput).data('typeahead');
  }

  /**
   * Get all user-inputted parameters
   * @param {boolean} [forCacheKey] whether or not to include the page name, and exclude sort and direction
   *   in the returned object. This is for the purposes of generating a unique cache key for params affecting the API queries
   * @return {Object} project, platform, agent, etc.
   */
  getParams(forCacheKey = false) {
    let params = {
      project: $(this.config.projectInput).val(),
      platform: $(this.config.platformSelector).val(),
      agent: $(this.config.agentSelector).val()
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

    /** only certain characters within the page name are escaped */
    params.page = $(this.config.sourceInput).val().score().replace(/[&%]/g, escape);

    if (!forCacheKey) {
      params.sort = this.sort;
      params.direction = this.direction;
      params.view = this.view;
    }

    return params;
  }

  /**
   * Push relevant class properties to the query string
   * @param  {Boolean} clear - wheter to clear the query string entirely
   * @return {null} nothing
   */
  pushParams(clear = false) {
    if (!window.history || !window.history.replaceState) return;

    if (clear) {
      return history.replaceState(null, document.title, location.href.split('?')[0]);
    }

    window.history.replaceState({}, document.title, `?${$.param(this.getParams())}`);

    $('.permalink').prop('href', `/redirectviews?${$.param(this.getPermaLink())}`);
  }

  /**
   * Render list of redirectviews into view
   * @returns {null} nothing
   */
  renderData() {
    super.renderData(sortedDatasets => {
      $('.output-totals').html(
        `<th scope='row'>${$.i18n('totals')}</th>
         <th>${$.i18n('unique-titles', this.outputData.titles.length)}</th>
         <th>${$.i18n('num-sections', this.outputData.sectionCount)}</th>
         <th>${this.formatNumber(this.outputData.sum)}</th>
         <th>${this.formatNumber(Math.round(this.outputData.average))} / ${$.i18n('day')}</th>`
      );
      $('#output_list').html('');

      sortedDatasets.forEach((item, index) => {
        let sectionMarkup = '';

        if (item.section) {
          const sectionUrl = `${this.getPageURL(this.outputData.source)}#${encodeURIComponent(item.section.score())}`;
          sectionMarkup = `<a href="${sectionUrl}" target="_blank">#${item.section}</a>`;
        }

        $('#output_list').append(
          `<tr>
           <th scope='row'>${index + 1}</th>
           <td><a href="${item.url}" target="_blank">${item.label}</a></td>
           <td>${sectionMarkup}</a></td>
           <td><a target='_blank' href='${this.getPageviewsURL(`${this.project}.org`, item.label)}'>${this.formatNumber(item.sum)}</a></td>
           <td>${this.formatNumber(Math.round(item.average))} / ${$.i18n('day')}</td>
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

    // XXX: throttling
    let dfd = $.Deferred(), promises = [], count = 0, hadFailure, failureRetries = {},
      totalRequestCount = redirectData.length, failedPages = [], pageViewsData = [];

    const makeRequest = page => {
      const uriEncodedPageName = encodeURIComponent(page.title);

      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${this.project}` +
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/${uriEncodedPageName}/daily` +
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
        // XXX: throttling
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const cassandraError = errorData.responseJSON.title === 'Error in Cassandra table storage backend',
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
            return this.rateLimit(makeRequest, 100, this)(page);
          }

          /** retries exceeded */
          failedPages.push(failedPageLink);
        } else {
          this.writeMessage(
            `${failedPageLink}: ${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`
          );
        }

        hadFailure = true; // don't treat this series of requests as being cached by server
      }).always(() => {
        this.updateProgressBar((++count / totalRequestCount) * 100);

        // XXX: throttling, totalRequestCount can just be pages.length
        if (count === totalRequestCount) {
          dfd.resolve(pageViewsData);

          if (failedPages.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedPages.map(failedPage => `<li>${failedPage}</li>`).join('') +
              '</ul>'
            ));
          }

          /**
           * if there were no failures, assume the resource is now cached by the server
           *   and save this assumption to our own cache so we don't throttle the same requests
           */
          // XXX: throttling
          if (!hadFailure) {
            simpleStorage.set(this.getCacheKey(), true, {TTL: 600000});
          }
        }
      });
    };

    /**
     * We don't want to throttle requests for cached resources. However in our case,
     *   we're unable to check response headers to see if the resource was cached,
     *   so we use simpleStorage to keep track of what the user has recently queried.
     */
    // XXX: throttling
    const requestFn = this.isRequestCached() ? makeRequest : this.rateLimit(makeRequest, 100, this);

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
      }].concat(data.query.pages[0].redirects);

      return dfd.resolve(redirects);
    });

    return dfd;
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

    this.patchUsage('rv');

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
        return;
      } else if (startDate > endDate) {
        this.addSiteNotice('warning', $.i18n('param-error-2'), $.i18n('invalid-params'), true);
        return;
      }
      this.daterangepicker.setStartDate(startDate);
      this.daterangepicker.setEndDate(endDate);
    } else {
      this.setSpecialRange(this.config.defaults.dateRange);
    }

    $(this.config.platformSelector).val(params.platform || 'all-access');
    $(this.config.agentSelector).val(params.agent || 'user');

    /** import params or set defaults if invalid */
    ['sort', 'direction', 'view'].forEach(key => {
      const value = params[key];
      if (value && this.config.validParams[key].includes(value)) {
        params[key] = value;
        this[key] = value;
      } else {
        params[key] = this.config.defaults.params[key];
        this[key] = this.config.defaults.params[key];
      }
    });

    /** start up processing if page name is present */
    if (params.page) {
      $(this.config.sourceInput).val(decodeURIComponent(params.page).descore());
      this.processInput();
    }
  }

  /**
   * Helper to set a CSS class on the `main` node,
   *   styling the document based on a 'state'
   * @param {String} state - class to be added;
   *   should be one of ['initial', 'processing', 'complete']
   * @returns {null} nothing
   */
  setState(state) {
    $('main').removeClass(this.config.formStates.join(' ')).addClass(state);

    switch (state) {
    case 'initial':
      this.clearMessages();
      this.assignDefaults();
      this.destroyChart();
      $('output').removeClass('list-mode').removeClass('chart-mode');
      $('.data-links').addClass('invisible');
      if (this.typeahead) this.typeahead.hide();
      $(this.config.sourceInput).val('').focus();
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
   * @return {null} nothing
   */
  processInput() {
    // XXX: throttling
    /** allow resubmission of queries that are cached */
    if (!this.isRequestCached()) {
      /** Check if user has exceeded request limit and throw error */
      if (simpleStorage.hasKey('pageviews-throttle')) {
        const timeRemaining = Math.round(simpleStorage.getTTL('pageviews-throttle') / 1000);

        /** > 0 check to combat race conditions */
        if (timeRemaining > 0) {
          return this.writeMessage($.i18n(
            'api-throttle-wait', `<b>${timeRemaining}</b>`,
            '<a href="https://phabricator.wikimedia.org/T124314" target="_blank">phab:T124314</a>'
          ), true);
        }
      }
    }

    const page = $(this.config.sourceInput).val();

    this.setState('processing');

    this.getRedirects(page).done(redirectData => {
      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      this.setThrottle();

      this.getPageViewsData(redirectData).done(pageViewsData => {
        const pageLink = this.getPageLink(decodeURIComponent(page), this.project);
        $('.output-title').html(pageLink);
        $('.output-params').text($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(page, pageLink, pageViewsData);
        this.updateProgressBar(100);
        this.setInitialChartType();
        this.renderData();

        /**
         * XXX: throttling
         * Reset throttling again; the first one was in case they aborted
         */
        this.setThrottle();
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
   * Called in validateProject, which is called in popParams when the app is first loaded
   * @return {null} Nothing
   */
  setupsourceInput() {
    if (this.typeahead) this.typeahead.destroy();

    $(this.config.sourceInput).typeahead({
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
   * Validate the currently entered project. Called when the value is changed
   * @return {boolean} true if validation failed
   */
  validateProject() {
    const project = $(this.config.projectInput).val();

    if (!this.isMultilangProject()) {
      this.writeMessage(
        $.i18n('invalid-lang-project', `<a href='//${project.escape()}'>${project.escape()}</a>`),
        true
      );
      this.setState('invalid');
      return true;
    }

    this.setState('initial');

    /** kill and re-init typeahead to point to new project */
    this.setupsourceInput();

    return false;
  }

  /**
   * Exports current lang data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @returns {string} CSV content
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

    // Output the CSV file to the browser
    const encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
  }

  /**
   * Get informative filename without extension to be used for export options
   * @return {string} filename without an extension
   */
  getExportFilename() {
    const params = this.getParams(true);
    return `${this.outputData.source}-${params.start.replace(/-/g, '')}-${params.end.replace(/-/g, '')}`;
  }
}

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new RedirectViews();
});
