/**
 * Topviews Analysis tool
 * @file Main file for Topviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');

/** Main TopViews class */
class TopViews extends Pv {
  constructor() {
    super(config);
    this.app = 'topviews';

    this.excludes = [];
    this.offset = 0;
    this.max = null;
    this.pageData = [];
    this.pageNames = [];
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   * @return {null} Nothing
   */
  initialize() {
    this.setupProjectInput();
    this.setupDateRangeSelector();
    this.popParams();
    this.updateInterAppLinks();
  }

  /**
   * Apply user input by updating the URL query string and view, if needed
   * @param {boolean} force - apply all user options even if we've detected nothing has changed
   * @returns {Deferred} deferred object from initData
   */
  applyChanges(force) {
    this.pushParams();

    /** prevent redundant querying */
    if (location.search === this.params && !force) {
      return false;
    }
    this.params = location.search;

    this.resetView(false);
    return this.initData().then(this.drawData.bind(this));
  }

  /**
   * Print list of top pages
   * @returns {null} nothing
   */
  drawData() {
    $('.chart-container').removeClass('loading').html('');
    $('.show-more').show();

    let count = 0, index = 0;

    while (count < this.config.pageSize + this.offset) {
      let item = this.pageData[index++];

      if (this.excludes.includes(item.article)) continue;
      if (!this.max) this.max = item.views;

      const width = 100 * (item.views / this.max);

      $('.chart-container').append(
        `<div class='topview-entry' style='background:linear-gradient(to right, #EEE ${width}%, transparent ${width}%)'>
         <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${index - 1} aria-hidden='true'></span>
         <span class='topview-entry--rank'>${++count}</span>
         <a class='topview-entry--label' href="${this.getPageURL(item.article)}" target="_blank">${item.article}</a>
         <span class='topview-entry--leader'></span>
         <a class='topview-entry--views' href='${this.getPageviewsURL(item.article)}'>${this.n(item.views)}</a></div>`
      );
    }

    this.pushParams();

    $('.topview-entry--remove').off('click').on('click', e => {
      const pageName = this.pageNames[$(e.target).data('article-id')];
      this.addExclude(pageName);
      this.pushParams();
    });
  }

  addExclude(pages) {
    if (!Array.isArray(pages)) pages = [pages];

    pages.forEach(page => {
      if (!this.excludes.includes(page)) {
        this.excludes.push(page);
      }
    });

    $(config.articleSelector).html('');

    this.excludes.forEach(exclude => {
      const escapedText = $('<div>').text(exclude).html();
      $(`<option>${escapedText}</option>`).appendTo(this.config.articleSelector);
    });

    $(this.config.articleSelector).val(this.excludes).trigger('change');
    // $(this.config.articleSelector).select2('close');
  }

  /**
   * Gets the date headings as strings - i18n compliant
   * @param {boolean} localized - whether the dates should be localized per browser language
   * @returns {Array} the date headings as strings
   */
  getDateHeadings(localized) {
    const dateHeadings = [];

    for (let date = moment(this.daterangepicker.startDate); date.isBefore(this.daterangepicker.endDate); date.add(1, 'd')) {
      if (localized) {
        dateHeadings.push(date.format(this.dateFormat));
      } else {
        dateHeadings.push(date.format('YYYY-MM-DD'));
      }
    }
    return dateHeadings;
  }

  /**
   * Link to /pageviews for given article and chosen daterange
   * @param {string} article - page name
   * @returns {string} URL
   */
  getPageviewsURL(article) {
    let startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate);
    const platform = $('#platform-select').val(),
      project = $(this.config.projectInput).val();

    if (endDate.diff(startDate, 'days') === 0) {
      startDate.subtract(3, 'days');
      endDate.add(3, 'days');
    }

    return `/pageviews#start=${startDate.format('YYYY-MM-DD')}` +
      `&end=${endDate.format('YYYY-MM-DD')}&project=${project}&platform=${platform}&pages=${article}`;
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    let startDate, endDate, params = this.parseQueryString('excludes');

    $(this.config.projectInput).val(params.project || this.config.defaults.project);
    if (this.validateProject()) return;

    this.patchUsage('tv');

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

    $('#platform-select').val(params.platform || 'all-access');

    if (!params.excludes || (params.excludes.length === 1 && !params.excludes[0])) {
      this.excludes = this.config.defaults.excludes;
    } else {
      this.excludes = params.excludes.map(exclude => exclude.descore());
    }

    this.params = location.search;

    this.initData().then(() => {
      this.setupArticleSelector();
      this.drawData();
      this.setupListeners();
    });
  }

  /**
   * Replaces history state with new URL query string representing current user input
   * Called whenever we go to update the chart
   * @returns {string|false} the new query param string or false if nothing has changed
   */
  pushParams() {
    let state = {
      project: $(this.config.projectInput).val(),
      platform: $('#platform-select').val()
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in this.config.specialRanges, constructed like `{range: 'last-month'}`,
     *   or a relative range like `{range: 'latest-N'}` where N is the number of days.
     */
    if (this.specialRange) {
      state.range = this.specialRange.range;
    } else {
      state.start = this.daterangepicker.startDate.format('YYYY-MM-DD');
      state.end = this.daterangepicker.endDate.format('YYYY-MM-DD');
    }

    if (window.history && window.history.replaceState) {
      const excludes = this.underscorePageNames(this.excludes);
      window.history.replaceState({}, document.title, `?${$.param(state)}&excludes=${excludes.join('|')}`);
    }

    return state;
  }

  /**
   * Removes all article selector related stuff then adds it back
   * @returns {null} nothing
   */
  resetArticleSelector() {
    const articleSelector = $(this.config.articleSelector);
    articleSelector.off('change');
    articleSelector.val(null);
    articleSelector.html('');
    articleSelector.select2('data', null);
    articleSelector.select2('destroy');
    this.setupArticleSelector();
  }

  /**
   * Removes chart, messages, and resets article selections
   * @returns {null} nothing
   */
  resetView(clearSelector = true) {
    this.max = null;
    this.offset = 0;
    this.pageData = [];
    this.pageNames = [];
    $('.chart-container').removeClass('loading').html('');
    $('.show-more').show();
    $('.message-container').html('');
    if (clearSelector) {
      this.resetArticleSelector();
      this.excludes = [];
    }
  }

  /**
   * Sets up the article selector and adds listener to update chart
   * @param {array} excludes - default page names to exclude
   * @returns {null} - nothing
   */
  setupArticleSelector(excludes = this.excludes) {
    const articleSelector = $(this.config.articleSelector);

    articleSelector.select2({
      data: [],
      maximumSelectionLength: 50,
      minimumInputLength: 0,
      placeholder: $.i18n('hover-to-exclude')
    });

    if (excludes.length) this.setArticleSelectorDefaults(excludes);

    articleSelector.on('change', e => {
      this.excludes = $(e.target).val() || [];
      this.max = null;
      this.drawData();
      // $(this).select2().trigger('close');
    });

    /**
     * for topviews we don't want the user input functionality of Select2
     * setTimeout of 0 to let rendering threads catch up and actually disable the field
     */
    setTimeout(() => {
      $('.select2-search__field').prop('disabled', true);
    });
  }

  /**
   * Directly set articles in article selector
   * Currently is not able to remove underscore from page names
   *
   * @param {array} pages - page titles
   * @returns {array} - untouched array of pages
   */
  setArticleSelectorDefaults(pages) {
    pages = pages.map(page => {
      // page = page.replace(/ /g, '_');
      const escapedText = $('<div>').text(page).html();
      $('<option>' + escapedText + '</option>').appendTo(this.config.articleSelector);
      return page;
    });
    $(this.config.articleSelector).select2('val', pages);
    $(this.config.articleSelector).select2('close');

    return pages;
  }

  /**
   * sets up the daterange selector and adds listeners
   * @returns {null} - nothing
   */
  setupDateRangeSelector() {
    super.setupDateRangeSelector();

    const dateRangeSelector = $(this.config.dateRangeSelector);

    /** the "Latest N days" links */
    $('.date-latest a').on('click', function(e) {
      this.setSpecialRange(`latest-${$(this).data('value')}`);
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
   * General place to add page-wide listeners
   * @returns {null} - nothing
   */
  setupListeners() {
    super.setupListeners();

    $('#platform-select').on('change', this.applyChanges.bind(this));
    $('.expand-chart').on('click', () => {
      this.offset += this.config.pageSize;
      this.drawData();
    });
    $(this.config.dateRangeSelector).on('change', e => {
      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
      this.applyChanges();
    });
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
      this.resetView(false);
      this.applyChanges(true).then(resetArticleSelector);
    });
  }

  /**
   * Fetch data from API
   * @returns {Deferred} promise with data
   */
  initData() {
    let dfd = $.Deferred();

    $('.chart-container').addClass('loading');
    $('.show-more').hide();

    /** Collect parameters from inputs. */
    const startDate = this.daterangepicker.startDate,
      endDate = this.daterangepicker.endDate,
      access = $('#platform-select').val();

    let promises = [], initPageData = {};

    for (let date = moment(startDate); date.isBefore(endDate); date.add(1, 'd')) {
      promises.push($.ajax({
        url: `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${this.project}/${access}/${date.format('YYYY/MM/DD')}`,
        dataType: 'json'
      }));
    }

    return $.when(...promises).then((...data) => {
      if (promises.length === 1) data = [data];

      /** import data and do summations */
      data.forEach(day => {
        day[0].items[0].articles.forEach(item => {
          const article = item.article.replace(/_/g, ' ');

          if (initPageData[article]) {
            initPageData[article] += item.views;
          } else {
            initPageData[article] = item.views;
          }
        });
      });

      /** sort given new view counts */
      let sortable = [];
      for (let page in initPageData) {
        sortable.push({
          article: page,
          views: initPageData[page]
        });
      }
      this.pageData = sortable.sort((a, b) => b.views - a.views);

      /** ...and build the pageNames array for Select2 */
      this.pageNames = this.pageData.map(value => value.article);

      if (this.excludes.length) {
        return dfd.resolve(this.pageData);
      } else {
        /** find first 30 non-mainspace pages and exclude them */
        this.filterByNamespace(this.pageNames.slice(0, 30)).done(() => {
          return dfd.resolve(this.pageData);
        });
      }
    });
  }

  /**
   * Get the pages that are not in the given namespace
   * @param {array} pages - pages to filter
   * @param  {Number} [ns] - namespace to restrict to, defaults to main
   * @return {Deferred} promise resolving with page titles that are not in the given namespace
   */
  filterByNamespace(pages, ns = 0) {
    let dfd = $.Deferred();

    return $.ajax({
      url: `https://${this.project}.org/w/api.php`,
      data: {
        action: 'query',
        titles: pages.join('|'),
        meta: 'siteinfo',
        siprop: 'general',
        format: 'json'
      },
      prop: 'info',
      dataType: 'jsonp'
    }).always(data => {
      if (data && data.query && data.query.pages) {
        let normalizeMap = {};
        (data.query.normalized || []).map(entry => {
          normalizeMap[entry.to] = entry.from;
        });

        let excludes = [data.query.general.mainpage];
        Object.keys(data.query.pages).forEach(key => {
          const page = data.query.pages[key];
          if (page.ns !== ns || page.missing === '') {
            const title = data.query.pages[key].title,
              normalizedTitle = normalizeMap[title];
            delete normalizeMap[title];
            excludes.push(normalizedTitle || title);
          }
        });
        this.addExclude(excludes);
      }

      dfd.resolve();
    });
  }

  /**
   * Checks value of project input and validates it against site map
   * @returns {boolean} whether the currently input project is valid
   */
  validateProject() {
    const project = $(this.config.projectInput).val();
    if (siteDomains.includes(project)) {
      $('body').removeClass('invalid-project');
    } else {
      this.resetView();
      this.writeMessage(
        $.i18n('invalid-project', `<a href='//${project}'>${project}</a>`),
        true
      );
      $('body').addClass('invalid-project');
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

  new TopViews();
});
