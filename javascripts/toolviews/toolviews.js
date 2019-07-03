/**
 * Toolviews Analysis tool
 * @file Main file for Toolviews application
 * @author MusikAnimal
 * @copyright 2019 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 * @requires Pv
 */

const config = require('./config');
const Pv = require('../shared/pv');

/** Main ToolViews class */
class ToolViews extends Pv {
  /**
   * Set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    // FIXME: for when localization is supported.
    window.i18nLang = 'en';
    window.i18nRtl = false;

    super(config);
    this.app = 'toolviews';

    this.offset = 0;
    this.offsetEnd = 0;
    this.max = null;
    this.toolData = [];
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
  processInput(force = false) {
    this.pushParams();

    /** prevent redundant querying */
    if (location.search === this.params && !force) {
      return false;
    }

    this.patchUsage();

    this.params = location.search;

    // $('#toolviews_search_field').val('');
    this.setState('reset');
    this.setState('processing');

    return this.initData().then(this.showList.bind(this));
  }

  /**
   * Print list of top pages
   */
  showList() {
    $('.toolview-entries').html('');

    const toolDataLength = this.toolData.length;

    let count = 0, index = 0;

    for (let tool in this.toolData) {
      const views = this.toolData[tool];

      if (!this.max) this.max = views;

      const width = 100 * (views / this.max),
        direction = !!i18nRtl ? 'to left' : 'to right',
        offsetTop = (count * 40) + 40;

      $('.toolview-entries').append(
        `<tr class='toolview-entry' id='toolview-entry-${index}'>
           <td class='toolview-entry--rank-wrapper'>
             <span class='toolview-entry--rank'>${++count}</span>
           </td>
           <td class='toolview-entry--label-wrapper'>
             <span class='toolview-entry--background' style='top:${offsetTop}px; background:linear-gradient(${direction}, #EEE ${width}%, transparent ${width}%); opacity: 0.6'></span>
             <div class='toolview-entry--label'>${this.getToolLink(tool)}</div>
           </td>
           <td>
             <a class='toolview-entry--views' href='${this.getPageviewsURL(tool)}' target='_blank'>${this.formatNumber(views)}</a>
           </td>
        </tr>`
      );

      index++;
    }

    this.offsetEnd = index;

    setTimeout(() => {
      this.setState('complete');
      $('.toolview-entry--background').addClass('animate');
    });

    this.pushParams();
    this.addExcludeListeners();
  }

  // /**
  //  * Exports current chart data to CSV format and loads it in a new tab
  //  * With the prepended data:text/csv this should cause the browser to download the data
  //  * @override
  //  */
  // exportCSV() {
  //   let csvContent = `data:text/csv;charset=utf-8,Rank,Tool,Views\n`;
  //
  //   for (tool in this.toolData) {
  //
  //
  //
  //   }
  //
  //
  //   this.toolData.forEach(entry => {
  //     // Build an array of page titles for use in the CSV header
  //     const title = '"' + entry.article.replace(/"/g, '""') + '"';
  //
  //     csvContent += `,${edits},${editors},${entry.views}`;
  //     csvContent += '\n';
  //   });
  //
  //   this.downloadData(csvContent, 'csv');
  // }

  /**
   * Link to /pageviews for given article and chosen daterange
   * @param {string} article - page name
   * @returns {string} URL
   */
  getPageviewsURL(article) {
    // first get the date range
    const date = moment(this.datepicker.getDate());

    // surround single dates with 3 days to make the pageviews chart meaningful
    let startDate = moment(date).subtract(3, 'days').format('YYYY-MM-DD'),
      endDate = date.add(3, 'days').format('YYYY-MM-DD');

    return '';
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
   * @param {String} range - e.g. 'yesterday'
   * @returns {Boolean} whether a valid range was provided and was set
   * @override
   */
  setSpecialRange(range) {
    if (range === 'yesterday') {
      this.setupDateRangeSelector('daily');
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
   * @param {String} dateInput - either a range like 'yesterday' or date with format 'YYYY-MM-DD'
   * @return {null}
   */
  setDate(dateInput) {
    let date;

    if (/\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // daily
      this.setupDateRangeSelector('daily');
      date = moment(dateInput).toDate();

      // if over max, set to max (Toolviews maxDate is a Date object, not moment)
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

    const params = this.validateParams(this.parseQueryString());

    this.setDate(params.date); // also performs validations

    this.params = location.search;

    this.patchUsage();

    this.initData().done(() => {
      this.showList();
    }).always(() => {
      this.setupListeners();
    });
  }

  /**
   * Replaces history state with new URL query string representing current user input
   * Called whenever we go to update the chart
   */
  pushParams() {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, `?${$.param(this.getParams())}`);
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}}`);
  }

  /**
   * Removes chart and messages.
   */
  resetView() {
    this.setState('reset');
    $('.toolview-entries').html('');
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
      this.offset = 0;
      this.offsetEnd = 0;
      this.max = null;
      this.pageData = [];
      this.pageNames = [];
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
   * sets up the datepicker based on given type
   * @override
   */
  setupDateRangeSelector() {
    let datepickerParams = {
      format: this.dateFormat,
      viewMode: 'days',
      endDate: this.maxDate
    };

    $(this.config.dateRangeSelector).datepicker('destroy');
    $(this.config.dateRangeSelector).datepicker(
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

    $('.show-more').on('click', () => {
      this.offset += this.config.pageSize;
      this.setState('processing');

      if (this.pageData.length - this.offsetEnd < this.config.pageSize) {
        $('.show-more').addClass('hidden');
      }

      this.showList();
    });
    $(this.config.dateRangeSelector).on('change', e => {
      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
      this.processInput();
    });
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
   * Get the currently selected date for the purposes of pageviews API call
   * @return {String} formatted date
   */
  getAPIDate() {
    const datepickerValue = this.datepicker.getDate();
    return moment(datepickerValue).format('YYYY-MM-DD');
  }

  /**
   * Get currently selected start and end dates as moment objects
   * @returns {Array} array containing the start and end date
   */
  getDates() {
    const datepickerValue = this.datepicker.getDate();
    let startDate = moment(datepickerValue),
      endDate = moment(datepickerValue);

    return [startDate, endDate];
  }

  /**
   * Fetch data from API
   * @returns {Deferred} promise with data
   */
  initData() {
    let dfd = $.Deferred();

    this.setState('processing');

    // FIXME: ~~~~~~~~~~~~~~~~~~~~~~~~ Got the wrong order for tools.wmflabs.org vs localhost ~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const endpoint = `http://tools.wmflabs.org/toolviews/api/v1/day/${this.getAPIDate()}`;
    // http://localhost:8010/toolviews/api/v1/day/${moment(this.maxDate).format('YYYY-MM-DD')}`;
    const showToolviews = () => {
      $.ajax({
        url: `/metaviews/toolviews_api.php?endpoint=${endpoint}`,
        dataType: 'json'
      }).done(data => {
        this.toolData = data.results;
        return dfd.resize(this.toolData);
      }).fail(() => {
        this.resetView();
        this.writeMessage($.i18n('api-error', 'Toolviews API'));
        return dfd.reject();
      });
    };

    showToolviews();

    return dfd;
  }
}

$(document).ready(() => {
  new ToolViews();
});
