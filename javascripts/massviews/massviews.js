/*
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
    super();

    this.localizeDateFormat = this.getFromLocalStorage('pageviews-settings-localizeDateFormat') || config.defaults.localizeDateFormat;
    this.numericalFormatting = this.getFromLocalStorage('pageviews-settings-numericalFormatting') || config.defaults.numericalFormatting;
    this.config = config;
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
  }

  /**
   * Copy default values over to class instance
   * Use JSON stringify/parsing so to make a deep clone of the defaults
   * @return {null} Nothing
   */
  assignDefaults() {
    Object.assign(this, JSON.parse(JSON.stringify(config.defaults.params)));
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
      platform: $(config.platformSelector).val(),
      agent: $(config.agentSelector).val(),
      source: $(config.sourceButton).data('value'),
      target: $(config.sourceInput).val()
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in config.specialRanges, constructed like `{range: 'last-month'}`,
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

    /** only certain characters within the page name are escaped */
    // const page = $(config.sourceInput).val().score().replace(/[&%]/g, escape);
    window.history.replaceState({}, document.title, '?' + $.param(this.getParams()));
  }

  /**
   * Given the badge code provided by the Wikidata API, return a image tag of the badge
   * @param  {String} badgeCode - as defined in config.badges
   * @return {String} HTML markup for the image
   */
  getBadgeMarkup(badgeCode) {
    if (!config.badges[badgeCode]) return '';
    const badgeImage = config.badges[badgeCode].image,
      badgeName = config.badges[badgeCode].name;
    return `<img class='article-badge' src='${badgeImage}' alt='${badgeName}' title='${badgeName}' />`;
  }

  /**
   * Render list of massviews into view
   * @returns {null} nothing
   */
  renderData() {
    /** sort ascending by current sort setting */
    const sortedMassViews = this.massData.sort((a, b) => {
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
       <th>${$.i18n('unique-titles', this.massData.length)}</th>
       <th>${this.formatNumber(this.total)}</th>
       <th>${this.formatNumber(Math.round(this.total / this.numDaysInRange()))} / ${$.i18n('day')}</th>`
    );
    $('#mass_list').html('');

    sortedMassViews.forEach((item, index) => {
      $('#mass_list').append(
        `<tr>
         <th scope='row'>${index + 1}</th>
         <td><a href="https://${this.sourceProject}/wiki/${item.title}" target="_blank">${item.title.descore()}</a></td>
         <td><a target="_blank" href='${this.getPageviewsURL(this.sourceProject, item.title)}'>${this.formatNumber(item.views)}</a></td>
         <td>${this.formatNumber(item.average)} / ${$.i18n('day')}</td>
         </tr>`
      );
    });

    this.pushParams();
    this.setState('complete');
  }

  /**
   * Get value of given langview entry for the purposes of column sorting
   * @param  {object} item - langview entry within this.massData
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    switch (type) {
    case 'title':
      return item.title;
    case 'views':
      return Number(item.views);
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
    const platform = $(config.platformSelector).val();

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
   * @param  {string} dbName - database name as returned by Page Pile API
   * @param  {Object} pages - as given by the getInterwikiData promise
   * @return {Deferred} - Promise resolving with data ready to be rendered to view
   */
  getPageViewsData(dbName, pages) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    // XXX: throttling
    let dfd = $.Deferred(), promises = [], count = 0, hadFailure, failureRetries = {},
      totalRequestCount = pages.length;

    /** clear out existing data */
    this.massData = [];

    const makeRequest = page => {
      const uriEncodedPageName = encodeURIComponent(page),
        sourceProject = siteMap[dbName];

      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${sourceProject}` +
        `/${$(config.platformSelector).val()}/${$(config.agentSelector).val()}/${uriEncodedPageName}/daily` +
        `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
      );
      const promise = $.ajax({ url, dataType: 'json' });
      promises.push(promise);

      promise.done(pvData => {
        const viewCounts = pvData.items.map(el => el.views),
          views = viewCounts.reduce((a, b) => a + b);

        this.massData.push({
          title: page,
          views,
          average: Math.round(views / this.numDaysInRange())
        });

        this.total += views;
      }).fail(errorData => {
        // XXX: throttling
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        if (errorData.responseJSON.title === 'Error in Cassandra table storage backend') {
          if (failureRetries[dbName]) {
            failureRetries[dbName]++;
          } else {
            failureRetries[dbName] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[dbName] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, 100, this)(page);
          }
        }

        this.writeMessage(`${$.i18n('langviews-error', page)}: ${errorData.responseJSON.title}`);
        hadFailure = true; // don't treat this series of requests as being cached by server
      }).always(() => {
        this.updateProgressBar((++count / totalRequestCount) * 100);

        // XXX: throttling, totalRequestCount can just be interWikiKeys.length
        if (count === totalRequestCount) {
          dfd.resolve(this.massData);

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
          `
          ${this.getPileLink(id)} contains ${this.n(pages.length)} pages.
          For performance reasons, the limit is currently set to ${config.pageLimit}.
          Processing the first ${config.pageLimit} pages only.
          `
        );

        pages = pages.slice(0, config.pageLimit);
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
   * Parse wiki URL for the page name
   * @param  {String} url - full URL to a wiki page
   * @return {String|null} page name
   */
  getPageNameFromURL(url) {
    if (url.includes('?')) {
      return url.match(/\?(?:.*\b)?title=(.*?)(?:&|$)/)[1];
    } else {
      return url.match(/\/wiki\/(.*?)(?:\?|$)/)[1];
    }
  }

  /**
   * Generate key/value pairs of URL query string
   * @returns {Object} key/value pairs representation of query string
   */
  parseQueryString() {
    const uri = decodeURI(location.search.slice(1)),
      chunks = uri.split('&');
    let params = {};

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i].split('=');
      params[chunk[0]] = chunk[1];
    }

    return params;
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
        this.setSpecialRange(config.defaults.dateRange);
      }
    } else if (params.start) {
      startDate = moment(params.start || moment().subtract(config.defaults.daysAgo, 'days'));
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
      this.setSpecialRange(config.defaults.dateRange);
    }

    $(config.platformSelector).val(params.platform || 'all-access');
    $(config.agentSelector).val(params.agent || 'user');
    this.sort = params.sort || config.defaults.params.sort;
    this.direction = params.direction || config.defaults.params.direction;

    /** start up processing if page name is present */
    if (config.validSources.includes(params.source) && params.target) {
      $(config.sourceButton).data('value', params.source);
      $(config.sourceInput).val(decodeURIComponent(params.target).descore());
      this.processInput();
    } else {
      this.setState('initial');
    }
  }

  getState() {
    const classList = $('main')[0].classList;
    return config.formStates.filter(stateName => {
      return classList.contains(stateName);
    })[0];
  }

  /**
   * Helper to set a CSS class on the `main` node,
   *   styling the document based on a 'state'
   * @param {String} state - class to be added;
   *   should be one of ['initial', 'processing', 'complete']
   * @returns {null} nothing
   */
  setState(state) {
    $('main').removeClass(config.formStates.join(' ')).addClass(state);

    switch (state) {
    case 'initial':
      this.clearMessages();
      this.assignDefaults();
      if (this.typeahead) this.typeahead.hide();
      $(config.sourceInput).val('').focus();
      break;
    case 'processing':
      document.activeElement.blur();
      $('.progress-bar').addClass('active');
      $('.error-message').html('');
      break;
    case 'complete':
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
    const dateRangeSelector = $(config.dateRangeSelector);

    /** transform config.specialRanges to have i18n as keys */
    let ranges = {};
    Object.keys(config.specialRanges).forEach(key => {
      ranges[$.i18n(key)] = config.specialRanges[key];
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
      startDate: moment().subtract(config.defaults.daysAgo, 'days'),
      minDate: config.minDate,
      maxDate: config.maxDate,
      ranges: ranges
    });

    /** so people know why they can't query data older than August 2015 */
    $('.daterangepicker').append(
      $('<div>')
        .addClass('daterange-notice')
        .html($.i18n('date-notice', document.title, "<a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>"))
    );

    /**
     * The special date range options (buttons the right side of the daterange picker)
     *
     * WARNING: we're unable to add class names or data attrs to the range options,
     * so checking which was clicked is hardcoded based on the index of the LI,
     * as defined in config.specialRanges
     */
    $('.daterangepicker .ranges li').on('click', e => {
      const index = $('.daterangepicker .ranges li').index(e.target),
        container = this.daterangepicker.container,
        inputs = container.find('.daterangepicker_input input');
      this.specialRange = {
        range: Object.keys(config.specialRanges)[index],
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
      if (simpleStorage.hasKey('langviews-throttle')) {
        const timeRemaining = Math.round(simpleStorage.getTTL('langviews-throttle') / 1000);

        /** > 0 check to combat race conditions */
        if (timeRemaining > 0) {
          // FIXME: restore when fallbacks are supported for multi-param messages
          // return this.writeMessage($.i18n(
          //   'langviews-throttle-wait', `<b>${timeRemaining}</b>`,
          //   '<a href="https://phabricator.wikimedia.org/T124314" target="_blank">phab:T124314</a>'
          // ), true);
          return this.writeMessage(`
            Please wait <b>${timeRemaining}</b> seconds before submitting another request.<br/>
            Apologies for the inconvenience. This is a temporary throttling tactic.<br/>
            See <a href="https://phabricator.wikimedia.org/T124314" target="_blank">phab:T124314</a>
            for more information.
          `, true);
        }
      } else {
        /** limit to one request every 90 seconds */
        simpleStorage.set('langviews-throttle', true, {TTL: 90000});
      }
    }

    this.setState('processing');

    this.getPagePile($(config.sourceInput).val()).done(pileData => {
      this.sourceProject = siteMap[pileData.wiki];
      this.getPageViewsData(pileData.wiki, pileData.pages).done(() => {
        $('.massviews-input-name').text(`Page Pile #${pileData.id}`).prop('href', this.getPileURL(pileData.id));
        $('.massviews-params').html(
          `
          ${$(config.dateRangeSelector).val()}
          &mdash;
          <a href="https://${this.sourceProject}" target="_blank">${this.sourceProject.replace(/.org$/, '')}</a>
          `
        );
        this.updateProgressBar(100);
        this.renderData();
      });
    }).fail(error => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (typeof error === 'string') {
        this.writeMessage(error);
      } else {
        this.writeMessage($.i18n('wikidata-error-unknown'));
      }
    });
  }

  /**
   * Set value of progress bar
   * @param  {Number} value - percentage as float
   * @return {null} nothing
   */
  updateProgressBar(value) {
    $('.progress-bar').css('width', `${value.toFixed(2)}%`);
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
