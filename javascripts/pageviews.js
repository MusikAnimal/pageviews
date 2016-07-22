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
const ChartHelpers = require('./shared/chart_helpers');

/** Main PageViews class */
class PageViews extends mix(Pv).with(ChartHelpers) {
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
   * Link to /langviews for given page and chosen daterange
   * @param {String} page - page title
   * @returns {String} URL
   */
  getLangviewsURL(page) {
    return `/langviews?${$.param(this.getParams())}&page=${page.replace(/[&%]/g, escape).score()}`;
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
    /** show loading indicator and add error handling for timeouts */
    this.startSpinny();

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
        params.pages = [];
        this.focusSelect2();
        this.stopSpinny();
      }
    } else if (this.normalized) {
      params.pages = this.underscorePageNames(params.pages);
      this.setSelect2Defaults(params.pages);
    } else {
      this.normalizePageNames(params.pages).then(data => {
        this.normalized = true;
        params.pages = data;
        this.setSelect2Defaults(this.underscorePageNames(params.pages));
      });
    }
    this.setInitialChartType(params.pages.length);
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

    /** add autolog param only if it was passed in originally, and only if it was false (true would be default) */
    if (this.noLogScale) params.autolog = 'false';

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
    $select2Input.on('change', e => {
      if ($(e.target).val()) {
        this.processInput();
      } else {
        this.resetView();
      }
    });
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
    const entities = $(config.select2Input).select2('val') || [];
    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && (location.search === this.params && this.prevChartType === this.chartType || !entities.length)) {
      return;
    }

    this.params = location.search;
    this.prevChartType = this.chartType;
    this.clearMessages(); // clear out old error messages
    this.destroyChart();
    this.startSpinny(); // show spinny and capture against fatal errors

    this.getPageViewsData(entities).done(xhrData => this.updateChart(xhrData));
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
        $.i18n('invalid-project', `<a href='//${project.escape()}'>${project.escape()}</a>`),
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
