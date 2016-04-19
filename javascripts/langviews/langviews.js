/*
 * Langviews Analysis tool
 *
 * Copyright 2016 MusikAnimal
 * Redistributed under the MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');

class LangViews extends Pv {
  constructor() {
    super();

    this.localizeDateFormat = this.getFromLocalStorage('pageviews-settings-localizeDateFormat') || config.defaults.localizeDateFormat;
    this.numericalFormatting = this.getFromLocalStorage('pageviews-settings-numericalFormatting') || config.defaults.numericalFormatting;
    this.config = config;
    this.assignDefaults();
    this.setupDateRangeSelector();
    this.popParams();
    this.setupListeners();

    if (location.host !== 'localhost') {
      /** simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :) */
      $.ajax({
        url: '//tools.wmflabs.org/musikanimal/api/uses',
        method: 'PATCH',
        data: {
          tool: 'langviews',
          type: 'form'
        }
      });
    }
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

    $(config.projectInput).on('change', this.validateProject.bind(this));
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
    if (this.specialRange) {
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
    const page = $(config.articleInput).val().score();
    window.history.replaceState({}, document.title, `?${$.param(this.getParams())}&page=${page.replace(/[&%]/g, escape)}`);
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
      `<th scope='row'>${i18nMessages.totals}</th>
       <th>${i18nMessages.numLanguages.i18nArg(this.langData.length)}</th>
       <th>${i18nMessages.uniqueTitles.i18nArg(this.totals.titles.length)}</th>
       <th>${totalBadgesMarkup}</th>
       <th>${this.n(this.totals.views)}</th>
       <th>${this.n(Math.round(this.totals.views / this.numDaysInRange()))} / ${i18nMessages.day}</th>`
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
         <td>${this.n(Math.round(item.views / this.numDaysInRange()))} / ${i18nMessages.day}</td>
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
    let dfd = $.Deferred(), promises = [], count = 0, hadFailure;

    /** clear out existing data */
    this.langData = [];

    const makeRequest = dbName => {
      const data = interWikiData[dbName],
        lang = data.site.replace(/wiki/, '');

      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.${this.baseProject}` +
        `/${$(config.platformSelector).val()}/${$(config.agentSelector).val()}/${data.title}/daily` +
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
          url: data.url
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
        this.writeMessage(`${i18nMessages.langviewsError.i18nArg(dbName)}: ${errorData.responseJSON.title}`);
        hadFailure = true; // don't treat this series of requests as being cached by server
      }).always(() => {
        this.updateProgressBar((++count / interWikiKeys.length) * 100);

        if (count === interWikiKeys.length) {
          dfd.resolve(this.langData);

          /**
           * if there were no failures, assume the resource is now cached by the server
           *   and save this assumption to our own cache so we don't throttle the same requests
           */
          if (!hadFailure) {
            simpleStorage.set(cacheKey, true, {TTL: 600000});
          }
        }
      });
    };

    /**
     * We don't want to throttle requests for cached resources. However in our case,
     *   we're unable to check response headers to see if the resource was cached,
     *   so we use simpleStorage to keep track of what the user has recently queried.
     */
    const cacheKey = `lv-cache-${this.hashCode(
        JSON.stringify(this.getParams(true))
      )}`,
      isCached = simpleStorage.hasKey(cacheKey),
      requestFn = isCached ? makeRequest : this.rateLimit(makeRequest, 100, this);

    interWikiKeys.forEach((dbName, index) => {
      requestFn(dbName);
    });

    return dfd;
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
      `&titles=${pageName}&props=sitelinks/urls|datatype&format=json&callback=?`;

    $.getJSON(url).done(data => {
      if (data.error) {
        return dfd.reject(`${i18nMessages.wikidataError}: ${data.error.info}`);
      } else if (data.entities['-1']) {
        return dfd.reject(
          `<a href='${this.getPageURL(pageName)}'>${pageName.descore()}</a> - ${i18nMessages.apiErrorNoData}`
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

    /**
     * Check if we're using a valid range, and if so ignore any start/end dates.
     * If an invalid range, throw and error and use default dates.
     */
    if (params.range) {
      if (!this.setSpecialRange(params.range)) {
        this.addSiteNotice('danger', i18nMessages.paramError3, i18nMessages.invalidParams, true);
        this.setSpecialRange(config.defaults.dateRange);
      }
    } else if (params.start) {
      startDate = moment(params.start || moment().subtract(config.defaults.daysAgo, 'days'));
      endDate = moment(params.end || Date.now());
      if (startDate < moment('2015-08-01') || endDate < moment('2015-08-01')) {
        this.addSiteNotice('danger', i18nMessages.paramError1, i18nMessages.invalidParams, true);
        return;
      } else if (startDate > endDate) {
        this.addSiteNotice('warning', i18nMessages.paramError2, i18nMessages.invalidParams, true);
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
      $(config.articleInput).val(params.page.descore());
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
    const dateRangeSelector = $(config.dateRangeSelector);

    /** transform config.specialRanges to have i18n as keys */
    let ranges = {};
    Object.keys(config.specialRanges).forEach(key => {
      ranges[i18nMessages[key]] = config.specialRanges[key];
    });

    dateRangeSelector.daterangepicker({
      locale: {
        format: this.dateFormat,
        applyLabel: i18nMessages.apply,
        cancelLabel: i18nMessages.cancel,
        customRangeLabel: i18nMessages.customRange,
        dateLimit: { days: 31 },
        daysOfWeek: [
          i18nMessages.su,
          i18nMessages.mo,
          i18nMessages.tu,
          i18nMessages.we,
          i18nMessages.th,
          i18nMessages.fr,
          i18nMessages.sa
        ],
        monthNames: [
          i18nMessages.january,
          i18nMessages.february,
          i18nMessages.march,
          i18nMessages.april,
          i18nMessages.may,
          i18nMessages.june,
          i18nMessages.july,
          i18nMessages.august,
          i18nMessages.september,
          i18nMessages.october,
          i18nMessages.november,
          i18nMessages.december
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
        .html(i18nMessages.dateNotice)
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
      if (action.chosenLabel === i18nMessages.customRange) {
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
    const page = $(config.articleInput).val();

    this.setState('processing');

    const dbName = Object.keys(siteMap).find(key => siteMap[key] === $(config.projectInput).val());

    this.getInterwikiData(dbName, page).done(interWikiData => {
      this.getPageViewsData(interWikiData).done(() => {
        $('.langviews-page-name').text(page).prop('href', this.getPageURL(page));
        $('.langviews-params').text($(config.dateRangeSelector).val());
        this.updateProgressBar(100);
        this.renderData();
      });
    }).fail(error => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (typeof error === 'string') {
        this.writeMessage(error);
      } else {
        this.writeMessage(i18nMessages.wikidataErrorUnknown);
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
    const regex = new RegExp(`.*?\\.(${config.langProjects.join('|')})\\.org`),
      project = $(config.projectInput).val();

    if (!siteDomains.includes(project) || !regex.test(project)) {
      this.writeMessage(
        i18nMessages.invalidLangProject.i18nArg(`<a href='//${project}'>${project}</a>`),
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
