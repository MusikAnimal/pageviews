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
  processInput(force) {
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
    this.stopSpinny();
    $('.chart-container').html('');
    $('.expand-chart').show();

    let count = 0, index = 0;

    while (count < this.config.pageSize + this.offset) {
      let item = this.pageData[index++];

      if (this.excludes.includes(item.article)) continue;
      if (!this.max) this.max = item.views;

      const width = 100 * (item.views / this.max),
        direction = !!i18nRtl ? 'to left' : 'to right';

      $('.chart-container').append(
        `<div class='topview-entry' style='background:linear-gradient(${direction}, #EEE ${width}%, transparent ${width}%)'>
         <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${index - 1} aria-hidden='true'></span>
         <span class='topview-entry--rank'>${++count}</span>
         <a class='topview-entry--label' href="${this.getPageURL(item.article)}" target="_blank">${item.article}</a>
         <span class='topview-entry--leader'></span>
         <a class='topview-entry--views' href='${this.getPageviewsURL(item.article)}'>${this.formatNumber(item.views)}</a></div>`
      );
    }

    this.pushParams();
    $('.data-links').removeClass('invisible');
    $('.search-topviews').removeClass('invisible');

    $('.topview-entry--remove').off('click').on('click', e => {
      const pageName = this.pageNames[$(e.target).data('article-id')];
      this.addExclude(pageName);
      this.pushParams();
    });
  }

  /**
   * Add given page(s) to list of excluded pages and optionally re-render the view
   * @param {Array|String} pages - page(s) to add to excludes
   * @param {Boolean} [triggerChange] - whether or not to re-render the view
   * @returns {null} nothing
   */
  addExclude(pages, triggerChange = true) {
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

    if (triggerChange) $(this.config.articleSelector).val(this.excludes).trigger('change');
    // $(this.config.articleSelector).select2('close');
  }

  /**
   * Clear the topviews search
   * @return {null} nothing
   */
  clearSearch() {
    if ($('.topviews-search-icon').hasClass('glyphicon-remove')) {
      $('#topviews_search_field').val('');
      $('.topviews-search-icon').removeClass('glyphicon-remove').addClass('glyphicon-search');
      this.drawData();
    }
  }

  /**
   * Exports current chart data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @returns {string} CSV content
   */
  exportCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,Page,Views\n';

    this.pageData.forEach(entry => {
      if (this.excludes.includes(entry.article)) return;
      // Build an array of site titles for use in the CSV header
      let title = '"' + entry.article.replace(/"/g, '""') + '"';

      csvContent += `${title},${entry.views}\n`;
    });

    // Output the CSV file to the browser
    const encodedUri = encodeURI(csvContent);
    window.open(encodedUri);
  }

  /**
   * Exports current chart data to JSON format and loads it in a new tab
   * @returns {string} stringified JSON
   */
  exportJSON() {
    let data = [];

    this.pageData.forEach((entry, index) => {
      if (this.excludes.includes(entry.article)) return;
      data.push({
        page: entry.article,
        views: entry.views
      });
    });

    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(data),
      encodedUri = encodeURI(jsonContent);
    window.open(encodedUri);

    return jsonContent;
  }

  /**
   * Link to /pageviews for given article and chosen daterange
   * @param {string} article - page name
   * @returns {string} URL
   */
  getPageviewsURL(article) {
    let startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate);
    const platform = $(this.config.platformSelector).val(),
      project = $(this.config.projectInput).val();

    if (endDate.diff(startDate, 'days') === 0) {
      startDate.subtract(3, 'days');
      endDate.add(3, 'days');
    }

    return `/pageviews#start=${startDate.format('YYYY-MM-DD')}` +
      `&end=${endDate.format('YYYY-MM-DD')}&project=${project}&platform=${platform}&pages=${article}`;
  }

  /**
   * Get all user-inputted parameters except the pages
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} project, platform, excludes, etc.
   */
  getParams(specialRange = true) {
    let params = {
      project: $(this.config.projectInput).val(),
      platform: $(this.config.platformSelector).val()
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

    return params;
  }

  /**
   * Get params needed to create a permanent link of visible data
   * @return {Object} hash of params
   */
  getPermaLink() {
    let params = this.getParams(false);
    delete params.range;
    return params;
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    this.startSpinny();
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

    $(this.config.platformSelector).val(params.platform || 'all-access');

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
   * @returns {null} nothing
   */
  pushParams() {
    const excludes = this.underscorePageNames(this.excludes).join('|').replace(/[&%]/g, escape);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, `?${$.param(this.getParams())}&excludes=${excludes}`);
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&excludes=${excludes}`);
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
    this.stopSpinny();
    $('.chart-container').html('');
    $('.expand-chart').show();
    $('.message-container').html('');
    if (clearSelector) {
      this.resetArticleSelector();
      this.excludes = [];
    }
  }

  /**
   * Search the topviews data for the given page title
   * and restrict the view to the matches
   * @returns {null} nothing
   */
  searchTopviews() {
    const query = $('#topviews_search_field').val();

    if (!query) return this.clearSearch();

    let matchedData = [], count = 0;

    // add ranking to pageData and fetch matches
    this.pageData.forEach((entry, index) => {
      if (!this.excludes.includes(entry.article)) {
        count++;
        if (entry.article.includes(query)) {
          entry.rank = count;
          entry.index = index;
          matchedData.push(entry);
        }
      }
    });

    $('.chart-container').html('');
    $('.expand-chart').hide();
    $('.topviews-search-icon').removeClass('glyphicon-search').addClass('glyphicon-remove');

    matchedData.forEach(item => {
      const width = 100 * (item.views / this.max),
        direction = !!i18nRtl ? 'to left' : 'to right';

      $('.chart-container').append(
        `<div class='topview-entry' style='background:linear-gradient(${direction}, #EEE ${width}%, transparent ${width}%)'>
         <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${item.index} aria-hidden='true'></span>
         <span class='topview-entry--rank'>${item.rank}</span>
         <a class='topview-entry--label' href="${this.getPageURL(item.article)}" target="_blank">${item.article}</a>
         <span class='topview-entry--leader'></span>
         <a class='topview-entry--views' href='${this.getPageviewsURL(item.article)}'>${this.formatNumber(item.views)}</a></div>`
      );
    });

    $('.topview-entry--remove').off('click').on('click', e => {
      const pageName = this.pageNames[$(e.target).data('article-id')];
      this.addExclude(pageName);
      this.searchTopviews(query, false);
    });
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

    $(this.config.platformSelector).on('change', this.processInput.bind(this));
    $('.expand-chart').on('click', () => {
      this.offset += this.config.pageSize;
      this.drawData();
    });
    $(this.config.dateRangeSelector).on('change', e => {
      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
      this.processInput();
    });
    $('.download-csv').on('click', this.exportCSV.bind(this));
    $('.download-json').on('click', this.exportJSON.bind(this));
    $('#topviews_search_field').on('keyup', this.searchTopviews.bind(this));
    $('.topviews-search-icon').on('click', this.clearSearch.bind(this));
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
      this.processInput(true).then(resetArticleSelector);
    });
  }

  /**
   * Fetch data from API
   * @returns {Deferred} promise with data
   */
  initData() {
    let dfd = $.Deferred();

    this.startSpinny();
    $('.expand-chart').hide();

    /** Collect parameters from inputs. */
    const startDate = this.daterangepicker.startDate,
      endDate = this.daterangepicker.endDate,
      access = $(this.config.platformSelector).val();

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
