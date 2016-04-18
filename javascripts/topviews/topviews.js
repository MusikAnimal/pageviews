/*
 * Topviews Analysis tool
 *
 * Copyright 2016 MusikAnimal
 * Redistributed under the MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');

class TopViews extends Pv {
  constructor() {
    super();

    this.localizeDateFormat = this.getFromLocalStorage('pageviews-settings-localizeDateFormat') || config.defaults.localizeDateFormat;
    this.numericalFormatting = this.getFromLocalStorage('pageviews-settings-numericalFormatting') || config.defaults.numericalFormatting;
    this.excludes = [];
    this.offset = 0;
    this.max = null;
    this.pageData = [];
    this.pageNames = [];
    this.params = null;
    this.config = config;

    this.setupProjectInput();
    this.setupDateRangeSelector();
    this.popParams();

    if (location.host !== 'localhost') {
      /** simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :) */
      $.ajax({
        url: '//tools.wmflabs.org/musikanimal/api/uses',
        method: 'PATCH',
        data: {
          tool: 'topviews',
          type: 'form'
        }
      });
    }
  }

  /**
   * Apply user input by updating the URL hash and view, if needed
   * @param {boolean} force - apply all user options even if we've detected nothing has changed
   * @returns {Deferred} deferred object from initData
   */
  applyChanges(force) {
    this.pushParams();

    /** prevent redundant querying */
    if (location.hash === this.params && !force) {
      return false;
    }
    this.params = location.hash;

    this.resetView(false);
    return this.initData().then(this.drawData.bind(this));
  }

  /**
   * Print list of top pages
   * @returns {null} nothing
   */
  drawData() {
    $('.chart-container').removeClass('loading').html('');

    let count = 0, index = 0;

    while (count < config.pageSize + this.offset) {
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

  addExclude(page) {
    this.excludes.push(page);
    page = page.replace(/ /g, '_');
    $(config.articleSelector).html('');
    this.excludes.forEach(exclude => {
      const escapedText = $('<div>').text(exclude).html();
      $(`<option>${escapedText}</option>`).appendTo(config.articleSelector);
    });
    $(config.articleSelector).val(this.excludes).trigger('change');
    // $(config.articleSelector).select2('close');
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
      project = $(config.projectInput).val();

    if (endDate.diff(startDate, 'days') === 0) {
      startDate.subtract(3, 'days');
      endDate.add(3, 'days');
    }

    return `/pageviews#start=${startDate.format('YYYY-MM-DD')}` +
      `&end=${endDate.format('YYYY-MM-DD')}&project=${project}&platform=${platform}&pages=${article}`;
  }

  /**
   * Generate key/value pairs of URL hash params
   * @returns {Object} key/value pairs representation of URL hash
   */
  parseHashParams() {
    const uri = decodeURI(location.hash.slice(1)),
      chunks = uri.split('&');
    let params = {};

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i].split('=');

      if (chunk[0] === 'excludes') {
        params.excludes = chunk[1].split('|');
      } else {
        params[chunk[0]] = chunk[1];
      }
    }

    return params;
  }

  /**
   * Parses the URL hash and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    let startDate, endDate, params = this.parseHashParams();

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
        this.resetView();
        return;
      } else if (startDate > endDate) {
        this.addSiteNotice('warning', i18nMessages.paramError2, i18nMessages.invalidParams, true);
        this.resetView();
        return;
      }
      /** directly assign startDate before calling setEndDate so events will be fired once */
      this.daterangepicker.startDate = startDate;
      this.daterangepicker.setEndDate(endDate);
    } else {
      this.setSpecialRange(config.defaults.dateRange);
    }

    $('#platform-select').val(params.platform || 'all-access');

    if (!params.excludes || (params.excludes.length === 1 && !params.excludes[0])) {
      this.excludes = config.defaults.excludes;
    } else {
      this.excludes = params.excludes.map(exclude => exclude.replace(/_/g, ' '));
    }

    this.params = location.hash;

    this.initData().then(() => {
      this.setupArticleSelector();
      this.drawData();
      this.setupListeners();
    });
  }

  /**
   * Replaces history state with new URL hash representing current user input
   * Called whenever we go to update the chart
   * @returns {string|false} the new hash param string or false if nothing has changed
   */
  pushParams() {
    let state = {
      project: $(config.projectInput).val(),
      platform: $('#platform-select').val()
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in config.specialRanges, constructed like `{range: 'last-month'}`,
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
      window.history.replaceState({}, 'Topviews comparsion', `#${$.param(state)}&excludes=${excludes.join('|')}`);
    }

    return state;
  }

  /**
   * Removes all article selector related stuff then adds it back
   * @returns {null} nothing
   */
  resetArticleSelector() {
    const articleSelector = $(config.articleSelector);
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
    const articleSelector = $(config.articleSelector);

    articleSelector.select2({
      data: [],
      maximumSelectionLength: 50,
      minimumInputLength: 0,
      placeholder: 'Hover over entires and click the ✖ to exclude from view'
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
      $('<option>' + escapedText + '</option>').appendTo(config.articleSelector);
      return page;
    });
    $(config.articleSelector).select2('val', pages);
    $(config.articleSelector).select2('close');

    return pages;
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

    /** the "Latest N days" links */
    $('.date-latest a').on('click', function(e) {
      this.setSpecialRange(`latest-${$(this).data('value')}`);
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
   * General place to add page-wide listeners
   * @returns {null} - nothing
   */
  setupListeners() {
    super.setupListeners();

    $('#platform-select').on('change', this.applyChanges.bind(this));
    $('.expand-chart').on('click', () => {
      this.offset += config.pageSize;
      this.drawData();
    });
    $(config.dateRangeSelector).on('change', e => {
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
    $(config.projectInput).on('change', e => {
      if (!e.target.value) {
        e.target.value = config.defaults.project;
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

      return dfd.resolve(this.pageData);
    });
  }

  /**
   * Checks value of project input and validates it against site map
   * @returns {boolean} whether the currently input project is valid
   */
  validateProject() {
    const project = $(config.projectInput).val();
    if (siteDomains.includes(project)) {
      $('body').removeClass('invalid-project');
    } else {
      this.resetView();
      this.writeMessage(
        `<a href='//${project}'>${project}</a> is not a
         <a href='//meta.wikipedia.org/w/api.php?action=sitematrix&formatversion=2'>valid project</a>`,
        'validate', true
      );
      $('body').addClass('invalid-project');
      return true;
    }
  }
}

$(document).ready(() => {
  new TopViews();
});
