/**
 * Massviews Analysis tool
 * @file Main file for Massviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');

/** Main MassViews class */
class MassViews extends Pv {
  constructor() {
    super(config);
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

    /** only show options for line, bar and radar charts */
    $('.multi-page-chart-node').hide();
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
   * Add general event listeners
   * @returns {null} nothing
   */
  setupListeners() {
    super.setupListeners();

    $('#massviews_form').on('submit', e => {
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

    $('.download-csv').on('click', this.exportCSV.bind(this));
    $('.download-json').on('click', this.exportJSON.bind(this));

    $('.source-option').on('click', e => this.updateSourceInput(e.target));

    $('.view-btn').on('click', e => {
      document.activeElement.blur();
      this.view = e.currentTarget.dataset.value;
      this.toggleView(this.view);
    });
  }

  toggleView(view) {
    $('.view-btn').removeClass('active');
    $(`.view-btn--${view}`).addClass('active');
    $('.list-view, .chart-view').hide();
    $(`.${view}-view`).show();

    if (view === 'chart') {
      this.destroyChart();
      /** export built datasets to global scope Chart templates */
      window.chartData = this.massData.datasets[0];

      const options = Object.assign({},
        this.config.chartConfig[this.chartType].opts,
        this.config.globalChartOpts
      );
      this.assignMassDataChartOpts();

      const context = $(this.config.chart)[0].getContext('2d');

      this.chartObj = new Chart(context)[this.chartType](this.massData, options);

      $('#chart-legend').html(this.chartObj.generateLegend());
    }

    this.pushParams();
  }

  updateSourceInput(node) {
    const source = node.dataset.value;

    $('#source_button').data('value', source).html(`${node.textContent} <span class='caret'></span>`);

    if (source === 'category') {
      $(this.config.sourceInput).prop('type', 'text')
        .prop('placeholder', this.config.placeholders.category)
        .val('');
    } else {
      $(this.config.sourceInput).prop('type', 'number')
        .prop('placeholder', this.config.placeholders.pagepile)
        .val('');
    }

    $(this.config.sourceInput).focus();
  }

  /**
   * Get the base project name (without language and the .org)
   * @returns {boolean} projectname
   */
  get baseProject() {
    return this.project.split('.')[1];
  }

  /**
   * Get all user-inputted parameters
   * @param {boolean} [forCacheKey] whether or not to include the page name, and exclude sort and direction
   *   in the returned object. This is for the purposes of generating a unique cache key for params affecting the API queries
   * @return {Object} project, platform, agent, etc.
   */
  getParams(forCacheKey = false) {
    let params = {
      platform: $(this.config.platformSelector).val(),
      agent: $(this.config.agentSelector).val(),
      source: $(this.config.sourceButton).data('value'),
      target: $(this.config.sourceInput).val()
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

    if (!forCacheKey) {
      params.sort = this.sort;
      params.direction = this.direction;
      params.view = this.view;
    }

    return params;
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
   * Push relevant class properties to the query string
   * @param  {Boolean} clear - wheter to clear the query string entirely
   * @return {null} nothing
   */
  pushParams(clear = false) {
    if (!window.history || !window.history.replaceState) return;

    if (clear) {
      return history.replaceState(null, document.title, location.href.split('?')[0]);
    }

    /** only certain characters within the page name are escaped */
    // const page = $(this.config.sourceInput).val().score().replace(/[&%]/g, escape);
    window.history.replaceState({}, document.title, '?' + $.param(this.getParams()));

    $('.permalink').prop('href', `/massviews?${$.param(this.getPermaLink())}`);
  }

  /**
   * Render list of massviews into view
   * @returns {null} nothing
   */
  renderData() {
    const articleDatasets = this.massData.listData;
    /** sort ascending by current sort setting */
    const sortedMassViews = articleDatasets.sort((a, b) => {
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
    const newSortClassName = parseInt(this.direction) === 1 ? 'glyphicon-sort-by-alphabet-alt' : 'glyphicon-sort-by-alphabet';
    $(`.sort-link--${this.sort} span`).addClass(newSortClassName).removeClass('glyphicon-sort');

    $('.output-totals').html(
      `<th scope='row'>${$.i18n('totals')}</th>
       <th>${$.i18n('num-pages', articleDatasets.length)}</th>
       <th>${this.formatNumber(this.massData.sum)}</th>
       <th>${this.formatNumber(Math.round(this.massData.average))} / ${$.i18n('day')}</th>`
    );
    $('#mass_list').html('');

    sortedMassViews.forEach((item, index) => {
      $('#mass_list').append(
        `<tr>
         <th scope='row'>${index + 1}</th>
         <td><a href="https://${this.sourceProject}/wiki/${item.label}" target="_blank">${item.label.descore()}</a></td>
         <td><a target="_blank" href='${this.getPageviewsURL(this.sourceProject, item.label)}'>${this.formatNumber(item.sum)}</a></td>
         <td>${this.formatNumber(Math.round(item.average))} / ${$.i18n('day')}</td>
         </tr>`
      );
    });

    this.pushParams();
    this.toggleView(this.view);
    this.setState('complete');
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
   * Get value of given langview entry for the purposes of column sorting
   * @param  {object} item - langview entry within this.massData
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    switch (type) {
    case 'original':
      return item.index;
    case 'title':
      return item.label;
    case 'views':
      return Number(item.sum);
    }
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

    return `/pageviews#start=${startDate.format('YYYY-MM-DD')}` +
      `&end=${endDate.format('YYYY-MM-DD')}&project=${project}&platform=${platform}&pages=${page}`;
  }

  /**
   * Loop through given pages and query the pageviews API for each
   *   Also updates this.massData with result
   * @param  {string} project - project such as en.wikipedia.org
   * @param  {Object} pages - as given by the getPagePile promise
   * @return {Deferred} - Promise resolving with data ready to be rendered to view
   */
  getPageViewsData(project, pages) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    // XXX: throttling
    let dfd = $.Deferred(), promises = [], count = 0, hadFailure, failureRetries = {},
      totalRequestCount = pages.length, failedPages = [], pageViewsData = [];

    const makeRequest = page => {
      const uriEncodedPageName = encodeURIComponent(page);
      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}` +
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/${uriEncodedPageName}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({ url, dataType: 'json' });
      promises.push(promise);

      promise.done(pvData => {
        pageViewsData.push({
          title: page,
          items: pvData.items
        });
      }).fail(errorData => {
        // XXX: throttling
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const cassandraError = errorData.responseJSON.title === 'Error in Cassandra table storage backend';

        if (cassandraError) {
          if (failureRetries[project]) {
            failureRetries[project]++;
          } else {
            failureRetries[project] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[project] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, 100, this)(page);
          }
        }

        if (cassandraError) {
          failedPages.push(page);
        } else {
          this.writeMessage(`${this.getPageLink(page, project)}: ${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`);
        }

        hadFailure = true; // don't treat this series of requests as being cached by server
      }).always(() => {
        this.updateProgressBar((++count / totalRequestCount) * 100);

        // XXX: throttling
        if (count === totalRequestCount) {
          dfd.resolve(pageViewsData);

          if (failedPages.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedPages.map(failedPage => `<li>${this.getPageLink(failedPage, project)}</li>`).join('') +
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

    pages.forEach((page, index) => {
      requestFn(page);
    });

    return dfd;
  }

  /**
   * Build our mother data set, from which we can draw a chart,
   *   render a list of data, whatever our heart desires :)
   * @param  {string} label - label for the dataset (e.g. category:blah, page pile 24, etc)
   * @param  {string} link - HTML anchor tag for the label
   * @param  {array} datasets - array of datasets for each article, as returned by the Pageviews API
   * @return {object} mother data set, also stored in this.massData
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

    this.massData = {
      labels: this.getDateHeadings(true), // labels needed for Charts.js, even though we'll only have one dataset
      link, // for our own purposes
      listData: []
    };
    const startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate),
      length = this.numDaysInRange();

    let totalViewsSet = new Array(length).fill(0),
      datesWithoutData = [];

    datasets.forEach((dataset, index) => {
      const data = dataset.items.map(item => item.views),
        sum = data.reduce((a, b) => a + b);

      this.massData.listData.push({
        data,
        label: dataset.title,
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

    // FIXME: for the dates that have incomplete data, still show what we have,
    //   but make the bullet point red in the chart

    const grandSum = totalViewsSet.reduce((a, b) => (a || 0) + (b || 0));

    Object.assign(this.massData, {
      datasets: [{
        label,
        data: totalViewsSet,
        sum: grandSum,
        average: grandSum / length
      }],
      datesWithoutData,
      sum: grandSum, // nevermind the duplication
      average: grandSum / length
    });

    if (datesWithoutData.length) {
      const dateList = datesWithoutData.map(date => moment(date).format(this.dateFormat));
      // FIXME: i18N
      this.writeMessage($.i18n('api-incomplete-data', dateList.sort().join(' &middot; ')));
    }

    return this.massData;
  }

  assignMassDataChartOpts(props) {
    const color = this.config.colors[0];
    Object.assign(this.massData.datasets[0], this.config.chartConfig[this.chartType].dataset(color));

    if (this.chartType === 'Line') {
      this.massData.datasets[0].fillColor = color.replace(/,\s*\d\)/, ', 0.2)');
    }
  }

  getPileURL(id) {
    return `http://tools.wmflabs.org/pagepile/api.php?action=get_data&id=${id}`;
  }

  getPileLink(id) {
    return `<a href='${this.getPileURL(id)}' target='_blank'>Page Pile ${id}</a>`;
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
   * Check simple storage to see if a request with the current params would be cached
   * @return {Boolean} cached or not
   */
  isRequestCached() {
    return simpleStorage.hasKey(this.getCacheKey());
  }

  /**
   * Get list of pages from Page Pile API given id
   * @param  {Number} id - PagePile ID
   * @return {Deferred} - Promise resolving with page names
   */
  getPagePile(id) {
    const dfd = $.Deferred();
    const url = `https://tools.wmflabs.org/pagepile/api.php?id=${id}&action=get_data&format=json&metadata=1`;

    $.ajax({
      url,
      dataType: 'jsonp'
    }).done(data => {
      let pages = Object.keys(data.pages);

      if (pages.length > 500) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', this.getPileLink(id), this.n(pages.length), this.config.pageLimit)
        );

        pages = pages.slice(0, this.config.pageLimit);
      }

      return dfd.resolve({
        id: data.id,
        wiki: data.wiki,
        pages: pages
      });
    }).fail(error => {
      return dfd.reject(
        `${this.getPileLink(id)}: ${$.i18n('api-error-no-data')}`
      );
    });

    return dfd;
  }

  /**
   * Parse wiki URL for the wiki and page name
   * @param  {String} url - full URL to a wiki page
   * @return {Array|null} ['wiki', 'page'] or null if invalid
   */
  getWikiPageFromURL(url) {
    let matches;

    if (url.includes('?')) {
      matches = url.match(/\/\/(.*?)\/w\/.*\?(?:.*\b)?title=(.*?)(?:&|$)/);
    } else {
      matches = url.match(/\/\/(.*?)\/wiki\/(.*?)(?:\?|$)/);
    }

    return matches ? matches.slice(1) : [null, null];
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    let startDate, endDate, params = this.parseQueryString();

    this.patchUsage('mv');

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
      if (startDate < moment('2015-08-01') || endDate < moment('2015-08-01')) {
        this.addSiteNotice('danger', $.i18n('param-error-1'), $.i18n('invalid-params'), true);
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
    ['sort', 'direction', 'view', 'source'].forEach(key => {
      const value = params[key];
      if (value && this.config.validParams[key].includes(value)) {
        params[key] = value;
        this[key] = value;
      } else {
        params[key] = this.config.defaults.params[key];
        this[key] = this.config.defaults.params[key];
      }
    });

    this.updateSourceInput($(`.source-option[data-value=${params.source}]`)[0]);

    /** start up processing if necessary params are present */
    if (params.target) {
      $(this.config.sourceInput).val(decodeURIComponent(params.target).descore());
      this.processInput();
    } else {
      this.setState('initial');
    }
  }

  getState() {
    const classList = $('main')[0].classList;
    return this.config.formStates.filter(stateName => {
      return classList.contains(stateName);
    })[0];
  }

  /**
   * Helper to set a CSS class on the `main` node,
   *   styling the document based on a 'state'
   * @param {String} state - class to be added;
   *   should be one of ['initial', 'processing', 'complete']
   * @param {function} [cb] - Optional function to be called after initial state has been set
   * @returns {null} nothing
   */
  setState(state, cb) {
    $('main').removeClass(this.config.formStates.join(' ')).addClass(state);

    switch (state) {
    case 'initial':
      this.clearMessages();
      this.assignDefaults();
      this.destroyChart();
      $('.list-view, .chart-view').hide();
      if (this.typeahead) this.typeahead.hide();
      $(this.config.sourceInput).val('').focus();
      if (typeof cb === 'function') cb.call(this);
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
      break;
    case 'invalid':
      break;
    }
  }

  /**
   * sets up the daterange selector and adds listeners
   * @returns {null} - nothing
   */
  setupDateRangeSelector() {
    const dateRangeSelector = $(this.config.dateRangeSelector);

    /** transform this.config.specialRanges to have i18n as keys */
    let ranges = {};
    Object.keys(this.config.specialRanges).forEach(key => {
      ranges[$.i18n(key)] = this.config.specialRanges[key];
    });

    dateRangeSelector.daterangepicker({
      locale: {
        format: this.dateFormat,
        applyLabel: $.i18n('apply'),
        cancelLabel: $.i18n('cancel'),
        customRangeLabel: $.i18n('custom-range'),
        dateLimit: { days: 31 },
        daysOfWeek: [
          $.i18n('su'),
          $.i18n('mo'),
          $.i18n('tu'),
          $.i18n('we'),
          $.i18n('th'),
          $.i18n('fr'),
          $.i18n('sa')
        ],
        monthNames: [
          $.i18n('january'),
          $.i18n('february'),
          $.i18n('march'),
          $.i18n('april'),
          $.i18n('may'),
          $.i18n('june'),
          $.i18n('july'),
          $.i18n('august'),
          $.i18n('september'),
          $.i18n('october'),
          $.i18n('november'),
          $.i18n('december')
        ]
      },
      startDate: moment().subtract(this.config.defaults.daysAgo, 'days'),
      minDate: this.config.minDate,
      maxDate: this.config.maxDate,
      ranges: ranges
    });

    /** so people know why they can't query data older than August 2015 */
    $('.daterangepicker').append(
      $('<div>')
        .addClass('daterange-notice')
        .html($.i18n('date-notice', document.title, "<a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>", `${$.i18n('july')} 2015`))
    );

    /**
     * The special date range options (buttons the right side of the daterange picker)
     *
     * WARNING: we're unable to add class names or data attrs to the range options,
     * so checking which was clicked is hardcoded based on the index of the LI,
     * as defined in this.config.specialRanges
     */
    $('.daterangepicker .ranges li').on('click', e => {
      const index = $('.daterangepicker .ranges li').index(e.target),
        container = this.daterangepicker.container,
        inputs = container.find('.daterangepicker_input input');
      this.specialRange = {
        range: Object.keys(this.config.specialRanges)[index],
        value: `${inputs[0].value} - ${inputs[1].value}`
      };
    });

    dateRangeSelector.on('apply.daterangepicker', (e, action) => {
      if (action.chosenLabel === $.i18n('custom-range')) {
        this.specialRange = null;

        /** force events to re-fire since apply.daterangepicker occurs before 'change' event */
        this.daterangepicker.updateElement();
      }
    });
  }

  processPagePile(cb) {
    const pileId = $(this.config.sourceInput).val();

    this.getPagePile(pileId).done(pileData => {
      if (!pileData.pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', this.getPileLink(pileId)));
        });
      }

      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      if (!this.isRequestCached()) simpleStorage.set('pageviews-throttle', true, {TTL: 90000});

      this.sourceProject = siteMap[pileData.wiki];
      this.getPageViewsData(this.sourceProject, pileData.pages).done(pageViewsData => {
        const label = `Page Pile #${pileData.id}`;

        $('.massviews-input-name').text(label).prop('href', this.getPileURL(pileData.id));
        $('.massviews-params').html(
          `
          ${$(this.config.dateRangeSelector).val()}
          &mdash;
          <a href="https://${this.sourceProject}" target="_blank">${this.sourceProject.replace(/.org$/, '')}</a>
          `
        );

        this.buildMotherDataset(label, this.getPileLink(pileData.id), pageViewsData);

        cb();
      });
    }).fail(error => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (typeof error === 'string') {
        this.writeMessage(error);
      } else {
        this.writeMessage($.i18n('api-error-unknown', 'Page Pile'));
      }
    });
  }

  processCategory(cb) {
    const [project, category] = this.getWikiPageFromURL($(this.config.sourceInput).val());

    if (!category) {
      return this.setState('initial', () => {
        this.writeMessage($.i18n('invalid-category-url'));
      });
    }

    const promise = $.ajax({
      url: `https://${project}/w/api.php`,
      jsonp: 'callback',
      dataType: 'jsonp',
      data: {
        action: 'query',
        format: 'json',
        list: 'categorymembers',
        cmlimit: 500,
        cmtitle: decodeURIComponent(category),
        prop: 'categoryinfo',
        titles: decodeURIComponent(category)
      }
    });
    const categoryLink = this.getPageLink(decodeURIComponent(category), project);
    this.sourceProject = project; // for caching purposes

    promise.done(data => {
      if (data.error) {
        return this.setState('initial', () => {
          this.writeMessage(
            `${$.i18n('api-error', 'Category API')}: ${data.error.info}`
          );
        });
      }

      const queryKey = Object.keys(data.query.pages)[0];

      if (queryKey === '-1') {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const size = data.query.pages[queryKey].categoryinfo.size;
      let pages = data.query.categorymembers;

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', categoryLink));
        });
      }

      if (size > 500) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', categoryLink, this.n(size), this.config.pageLimit)
        );

        pages = pages.slice(0, this.config.pageLimit);
      }

      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      this.setThrottle();

      const pageNames = pages.map(cat => cat.title);

      this.getPageViewsData(project, pageNames).done(pageViewsData => {
        $('.massviews-input-name').html(categoryLink);
        $('.massviews-params').html($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(category, categoryLink, pageViewsData);

        cb();
      });
    }).fail(data => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (data && data.error) {
        this.writeMessage(
          $.i18n('api-error', categoryLink + ': ' + data.error)
        );
      } else {
        this.writeMessage($.i18n('api-error-unknown', categoryLink));
      }
    });
  }

  /**
   * Process the massviews for the given source and options entered
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

    this.setState('processing');

    const cb = () => {
      this.updateProgressBar(100);
      this.renderData();

      // XXX: throttling
      this.setThrottle();
    };

    switch ($('#source_button').data('value')) {
    case 'pagepile':
      this.processPagePile(cb);
      break;
    case 'category':
      this.processCategory(cb);
      break;
    }
  }

  /**
   * Set value of progress bar
   * @param  {Number} value - percentage as float
   * @return {null} nothing
   */
  updateProgressBar(value) {
    $('.progress-bar').css('width', `${value.toFixed(2)}%`);
  }

  /**
   * Exports current mass data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @returns {string} CSV content
   */
  exportCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,Title,Pageviews,Average\n';

    // Add the rows to the CSV
    this.massData.listData.forEach(page => {
      let pageName = '"' + page.label.descore().replace(/"/g, '""') + '"';

      csvContent += [
        pageName,
        page.sum,
        page.average
      ].join(',') + '\n';
    });

    // Output the CSV file to the browser
    const encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
  }

  /**
   * Exports current mass data to JSON format and loads it in a new tab
   * @returns {string} stringified JSON
   */
  exportJSON() {
    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(this.massData),
      encodedUri = encodeURI(jsonContent);
    window.open(encodedUri);

    return jsonContent;
  }
}

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new MassViews();
});
