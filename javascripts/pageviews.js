/**
 * Pageviews Analysis tool
 * @file Main file for Pageviews application
 * @author MusikAnimal, Kaldari, Marcelrf
 * @copyright 2016 MusikAnimal, Kaldari, Marcelrf
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('./shared/site_map');
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
    this.setupDateRangeSelector();
    this.setupSelect2();
    this.setupSelect2Colors();
    this.popParams();
    this.setupListeners();
    this.updateInterAppLinks();

    if (i18nLang === 'en' && !this.getFromLocalStorage('pageviews-hide-beta-notice')) {
      this.addSiteNotice(
        'info',
        `
          There's a new Pageviews tool in town!
          Try <strong><a href='/pageviews-test?pages=Google'>Pageviews Analysis 2.0 BETA!</a></strong>
          &nbsp;
          <span class='small'>(<a href='#' class='hide-beta-notice' data-dismiss='alert'>permanently hide this notice</a>)</span>
        `,
        '',
        true
      );
      $('.hide-beta-notice').on('click', () => {
        this.setLocalStorage('pageviews-hide-beta-notice', true);
      });
    }
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
   * Link to /redirectviews for given page and chosen daterange
   * @param {String} page - page title
   * @returns {String} URL
   */
  getRedirectviewsURL(page) {
    return `/redirectviews?${$.param(this.getParams())}&page=${page.replace(/[&%]/g, escape).score()}`;
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

    let params = this.validateParams(
      this.parseQueryString('pages')
    );

    $(this.config.projectInput).val(params.project);
    $(this.config.platformSelector).val(params.platform);
    $(this.config.agentSelector).val(params.agent);

    this.patchUsage();
    this.validateDateRange(params);

    this.resetSelect2();

    /**
     * Normalizes the page names then sets the Select2 defaults,
     *   which triggers the Select2 listener and renders the chart
     * @param {Array} pages - pages to pass to Massviews
     * @return {null} nothing
     */
    const normalizeAndSetDefaults = pages => {
      if (this.normalized) {
        pages = this.underscorePageNames(pages);
        this.setSelect2Defaults(pages);
      } else {
        this.normalizePageNames(pages).then(data => {
          this.normalized = true;
          pages = data;
          this.setSelect2Defaults(this.underscorePageNames(pages));
        });
      }
    };

    // set up default pages if none were passed in
    if (!params.pages || !params.pages.length) {
      // only set default of Cat and Dog for enwiki
      if (this.project === 'en.wikipedia') {
        params.pages = ['Cat', 'Dog'];
        this.setInitialChartType(params.pages.length);
        normalizeAndSetDefaults(params.pages);
      } else {
        // leave Select2 empty and put focus on it so they can type in pages
        this.focusSelect2();
        this.stopSpinny(); // manually hide spinny since we aren't drawing the chart
        this.setInitialChartType();
      }
    // If there's more than 10 articles attempt to create a PagePile and open it in Massviews
    } else if (params.pages.length > 10) {
      // If a PagePile is successfully created we are redirected to Massviews and the promise is never resolved,
      //   otherwise we just take the first 10 and process as we would normally
      this.massviewsRedirectWithPagePile(params.pages).then(normalizeAndSetDefaults);
    } else {
      this.setInitialChartType(params.pages.length);
      normalizeAndSetDefaults(params.pages);
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
      agent: $(this.config.agentSelector).val()
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
   * Calls parent setupProjectInput and updates the view if validations passed
   *   reverting to the old value if the new one is invalid
   * @returns {null} nothing
   * @override
   */
  validateProject() {
    if (super.validateProject()) {
      this.resetView(true);
      this.focusSelect2();
    }
  }

  /**
   * General place to add page-wide listeners
   * @override
   * @returns {null} - nothing
   */
  setupListeners() {
    super.setupListeners();
    $('#platform-select, #agent-select').on('change', this.processInput.bind(this));
  }

  /**
   * Query the API for each page, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @returns {null} - nothin
   */
  processInput(force) {
    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && (location.search === this.params && this.prevChartType === this.chartType)) {
      return;
    }

    this.params = location.search;

    const entities = $(config.select2Input).select2('val') || [];

    if (!entities.length) {
      return this.resetView();
    }

    // clear out old error messages unless the is the first time rendering the chart
    this.clearMessages();

    this.prevChartType = this.chartType;
    this.destroyChart();
    this.startSpinny(); // show spinny and capture against fatal errors

    this.getPageViewsData(entities).done(xhrData => this.updateChart(xhrData));
  }

  /**
   * Create a PagePile with given pages using the API and redirect to Massviews.
   * This is used when the user passes in more than 10 pages
   * @param {Array} pages - pages to convert to a PagePile and open in Massviews
   * @returns {Deferred} promise resolved only if creation of PagePile failed
   */
  massviewsRedirectWithPagePile(pages) {
    const dfd = $.Deferred(),
      dbName = Object.keys(siteMap).find(key => siteMap[key] === `${this.project}.org`);

    $.ajax({
      url: '//tools.wmflabs.org/pagepile/api.php',
      data: {
        action: 'create_pile_with_data',
        wiki: dbName,
        data: pages.join('\n')
      }
    }).success(pileData => {
      const params = this.getParams();
      delete params.project;
      document.location = `/massviews?overflow=1&${$.param(params)}&source=pagepile&target=${pileData.pile.id}`;
    }).fail(() => {
      // just grab first 10 pages and throw an error
      this.writeMessage($.i18n('auto-pagepile-error', 'PagePile', 10));
      dfd.resolve(pages.slice(0, 10));
    });

    return dfd;
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
