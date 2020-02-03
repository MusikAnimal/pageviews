/**
 * Topviews Analysis tool
 * @link https://tools.wmflabs.org/topviews
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
    this.offsetEnd = 0;
    this.max = null;
    this.pageData = [];
    this.pageNames = [];
    this.mobileViews = {};
    this.editData = {};
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
   * @param {boolean} [force] - apply all user options even if we've detected nothing has changed
   * @returns {Deferred|boolean} deferred object from initData, or false if nothing needs to be processed.
   */
  processInput(force) {
    this.pushParams();

    /** prevent redundant querying */
    if (location.search === this.params && !force) {
      return false;
    }

    this.patchUsage();

    this.params = location.search;

    $('#topviews_search_field').val('');
    this.setState('reset');
    this.setState('processing');

    return this.initData().then(this.showList.bind(this));
  }

  /**
   * Get a string for % of mobile traffic.
   * @param {Object} item The item within this.pageData
   * @returns {String}
   */
  percentMobile(item) {
    let percentage = '';

    if (this.isYearly()) {
      percentage = item.mobile_percentage;
    } else {
      percentage = ((this.mobileViews[item.article] / item.views) * 100).toFixed(1);
    }

    if (parseFloat(percentage) === 0.0) {
      percentage = '< 0.1';
    }

    return percentage;
  }

  /**
   * Print list of top pages
   */
  showList() {
    $('.topview-entries').html('');

    const pageDataLength = this.pageData.length;

    let count = 0, index = 0;

    while (count < (this.config.pageSize + this.offset) && index < pageDataLength) {
      let item = this.pageData[index++];

      if (this.excludes.includes(item.article) || this.autoExcludes.includes(item.article)) continue;
      if (!this.max) this.max = item.views;

      const width = 100 * (item.views / this.max),
        direction = !!i18nRtl ? 'to left' : 'to right',
        offsetTop = (count * 40) + 40;

      const percentMobileText = this.shouldShowMobile() ? this.percentMobile(item) + '%' : '',
        editData = this.editData[item.article] || {},
        editors = typeof editData.num_users === 'number' ? this.formatNumber(editData.num_users) : '?';

      // create link to edit history or ? if no data is available
      let edits = '?';
      if (typeof editData.num_edits === 'number') {
        const [, endDate] = this.getDates();
        edits = this.getHistoryLink(
          item.article,
          this.formatNumber(editData.num_edits),
          endDate,
          editData.num_edits
        );
      }

      $('.topview-entries').append(
        `<tr class='topview-entry' id='topview-entry-${index}'>
           <td class='topview-entry--rank-wrapper'>
             <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${index - 1}
               title='${$.i18n('topviews-remove-page')}' aria-hidden='true'></span>
             <span class='topview-entry--rank'>${++count}</span>
           </td>
           <td class='topview-entry--label-wrapper'>
             <span class='topview-entry--background' style='top:${offsetTop}px; background:linear-gradient(${direction}, #EEE ${width}%, transparent ${width}%); opacity: 0.6'></span>
             <div class='topview-entry--label'>${this.getPageLink(item.article, this.project)}</div>
           </td>
           <td class='topview-entry--edits'>${edits}</td>
           <td class='topview-entry--editors'>${editors}</td>
           <td>
             <a class='topview-entry--views' href='${this.getPageviewsURL(item.article)}' target='_blank'>${this.formatNumber(item.views)}</a>
           </td>
           <td class='topview-entry--mobile'>${percentMobileText}</td>
         </tr>`
      );
    }

    this.offsetEnd = index;

    setTimeout(() => {
      this.setState('complete');
      $('.topview-entry--background').addClass('animate');
    });

    this.pushParams();
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

    if (triggerChange) {
      if (this.pageData[this.offsetEnd]) {
        this.setState('processing');

        // get edit data and mobile views for the new page that has come into view
        const newPage = this.pageData[this.offsetEnd].article;

        this.setSingleEditData(newPage)
          .always(() => this.setSingleMobileViews(newPage)
            .always(() => {
              this.setState('complete');
              $(this.config.select2Input).val(this.excludes).trigger('change');
              this.showList();
            })
          );
      } else {
        $(this.config.select2Input).val(this.excludes).trigger('change');
        this.showList();
      }
    }
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
        return encodeURIComponent(this.excludes[parseInt(el.dataset.index, 10)]);
      });
      if (!excludes.length) return;

      $.ajax({
        url: '/topviews/api.php',
        data: {
          project: this.project,
          pages: excludes,
          date: this.getParams(false).date,
          platform: this.$platformSelector.val()
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
    this.setState('complete');
    if ($('.topviews-search-icon').hasClass('glyphicon-remove')) {
      $('#topviews_search_field').val('');
      $('.topviews-search-icon').removeClass('glyphicon-remove').addClass('glyphicon-search');
      this.showList();
    }
  }

  /**
   * Should the "% Mobile" column be shown?
   * @return {Boolean} yes or no
   */
  shouldShowMobile() {
    return this.isYearly() || (
      $('.show-percent-mobile').is(':checked') && this.$platformSelector.val() === 'all-access'
    );
  }

  /**
   * Exports current chart data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @override
   */
  exportCSV() {
    let csvContent = `data:text/csv;charset=utf-8,Page,Edits,Editors,Views${this.shouldShowMobile() ? ',Mobile %' : ''}\n`;

    this.pageData.forEach(entry => {
      if (this.excludes.includes(entry.article) || this.autoExcludes.includes(entry.article)) return;

      // Build an array of page titles for use in the CSV header
      const title = '"' + entry.article.replace(/"/g, '""') + '"';

      const editData = this.editData[entry.article] || {},
        edits = typeof editData.num_edits === 'number' ? editData.num_edits : '?',
        editors = typeof editData.num_users === 'number' ? editData.num_users : '?';

      csvContent += `${title},${edits},${editors},${entry.views}`;
      if (this.shouldShowMobile()) {
        csvContent += `,${this.percentMobile(entry)}`;
      }
      csvContent += '\n';
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

    if (this.isYearly()) {
      date = moment(datepickerValue).format('YYYY');
    } else if (this.isMonthly()) {
      date = moment(datepickerValue).format('YYYY/MM');
    } else {
      date = moment(datepickerValue).format('YYYY/MM/DD');
    }

    return `${this.app}-${date}`;
  }

  /**
   * Link to /pageviews for given article and range around chosen date.
   * @param {string} article - page name
   * @returns {string} URL
   */
  getPageviewsURL(article) {
    // first get the date range
    const date = moment(this.datepicker.getDate());
    let startDate, endDate;
    if (this.isYearly()) {
      startDate = date.format('YYYY-01-01');
      endDate = date.endOf('year').format('YYYY-MM-DD');
    } else if (this.isMonthly()) {
      startDate = date.format('YYYY-MM-01');
      endDate = date.endOf('month').format('YYYY-MM-DD');
    } else {
      // surround single dates with 3 days to make the pageviews chart meaningful
      startDate = moment(date).subtract(3, 'days').format('YYYY-MM-DD');
      endDate = date.add(3, 'days').format('YYYY-MM-DD');
    }

    const platform = this.$platformSelector.val(),
      project = this.$projectInput.val();

    return `/pageviews?start=${startDate}&end=${endDate}&project=${project}` +
      `&platform=${platform}&pages=${encodeURIComponent(article.score()).replace("'", escape)}`;
  }

  /**
   * Get all user-inputted parameters except the pages
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} project, platform, excludes, etc.
   */
  getParams(specialRange = true) {
    let params = {
      project: this.$projectInput.val(),
      platform: this.$platformSelector.val()
    };

    const datepickerValue = this.datepicker.getDate();

    /**
     * Override start and end with custom range values,
     *   if configured (set by URL params or setupDatePicker)
     */
    if (this.specialRange && specialRange) {
      params.date = this.specialRange.range;
    } else if (this.isYearly()) {
      params.date = moment(datepickerValue).format('YYYY');
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
    if (range === 'last-year') {
      this.setupDatePicker('yearly');
      this.datepicker.setDate(this.config.maxYear);
      this.specialRange = {
        range,
        value: moment(this.config.maxYear).format('YYYY')
      };
    } else if (range === 'last-month') {
      this.setupDatePicker('monthly');
      this.datepicker.setDate(this.maxMonth);
      this.specialRange = {
        range,
        value: moment(this.maxMonth).format('YYYY/MM')
      };
    } else if (range === 'yesterday') {
      this.setupDatePicker('daily');
      this.datepicker.setDate(this.maxDate);
      this.specialRange = {
        range,
        value: moment(this.maxDate).format('YYYY-MM-DD')
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

    if (/\d{4}$/.test(dateInput)) {
      // yearly
      this.setupDatePicker('yearly');
      date = moment(`${dateInput}-01-01`).toDate();

      // if over max, set to max
      if (date > this.config.maxYear) {
        date = this.config.maxYear;
      }
    } else if (/\d{4}-\d{2}$/.test(dateInput)) {
      // monthly
      this.setupDatePicker('monthly');
      date = moment(`${dateInput}-01`).toDate();

      // if over max, set to max
      if (date > this.maxMonth) {
        date = this.maxMonth;
      }
    } else if (/\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // daily
      this.setupDatePicker('daily');
      date = moment(dateInput).toDate();

      // if over max, set to max (Topviews maxDate is a Date object, not moment)
      if (date > this.maxDate) {
        date = this.maxDate;
      }
    } else {
      // attempt to set as special range, or default range if range is invalid
      return this.setSpecialRange(dateInput) || this.setSpecialRange(this.config.defaults.dateRange);
    }

    // if less than min, throw error (since this is a common request)
    if (date < this.minDate.toDate()) {
      // use super.dateFormat since this is for moment, not for our datepicker
      this.toastError(`
        <strong>${$.i18n('invalid-params')}</strong>
        ${$.i18n('param-error-1', moment(this.minDate).format(super.dateFormat))}
      `);
      date = this.minDate.toDate();
    }

    return this.datepicker.setDate(date);
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   */
  popParams() {
    this.setState('processing');

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

    this.$projectInput.val(params.project);
    this.$platformSelector.val(params.platform);

    if (this.isYearly()) {
      $('.percent-mobile-wrapper').show();
      $('.show-percent-mobile').prop('disabled', true).prop('checked', true);
      $('.mainspace-only-option').prop('disabled', true).prop('checked', true);
      $('.output-table').addClass('show-mobile');
      $('#platform-select').prop('disabled', true).val('all-access');
    } else if (params.platform === 'all-access') {
      $('.percent-mobile-wrapper').show();
      $('.show-percent-mobile').prop('checked', !!params.mobileviews);
      $('.output-table').toggleClass('show-mobile', !!params.mobileviews);
    }

    $('.mainspace-only-option').prop('checked', params.mainspace !== 'false');

    this.excludes = (params.excludes || []).map(exclude => decodeURIComponent(exclude.descore()));

    this.params = location.search;

    this.patchUsage();

    this.initData().done(() => {
      this.setupSelect2();
      this.showList();
    }).always(() => {
      this.setupListeners();
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
    const excludes = this.underscorePageNames(this.excludes).join('|').replace(/[&%?+]/g, encodeURIComponent);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, `?${$.param(this.getParams())}&excludes=${excludes}`);
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&excludes=${excludes.replace('|', escape)}`);
  }

  /**
   * Removes chart, messages, and resets Select2 selections
   * @param {Boolean} [clearSelector] - whether to clear the Select2 control
   */
  resetView(clearSelector = true) {
    this.setState('reset');
    this.clearSearch();
    $('.topview-entries').html('');

    if (clearSelector) {
      this.resetSelect2();
      this.excludes = [];
    }
  }

  /**
   * Helper to set a CSS class on the `main` node, styling the document
   *   based on a 'state', along with related JS actions
   * @param {String} state - class to be added;
   *   should be one of this.config.formStates
   * @param {function} [cb] - Optional function to be called after initial state has been set
   */
  setState(state, cb) {
    $('main').removeClass(this.config.formStates.join(' ')).addClass(state);

    switch (state) {
    case 'initial':
    case 'reset':
      this.stopSpinny();
      this.autoExcludes = [];
      this.offset = 0;
      this.offsetEnd = 0;
      this.max = null;
      this.pageData = [];
      this.pageNames = [];
      this.mobileViews = {};
      this.editData = {};
      this.excludeAdded = false;
      $('.message-container').html('');
      $('.show-more').removeClass('hidden');
      break;
    case 'processing':
      this.startSpinny();
      break;
    case 'complete':
      this.stopSpinny();
      break;
    case 'search':
      break;
    }

    if (typeof cb === 'function') cb();
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

    this.setState('search');

    let matchedData = [], count = 0;

    // add ranking to pageData and fetch matches
    this.pageData.forEach((entry, index) => {
      if (!this.excludes.includes(entry.article) && !this.autoExcludes.includes(entry.article)) {
        count++;
        if (new RegExp(query, 'i').test(entry.article)) {
          entry.rank = count;
          entry.index = index;
          matchedData.push(entry);
        }
      }
    });

    $('.topview-entries').html('');
    $('.topviews-search-icon').removeClass('glyphicon-search').addClass('glyphicon-remove');

    matchedData.forEach(item => {
      $('.topview-entries').append(
        `<tr class='topview-entry'>
         <td class='topview-entry--rank-wrapper'>
           <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${item.index}
             title='${$.i18n('topviews-remove-page')}' aria-hidden='true'></span>
           <span class='topview-entry--rank'>${item.rank}</span>
         </td>
         <td>
           <a class='topview-entry--label' href="${this.getPageURL(item.article)}" target="_blank">${item.article}</a>
         </td>
         <td class='topview-entry--edits'></td>
         <td class='topview-entry--editors'></td>
         <td>
           <a class='topview-entry--views' target='_blank'
              href='${this.getPageviewsURL(item.article)}'>${this.formatNumber(item.views)}
           </a>
         </td>
         <td class='topview-entry--mobile'></td></tr>`
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
      minimumResultsForSearch: Infinity,
      placeholder: $.i18n('hover-to-exclude')
    });

    if (excludes.length) this.setSelect2Defaults(excludes);

    select2Input.on('change', e => {
      this.excludes = $(e.target).val() || [];
      this.max = null;
      this.clearSearch();

      /** for topviews we don't want the user input functionality of Select2 */
      $('.select2-search__field').prop('disabled', true);
    });

    select2Input.on('select2:unselect', e => {
      const pageName = e.params.data.text;

      if (!this.mobileViews[pageName]) {
        this.setState('processing');
        this.setSingleMobileViews(pageName).always(this.showList.bind(this));
      } else {
        this.showList();
      }

      if (!$(e.target).val()) $('.report-false-positive').hide();
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
  setupDatePicker(type = 'monthly') {
    $('#date-type-select').val(type);

    let datepickerParams;

    if (type === 'yearly') {
      datepickerParams = {
        format: 'yyyy',
        viewMode: 'years',
        minViewMode: 'years',
        endDate: this.config.maxYear
      };
    } else if (type === 'monthly') {
      datepickerParams = {
        format: 'MM yyyy',
        viewMode: 'months',
        minViewMode: 'months',
        endDate: this.maxMonth
      };
    } else {
      datepickerParams = {
        format: this.dateFormat,
        viewMode: 'days',
        endDate: this.maxDate
      };
    }

    this.$dateSelector.datepicker('destroy');
    this.$dateSelector.datepicker(
      Object.assign({
        autoclose: true,
        startDate: this.minDate.toDate()
      }, datepickerParams)
    );
  }

  /**
   * General place to add page-wide listeners
   */
  setupListeners() {
    super.setupListeners();

    this.$platformSelector.on('change', e => {
      $('.percent-mobile-wrapper').toggle(e.target.value === 'all-access' || this.isYearly());
      $('.output-table').toggleClass('show-mobile', this.shouldShowMobile());
      this.processInput();
    });
    $('#date-type-select').on('change', e => {
      $('#platform-select').prop('disabled', false);
      $('.show-percent-mobile').prop('disabled', false);
      $('.mainspace-only-option').prop('disabled', false);

      // setSpecialRange() also calls setupDatePicker()
      if (this.isYearly()) {
        $('#platform-select').val('all-access').prop('disabled', true);
        $('.percent-mobile-wrapper').show();
        $('.show-percent-mobile').prop('checked', true).prop('disabled', true);
        $('.mainspace-only-option').prop('checked', true).prop('disabled', true);
        $('.output-table').addClass('show-mobile');
        this.setSpecialRange('last-year');
      } else if (this.isMonthly()) {
        this.setSpecialRange('last-month');
      } else {
        this.setSpecialRange('yesterday');
      }
    });
    $('.show-more').on('click', () => {
      this.offset += this.config.pageSize;
      this.setState('processing');

      let editDataOffset = this.config.pageSize;

      // if we're on the last page, instruct setEditData to only process
      //  the remaining pages (which might be less than this.config.pageSize)
      if (this.pageData.length - this.offsetEnd < this.config.pageSize) {
        editDataOffset = this.pageData.length - this.offsetEnd;
        $('.show-more').addClass('hidden');
      }

      this.setEditData(this.offsetEnd, editDataOffset)
        .always(() => this.setMobileViews(this.offsetEnd)
          .always(this.showList.bind(this))
        );
    });
    this.$dateSelector.on('change', e => {
      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
      this.processInput();
    });
    $('.mainspace-only-option').on('click', this.processInput.bind(this));
    $('.show-percent-mobile').on('click', e => {
      $('.output-table').toggleClass('show-mobile', $(e.target).prop('checked'));
      this.processInput(true);
    });
    $('#topviews_search_field').on('keyup', this.searchTopviews.bind(this));
    $('.topviews-search-icon').on('click', this.clearSearch.bind(this));
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
   * The date selector input.
   * @returns {jQuery}
   */
  get $dateSelector() {
    return this.cachedElement('.date-selector');
  }

  /**
   * Get instance of datepicker
   * @return {Object} the datepicker instance
   */
  get datepicker() {
    return this.$dateSelector.data('datepicker');
  }

  /**
   * Are we in 'monthly' mode?
   * @return {Boolean} yes or no
   */
  isMonthly() {
    return $('#date-type-select').val() === 'monthly';
  }

  /**
   * Are we in 'yearly' mode?
   * @return {Boolean}
   */
  isYearly() {
    return $('#date-type-select').val() === 'yearly';
  }

  /**
   * Get the currently selected date for the purposes of pageviews API call
   * @return {String} formatted date
   */
  getAPIDate() {
    const datepickerValue = this.datepicker.getDate();

    if (this.isYearly()) {
      // This ends up going to a temporary internal endpoint until T154381 is resolved.
      return moment(datepickerValue).format('YYYY');
    } else if (this.isMonthly()) {
      return moment(datepickerValue).format('YYYY/MM') + '/all-days';
    } else {
      return moment(datepickerValue).format('YYYY/MM/DD');
    }
  }

  /**
   * Get known false positives for currently selected project, date and platform
   * @return {Deferred} Promise resolving with an array of page names
   */
  getFalsePositives() {
    return $.ajax({
      url: '/topviews/api.php',
      data: {
        project: this.project,
        date: this.getParams(false).date,
        platform: this.$platformSelector.val()
      },
      timeout: 8000
    });
  }

  /**
   * Get currently selected start and end dates as moment objects
   * @returns {Array} array containing the start and end date
   */
  getDates() {
    const datepickerValue = this.datepicker.getDate();
    let startDate, endDate;

    if (this.isYearly()) {
      startDate = moment(datepickerValue).startOf('year');
      endDate = moment(datepickerValue).endOf('year');
    } else if (this.isMonthly()) {
      startDate = moment(datepickerValue).startOf('month');
      endDate = moment(datepickerValue).endOf('month');
    } else {
      startDate = moment(datepickerValue);
      endDate = moment(datepickerValue);
    }

    return [startDate, endDate];
  }

  /**
   * Set this.editData for a single page
   * @param {String} page - page title
   * @returns {Deferred} promise resolving with this.editData
   */
  setSingleEditData(page) {
    const dfd = $.Deferred(),
      [startDate, endDate] = this.getDates();

    // if we already have the data, resolve with this.editData as-is
    if (this.editData[page]) {
      return dfd.resolve(this.editData);
    }

    const url = `/pageviews/api.php?project=${this.project}.org&start=${startDate.format('YYYY-MM-DD')}` +
      `&end=${endDate.format('YYYY-MM-DD')}&pages=${encodeURIComponent(page)}`;

    $.ajax({ url, dataType: 'json' }).done(data => {
      Object.assign(this.editData, data.pages);
    }).always(() => dfd.resolve(this.editData));

    return dfd;
  }

  /**
   * Set this.editData for requested pages, providing number of edits and edits in the period
   * @param {Number} startIndex - start index of this.pageData
   * @param {Number} offset - number of entries to process following startIndex
   * @returns {Deferred} promise resolving with this.mobileViews
   */
  setEditData(startIndex = 0, offset = this.config.pageSize) {
    const dfd = $.Deferred(),
      [startDate, endDate] = this.getDates();

    let index = startIndex,
      counter = 0,
      requestCount = offset;

    // Set total page length to as the requestCount if it is less than the offset
    // Also hide the 'show more' link
    if (this.pageData.length < offset) {
      $('.show-more').addClass('hidden');
      requestCount = this.pageData.length;
    }

    const makeRequest = pages => {
      const originalNumPages = pages.length;

      // filter out pages we already have data for
      pages = pages.filter(page => !this.editData[page])
        .map(page => encodeURIComponent(page));

      // if we already have the data, just go straight to resolving via dummy Deferred
      if (!pages.length) {
        requestCount -= originalNumPages;
        if (requestCount <= 0) {
          return dfd.resolve(this.editData);
        }

        return $.Deferred().resolve();
      }

      const url = `/pageviews/api.php?project=${this.project}.org&start=${startDate.format('YYYY-MM-DD')}` +
        `&end=${endDate.format('YYYY-MM-DD')}&pages=${pages.join('|')}`;

      $.ajax({ url, dataType: 'json' }).done(data => {
        Object.assign(this.editData, data.pages);
      }).always(() => {
        requestCount -= originalNumPages;
        if (requestCount <= 0) {
          dfd.resolve(this.editData);
        }
      });
    };

    const requestFn = this.rateLimit(makeRequest, this.config.apiThrottle * 2, this),
      pageDataLength = this.pageData.length;

    let queue = [];

    while (counter < offset && index < pageDataLength) {
      const item = this.pageData[index];
      if (this.excludes.includes(item.article) || this.autoExcludes.includes(item.article)) {
        index++;
        continue;
      }
      queue.push(this.pageData[index].article);
      if (queue.length === 10 || index + 1 === pageDataLength) {
        requestFn(queue);
        queue = [];
      }
      counter++;
      index++;
    }

    return dfd;
  }

  /**
   * Set this.mobileViews for a single page
   * @param {String} page - page title
   * @returns {Deferred} promise resolving with this.mobileViews
   */
  setSingleMobileViews(page) {
    const dfd = $.Deferred();

    if (!this.shouldShowMobile()) {
      return dfd.resolve({});
    }

    if (this.isYearly()) {
      // this.mobileViews is already set when importing the yearly data from the internal API.
      return dfd.resolve(this.mobileViews);
    }

    const [startDate, endDate] = this.getDates();

    let promises = [];

    ['mobile-web', 'mobile-app'].forEach(endpoint => {
      const url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article' +
        `/${this.project}/${endpoint}/all-agents/${page}/${this.isMonthly() ? 'monthly' : 'daily'}` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`;

      // if we already have the data, just go straight to resolving via dummy Deferred
      if (this.mobileViews[page]) {
        const dummyDfd = $.Deferred();
        promises.push(dummyDfd);
        return dummyDfd.resolve();
      }

      const promise = $.ajax({ url, dataType: 'json' });

      promises.push(promise);

      promise.done(data => {
        const views = data.items.reduce((a, b) => a + b.views, 0),
          pageTitle = data.items[0].article.descore();
        this.mobileViews[pageTitle] = views + (this.mobileViews[pageTitle] || 0);
      });
    });

    $.whenAll(...promises).always(() => dfd.resolve(this.mobileViews));

    return dfd;
  }

  /**
   * Set this.mobileViews for requested pages
   * @param {Number} startIndex - start index of this.pageData
   * @param {Number} offset - number of entries to process following startIndex
   * @returns {Deferred} promise resolving with this.mobileViews
   */
  setMobileViews(startIndex = 0, offset = this.config.pageSize) {
    const dfd = $.Deferred();

    if (!this.shouldShowMobile()) {
      return dfd.resolve({});
    }

    if (this.isYearly()) {
      // Mobile percentages are already set when importing the yearly data from the internal API.
      return dfd.resolve({});
    }

    const [startDate, endDate] = this.getDates();

    let index = startIndex,
      counter = 0,
      requestCount = offset;

    const makeRequest = page => {
      let promises = [];

      ['mobile-web', 'mobile-app'].forEach(endpoint => {
        const url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article' +
          `/${this.project}/${endpoint}/all-agents/${encodeURIComponent(page)}/${this.isMonthly() ? 'monthly' : 'daily'}` +
          `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`;

        // if we already have the data, just go straight to resolving via dummy Deferred
        if (this.mobileViews[page]) {
          const dummyDfd = $.Deferred();
          promises.push(dummyDfd);
          return dummyDfd.resolve();
        }

        const promise = $.ajax({ url, dataType: 'json' });

        promises.push(promise);

        promise.done(data => {
          const views = data.items.reduce((a, b) => a + b.views, 0),
            pageTitle = data.items[0].article.descore();
          this.mobileViews[pageTitle] = views + (this.mobileViews[pageTitle] || 0);
        });
      });

      $.whenAll(...promises).always(() => {
        if (--requestCount === 0) {
          dfd.resolve(this.mobileViews);
        }
      });
    };

    const requestFn = this.rateLimit(makeRequest, this.config.apiThrottle * 2, this),
      pageDataLength = this.pageData.length;

    while (counter < offset && index < pageDataLength) {
    // for (let index = startIndex; index <= endIndex; index++) {
      const item = this.pageData[index];
      if (this.excludes.includes(item.article) || this.autoExcludes.includes(item.article)) {
        index++;
        continue;
      }
      requestFn(this.pageData[index].article);
      counter++;
      index++;
    }

    return dfd;
  }

  /**
   * Fetch data from API
   * @returns {Deferred} promise with data
   */
  initData() {
    let dfd = $.Deferred();

    this.setState('processing');

    const postProcess = () => {
      /** build the pageNames array for Select2 */
      this.pageNames = this.pageData.map(page => page.article);

      /** set up auto excludes now that we know what pages will be effected */
      this.setupAutoExcludes();

      if ($('.mainspace-only-option').is(':checked')) {
        this.filterOutNamespace(this.pageNames).done(pageNames => {
          this.pageNames = pageNames;
          this.pageData = this.pageData.filter(page => pageNames.includes(page.article));

          if (access === 'all-access') {
            return this.setEditData()
              .always(() => this.setMobileViews()
                .always(() => dfd.resolve(this.pageData))
              );
          } else {
            return this.setEditData().always(() => dfd.resolve(this.pageData));
          }
        });
      } else if (access === 'all-access') {
        return this.setEditData()
          .always(() => this.setMobileViews()
            .always(() => dfd.resolve(this.pageData))
          );
      } else {
        return this.setEditData().always(() => dfd.resolve(this.pageData));
      }
    };

    const access = this.isYearly() ? 'all-access' : this.$platformSelector.val();

    const showTopviews = () => {
      if (this.isYearly()) {
        $.getJSON(`/topviews/yearly_datasets/${this.project}/${this.getAPIDate()}.json`).done(data => {
          this.pageData = data;

          /** build the pageNames array for Select2 */
          this.pageNames = this.pageData.map(page => page.article);

          return postProcess();
        }).fail(() => {
          this.resetView();
          this.writeMessage($.i18n('api-error', 'Yearly pageviews API'));
        });
      } else {
        $.ajax({
          url: `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${this.project}/${access}/${this.getAPIDate()}`,
          dataType: 'json'
        }).done(data => {
          // store pageData from API, removing underscores from the page name
          this.pageData = data.items[0].articles.map(page => {
            page.article = page.article.descore();
            return page;
          });

          return postProcess();
        }).fail(errorData => {
          this.resetView();
          this.writeMessage(`${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`);
          return dfd.reject();
        });
      }
    };

    this.getFalsePositives().done(autoExcludes => {
      this.autoExcludes = autoExcludes;
    }).always(showTopviews);

    return dfd;
  }

  /**
   * Adds a message below the "Excluded pages" list, that has a link to show
   *   the automatically excluded pages (as retrieved from /musikanimal/api/topviews/false_positives).
   * Also reremoves any auto-excluded pages from this.excludes
   * @returns {null} nothing
   */
  setupAutoExcludes() {
    // remove any that aren't actually in the results
    this.autoExcludes = this.autoExcludes.filter(page => this.pageNames.includes(page));

    if (!this.autoExcludes.length) return $('.list-false-positives').hide();

    const listFPLink = `<a href='#' data-target='#list-false-positives-modal' data-toggle='modal'>
        ${$.i18n('known-false-positives-link', this.autoExcludes.length)}
      </a>`;

    $('.list-false-positives').html(
      $.i18n('known-false-positives-text', listFPLink, this.autoExcludes.length)
    );

    $('.list-false-positives').show();
    $('#list-false-positives-modal').on('show.bs.modal', () => {
      // list the false positives
      $('.false-positive-list').html('');
      this.autoExcludes.forEach(exclude => {
        const rank = this.pageData.find(page => page.article === exclude).rank;
        $('.false-positive-list').append(`
          <tr><td>${this.getPageLink(exclude, this.project)}</td><td>${rank}</td></tr>
        `);
      });
    });

    // remove autoExcludes from excludes given via URL param
    this.excludes = this.excludes.filter(exclude => this.autoExcludes.indexOf(exclude) === -1);
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
        const mainPage = this.getSiteInfo(this.project).general.mainpage;

        // main page may include project namespace, so compare against main page name without namespace, too
        if (restrictedNamespace === 0 && (entry === mainPage || entry === mainPage.split(':')[1])) {
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

$(() => {
  new TopViews();
});
