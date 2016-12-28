/**
 * Topviews Analysis tool
 * @file Main file for Topviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 * @requires Pv
 */

const config = require('./config');
const Pv = require('../shared/pv');

/** Main TopViews class */
class TopViews extends Pv {
  /**
   * Set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'topviews';

    this.excludes = [];
    this.autoExcludes = [];
    this.offset = 0;
    this.max = null;
    this.pageData = [];
    this.pageNames = [];
    this.excludeAdded = false;
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   */
  initialize() {
    this.popParams();
    this.updateInterAppLinks();
  }

  /**
   * Apply user input by updating the URL query string and view, if needed
   * @param {boolean} force - apply all user options even if we've detected nothing has changed
   * @returns {Deferred} deferred object from initData
   */
  processInput(force) {
    this.clearSearch();
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
   */
  drawData() {
    $('.chart-container').html('');

    let count = 0, index = 0;

    while (count < this.config.pageSize + this.offset) {
      let item = this.pageData[index++];

      if (this.excludes.includes(item.article) || this.autoExcludes.includes(item.article)) continue;
      if (!this.max) this.max = item.views;

      const width = 100 * (item.views / this.max),
        direction = !!i18nRtl ? 'to left' : 'to right';

      $('.chart-container').append(
        `<div class='topview-entry' id='topview-entry-${index}' style='background:linear-gradient(${direction}, #EEE ${width}%, transparent ${width}%)'>
         <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${index - 1}
           title='Remove this page from Topviews rankings' aria-hidden='true'></span>
         <span class='topview-entry--rank'>${++count}</span>
         <a class='topview-entry--label' href="${this.getPageURL(item.article)}" target="_blank">${item.article}</a>
         <span class='topview-entry--leader'></span>
         <a class='topview-entry--views' href='${this.getPageviewsURL(item.article)}'>${this.formatNumber(item.views)}</a></div>`
      );
    }

    this.pushParams();
    this.stopSpinny();

    this.addExcludeListeners();
  }

  /**
   * Add given page(s) to list of excluded pages and optionally re-render the view
   * @param {Array|String} pages - page(s) to add to excludes
   * @param {Boolean} [triggerChange] - whether or not to re-render the view
   */
  addExclude(pages, triggerChange = true) {
    if (!Array.isArray(pages)) pages = [pages];

    pages.forEach(page => {
      if (!this.excludes.includes(page)) {
        this.excludes.push(page);
      }
    });

    $(this.config.select2Input).html('');

    this.excludes.forEach(exclude => {
      const escapedText = $('<div>').text(exclude).html();
      $(`<option>${escapedText}</option>`).appendTo(this.config.select2Input);
    });

    if (triggerChange) $(this.config.select2Input).val(this.excludes).trigger('change');
    this.buildReportFalsePositiveForm();
  }

  /**
   * Re-add listeners to exclude pages, called after sorting or changing params
   */
  addExcludeListeners() {
    $('.topview-entry--remove').off('click').on('click', e => {
      // show 'Report false positive' button if they've manually excluded a page
      if (!this.excludeAdded) {
        this.excludeAdded = true;
        $('.report-false-positive').show();
      }

      const pageName = this.pageNames[$(e.target).data('article-id')];
      this.addExclude(pageName);
      this.pushParams();
    });
  }

  /**
   * Uses this.excludes to build a list of pages
   * that the user can report as a false positive.
   */
  buildReportFalsePositiveForm() {
    $('.false-positive-list').html('');
    this.excludes.forEach((exclude, index) => {
      exclude = exclude.escape();
      $('.false-positive-list').append(`
        <li>
          <label>
            <input type='checkbox' data-index='${index}' />
            ${exclude.escape()}
          </label>
        </li>
      `);
    });
    $('.submit-false-positive').off('click').on('click', () => {
      const excludes = $.map($('.false-positive-list input:checked'), el => {
        return this.excludes[parseInt(el.dataset.index, 10)];
      });
      if (!excludes.length) return;

      $.ajax({
        url: `//${metaRoot}/usage/topviews/${this.project}/false_positives`,
        data: {
          pages: excludes
        },
        method: 'POST'
      });
      this.toastSuccess($.i18n('report-false-positive-submitted', $.i18n('topviews')));
      $('.report-false-positive').hide();
    });
  }

  /**
   * Clear the topviews search
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
   * @override
   */
  exportCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,Page,Views\n';

    this.pageData.forEach(entry => {
      // Build an array of page titles for use in the CSV header
      let title = '"' + entry.article.replace(/"/g, '""') + '"';

      csvContent += `${title},${entry.views}\n`;
    });

    this.downloadData(csvContent, 'csv');
  }

  /**
   * Exports current chart data to JSON format and loads it in a new tab
   * @override
   */
  exportJSON() {
    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(this.pageData);
    this.downloadData(jsonContent, 'json');
  }

  /**
   * Get informative filename without extension to be used for export options
   * @return {string} filename without an extension
   * @override
   */
  getExportFilename() {
    const datepickerValue = this.datepicker.getDate();
    let date;

    if (this.isMonthly()) {
      date = moment(datepickerValue).format('YYYY/MM');
    } else {
      date = moment(datepickerValue).format('YYYY/MM/DD');
    }

    return `${this.app}-${date}`;
  }

  /**
   * Link to /pageviews for given article and chosen daterange
   * @param {string} article - page name
   * @returns {string} URL
   */
  getPageviewsURL(article) {
    // first get the date range
    const date = moment(this.datepicker.getDate());
    let startDate, endDate;
    if (this.isMonthly()) {
      startDate = date.format('YYYY-MM-01');
      endDate = date.endOf('month').format('YYYY-MM-DD');
    } else {
      // surround single dates with 3 days to make the pageviews chart meaningful
      startDate = moment(date).subtract(3, 'days').format('YYYY-MM-DD');
      endDate = date.add(3, 'days').format('YYYY-MM-DD');
    }

    const platform = $(this.config.platformSelector).val(),
      project = $(this.config.projectInput).val();

    return `/pageviews?start=${startDate}&end=${endDate}&project=${project}&platform=${platform}&pages=${article}`;
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

    const datepickerValue = this.datepicker.getDate();

    /**
     * Override start and end with custom range values,
     *   if configured (set by URL params or setupDateRangeSelector)
     */
    if (this.specialRange && specialRange) {
      params.date = this.specialRange.range;
    } else if (this.isMonthly()) {
      params.date = moment(datepickerValue).format('YYYY-MM');
    } else {
      params.date = moment(datepickerValue).format('YYYY-MM-DD');
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
   * Set datepicker based on provided relative range
   * @param {String} range - e.g. 'last-month', 'yesterday'
   * @returns {Boolean} whether a valid range was provided and was set
   * @override
   */
  setSpecialRange(range) {
    if (range === 'last-month') {
      this.setupDateRangeSelector('monthly');
      this.datepicker.setDate(this.config.maxMonth);
      this.specialRange = {
        range,
        value: moment(this.config.maxMonth).format('YYYY/MM')
      };
    } else if (range === 'yesterday') {
      this.setupDateRangeSelector('daily');
      this.datepicker.setDate(this.config.maxDate);
      this.specialRange = {
        range,
        value: moment(this.config.maxDate).format('YYYY-MM-DD')
      };
    } else {
      return false;
    }

    return true;
  }

  /**
   * Set datepicker based on provided date or range
   * @param {String} dateInput - either a range like 'last-month', 'yesterday' or date with format 'YYYY-MM-DD'
   * @return {null}
   */
  setDate(dateInput) {
    let date;

    if (/\d{4}-\d{2}$/.test(dateInput)) {
      // monthly
      this.setupDateRangeSelector('monthly');
      date = moment(`${dateInput}-01`).toDate();

      // if over max, set to max
      if (date > this.config.maxMonth) {
        date = this.config.maxMonth;
      }
    } else if (/\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // daily
      this.setupDateRangeSelector('daily');
      date = moment(dateInput).toDate();

      // if over max, set to max (Topviews maxDate is a Date object, not moment)
      if (date > this.config.maxDate) {
        date = this.config.maxDate;
      }
    } else {
      // attempt to set as special range, or default range if range is invalid
      return this.setSpecialRange(dateInput) || this.setSpecialRange(this.config.defaults.dateRange);
    }

    // if less than min, throw error (since this is a common request)
    if (date < this.config.minDate.toDate()) {
      // use super.dateFormat since this is for moment, not for our datepicker
      this.toastError(`
        <strong>${$.i18n('invalid-params')}</strong>
        ${$.i18n('param-error-1', moment(this.config.minDate).format(super.dateFormat))}
      `);
      date = this.config.minDate.toDate();
    }

    return this.datepicker.setDate(date);
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   */
  popParams() {
    /** show loading indicator and add error handling for timeouts */
    this.startSpinny();

    const params = this.validateParams(
      this.parseQueryString('excludes')
    );

    // FIXME: remove once all affected wikis/links have been updated
    if (params.range || params.start || params.end) {
      this.fixLegacyDates(params);
      this.toastWarn(`
        <strong>Topviews has been revamped!</strong>
        Custom date ranges are
        <a href='//meta.wikimedia.org/wiki/Special:Permalink/15931284#Topviews_revamped'>no longer supported</a>.
        Using defaults instead.
      `);
    }

    this.setDate(params.date); // also performs validations

    $(this.config.projectInput).val(params.project);
    $(this.config.platformSelector).val(params.platform);

    this.excludes = (params.excludes || []).map(exclude => decodeURIComponent(exclude.descore()));

    this.patchUsage().done(autoExcludes => {
      this.autoExcludes = autoExcludes;

      // remove autoExcludes from excludes given via URL param
      this.excludes = this.excludes.filter(exclude => this.autoExcludes.indexOf(exclude) === -1);
    }).always(() => {
      this.params = location.search;

      this.initData().done(() => {
        this.drawData();
      }).always(() => {
        this.setupSelect2();
        this.setupListeners();
      });
    });
  }

  /**
   * Fix legacy links to Topviews that used a defined date range.
   * Instead, we'll determine how wide the range is, and if it's greater than 3 days
   *   then use the month, otherwise use the first day of the range
   * @param {Object} params - params as provided by this.parseQueryString
   * @returns {Object} modified params with corrected dates
   */
  fixLegacyDates(params) {
    // all is well if we were given a date parameter (new version)
    //   or if no date params were provided
    if (params.date || (!params.start && !params.end && !params.range)) return params;

    // use last-month if any range was provided
    if (params.range) {
      params.date = 'last-month';
      return params;
    }

    // if invalid start/end use last-month
    const dateRegex = /\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(params.start) && !dateRegex.test(params.end)) {
      params.date = 'last-month';
      return params;
    }

    const startDate = moment(params.start, 'YYYY-MM-DD'),
      endDate = moment(params.end, 'YYYY-MM-DD'),
      numDays = Math.abs(endDate.diff(startDate, 'days'));

    if (numDays > 3) {
      params.date = startDate.format('YYYY-MM');
    } else {
      params.date = params.start;
    }

    return params;
  }

  /**
   * Replaces history state with new URL query string representing current user input
   * Called whenever we go to update the chart
   */
  pushParams() {
    const excludes = this.underscorePageNames(this.excludes).join('|').replace(/[&%?]/g, escape);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, `?${$.param(this.getParams())}&excludes=${excludes}`);
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&excludes=${excludes}`);
  }

  /**
   * Removes chart, messages, and resets Select2 selections
   * @param {Boolean} [clearSelector] - whether to clear the Select2 control
   */
  resetView(clearSelector = true) {
    this.max = null;
    this.offset = 0;
    this.pageData = [];
    this.pageNames = [];
    this.stopSpinny(true);
    $('.chart-container').html('');
    $('.message-container').html('');
    if (clearSelector) {
      this.resetSelect2();
      this.excludes = [];
    }
  }

  /**
   * Search the topviews data for the given page title
   * and restrict the view to the matches
   * @return {null}
   */
  searchTopviews() {
    const query = $('#topviews_search_field').val()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    if (!query) return this.clearSearch();

    let matchedData = [], count = 0;

    // add ranking to pageData and fetch matches
    this.pageData.forEach((entry, index) => {
      if (!this.excludes.includes(entry.article)) {
        count++;
        if (new RegExp(query, 'i').test(entry.article)) {
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

    this.addExcludeListeners();
  }

  /**
   * Calls parent setupProjectInput and updates the view if validations passed
   *   reverting to the old value if the new one is invalid
   * @override
   */
  validateProject() {
    if (super.validateProject()) {
      this.resetView(true);
      this.processInput();
    }
  }

  /**
   * Sets up the Select2 selector and adds listener to update chart
   * @param {array} excludes - default page names to exclude
   */
  setupSelect2(excludes = this.excludes) {
    const select2Input = $(this.config.select2Input);

    select2Input.select2({
      data: [],
      maximumSelectionLength: 50,
      minimumInputLength: 0,
      placeholder: $.i18n('hover-to-exclude')
    });

    if (excludes.length) this.setSelect2Defaults(excludes);

    select2Input.on('change', e => {
      this.excludes = $(e.target).val() || [];
      this.max = null;
      this.clearSearch();
      this.drawData();
    });

    select2Input.on('select2:unselect', e => {
      if (!$(e.target).val()) $('.report-false-positive').hide();
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
   * Directly set pages in Select2 selector
   * Currently is not able to remove underscore from page names
   *
   * @param {array} pages - page titles
   * @returns {array} - untouched array of pages
   */
  setSelect2Defaults(pages) {
    pages = pages.map(page => {
      // page = page.replace(/ /g, '_');
      const escapedText = $('<div>').text(page).html();
      $('<option>' + escapedText + '</option>').appendTo(this.config.select2Input);
      return page;
    });
    $(this.config.select2Input).select2('val', pages);

    return pages;
  }

  /**
   * sets up the datepicker based on given type
   * @param {String} [type] - either 'monthly' or 'daily'
   * @override
   */
  setupDateRangeSelector(type = 'monthly') {
    $('#date-type-select').val(type);

    const datepickerParams = type === 'monthly' ? {
      format: 'MM yyyy',
      viewMode: 'months',
      minViewMode: 'months',
      endDate: this.config.maxMonth
    } : {
      format: this.dateFormat,
      viewMode: 'days',
      endDate: this.config.maxDate
    };

    $(this.config.dateRangeSelector).datepicker('destroy');
    $(this.config.dateRangeSelector).datepicker(
      Object.assign({
        autoclose: true,
        startDate: this.config.minDate.toDate()
      }, datepickerParams)
    );
  }

  /**
   * General place to add page-wide listeners
   */
  setupListeners() {
    super.setupListeners();

    $(this.config.platformSelector).on('change', this.processInput.bind(this));
    $('#date-type-select').on('change', e => {
      // also calls setupDateRangeSelector
      this.setSpecialRange(this.isMonthly() ? 'last-month' : 'yesterday');
    });
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
    $('.mainspace-only-option').on('click', this.processInput.bind(this));
    $('#topviews_search_field').on('keyup', this.searchTopviews.bind(this));
    $('.topviews-search-icon').on('click', this.clearSearch.bind(this));
  }

  /**
   * Add the loading indicator class and set the safeguard timeout
   * @override
   */
  startSpinny() {
    super.startSpinny();
    $('.expand-chart').hide();
    $('.data-links').addClass('invisible');
    $('.search-topviews').addClass('invisible');
    $('.data-notice').addClass('invisible');
  }

  /**
   * Remove loading indicator class and clear the safeguard timeout
   * @param {Boolean} hideDataLinks - whether or not to hide the data links
   * @override
   */
  stopSpinny(hideDataLinks) {
    super.stopSpinny();
    if (!hideDataLinks) {
      $('.data-links').removeClass('invisible');
      $('.search-topviews').removeClass('invisible');
      $('.data-notice').removeClass('invisible');
      $('.expand-chart').show();
    }
  }

  /**
   * Get date format to use based on settings
   * @returns {string} date format to passed to parser
   * @override
   */
  get dateFormat() {
    return super.dateFormat.toLowerCase();
  }

  /**
   * Get instance of datepicker
   * @return {Object} the datepicker instance
   */
  get datepicker() {
    return $(this.config.dateRangeSelector).data('datepicker');
  }

  /**
   * Are we in 'monthly' mode? (If we aren't then we're in daily)
   * @return {Boolean} yes or no
   */
  isMonthly() {
    return $('#date-type-select').val() === 'monthly';
  }

  /**
   * Get the currently selected date for the purposes of pageviews API call
   * @return {String} formatted date
   */
  getAPIDate() {
    const datepickerValue = this.datepicker.getDate();

    if (this.isMonthly()) {
      return moment(datepickerValue).format('YYYY/MM') + '/all-days';
    } else {
      return moment(datepickerValue).format('YYYY/MM/DD');
    }
  }

  /**
   * Fetch data from API
   * @returns {Deferred} promise with data
   */
  initData() {
    let dfd = $.Deferred();

    this.startSpinny();

    const access = $(this.config.platformSelector).val();

    $.ajax({
      url: `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${this.project}/${access}/${this.getAPIDate()}`,
      dataType: 'json'
    }).done(data => {
      // store pageData from API, removing underscores from the page name
      this.pageData = data.items[0].articles.map(page => {
        page.article = page.article.descore();
        return page;
      });

      /** build the pageNames array for Select2 */
      this.pageNames = this.pageData.map(page => page.article);

      if ($('.mainspace-only-option').is(':checked')) {
        this.filterOutNamespace(this.pageNames).done(pageNames => {
          this.pageNames = pageNames;
          this.pageData = this.pageData.filter(page => pageNames.includes(page.article));
          return dfd.resolve(this.pageData);
        });
      } else {
        return dfd.resolve(this.pageData);
      }
    }).fail(errorData => {
      this.resetView();
      this.writeMessage(`${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`);
      return dfd.reject();
    });

    return dfd;
  }

  /**
   * Get the pages that are not in the given namespace
   * @param {array} pages - pages to filter
   * @param {Number} [restrictedNamespace] - ID of the namespace to restrict to, defaults to 0 (mainspace)
   * @return {Deferred} promise resolving with pages in given namespace
   */
  filterOutNamespace(pages, restrictedNamespace = 0) {
    let dfd = $.Deferred();

    const doFiltering = (entries, unacceptableNamespaces) => {
      return entries.filter(entry => {
        const ns = entry.split(':')[0];

        // include main page as non-mainspace
        if (restrictedNamespace === 0 && entry === this.getSiteInfo(this.project).general.mainpage) {
          return false;
        }

        // Verify there was a namespace. For instance, don't filter out a mainspace article
        //  called 'Search', when we wanted to filter out Special:Search
        if (!entry.includes(':')) return true;

        return !unacceptableNamespaces.includes(ns);
      });
    };

    this.fetchSiteInfo(this.project).done(() => {
      let unacceptableNamespaces = [];

      // for non-mainspace, count 'Wikipedia' and 'Special' since API seems to
      //  include for instance both Wikipedia and Wikipédia in some projects
      // FIXME: the 'Sp?cial' is an apparent bug, see phab:T145043
      if (restrictedNamespace === 0) {
        unacceptableNamespaces = ['Wikipedia', 'Special', 'Sp?cial'];
      }

      for (const ns in this.getSiteInfo(this.project).namespaces) {
        unacceptableNamespaces.push(this.getSiteInfo(this.project).namespaces[ns]['*']);
      }

      // the actual filtering of the given pages
      pages = doFiltering(pages, unacceptableNamespaces);

      // remove excludes that would otherwise automatically be filtered out
      this.excludes = doFiltering(this.excludes, unacceptableNamespaces);

      dfd.resolve(pages);
    }).fail(() => {
      this.writeMessage(`${$.i18n('api-error', 'Siteinfo API')}`);
      dfd.resolve(pages);
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

  new TopViews();
});
