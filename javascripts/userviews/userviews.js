/**
 * Userviews Analysis tool
 * @link https://tools.wmflabs.org/userviews
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');
const ListHelpers = require('../shared/list_helpers');

/** Main UserViews class */
class UserViews extends mix(Pv).with(ChartHelpers, ListHelpers) {
  /**
   * set instance variables and initial setup in pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'userviews';
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
   * Add general event listeners.
   * @override
   */
  setupListeners() {
    super.setupListeners();

    // update namespace selector when project is changed, 0 to force selection of main namespace
    this.$projectInput.on('updated', this.setupNamespaceSelector.bind(this, 0));
  }

  /**
   * Fetch namespaces and populate the namespace selector
   * @param {String|number} [namespace] - namespace number to default to
   * @returns {Deferred} Empty promise
   */
  setupNamespaceSelector(namespace = 0) {
    const dfd = $.Deferred();

    this.fetchSiteInfo(this.project).then(data => {
      $('#namespace-select').html(
        `<option value='all'>${$.i18n('all')}</option>`
      );

      const namespaces = data[this.project].namespaces;
      for (let ns in namespaces) {
        if (ns < 0) continue;
        const nsTitle = namespaces[ns]['*'] || $.i18n('main');
        $('#namespace-select').append(
          `<option value=${ns}>${nsTitle}</option>`
        );
      }
      $('#namespace-select').val(namespace);
      return dfd.resolve();
    });

    return dfd;
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
   * @param  {string} label - label for the dataset (e.g. category:blah, page pile 24, etc)
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
     *   oldest: moment(),
     *   newest: moment(),
     *   totalViewsSet: [1,2,3,4],
     *   sum: 10,
     *   average: 2,
     *   datesWithoutData: ['2016-05-16T00:00:00-00:00']
     * }
     */

    this.outputData = {
      link, // for our own purposes
      listData: []
    };
    const startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate),
      length = this.numDaysInRange();

    let totalViewsSet = new Array(length).fill(0),
      datesWithoutData = [],
      // totalBadges = {}, // FIXME: add badges!
      totalTitles = [],
      totalSize = 0,
      oldest, newest; // moment object for the dates of the oldest and newest pages

    datasets.forEach((dataset, index) => {
      // dataset.badges.forEach(badge => {
      //   if (totalBadges[badge] === undefined) {
      //     totalBadges[badge] = 1;
      //   } else {
      //     totalBadges[badge] += 1;
      //   }
      // });

      totalTitles.push(dataset.title);

      // keep track of the dates for the oldest and newest pages
      const dateCreated = moment(dataset.timestamp.substr(0, 8), 'YYYYMMDD');
      if (!oldest || dateCreated.isBefore(oldest)) {
        oldest = dateCreated;
      }
      if (!newest || dateCreated.isAfter(newest)) {
        newest = dateCreated;
      }

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
        // badges: dataset.badges,
        // dbName: dataset.dbName,
        label: dataset.title,
        datestamp: dateCreated.format('YYYY-MM-DD'), // what shows up in exported data
        size: dataset.length,
        redirect: dataset.redirect,
        url: dataset.url,
        sum,
        average: sum / length,
        index
      });

      totalViewsSet = totalViewsSet.map((num, i) => num + viewsSet[i].views);
      totalSize += dataset.length;
    });

    const grandSum = totalViewsSet.reduce((a, b) => (a || 0) + (b || 0));

    // Get number of days spanning oldest and newest pages
    // Use Math.abs just in case...
    const datespan = oldest && newest ? Math.abs(oldest.diff(newest, 'days')) : null;

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
      datespan,
      size: totalSize,
      // badges: totalBadges,
      titles: totalTitles.unique()
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
   * @returns {string} project name
   */
  get baseProject() {
    return this.project.split('.')[1];
  }

  /**
   * Get the instance of the Typeahead plugin
   * @returns {Typeahead} instance
   */
  get typeahead() {
    return this.$sourceInput.data('typeahead');
  }

  /**
   * Get a full link of the user page for the given user
   * @param  {string} user
   * @return {string} HTML markup
   */
  getUserLink(user) {
    return `<a target="_blank" href="${this.getPageURL(`User:${user}`, this.project)}">${user.descore().escape()}</a>`;
  }

  /**
   * Get all user-inputted parameters
   * @param {boolean} [forCacheKey] whether or not to include the page name, and exclude sort and direction
   *   in the returned object. This is for the purposes of generating a unique cache key for params affecting the API queries
   * @return {Object} project, platform, agent, etc.
   */
  getParams(forCacheKey = false) {
    let params = {
      project: this.$projectInput.val(),
      platform: this.$platformSelector.val(),
      agent: this.$agentSelector.val(),
      namespace: $('#namespace-select').val(),
      redirects: $('#redirects-select').val()
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
      params.user = this.$sourceInput.val().score();
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
   * Push relevant class properties to the URL query string.
   * @param {Boolean} clear - whether to clear the query string entirely
   * @override
   */
  pushParams(clear = false) {
    super.pushParams('user', clear);
  }

  /**
   * Render list of userviews into view
   * @override
   */
  renderData() {
    super.renderData(sortedDatasets => {
      $('.output-totals').html(
        `<th scope='row'>${$.i18n('totals')}</th>
         <th>${$.i18n('num-pages', this.formatNumber(this.outputData.titles.length), this.outputData.titles.length)}</th>
         <th>${$.i18n('num-days-span', this.outputData.datespan)}</th>
         <th>${this.formatNumber(this.outputData.size)}</th>
         <th>${this.formatNumber(this.outputData.sum)}</th>
         <th>${this.formatNumber(Math.round(this.outputData.average))} / ${$.i18n('day')}</th>`
      );
      $('#output_list').html('');

      sortedDatasets.forEach((item, index) => {
        const datestamp = moment(item.datestamp).format(this.dateFormat);
        const redirect = item.redirect ? `<span class='text-muted'>(${$.i18n('redirect').toLowerCase()})</span>` : '';

        $('#output_list').append(
          `<tr>
           <th scope='row'>${index + 1}</th>
           <td>${this.getPageLink(item.label, this.project)} ${redirect}</td>
           <td>${datestamp}</td>
           <td>${this.formatNumber(item.size)}</td>
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
    case 'datestamp':
      return item.datestamp;
    case 'badges':
      return item.badges.sort().join('');
    case 'size':
      return item.size;
    case 'views':
      return Number(item.sum);
    }
  }

  /**
   * Check the user's edit count and if over 50,000,
   *   warn that fetching pages created might take a while...
   * @param  {String} user - userneame
   */
  checkEditCount(user) {
    // there's no waiting if the request is cached
    if (this.isRequestCached()) return;

    $.ajax({
      url: `https://${this.project}.org/w/api.php?action=query&list=users` +
        `&ususers=${user}&usprop=editcount&format=json`,
      dataType: 'jsonp'
    }).then(data => {
      const editCount = data.query.users[0].editcount;
      if (editCount > 50000) {
        const userLink = this.getUserLink(user);
        this.toastInfo(
          $.i18n('userviews-edit-count-warning', userLink, editCount)
        );
      }
    });
  }

  /**
   * Get pages created by user via /musikanimal/api
   * @returns {Deferred} promise resolving with data
   */
  getPagesCreated() {
    const dfd = $.Deferred(),
      username = this.$sourceInput.val();

    let params = {
      username,
      project: this.project + '.org',
      redirects: $('#redirects-select').val()
    };
    if ($('#namespace-select').val() !== 'all') {
      params.namespace = $('#namespace-select').val();
    }
    $.ajax({
      url: '/userviews/api.php',
      data: params
    }).done(data => {
      if (!Array.isArray(data)) return dfd.reject();

      const pages = data.map(page => {
        const ns = this.siteInfo[this.project].namespaces[page.namespace]['*'],
          title = ns === '' ? page.title : `${ns}:${page.title}`;
        return Object.assign(page, { title });
      });
      if (pages.length >= this.config.apiLimit) {
        this.toastWarn(
          $.i18n(
            'userviews-oversized-set',
            this.getUserLink(username),
            this.config.apiLimit,
            this.config.apiLimit
          )
        );
      }
      return dfd.resolve(pages);
    }).fail(() => dfd.reject());

    return dfd;
  }

  /**
   * Loop through given pages and query the pageviews API for each
   *   Also updates this.outputData with result
   * @param  {Array} pages - as given by the getPagesCreated promise
   * @return {Deferred} - Promise resolving with data ready to be rendered to view
   */
  getPageViewsData(pages) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    let dfd = $.Deferred(), promises = [], count = 0, failureRetries = {},
      totalRequestCount = pages.length, failedPages = [], pageViewsData = [];

    const makeRequest = pageObj => {
      const pageTitle = pageObj.title,
        uriEncodedPageName = encodeURIComponent(pageTitle);

      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${this.project}` +
        `/${this.$platformSelector.val()}/${this.$agentSelector.val()}/${uriEncodedPageName}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({url, dataType: 'json'});
      promises.push(promise);

      promise.done(pvData => {
        pageObj.items = pvData.items;
        pageViewsData.push(pageObj);
      }).fail(errorData => {
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const errorMessage = errorData.responseJSON && errorData.responseJSON.title
          ? errorData.responseJSON.title
          : $.i18n('unknown');
        const cassandraError = errorMessage === 'Error in Cassandra table storage backend',
          failedPageLink = this.getPageLink(pageTitle, `${this.project}.org`);

        if (cassandraError) {
          if (failureRetries[pageTitle]) {
            failureRetries[pageTitle]++;
          } else {
            failureRetries[pageTitle] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[pageTitle] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, this.config.apiThrottle, this)(pageTitle);
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

    pages.forEach(pageObj => {
      requestFn(pageObj);
    });

    return dfd;
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   */
  popParams() {
    let params = this.validateParams(
      this.parseQueryString()
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
    $('#redirects-select').val(params.redirects || '0');

    /** export necessary params to outer scope */
    ['sort', 'direction', 'view'].forEach(key => {
      this[key] = params[key];
    });

    this.setupSourceInput();

    /** start up processing if page name is present */
    if (params.user) {
      this.$sourceInput.val(decodeURIComponent(params.user).descore());

      // namespace selector may fetch siteinfo, which we need *before* processing input
      this.setupNamespaceSelector(params.namespace).then(() => {
        this.processInput();
      });
    } else {
      this.setupNamespaceSelector(params.namespace);
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
   * Process the langviews for the article and options entered
   * Called when submitting the form
   * @returns {null}
   */
  processInput() {
    this.patchUsage();

    const user = this.$sourceInput.val();

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

    $('.progress-counter').text($.i18n('fetching-data', 'Page Creation API'));

    // show timer
    let count = 0;
    this.elapsedTimer = setInterval(() => {
      $('.elapsed-timer').text(
        $.i18n('elapsed-time', ++count)
      );
    }, 1000);

    this.checkEditCount(user);

    this.getPagesCreated(user).done(pagesCreated => {
      if (!pagesCreated.length) {
        this.toastInfo($.i18n('select2-no-results'));
        return this.setState('initial');
      }
      this.getPageViewsData(pagesCreated).done(pageViewsData => {
        $('.progress-bar').css('width', '100%');
        $('.progress-counter').text($.i18n('building-dataset'));
        const userLink = this.getUserLink(user);
        setTimeout(() => {
          this.buildMotherDataset(user, userLink, pageViewsData);
          readyForRendering();
        }, 250);
      });
    }).fail(error => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (typeof error === 'string') {
        this.toastError(error);
      } else {
        this.toastError($.i18n('api-error-unknown', 'Page Creation API'));
      }
    }).always(() => {
      $('.elapsed-timer').text('');
      window.clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
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
            action: 'query',
            list: 'prefixsearch',
            format: 'json',
            psnamespace: 2,
            pssearch: `User:${query}`
          };
        },
        preProcess: data => {
          const results = data.query.prefixsearch.map(elem => {
            return elem.title.split('/')[0].substr(elem.title.indexOf(':') + 1);
          }).unique();
          return results;
        }
      }
    });
  }

  /**
   * Calls parent setupProjectInput and updates the view if validations passed
   *   reverting to the old value if the new one is invalid
   * @override
   */
  validateProject() {
    // 'true' validates that it is a multilingual project
    if (super.validateProject()) {
      this.setState('initial');

      /** kill and re-init typeahead to point to new project */
      this.setupSourceInput();
    }
  }

  /**
   * Exports current lang data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @override
   */
  exportCSV() {
    let csvContent = `data:text/csv;charset=utf-8,Title,${this.getDateHeadings(false).join(',')}\n`;

    // Add the rows to the CSV
    this.outputData.listData.forEach(page => {
      const pageName = '"' + page.label.descore().replace(/"/g, '""') + '"';

      csvContent += [
        pageName
      ].concat(page.data).join(',') + '\n';
    });

    this.downloadData(csvContent, 'csv');
  }
}

$(() => {
  new UserViews();
});
