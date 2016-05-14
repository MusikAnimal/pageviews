/*
 * Langviews Analysis tool
 * @file Main file for Langviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');

/** Main LangViews class */
class LangViews extends Pv {
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

    $('#langviews_form').on('submit', e => {
      e.preventDefault(); // prevent page from reloading
      this.processArticle();
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

    $(config.projectInput).on('change', () => {
      this.validateProject();
      this.updateInterAppLinks();
    });

    $('.download-csv').on('click', this.exportCSV.bind(this));
    $('.download-json').on('click', this.exportJSON.bind(this));
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
    return $(config.articleInput).data('typeahead');
  }

  /**
   * Get all user-inputted parameters
   * @param {boolean} [forCacheKey] whether or not to include the page name, and exclude sort and direction
   *   in the returned object. This is for the purposes of generating a unique cache key for params affecting the API queries
   * @return {Object} project, platform, agent, etc.
   */
  getParams(forCacheKey = false) {
    let params = {
      project: $(config.projectInput).val(),
      platform: $(config.platformSelector).val(),
      agent: $(config.agentSelector).val()
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

    if (forCacheKey) {
      params.page = $(config.articleInput).val();
    } else {
      params.sort = this.sort;
      params.direction = this.direction;
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
    const page = $(config.articleInput).val().score().replace(/[&%]/g, escape);
    window.history.replaceState({}, document.title, `?${$.param(this.getParams())}&page=${page}`);

    $('.permalink').prop('href', `/langviews?${$.param(this.getPermaLink())}`);
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
   * Render list of langviews into view
   * @returns {null} nothing
   */
  renderData() {
    /** sort ascending by current sort setting */
    const sortedLangViews = this.langData.sort((a, b) => {
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

    const totalBadgesMarkup = Object.keys(this.totals.badges).map(badge => {
      return `<span class='nowrap'>${this.getBadgeMarkup(badge)} &times; ${this.totals.badges[badge]}</span>`;
    }).join(', ');

    $('.output-totals').html(
      `<th scope='row'>${$.i18n('totals')}</th>
       <th>${$.i18n('num-languages', this.langData.length)}</th>
       <th>${$.i18n('unique-titles', this.totals.titles.length)}</th>
       <th>${totalBadgesMarkup}</th>
       <th>${this.n(this.totals.views)}</th>
       <th>${this.n(Math.round(this.totals.views / this.numDaysInRange()))} / ${$.i18n('day')}</th>`
    );
    $('#lang_list').html('');

    sortedLangViews.forEach((item, index) => {
      let badgeMarkup = '';
      if (item.badges) {
        badgeMarkup = item.badges.map(this.getBadgeMarkup).join();
      }

      $('#lang_list').append(
        `<tr>
         <th scope='row'>${index + 1}</th>
         <td>${item.lang}</td>
         <td><a href="${item.url}" target="_blank">${item.pageName}</a></td>
         <td>${badgeMarkup}</td>
         <td><a href='${this.getPageviewsURL(item.lang, this.baseProject, item.pageName)}'>${this.n(item.views)}</a></td>
         <td>${this.n(item.average)} / ${$.i18n('day')}</td>
         </tr>`
      );
    });

    this.pushParams();
    this.setState('complete');
  }

  /**
   * Get value of given langview entry for the purposes of column sorting
   * @param  {object} item - langview entry within this.langData
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    switch (type) {
    case 'lang':
      return item.lang;
    case 'title':
      return item.pageName;
    case 'badges':
      return item.badges.sort().join('');
    case 'views':
      return Number(item.views);
    }
  }

  /**
   * Link to /pageviews for given article and chosen daterange
   * @param {String} lang - two character language code
   * @param {String} project - base project without lang, e.g. wikipedia.org
   * @param {String} article - page name
   * @returns {String} URL
   */
  // FIXME: should include agent and platform, and use special ranges as currently specified
  getPageviewsURL(lang, project, article) {
    let startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate);
    const platform = $(config.platformSelector).val();

    if (endDate.diff(startDate, 'days') === 0) {
      startDate.subtract(3, 'days');
      endDate.add(3, 'days');
    }

    return `/pageviews#start=${startDate.format('YYYY-MM-DD')}` +
      `&end=${endDate.format('YYYY-MM-DD')}&project=${lang}.${project}.org&platform=${platform}&pages=${article}`;
  }

  /**
   * Loop through given interwiki data and query the pageviews API for each
   *   Also updates this.langData with result
   * @param  {Object} interWikiData - as given by the getInterwikiData promise
   * @return {Deferred} - Promise resolving with data ready to be rendered to view
   */
  getPageViewsData(interWikiData) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day'),
      interWikiKeys = Object.keys(interWikiData);
    // XXX: throttling
    let dfd = $.Deferred(), promises = [], count = 0, hadFailure, failureRetries = {},
      totalRequestCount = interWikiKeys.length;

    /** clear out existing data */
    this.langData = [];

    const makeRequest = dbName => {
      const data = interWikiData[dbName],
        lang = data.site.replace(/wiki.*$/, ''),
        uriEncodedPageName = encodeURIComponent(data.title);

      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.${this.baseProject}` +
        `/${$(config.platformSelector).val()}/${$(config.agentSelector).val()}/${uriEncodedPageName}/daily` +
        `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
      );
      const promise = $.ajax({ url, dataType: 'json' });
      promises.push(promise);

      promise.done(pvData => {
        const viewCounts = pvData.items.map(el => el.views),
          views = viewCounts.reduce((a, b) => a + b);

        this.langData.push({
          badges: data.badges,
          dbName,
          lang,
          pageName: data.title,
          views,
          url: data.url,
          average: Math.round(views / this.numDaysInRange())
        });

        /** keep track of unique badges/titles and total pageviews */
        this.totals.views += views;
        if (!this.totals.titles.includes(data.title)) {
          this.totals.titles.push(data.title);
        }
        data.badges.forEach(badge => {
          if (this.totals.badges[badge] === undefined) {
            this.totals.badges[badge] = 1;
          } else {
            this.totals.badges[badge] += 1;
          }
        });
      }).fail(errorData => {
        // XXX: throttling
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const cassandraError = errorData.responseJSON.title === 'Error in Cassandra table storage backend';

        if (cassandraError) {
          if (failureRetries[dbName]) {
            failureRetries[dbName]++;
          } else {
            failureRetries[dbName] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[dbName] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, 100, this)(dbName);
          }
        }

        const errorMessage = cassandraError ? $.i18n('api-error-timeout') : `${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`;
        this.writeMessage(`${dbName}: ${errorMessage}`);

        hadFailure = true; // don't treat this series of requests as being cached by server
      }).always(() => {
        this.updateProgressBar((++count / totalRequestCount) * 100);

        // XXX: throttling, totalRequestCount can just be interWikiKeys.length
        if (count === totalRequestCount) {
          dfd.resolve(this.langData);

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

    interWikiKeys.forEach((dbName, index) => {
      requestFn(dbName);
    });

    return dfd;
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
   * Query Wikidata to find data about a given page across all sister projects
   * @param  {String} dbName - database name of source project
   * @param  {String} pageName - name of page we want to get data about
   * @return {Deferred} - Promise resolving with interwiki data
   */
  getInterwikiData(dbName, pageName) {
    const dfd = $.Deferred();
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=${dbName}` +
      `&titles=${encodeURIComponent(pageName)}&props=sitelinks/urls|datatype&format=json&callback=?`;

    $.getJSON(url).done(data => {
      if (data.error) {
        return dfd.reject(`${$.i18n('api-error', 'Wikidata')}: ${data.error.info}`);
      } else if (data.entities['-1']) {
        return dfd.reject(
          `<a href='${this.getPageURL(pageName)}'>${pageName.descore()}</a> - ${$.i18n('api-error-no-data')}`
        );
      }

      const key = Object.keys(data.entities)[0],
        sitelinks = data.entities[key].sitelinks,
        filteredLinks = {},
        matchRegex = new RegExp(`^https://\\w+\\.${this.baseProject}\\.org`);

      /** restrict to selected base project (e.g. wikipedias, not wikipedias and wikivoyages) */
      Object.keys(sitelinks).forEach(key => {
        if (matchRegex.test(sitelinks[key].url)) {
          filteredLinks[key] = sitelinks[key];
        }
      });

      return dfd.resolve(filteredLinks);
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

      if (chunk[0] === 'pages') {
        params.pages = chunk[1].split('|');
      } else {
        params[chunk[0]] = chunk[1];
      }
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

    $(config.projectInput).val(params.project || config.defaults.project);
    if (this.validateProject()) return;

    // FIXME: only run this when they actually submit
    this.patchUsage('lv');

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
      if (startDate < config.minDate || endDate < config.minDate) {
        this.addSiteNotice('danger', $.i18n('param-error-1', `${$.i18n('july')} 2015`), $.i18n('invalid-params'), true);
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
    if (params.page) {
      $(config.articleInput).val(decodeURIComponent(params.page).descore());
      this.processArticle();
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
      $(config.articleInput).val('').focus();
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
    super.setupDateRangeSelector();

    $(config.dateRangeSelector).on('apply.daterangepicker', (e, action) => {
      if (action.chosenLabel === $.i18n('custom-range')) {
        this.specialRange = null;

        /** force events to re-fire since apply.daterangepicker occurs before 'change' event */
        this.daterangepicker.updateElement();
      }
    });
  }

  /**
   * Process the langviews for the article and options entered
   * Called when submitting the form
   * @return {null} nothing
   */
  processArticle() {
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

    const page = $(config.articleInput).val();

    this.setState('processing');

    const dbName = Object.keys(siteMap).find(key => siteMap[key] === $(config.projectInput).val());

    this.getInterwikiData(dbName, page).done(interWikiData => {
      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      if (!this.isRequestCached()) simpleStorage.set('pageviews-throttle', true, {TTL: 90000});

      this.getPageViewsData(interWikiData).done(() => {
        $('.langviews-page-name').text(page).prop('href', this.getPageURL(page));
        $('.langviews-params').text($(config.dateRangeSelector).val());
        this.updateProgressBar(100);
        this.renderData();

        /**
         * XXX: throttling
         * Reset throttling again; the first one was in case they aborted
         */
        if (!this.isRequestCached()) simpleStorage.set('pageviews-throttle', true, {TTL: 90000});
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
  setupArticleInput() {
    if (this.typeahead) this.typeahead.destroy();

    $(config.articleInput).typeahead({
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
            pssearch: query
          };
        },
        preProcess: data => {
          const results = data.query.prefixsearch.map(elem => elem.title);
          return results;
        }
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

  /**
   * Validate the currently entered project. Called when the value is changed
   * @return {boolean} true if validation failed
   */
  validateProject() {
    const project = $(config.projectInput).val();

    if (!this.isMultilangProject()) {
      this.writeMessage(
        $.i18n('invalid-lang-project', `<a href='//${project}'>${project}</a>`),
        true
      );
      this.setState('invalid');
      return true;
    }

    this.setState('initial');

    /** kill and re-init typeahead to point to new project */
    this.setupArticleInput();

    return false;
  }

  /**
   * Exports current mass data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @returns {string} CSV content
   */
  exportCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,Language,Title,Badges,Pageviews,Average\n';

    // Add the rows to the CSV
    this.langData.forEach(page => {
      let pageName = '"' + page.pageName.descore().replace(/"/g, '""') + '"';

      csvContent += [
        page.lang,
        pageName,
        page.badges.map(badge => config.badges[badge].name),
        page.views,
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
    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(this.langData),
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

  new LangViews();
});
