/**
 * @file Shared code amongst all apps (Pageviews, Topviews, Langviews, Siteviews, Massviews, Redirect Views)
 * @author MusikAnimal, Kaldari
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

/** class-less files with global overrides */
require('./core_extensions');
require('./polyfills');

const PvConfig = require('./pv_config');
const siteMap = require('./site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);

/** Pv class, contains code amongst all apps (Pageviews, Topviews, Langviews, Siteviews, Massviews, Redirect Views) */
class Pv extends PvConfig {
  /**
   * Main constructor for each app, giving way to the parent constructor in list_helpers or chart_helpers
   * @param {Object} appConfig - as defined in the app's config.js
   * @override
   */
  constructor(appConfig) {
    super(appConfig);

    /** assign initial class properties */
    const defaults = this.config.defaults,
      validParams = this.config.validParams;
    this.config = Object.assign({}, this.config, appConfig);
    this.config.defaults = Object.assign({}, defaults, appConfig.defaults);
    this.config.validParams = Object.assign({}, validParams, appConfig.validParams);

    this.colorsStyleEl = undefined;
    this.storage = {}; // used as fallback when localStorage is not supported

    ['localizeDateFormat', 'numericalFormatting', 'bezierCurve', 'autocomplete', 'autoLogDetection', 'beginAtZero', 'rememberChart'].forEach(setting => {
      this[setting] = this.getFromLocalStorage(`pageviews-settings-${setting}`) || this.config.defaults[setting];
    });
    this.setupSettingsModal();

    this.params = null;
    this.siteInfo = {};

    /**
     * tracking of elapsed time
     * @type {null|Date}
     */
    this.processStart = null;

    this.debug = location.search.includes('debug=true') || location.host === 'localhost';

    /** redirect to production if debug flag isn't given */
    if (location.pathname.includes('-test') && !location.search.includes('debug=true')) {
      const actualPathName = location.pathname.replace(/-test\/?/, '');
      $('body').html(`
        <p class='tm text-center'>This is the staging environment!</p>
        <p class='tm text-center'>To use the staging app, append <code>debug=true</code> to the URL</p>
        <p class='tm text-center'>Otherwise, please update your links to use
          <strong><a href='${actualPathName}'>https://${location.host}${actualPathName}</a></strong>
        </p>
        <p class='text-center' style='margin-top:50px; font-weight:bold'>
          Redirecting you to the production ${document.title} in
          <span class='countdown'>10</span>...
        </p>
      `);

      let count = 10;

      setInterval(() => {
        if (--count === 0) {
          return document.location = actualPathName;
        }
        $('.countdown').text(count);
      }, 1000);

      return;
    }

    /** assign app instance to window for debugging on local environment */
    if (this.debug) {
      window.app = this;
    } else {
      this.splash();
    }

    /**
     * Load translations then initialize the app.
     * Each app has it's own initialize method.
     * Make sure we load 'en.json' as a fallback
     */
    let messagesToLoad = {
      [i18nLang]: `/pageviews/messages/${i18nLang}.json`
    };
    if (i18nLang !== 'en') {
      messagesToLoad.en = '/pageviews/messages/en.json';
    }
    $.i18n({
      locale: i18nLang
    }).load(messagesToLoad).then(this.initialize.bind(this));

    /** set up toastr config. The duration may be overriden later */
    toastr.options = {
      closeButton: true,
      debug: location.host === 'localhost',
      newestOnTop: false,
      progressBar: false,
      positionClass: 'toast-top-center',
      preventDuplicates: true,
      onclick: null,
      showDuration: '300',
      hideDuration: '1000',
      timeOut: '5000',
      extendedTimeOut: '3000',
      showEasing: 'swing',
      hideEasing: 'linear',
      showMethod: 'fadeIn',
      hideMethod: 'fadeOut',
      toastClass: 'alert',
      iconClasses: {
        error: 'alert-danger',
        info: 'alert-info',
        success: 'alert-success',
        warning: 'alert-warning'
      }
    };
  }

  /**
   * Add a site notice (Bootstrap alert)
   * @param {Object} opts - as follows:
   * {
   *   message: '',       // {String} message - message to show
   *   level: 'warning',  // one of 'success', 'info', 'warning', 'error'
   *   timeout: 10,       // {Number} [timeout] - in seconds. Use 0 to show indefinitely
   *   title: ''          // {String} [title] - will appear in bold and in front of the message
   * }
   */
  toast(opts) {
    const title = opts.title ? `<strong>${opts.title}</strong> ` : '';
    opts = Object.assign({
      message: title + opts.message,
      level: 'warning',
      timeout: 10
    }, opts);

    toastr.options.timeOut = opts.timeout * 1000;
    toastr[opts.level](opts.message);
  }

  /**
   * Show success message to user via this.toast
   * @param {String} message
   * @param {Number} [timeout] - in seconds
   */
  toastSuccess(message, timeout = 10) {
    this.toast({ message, level: 'success', timeout });
  }

  /**
   * Show info message to user via this.toast
   * @param {String} message
   * @param {Number} [timeout] - in seconds
   */
  toastInfo(message, timeout = 10) {
    this.toast({ message, level: 'info', timeout });
  }

  /**
   * Show warning to user via this.toast
   * @param {String} message
   * @param {Number} [timeout] - in seconds
   */
  toastWarn(message, timeout = 10) {
    this.toast({ message, level: 'warning', timeout });
  }

  /**
   * Show an error to user via this.toast
   * @param {String} message
   * @param {Number} [timeout] - in seconds
   */
  toastError(message, timeout = 10) {
    this.toast({ message, level: 'error', timeout });
  }

  /**
   * Add site notice for invalid parameter
   * @param {String} param - name of parameter
   */
  addInvalidParamNotice(param) {
    const docLink = `<a href='/${this.app}/url_structure'>${$.i18n('documentation').toLowerCase()}</a>`;
    this.toastError(`
      <strong>${$.i18n('invalid-params')}</strong>
      ${$.i18n('param-error-3', param, docLink)}
    `);
  }

  /**
   * Validate the date range of given params
   *   and throw errors as necessary and/or set defaults
   * @param {Object} params - as returned by this.parseQueryString()
   * @returns {Boolean} true if there were no errors, false otherwise
   */
  validateDateRange(params) {
    if (params.range) {
      if (!this.setSpecialRange(params.range)) {
        this.addInvalidParamNotice('range');
        this.setSpecialRange(this.config.defaults.dateRange);
      }
    } else if (params.start) {
      const dateRegex = /\d{4}-\d{2}-\d{2}$/;

      // first set defaults
      let startDate, endDate;

      // then check format of start and end date
      if (params.start && dateRegex.test(params.start)) {
        startDate = moment(params.start);
      } else {
        this.addInvalidParamNotice('start');
        return false;
      }
      if (params.end && dateRegex.test(params.end)) {
        endDate = moment(params.end);
      } else {
        this.addInvalidParamNotice('end');
        return false;
      }

      // check if they are outside the valid range or if in the wrong order
      if (startDate < this.config.minDate || endDate < this.config.minDate) {
        this.toastError(`
          <strong>${$.i18n('invalid-params')}</strong>
          ${$.i18n('param-error-1', moment(this.config.minDate).format(this.dateFormat))}
        `);
        return false;
      } else if (startDate > endDate) {
        this.toastError(`
          <strong>${$.i18n('param-error-2')}</strong>
          ${$.i18n('invalid-params')}
        `);
        return false;
      }

      /** directly assign startDate before calling setEndDate so events will be fired once */
      this.daterangepicker.startDate = startDate;
      this.daterangepicker.setEndDate(endDate);
    } else {
      this.setSpecialRange(this.config.defaults.dateRange);
    }

    return true;
  }

  /**
   * Clear inline messages used to show non-critical errors
   */
  clearMessages() {
    $('.message-container').html('');
  }

  /**
   * Get date format to use based on settings
   * @returns {string} date format to passed to parser
   */
  get dateFormat() {
    if (this.localizeDateFormat === 'true') {
      return this.getLocaleDateString();
    } else {
      return this.config.defaults.dateFormat;
    }
  }

  /**
   * Get the daterangepicker instance. Plain and simple.
   * @return {Object} daterange picker
   */
  get daterangepicker() {
    return $(this.config.dateRangeSelector).data('daterangepicker');
  }

  /**
   * Get the database name of the given projet
   * @param  {String} project - with or without .org
   * @return {String} database name
   */
  dbName(project) {
    return Object.keys(siteMap).find(key => siteMap[key] === `${project.replace(/\.org$/,'')}.org`);
  }

  /**
   * Force download of given data, or open in a new tab if HTML5 <a> download attribute is not supported
   * @param {String} data - Raw data prepended with data type, e.g. "data:text/csv;charset=utf-8,my data..."
   * @param {String} extension - the file extension to use
   */
  downloadData(data, extension) {
    const encodedUri = encodeURI(data);

    // create HTML5 download element and force click so we can specify a filename
    const link = document.createElement('a');
    if (typeof link.download === 'string') {
      document.body.appendChild(link); // Firefox requires the link to be in the body

      const filename = `${this.getExportFilename()}.${extension}`;
      link.download = filename;
      link.href = encodedUri;
      link.click();

      document.body.removeChild(link); // remove the link when done
    } else {
      window.open(encodedUri); // open in new tab if download isn't supported (*cough* Safari)
    }
  }

  /**
   * Fill in values within settings modal with what's in the session object
   */
  fillInSettings() {
    $.each($('#settings-modal input'), (index, el) => {
      if (el.type === 'checkbox') {
        el.checked = this[el.name] === 'true';
      } else {
        el.checked = this[el.name] === el.value;
      }
    });
  }

  /**
   * Add focus to Select2 input field
   */
  focusSelect2() {
    $('.select2-selection').trigger('click');
    $('.select2-search__field').focus();
  }

  /**
   * Format number based on current settings, e.g. localize with comma delimeters
   * @param {number|string} num - number to format
   * @returns {string} formatted number
   */
  formatNumber(num) {
    const numericalFormatting = this.getFromLocalStorage('pageviews-settings-numericalFormatting') || this.config.defaults.numericalFormatting;
    if (numericalFormatting === 'true') {
      return this.n(num);
    } else {
      return num;
    }
  }

  /**
   * show every other number in the y-axis, called from PvConfig
   * @param  {Number} num - numerical value
   * @return {String|null} formatted number or null if an even number
   */
  formatYAxisNumber(num) {
    if (num % 1 === 0) {
      return this.formatNumber(num);
    } else {
      return null;
    }
  }

  /**
   * Gets the date headings as strings - i18n compliant
   * @param {boolean} localized - whether the dates should be localized per browser language
   * @returns {Array} the date headings as strings
   */
  getDateHeadings(localized = true) {
    const dateHeadings = [],
      endDate = moment(this.daterangepicker.endDate).add(1, 'day');

    for (let date = moment(this.daterangepicker.startDate); date.isBefore(endDate); date.add(1, 'day')) {
      if (localized) {
        dateHeadings.push(date.format(this.dateFormat));
      } else {
        dateHeadings.push(date.format('YYYY-MM-DD'));
      }
    }
    return dateHeadings;
  }

  /**
   * Get the explanded wiki URL given the page name
   * This should be used instead of getPageURL when you want to chain query string parameters
   *
   * @param {string} page name
   * @returns {string} URL for the page
   */
  getExpandedPageURL(page) {
    return `//${this.project}.org/w/index.php?title=${encodeURIComponent(page.score()).replace(/'/, escape)}`;
  }

  /**
   * Get full link to page history for given page and project
   * @param  {string} page - page to link to
   * @param  {string} content - what to put as the link text
   * @return {string} HTML markup
   */
  getHistoryLink(page, content) {
    return `<a href="${this.getExpandedPageURL(page)}&action=history" target="_blank">
        ${content}
      </a>`;
  }

  /**
   * Get informative filename without extension to be used for export options
   * @return {string} filename without an extension
   */
  getExportFilename() {
    const startDate = this.daterangepicker.startDate.startOf('day').format('YYYYMMDD'),
      endDate = this.daterangepicker.endDate.startOf('day').format('YYYYMMDD');
    return `${this.app}-${startDate}-${endDate}`;
  }

  /**
   * Get a full link for the given page and project
   * @param  {string} page - page to link to
   * @param  {string} [project] - project link, defaults to `this.project`
   * @return {string} HTML markup
   */
  getPageLink(page, project) {
    return `<a target="_blank" href="${this.getPageURL(page, project)}">${page.descore().escape()}</a>`;
  }

  /**
   * Get the wiki URL given the page name
   * @param {string} page - page name
   * @param {string} [project] - project, or this.project (for chart-based apps)
   * @returns {string} URL for the page
   */
  getPageURL(page, project = this.project) {
    return `//${project.replace(/\.org$/, '').escape()}.org/wiki/${page.score().replace(/'/, escape)}`;
  }

  /**
   * Get the wiki URL given the page name
   *
   * @param {string} site - site name (e.g. en.wikipedia.org)
   * @returns {string} URL for the site
   */
  getSiteLink(site) {
    return `<a target="_blank" href="//${site.replace(/\.org$/, '')}.org">${site}</a>`;
  }

  /**
   * Get the project name (without the .org)
   *
   * @returns {boolean} lang.projectname
   */
  get project() {
    const project = $(this.config.projectInput).val();
    /** Get the first 2 characters from the project code to get the language */
    return project ? project.toLowerCase().replace(/.org$/, '') : null;
  }

  /**
   * get date format for the browser's locale
   * @return {String} format to be passed to moment.format()
   */
  getLocaleDateString() {
    if (!navigator.language) {
      return this.config.defaults.dateFormat;
    }

    const formats = {
      'ar-sa': 'DD/MM/YY',
      'bg-bg': 'DD.M.YYYY',
      'ca-es': 'DD/MM/YYYY',
      'zh-tw': 'YYYY/M/D',
      'cs-cz': 'D.M.YYYY',
      'da-dk': 'DD-MM-YYYY',
      'de-de': 'DD.MM.YYYY',
      'el-gr': 'D/M/YYYY',
      'en-us': 'M/D/YYYY',
      'fi-fi': 'D.M.YYYY',
      'fr-fr': 'DD/MM/YYYY',
      'he-il': 'DD/MM/YYYY',
      'hu-hu': 'YYYY. MM. DD.',
      'is-is': 'D.M.YYYY',
      'it-it': 'DD/MM/YYYY',
      'ja-jp': 'YYYY/MM/DD',
      'ko-kr': 'YYYY-MM-DD',
      'nl-nl': 'D-M-YYYY',
      'nb-no': 'DD.MM.YYYY',
      'pl-pl': 'YYYY-MM-DD',
      'pt-br': 'D/M/YYYY',
      'ro-ro': 'DD.MM.YYYY',
      'ru-ru': 'DD.MM.YYYY',
      'hr-hr': 'D.M.YYYY',
      'sk-sk': 'D. M. YYYY',
      'sq-al': 'YYYY-MM-DD',
      'sv-se': 'YYYY-MM-DD',
      'th-th': 'D/M/YYYY',
      'tr-tr': 'DD.MM.YYYY',
      'ur-pk': 'DD/MM/YYYY',
      'id-id': 'DD/MM/YYYY',
      'uk-ua': 'DD.MM.YYYY',
      'be-by': 'DD.MM.YYYY',
      'sl-si': 'D.M.YYYY',
      'et-ee': 'D.MM.YYYY',
      'lv-lv': 'YYYY.MM.DD.',
      'lt-lt': 'YYYY.MM.DD',
      'fa-ir': 'MM/DD/YYYY',
      'vi-vn': 'DD/MM/YYYY',
      'hy-am': 'DD.MM.YYYY',
      'az-latn-az': 'DD.MM.YYYY',
      'eu-es': 'YYYY/MM/DD',
      'mk-mk': 'DD.MM.YYYY',
      'af-za': 'YYYY/MM/DD',
      'ka-ge': 'DD.MM.YYYY',
      'fo-fo': 'DD-MM-YYYY',
      'hi-in': 'DD-MM-YYYY',
      'ms-my': 'DD/MM/YYYY',
      'kk-kz': 'DD.MM.YYYY',
      'ky-kg': 'DD.MM.YY',
      'sw-ke': 'M/d/YYYY',
      'uz-latn-uz': 'DD/MM YYYY',
      'tt-ru': 'DD.MM.YYYY',
      'pa-in': 'DD-MM-YY',
      'gu-in': 'DD-MM-YY',
      'ta-in': 'DD-MM-YYYY',
      'te-in': 'DD-MM-YY',
      'kn-in': 'DD-MM-YY',
      'mr-in': 'DD-MM-YYYY',
      'sa-in': 'DD-MM-YYYY',
      'mn-mn': 'YY.MM.DD',
      'gl-es': 'DD/MM/YY',
      'kok-in': 'DD-MM-YYYY',
      'syr-sy': 'DD/MM/YYYY',
      'dv-mv': 'DD/MM/YY',
      'ar-iq': 'DD/MM/YYYY',
      'zh-cn': 'YYYY/M/D',
      'de-ch': 'DD.MM.YYYY',
      'en-gb': 'DD/MM/YYYY',
      'es-mx': 'DD/MM/YYYY',
      'fr-be': 'D/MM/YYYY',
      'it-ch': 'DD.MM.YYYY',
      'nl-be': 'D/MM/YYYY',
      'nn-no': 'DD.MM.YYYY',
      'pt-pt': 'DD-MM-YYYY',
      'sr-latn-cs': 'D.M.YYYY',
      'sv-fi': 'D.M.YYYY',
      'az-cyrl-az': 'DD.MM.YYYY',
      'ms-bn': 'DD/MM/YYYY',
      'uz-cyrl-uz': 'DD.MM.YYYY',
      'ar-eg': 'DD/MM/YYYY',
      'zh-hk': 'D/M/YYYY',
      'de-at': 'DD.MM.YYYY',
      'en-au': 'D/MM/YYYY',
      'es-es': 'DD/MM/YYYY',
      'fr-ca': 'YYYY-MM-DD',
      'sr-cyrl-cs': 'D.M.YYYY',
      'ar-ly': 'DD/MM/YYYY',
      'zh-sg': 'D/M/YYYY',
      'de-lu': 'DD.MM.YYYY',
      'en-ca': 'DD/MM/YYYY',
      'es-gt': 'DD/MM/YYYY',
      'fr-ch': 'DD.MM.YYYY',
      'ar-dz': 'DD-MM-YYYY',
      'zh-mo': 'D/M/YYYY',
      'de-li': 'DD.MM.YYYY',
      'en-nz': 'D/MM/YYYY',
      'es-cr': 'DD/MM/YYYY',
      'fr-lu': 'DD/MM/YYYY',
      'ar-ma': 'DD-MM-YYYY',
      'en-ie': 'DD/MM/YYYY',
      'es-pa': 'MM/DD/YYYY',
      'fr-mc': 'DD/MM/YYYY',
      'ar-tn': 'DD-MM-YYYY',
      'en-za': 'YYYY/MM/DD',
      'es-do': 'DD/MM/YYYY',
      'ar-om': 'DD/MM/YYYY',
      'en-jm': 'DD/MM/YYYY',
      'es-ve': 'DD/MM/YYYY',
      'ar-ye': 'DD/MM/YYYY',
      'en-029': 'MM/DD/YYYY',
      'es-co': 'DD/MM/YYYY',
      'ar-sy': 'DD/MM/YYYY',
      'en-bz': 'DD/MM/YYYY',
      'es-pe': 'DD/MM/YYYY',
      'ar-jo': 'DD/MM/YYYY',
      'en-tt': 'DD/MM/YYYY',
      'es-ar': 'DD/MM/YYYY',
      'ar-lb': 'DD/MM/YYYY',
      'en-zw': 'M/D/YYYY',
      'es-ec': 'DD/MM/YYYY',
      'ar-kw': 'DD/MM/YYYY',
      'en-ph': 'M/D/YYYY',
      'es-cl': 'DD-MM-YYYY',
      'ar-ae': 'DD/MM/YYYY',
      'es-uy': 'DD/MM/YYYY',
      'ar-bh': 'DD/MM/YYYY',
      'es-py': 'DD/MM/YYYY',
      'ar-qa': 'DD/MM/YYYY',
      'es-bo': 'DD/MM/YYYY',
      'es-sv': 'DD/MM/YYYY',
      'es-hn': 'DD/MM/YYYY',
      'es-ni': 'DD/MM/YYYY',
      'es-pr': 'DD/MM/YYYY',
      'am-et': 'D/M/YYYY',
      'tzm-latn-dz': 'DD-MM-YYYY',
      'iu-latn-ca': 'D/MM/YYYY',
      'sma-no': 'DD.MM.YYYY',
      'mn-mong-cn': 'YYYY/M/D',
      'gd-gb': 'DD/MM/YYYY',
      'en-my': 'D/M/YYYY',
      'prs-af': 'DD/MM/YY',
      'bn-bd': 'DD-MM-YY',
      'wo-sn': 'DD/MM/YYYY',
      'rw-rw': 'M/D/YYYY',
      'qut-gt': 'DD/MM/YYYY',
      'sah-ru': 'MM.DD.YYYY',
      'gsw-fr': 'DD/MM/YYYY',
      'co-fr': 'DD/MM/YYYY',
      'oc-fr': 'DD/MM/YYYY',
      'mi-nz': 'DD/MM/YYYY',
      'ga-ie': 'DD/MM/YYYY',
      'se-se': 'YYYY-MM-DD',
      'br-fr': 'DD/MM/YYYY',
      'smn-fi': 'D.M.YYYY',
      'moh-ca': 'M/D/YYYY',
      'arn-cl': 'DD-MM-YYYY',
      'ii-cn': 'YYYY/M/D',
      'dsb-de': 'D. M. YYYY',
      'ig-ng': 'D/M/YYYY',
      'kl-gl': 'DD-MM-YYYY',
      'lb-lu': 'DD/MM/YYYY',
      'ba-ru': 'DD.MM.YY',
      'nso-za': 'YYYY/MM/DD',
      'quz-bo': 'DD/MM/YYYY',
      'yo-ng': 'D/M/YYYY',
      'ha-latn-ng': 'D/M/YYYY',
      'fil-ph': 'M/D/YYYY',
      'ps-af': 'DD/MM/YY',
      'fy-nl': 'D-M-YYYY',
      'ne-np': 'M/D/YYYY',
      'se-no': 'DD.MM.YYYY',
      'iu-cans-ca': 'D/M/YYYY',
      'sr-latn-rs': 'D.M.YYYY',
      'si-lk': 'YYYY-MM-DD',
      'sr-cyrl-rs': 'D.M.YYYY',
      'lo-la': 'DD/MM/YYYY',
      'km-kh': 'YYYY-MM-DD',
      'cy-gb': 'DD/MM/YYYY',
      'bo-cn': 'YYYY/M/D',
      'sms-fi': 'D.M.YYYY',
      'as-in': 'DD-MM-YYYY',
      'ml-in': 'DD-MM-YY',
      'en-in': 'DD-MM-YYYY',
      'or-in': 'DD-MM-YY',
      'bn-in': 'DD-MM-YY',
      'tk-tm': 'DD.MM.YY',
      'bs-latn-ba': 'D.M.YYYY',
      'mt-mt': 'DD/MM/YYYY',
      'sr-cyrl-me': 'D.M.YYYY',
      'se-fi': 'D.M.YYYY',
      'zu-za': 'YYYY/MM/DD',
      'xh-za': 'YYYY/MM/DD',
      'tn-za': 'YYYY/MM/DD',
      'hsb-de': 'D. M. YYYY',
      'bs-cyrl-ba': 'D.M.YYYY',
      'tg-cyrl-tj': 'DD.MM.yy',
      'sr-latn-ba': 'D.M.YYYY',
      'smj-no': 'DD.MM.YYYY',
      'rm-ch': 'DD/MM/YYYY',
      'smj-se': 'YYYY-MM-DD',
      'quz-ec': 'DD/MM/YYYY',
      'quz-pe': 'DD/MM/YYYY',
      'hr-ba': 'D.M.YYYY.',
      'sr-latn-me': 'D.M.YYYY',
      'sma-se': 'YYYY-MM-DD',
      'en-sg': 'D/M/YYYY',
      'ug-cn': 'YYYY-M-D',
      'sr-cyrl-ba': 'D.M.YYYY',
      'es-us': 'M/D/YYYY'
    };

    const key = navigator.language.toLowerCase();
    return formats[key] || this.config.defaults.dateFormat;
  }

  /**
   * Get a value from localStorage, using a temporary storage if localStorage is not supported
   * @param {string} key - key for the value to retrieve
   * @returns {Mixed} stored value
   */
  getFromLocalStorage(key) {
    // See if localStorage is supported and enabled
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return storage[key];
    }
  }

  /**
   * Get URL to file a report on Meta, preloaded with permalink
   * @param {String} [phabPaste] URL to auto-generated error report on Phabricator
   * @param {String} [titleOverride] goes in the title input field of the wiki editing interface
   * @return {String} URL
   */
  getBugReportURL(phabPaste, titleOverride) {
    const reportURL = 'https://meta.wikimedia.org/w/index.php?title=Talk:Pageviews_Analysis&action=edit' +
      `&section=new&preloadtitle=${titleOverride || this.app.upcase() + ' bug report'}`;

    if (phabPaste) {
      return `${reportURL}&preload=Talk:Pageviews_Analysis/Preload&preloadparams[]=${phabPaste}`;
    } else {
      return reportURL;
    }
  }

  /**
   * Get general information about a project, such as namespaces, title of the main page, etc.
   * Data returned by the api is also stored in this.siteInfo
   * @param {String} project - project such as en.wikipedia (with or without .org)
   * @returns {Deferred} promise resolving with siteinfo,
   *   along with any other cached siteinfo for other projects
   */
  fetchSiteInfo(project) {
    project = project.replace(/\.org$/, '');
    const dfd = $.Deferred(),
      cacheKey = `pageviews-siteinfo-${project}`;

    if (this.siteInfo[project]) return dfd.resolve(this.siteInfo);

    // use cached site info if present
    if (simpleStorage.hasKey(cacheKey)) {
      this.siteInfo[project] = simpleStorage.get(cacheKey);
      dfd.resolve(this.siteInfo);
    } else {
      // otherwise fetch siteinfo and store in cache
      $.ajax({
        url: `https://${project}.org/w/api.php`,
        data: {
          action: 'query',
          meta: 'siteinfo',
          siprop: 'general|namespaces',
          format: 'json'
        },
        dataType: 'jsonp'
      }).done(data => {
        this.siteInfo[project] = data.query;

        // cache for one week (TTL is in milliseconds)
        simpleStorage.set(cacheKey, this.siteInfo[project], {TTL: 1000 * 60 * 60 * 24 * 7});

        dfd.resolve(this.siteInfo);
      }).fail(data => {
        dfd.reject(data);
      });
    }

    return dfd;
  }

  /**
   * Helper to get siteinfo from this.siteInfo for given project, with or without .org
   * @param {String} project - project name, with or without .org
   * @returns {Object|undefined} site information if present
   */
  getSiteInfo(project) {
    return this.siteInfo[project.replace(/\.org$/, '')];
  }

  /**
   * Get month that would be shown in Topviews based on start date or end date, as specified
   * @param {Boolean} [useStartDate] - if false, the end date will be used
   * @return {moment} date within the month that will be used
   */
  getTopviewsMonth(useStartDate = true) {
    const dateKey = useStartDate ? 'startDate' : 'endDate';
    let targetMonth = moment(this.daterangepicker[dateKey]);

    // Use the month of the target date as the date value for Topviews.
    // If we are on the cusp of a new month, use the previous month as last month's data may not be available yet.
    if (targetMonth.month() === moment().month() || targetMonth.month() === moment().subtract(2, 'days').month()) {
      targetMonth.subtract(1, 'month');
    }

    return targetMonth;
  }

  /**
   * Link to /topviews for given project and chosen options
   * @param {String} project - project to link to
   * @param {moment} [month] - date that lies within the month we want to link to
   * @returns {String} URL
   */
  getTopviewsMonthURL(project, month = this.getTopviewsMonth()) {
    let params = {
      project,
      platform: 'all-access',
      date: month.startOf('month').format('YYYY-MM')
    };

    return `/topviews?${$.param(params)}`;
  }

  /**
   * Get user agent, if supported
   * @returns {string} user-agent
   */
  getUserAgent() {
    return navigator.userAgent ? navigator.userAgent : 'Unknown';
  }

  /**
   * Set a value to localStorage, using a temporary storage if localStorage is not supported
   * @param {string} key - key for the value to set
   * @param {Mixed} value - value to store
   * @returns {Mixed} stored value
   */
  setLocalStorage(key, value) {
    // See if localStorage is supported and enabled
    try {
      return localStorage.setItem(key, value);
    } catch (err) {
      return storage[key] = value;
    }
  }

  /**
   * Generate a unique hash code from given string
   * @param  {String} str - to be hashed
   * @return {String} the hash
   */
  hashCode(str) {
    return str.split('').reduce((prevHash, currVal) =>
      ((prevHash << 5) - prevHash) + currVal.charCodeAt(0), 0);
  }

  /**
   * Is this one of the chart-view apps (that does not have a list view)?
   * @return {Boolean} true or false
   */
  isChartApp() {
    return !this.isListApp();
  }

  /**
   * Is this one of the list-view apps?
   * @return {Boolean} true or false
   */
  isListApp() {
    return ['langviews', 'massviews', 'redirectviews'].includes(this.app);
  }

  /**
   * Test if the current project is a multilingual project
   * @returns {Boolean} is multilingual or not
   */
  isMultilangProject() {
    return new RegExp(`.*?\\.(${Pv.multilangProjects.join('|')})`).test(this.project);
  }

  /**
   * List of valid multilingual projects
   * @return {Array} base projects, without the language
   */
  static get multilangProjects() {
    return [
      'wikipedia',
      'wikibooks',
      'wikinews',
      'wikiquote',
      'wikisource',
      'wikiversity',
      'wikivoyage'
    ];
  }

  /**
   * Make mass requests to MediaWiki API
   * The API normally limits to 500 pages, but gives you a 'continue' value
   *   to finish iterating through the resource.
   * @param {Object} params - parameters to pass to the API
   * @param {String} project - project to query, e.g. en.wikipedia (.org is optional)
   * @param {String} [continueKey] - the key to look in the continue hash, if present (e.g. cmcontinue for API:Categorymembers)
   * @param {String|Function} [dataKey] - the key for the main chunk of data, in the query hash (e.g. categorymembers for API:Categorymembers)
   *   If this is a function it is given the response data, and expected to return the data we want to concatentate.
   * @param {Number} [limit] - max number of pages to fetch
   * @return {Deferred} promise resolving with data
   */
  massApi(params, project, continueKey = 'continue', dataKey, limit = this.config.apiLimit) {
    if (!/\.org$/.test(project)) project += '.org';

    const dfd = $.Deferred();
    let resolveData = {
      pages: []
    };

    const makeRequest = continueValue => {
      let requestData = Object.assign({
        action: 'query',
        format: 'json',
        formatversion: '2'
      }, params);

      if (continueValue) requestData[continueKey] = continueValue;

      const promise = $.ajax({
        url: `https://${project}/w/api.php`,
        jsonp: 'callback',
        dataType: 'jsonp',
        data: requestData
      });

      promise.done(data => {
        // some failures come back as 200s, so we still resolve and let the local app handle it
        if (data.error) return dfd.resolve(data);

        let isFinished;

        // allow custom function to parse the data we want, if provided
        if (typeof dataKey === 'function') {
          resolveData.pages = resolveData.pages.concat(dataKey(data.query));
          isFinished = resolveData.pages.length >= limit;
        } else {
          // append new data to data from last request. We might want both 'pages' and dataKey
          if (data.query.pages) {
            resolveData.pages = resolveData.pages.concat(data.query.pages);
          }
          if (data.query[dataKey]) {
            resolveData[dataKey] = (resolveData[dataKey] || []).concat(data.query[dataKey]);
          }
          // If pages is not the collection we want, it will be either an empty array or one entry with basic page info
          //   depending on what API we're hitting. So resolveData[dataKey] will hit the limit
          isFinished = resolveData.pages.length >= limit || resolveData[dataKey].length >= limit;
        }

        // make recursive call if needed, waiting 100ms
        if (!isFinished && data.continue && data.continue[continueKey]) {
          setTimeout(() => {
            makeRequest(data.continue[continueKey]);
          }, 100);
        } else {
          // indicate there were more entries than the limit
          if (data.continue) resolveData.continue = true;
          dfd.resolve(resolveData);
        }
      }).fail(data => {
        dfd.reject(data);
      });
    };

    makeRequest();

    return dfd;
  }

  /**
   * Localize Number object with delimiters
   *
   * @param {Number} value - the Number, e.g. 1234567
   * @returns {string} - with locale delimiters, e.g. 1,234,567 (en-US)
   */
  n(value) {
    return (new Number(value)).toLocaleString();
  }

  /**
   * Get basic info on given pages, including the normalized page names.
   * E.g. masculine versus feminine namespaces on dewiki
   * @param {array} pages - array of page names
   * @returns {Deferred} promise with data fetched from API
   */
  getPageInfo(pages) {
    let dfd = $.Deferred();

    return $.ajax({
      url: `https://${this.project}.org/w/api.php?action=query&prop=info&inprop=protection|watchers` +
        `&formatversion=2&format=json&titles=${pages.join('|')}`,
      dataType: 'jsonp'
    }).then(data => {
      // restore original order of pages, taking into account out any page names that were normalized
      let pageData = {};
      if (data.query.normalized) {
        data.query.normalized.forEach(n => {
          pages[pages.indexOf(n.from)] = n.to;
        });
      }
      pages.forEach(page => {
        pageData[page] = data.query.pages.find(p => p.title === page);
      });
      return dfd.resolve(pageData);
    });
  }

  /**
   * Compute how many days are in the selected date range
   * @returns {integer} number of days
   */
  numDaysInRange() {
    return this.daterangepicker.endDate.diff(this.daterangepicker.startDate, 'days') + 1;
  }

  /**
   * Generate key/value pairs of URL query string
   * @param {string} [multiParam] - parameter whose values needs to split by pipe character
   * @returns {Object} key/value pairs representation of query string
   */
  parseQueryString(multiParam) {
    const uri = decodeURI(location.search.slice(1)),
      chunks = uri.split('&');
    let params = {};

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i].split('=');

      if (multiParam && chunk[0] === multiParam) {
        params[multiParam] = chunk[1].split('|').filter(param => !!param).unique();
      } else {
        params[chunk[0]] = chunk[1];
      }
    }

    return params;
  }

  /**
   * Simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :)
   * @param {string} app - one of: pv, lv, tv, sv, ms
   */
  patchUsage(app) {
    if (location.pathname.includes('-test')) {
      $.ajax({
        url: `//${metaRoot}/usage/${this.app}-test/${this.project || i18nLang}`,
        method: 'POST'
      });
    } else if (metaRoot) {
      $.ajax({
        url: `//${metaRoot}/usage/${this.app}/${this.project || i18nLang}`,
        method: 'POST'
      });
    }
  }

  /**
   * Set timestamp of when process started
   * @return {moment} start time
   */
  processStarted() {
    return this.processStart = moment();
  }

  /**
   * Get elapsed time from this.processStart, and show it
   * @return {moment} Elapsed time from `this.processStart` in milliseconds
   */
  processEnded() {
    const endTime = moment(),
      elapsedTime = endTime.diff(this.processStart, 'milliseconds');

    /** FIXME: report this bug: some languages don't parse PLURAL correctly ('he' for example) with the English fallback message */
    try {
      $('.elapsed-time').attr('datetime', endTime.format())
        .text($.i18n('elapsed-time', elapsedTime / 1000));
    } catch (e) {
      // intentionall nothing, everything will still show
    }

    return elapsedTime;
  }

  /**
   * Adapted from http://jsfiddle.net/dandv/47cbj/ courtesy of dandv
   *
   * Same as _.debounce but queues and executes all function calls
   * @param  {Function} fn - function to debounce
   * @param  {delay} delay - delay duration of milliseconds
   * @param  {object} context - scope the function should refer to
   * @return {Function} rate-limited function to call instead of your function
   */
  rateLimit(fn, delay, context) {
    let queue = [], timer;

    const processQueue = () => {
      const item = queue.shift();
      if (item) {
        fn.apply(item.context, item.arguments);
      }
      if (queue.length === 0) {
        clearInterval(timer), timer = null;
      }
    };

    return function limited() {
      queue.push({
        context: context || this,
        arguments: [].slice.call(arguments)
      });

      if (!timer) {
        processQueue(); // start immediately on the first invocation
        timer = setInterval(processQueue, delay);
      }
    };
  }

  /**
   * Removes all Select2 related stuff then adds it back
   * Also might result in the chart being re-rendered
   */
  resetSelect2() {
    const select2Input = $(this.config.select2Input);
    select2Input.off('change');
    select2Input.select2('val', null);
    select2Input.select2('data', null);
    select2Input.select2('destroy');
    this.setupSelect2();
  }

  /**
   * Change alpha level of an rgba value
   *
   * @param {string} value - rgba value
   * @param {float|string} alpha - transparency as float value
   * @returns {string} rgba value
   */
  rgba(value, alpha) {
    return value.replace(/,\s*\d\)/, `, ${alpha})`);
  }

  /**
   * Save a particular setting to session and localStorage
   *
   * @param {string} key - settings key
   * @param {string|boolean} value - value to save
   */
  saveSetting(key, value) {
    this[key] = value;
    this.setLocalStorage(`pageviews-settings-${key}`, value);
  }

  /**
   * Save the selected settings within the settings modal
   * Prefer this implementation over a large library like serializeObject or serializeJSON
   */
  saveSettings() {
    /** track if we're changing to no_autocomplete mode */
    const wasAutocomplete = this.autocomplete === 'no_autocomplete';

    $.each($('#settings-modal input'), (index, el) => {
      if (el.type === 'checkbox') {
        this.saveSetting(el.name, el.checked ? 'true' : 'false');
      } else if (el.checked) {
        this.saveSetting(el.name, el.value);
      }
    });

    if (this.app !== 'topviews') {
      this.daterangepicker.locale.format = this.dateFormat;
      this.daterangepicker.updateElement();

      this.setupSelect2Colors();

      /**
       * If we changed to/from no_autocomplete we have to reset Select2 entirely
       *   as setSelect2Defaults is super buggy due to Select2 constraints
       * So let's only reset if we have to
       */
      if ((this.autocomplete === 'no_autocomplete') !== wasAutocomplete) {
        this.resetSelect2();
      }

      if (this.beginAtZero === 'true') {
        $('.begin-at-zero-option').prop('checked', true);
      }
    }

    this.processInput(true);
  }

  /**
   * Directly set items in Select2
   * Currently is not able to remove underscores from page names
   *
   * @param {array} items - page titles
   * @returns {array} - untouched array of items
   */
  setSelect2Defaults(items) {
    items.forEach(item => {
      const escapedText = $('<div>').text(item).html();
      $(`<option>${escapedText}</option>`).appendTo(this.config.select2Input);
    });
    $(this.config.select2Input).select2('val', items);
    $(this.config.select2Input).trigger('select2:select');

    return items;
  }

  /**
   * Sets the daterange picker values and this.specialRange based on provided special range key
   * WARNING: not to be called on daterange picker GUI events (e.g. special range buttons)
   *
   * @param {string} type - one of special ranges defined in this.config.specialRanges,
   *   including dynamic latest range, such as `latest-15` for latest 15 days
   * @returns {object|null} updated this.specialRange object or null if type was invalid
   */
  setSpecialRange(type) {
    const rangeIndex = Object.keys(this.config.specialRanges).indexOf(type);
    let startDate, endDate, offset;

    if (type.includes('latest-')) {
      offset = parseInt(type.replace('latest-', ''), 10) || 20; // fallback of 20
      [startDate, endDate] = this.config.specialRanges.latest(offset);
    } else if (rangeIndex >= 0) {
      /** treat 'latest' as a function */
      [startDate, endDate] = type === 'latest' ? this.config.specialRanges.latest() : this.config.specialRanges[type];
      $('.daterangepicker .ranges li').eq(rangeIndex).trigger('click');
    } else {
      return;
    }

    this.specialRange = {
      range: type,
      value: `${startDate.format(this.dateFormat)} - ${endDate.format(this.dateFormat)}`
    };

    /** directly assign startDate then use setEndDate so that the events will be fired once */
    this.daterangepicker.startDate = startDate;
    this.daterangepicker.setEndDate(endDate);

    $('.latest-num').text(offset);

    return this.specialRange;
  }

  /**
   * Setup colors for Select2 entries so we can dynamically change them
   * This is a necessary evil, as we have to mark them as !important
   *   and since there are any number of entires, we need to use nth-child selectors
   * @returns {CSSStylesheet} our new stylesheet
   */
  setupSelect2Colors() {
    /** first delete old stylesheet, if present */
    if (this.colorsStyleEl) this.colorsStyleEl.remove();

    /** create new stylesheet */
    this.colorsStyleEl = document.createElement('style');
    this.colorsStyleEl.appendChild(document.createTextNode('')); // WebKit hack :(
    document.head.appendChild(this.colorsStyleEl);

    /** add color rules */
    this.config.colors.forEach((color, index) => {
      this.colorsStyleEl.sheet.insertRule(`.select2-selection__choice:nth-of-type(${index + 1}) { background: ${color} !important }`, 0);
    });

    return this.colorsStyleEl.sheet;
  }

  /**
   * Cross-application listeners
   * Each app has it's own setupListeners() that should call super.setupListeners()
   */
  setupListeners() {
    /** prevent browser's default behaviour for any link with href="#" */
    $("a[href='#']").on('click', e => e.preventDefault());

    /** download listeners */
    $('.download-csv').on('click', this.exportCSV.bind(this));
    $('.download-json').on('click', this.exportJSON.bind(this));

    /** project input listeners, saving and restoring old value if new one is invalid */
    $(this.config.projectInput).on('focusin', function() {
      this.dataset.value = this.value;
    });
    $(this.config.projectInput).on('change', e => this.validateProject(e));
  }

  /**
   * Set values of form based on localStorage or defaults, add listeners
   */
  setupSettingsModal() {
    /** fill in values, everything is either a checkbox or radio */
    this.fillInSettings();

    /** add listener */
    $('.save-settings-btn').on('click', this.saveSettings.bind(this));
    $('.cancel-settings-btn').on('click', this.fillInSettings.bind(this));
  }

  /**
   * sets up the daterange selector and adds listeners
   */
  setupDateRangeSelector() {
    const dateRangeSelector = $(this.config.dateRangeSelector);

    /**
     * Transform this.config.specialRanges to have i18n as keys
     * This is what is shown as the special ranges (Last month, etc.) in the datepicker menu
     * @type {Object}
     */
    let ranges = {};
    Object.keys(this.config.specialRanges).forEach(key => {
      if (key === 'latest') return; // this is a function, not meant to be in the list of special ranges
      ranges[$.i18n(key)] = this.config.specialRanges[key];
    });

    let datepickerOptions = {
      locale: {
        format: this.dateFormat,
        applyLabel: $.i18n('apply'),
        cancelLabel: $.i18n('cancel'),
        customRangeLabel: $.i18n('custom-range'),
        daysOfWeek: [
          $.i18n('su'),
          $.i18n('mo'),
          $.i18n('tu'),
          $.i18n('we'),
          $.i18n('th'),
          $.i18n('fr'),
          $.i18n('sa')
        ],
        monthNames: [
          $.i18n('january'),
          $.i18n('february'),
          $.i18n('march'),
          $.i18n('april'),
          $.i18n('may'),
          $.i18n('june'),
          $.i18n('july'),
          $.i18n('august'),
          $.i18n('september'),
          $.i18n('october'),
          $.i18n('november'),
          $.i18n('december')
        ]
      },
      startDate: moment().subtract(this.config.daysAgo, 'days'),
      minDate: this.config.minDate,
      maxDate: this.config.maxDate,
      ranges: ranges
    };

    if (this.config.dateLimit) datepickerOptions.dateLimit = { days: this.config.dateLimit };

    dateRangeSelector.daterangepicker(datepickerOptions);

    /** so people know why they can't query data older than July 2015 */
    $('.daterangepicker').append(
      $('<div>')
        .addClass('daterange-notice')
        .html($.i18n('date-notice', document.title,
          "<a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>",
          `${$.i18n('july')} 2015`
        ))
    );

    /**
     * The special date range options (buttons the right side of the daterange picker)
     *
     * WARNING: we're unable to add class names or data attrs to the range options,
     * so checking which was clicked is hardcoded based on the index of the LI,
     * as defined in this.config.specialRanges
     */
    $('.daterangepicker .ranges li').on('click', e => {
      const index = $('.daterangepicker .ranges li').index(e.target),
        container = this.daterangepicker.container,
        inputs = container.find('.daterangepicker_input input');
      this.specialRange = {
        range: Object.keys(this.config.specialRanges)[index],
        value: `${inputs[0].value} - ${inputs[1].value}`
      };
    });

    $(this.config.dateRangeSelector).on('apply.daterangepicker', (e, action) => {
      if (action.chosenLabel === $.i18n('custom-range')) {
        this.specialRange = null;

        /** force events to re-fire since apply.daterangepicker occurs before 'change' event */
        this.daterangepicker.updateElement();
      }
    });
  }

  /**
   * Loop through given errors and show them to the user, also creating a paste on phabricator
   * @param  {Array} errors - list of error messages (strings)
   */
  showFatalErrors(errors) {
    this.resetView();
    errors.forEach(error => {
      this.writeMessage(
        `<strong>${$.i18n('fatal-error')}</strong>: <code>${error}</code>`
      );
    });

    const throwToastError = bugUrl => this.toastError(`
      <strong>${$.i18n('fatal-error')}</strong>: ${$.i18n('error-please-report', this.getBugReportURL(bugUrl))}
    `, 0);

    if (this.debug) {
      throw errors[0];
    } else if (errors && errors[0] && errors[0].stack) {
      $.ajax({
        method: 'POST',
        url: '//tools.wmflabs.org/musikanimal/paste',
        data: {
          content: '' +
            `\ndate:      ${moment().utc().format()}` +
            `\ntool:      ${this.app}` +
            `\nlanguage:  ${i18nLang}` +
            `\nchart:     ${this.chartType}` +
            `\nurl:       ${document.location.href}` +
            `\nuserAgent: ${this.getUserAgent()}` +
            `\ntrace:     ${errors[0].stack}`
          ,
          title: `Pageviews Analysis error report: ${errors[0]}`
        }
      }).done(data => {
        if (data && data.result && data.result.objectName) {
          throwToastError(data.result.objectName);
        } else {
          throwToastError();
        }
      }).fail(() => {
        throwToastError();
      });
    }
  }

  /**
   * Splash in console, just for fun
   */
  splash() {
    const style = 'background: #eee; color: #555; padding: 4px; font-family:monospace';
    console.log('%c      ___            __ _                     _                             ', style);
    console.log('%c     | _ \\  __ _    / _` |   ___    __ __    (_)     ___   __ __ __  ___    ', style);
    console.log('%c     |  _/ / _` |   \\__, |  / -_)   \\ V /    | |    / -_)  \\ V  V / (_-<    ', style);
    console.log('%c    _|_|_  \\__,_|   |___/   \\___|   _\\_/_   _|_|_   \\___|   \\_/\\_/  /__/_   ', style);
    console.log('%c  _| """ |_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|_|"""""|  ', style);
    console.log('%c  "`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'  ', style);
    console.log('%c              ___                     _  _     _               _            ', style);
    console.log('%c      o O O  /   \\   _ _     __ _    | || |   | |     ___     (_)     ___   ', style);
    console.log('%c     o       | - |  | \' \\   / _` |    \\_, |   | |    (_-<     | |    (_-<   ', style);
    console.log('%c    TS__[O]  |_|_|  |_||_|  \\__,_|   _|__/   _|_|_   /__/_   _|_|_   /__/_  ', style);
    console.log('%c   {======|_|"""""|_|"""""|_|"""""|_| """"|_|"""""|_|"""""|_|"""""|_|"""""| ', style);
    console.log('%c  ./o--000\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\'"`-0-0-\' ', style);
    console.log('%c                                                                            ', style);
    console.log(`%c  Copyright © ${new Date().getFullYear()} MusikAnimal, Kaldari, Marcel Ruiz Forns                  `, style);
  }

  /**
   * Add the loading indicator class and set the safeguard timeout
   */
  startSpinny() {
    $('body').addClass('loading');
    document.activeElement.blur();
    clearTimeout(this.timeout);

    this.timeout = setTimeout(err => {
      this.resetView();
      this.toastError(`
        <strong>${$.i18n('fatal-error')}</strong>:
        ${$.i18n('error-timed-out')}
        ${$.i18n('error-please-report', this.getBugReportURL())}
      `);
    }, 30 * 1000);
  }

  /**
   * Remove loading indicator class and clear the safeguard timeout
   */
  stopSpinny() {
    $('body').removeClass('loading initial');
    clearTimeout(this.timeout);
  }

  /**
   * Replace spaces with underscores
   *
   * @param {array} pages - array of page names
   * @returns {array} page names with underscores
   */
  underscorePageNames(pages) {
    return pages.map(page => {
      return decodeURIComponent(page).score();
    });
  }

  /**
   * Update hrefs of inter-app links to load currently selected project
   */
  updateInterAppLinks() {
    $('.interapp-link').each((i, link) => {
      let url = link.href.split('?')[0];

      if (link.classList.contains('interapp-link--siteviews')) {
        link.href = `${url}?sites=${this.project.escape()}.org`;
      } else {
        link.href = `${url}?project=${this.project.escape()}.org`;
      }
    });
  }

  /**
   * Validate basic params against what is defined in the config,
   *   and if they are invalid set the default
   * @param {Object} params - params as fetched by this.parseQueryString()
   * @returns {Object} same params with some invalid parameters correted, as necessary
   */
  validateParams(params) {
    this.config.validateParams.forEach(paramKey => {
      if (paramKey === 'project' && params.project) {
        params.project = params.project.replace(/^www\./, '');
      }

      const defaultValue = this.config.defaults[paramKey],
        paramValue = params[paramKey];

      if (defaultValue && !this.config.validParams[paramKey].includes(paramValue)) {
        // only throw error if they tried to provide an invalid value
        if (!!paramValue) {
          this.addInvalidParamNotice(paramKey);
        }

        params[paramKey] = defaultValue;
      }
    });

    return params;
  }

  /**
   * Adds listeners to the project input for validations against the site map,
   *   reverting to the old value if the new one is invalid
   * @param {Boolean} [multilingual] - whether we should check if it is a multilingual project
   * @returns {Boolean} whether or not validations passed
   */
  validateProject(multilingual = false) {
    const projectInput = $(this.config.projectInput)[0];
    let project = projectInput.value.replace(/^www\./, ''),
      valid = false;

    if (multilingual && !this.isMultilangProject()) {
      this.toastWarn(
        $.i18n('invalid-lang-project', `<a href='//${project.escape()}'>${project.escape()}</a>`)
      );
      project = projectInput.dataset.value;
    } else if (siteDomains.includes(project)) {
      this.clearMessages();
      this.updateInterAppLinks();
      valid = true;
    } else {
      this.toastWarn(
        $.i18n('invalid-project', `<a href='//${project.escape()}'>${project.escape()}</a>`)
      );
      project = projectInput.dataset.value;
    }

    projectInput.value = project;

    return valid;
  }

  /**
   * Writes message just below the chart or list of data
   * @param {string} message - message to write
   * @param {boolean} [clear] - whether to clear any existing messages
   * @returns {jQuery} - jQuery object of message container
   */
  writeMessage(message, clear = false) {
    if (clear) this.clearMessages();
    return $('.message-container').append(
      `<div class='error-message'>${message}</div>`
    );
  }
}

module.exports = Pv;
