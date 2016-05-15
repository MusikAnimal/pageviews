/**
 * @file Shared code amongst all apps (Pageviews, Topviews, Langviews, Siteviews)
 * @author MusikAnimal, Kaldari
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

/** Pv class, contains code amongst all apps (Pageviews, Topviews, Langviews, Siteviews) */
class Pv {
  constructor() {
    this.storage = {}; // used as fallback when localStorage is not supported

    /** @type {null|Date} tracking of elapsed time */
    this.processStart = null;

    /** assign app instance to window for debugging on local environment */
    if (location.host === 'localhost') {
      window.app = this;
    } else {
      this.splash();
    }

    /** show notice if on staging environment */
    if (/-test/.test(location.pathname)) {
      const actualPathName = location.pathname.replace(/-test\/?/, '');
      this.addSiteNotice('warning',
        `This is a staging environment. For the actual ${document.title},
         see <a href='${actualPathName}'>${location.hostname}${actualPathName}</a>`
      );
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
  }

  addSiteNotice(level, message, title, autodismiss) {
    title = title ? `<strong>${title}</strong> ` : '';
    autodismiss = autodismiss ? ' autodismiss' : '';
    $('.site-notice').append(
      `<div class='alert alert-${level}${autodismiss}'>${title}${message}</div>`
    );
    $('.site-notice-wrapper').show();
  }

  clearMessages() {
    $('.message-container').html('');
  }

  clearSiteNotices() {
    $('.site-notice .autodismiss').remove();

    if (!$('.site-notice .alert').length) {
      $('.site-notice-wrapper').hide();
    }
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
   * Fill in values within settings modal with what's in the session object
   * @returns {null} nothing
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
   * Format number based on current settings, e.g. localize with comma delimeters
   * @param {number|string} num - number to format
   * @returns {string} formatted number
   */
  formatNumber(num) {
    if (this.numericalFormatting === 'true') {
      return this.n(num);
    } else {
      return num;
    }
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
   * Get a full link for the given page and project
   * @param  {string} page - page to link to
   * @param  {string} [project] - project link, defaults to `this.project`
   * @return {string} HTML markup
   */
  getPageLink(page, project) {
    return `<a target="_blank" href="//${this.getPageURL(page, project)}">${page.descore()}</a>`;
  }

  /**
   * Get the wiki URL given the page name
   *
   * @param {string} page name
   * @returns {string} URL for the page
   */
  getPageURL(page, project = this.project) {
    return `//${project.replace(/\.org$/, '')}.org/wiki/${encodeURIComponent(page.score()).replace(/'/, escape)}`;
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

  getLocaleDateString() {
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

    if (!navigator.language) {
      return this.config.defaults.dateFormat;
    }

    const key = navigator.language.toLowerCase();
    return formats[key] || this.config.defaults.dateFormat;
  }

  /**
   * Test if the current project is a multilingual project
   * @returns {Boolean} is multilingual or not
   */
  isMultilangProject() {
    return new RegExp(`.*?\\.(${Pv.multilangProjects.join('|')})`).test(this.project);
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
   * Check if Intl is supported
   *
   * @returns {boolean} whether the browser (presumably) supports date locale operations
   */
  localeSupported() {
    return typeof Intl === 'object';
  }

  /**
   * Map normalized pages from API into a string of page names
   * Used in normalizePageNames()
   *
   * @param {array} pages - array of page names
   * @param {array} normalizedPages - array of normalized mappings returned by the API
   * @returns {array} pages with the new normalized names, if given
   */
  mapNormalizedPageNames(pages, normalizedPages) {
    normalizedPages.forEach(normalPage => {
      /** do it this way to preserve ordering of pages */
      pages = pages.map(page => {
        if (normalPage.from === page) {
          return normalPage.to;
        } else {
          return page;
        }
      });
    });
    return pages;
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
   * Localize Number object with delimiters
   *
   * @param {Number} value - the Number, e.g. 1234567
   * @returns {string} - with locale delimiters, e.g. 1,234,567 (en-US)
   */
  n(value) {
    return (new Number(value)).toLocaleString();
  }

  /**
   * Make request to API in order to get normalized page names. E.g. masculine versus feminine namespaces on dewiki
   *
   * @param {array} pages - array of page names
   * @returns {Deferred} promise with data fetched from API
   */
  normalizePageNames(pages) {
    let dfd = $.Deferred();

    return $.ajax({
      url: `https://${this.project}.org/w/api.php?action=query&prop=info&format=json&titles=${pages.join('|')}`,
      dataType: 'jsonp'
    }).then(data => {
      if (data.query.normalized) {
        pages = this.mapNormalizedPageNames(pages, data.query.normalized);
      }
      return dfd.resolve(pages);
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
   * Simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :)
   * @param {string} app - one of: pv, lv, tv, sv, ms
   * @return {null} nothing
   */
  patchUsage(app) {
    if (location.host !== 'localhost') {
      $.ajax({
        url: `//tools.wmflabs.org/musikanimal/api/${app}_uses/${this.project || i18nLang}`,
        method: 'PATCH'
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

    $('.elapsed-time').attr('datetime', endTime.format())
      .text(`Elapsed time: ${elapsedTime / 1000} seconds`);

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
   * @returns {null} nothing
   */
  resetSelect2() {
    const select2Input = $(this.config.select2Input);
    select2Input.off('change');
    select2Input.select2('val', null);
    select2Input.select2('data', null);
    select2Input.select2('destroy');
    $('.data-links').hide();
    this.setupSelect2();
  }

  /**
   * Change alpha level of an rgba value
   *
   * @param {string} value - rgba value
   * @param {float|string} alpha - transparency as float value
   * @returns {string} rgba value
   */
  static rgba(value, alpha) {
    return value.replace(/,\s*\d\)/, `, ${alpha})`);
  }

  /**
   * Save a particular setting to session and localStorage
   *
   * @param {string} key - settings key
   * @param {string|boolean} value - value to save
   * @returns {null} nothing
   */
  saveSetting(key, value) {
    this[key] = value;
    this.setLocalStorage(`pageviews-settings-${key}`, value);
  }

  /**
   * Save the selected settings within the settings modal
   * Prefer this implementation over a large library like serializeObject or serializeJSON
   * @returns {null} nothing
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

    this.updateChart(true);
  }

  /**
   * Attempt to fine-tune the pointer detection spacing based on how cluttered the chart is
   * @returns {null} nothing
   */
  setChartPointDetectionRadius() {
    if (this.chartType !== 'Line') return;

    if (this.numDaysInRange() > 50) {
      Chart.defaults.Line.pointHitDetectionRadius = 3;
    } else if (this.numDaysInRange() > 30) {
      Chart.defaults.Line.pointHitDetectionRadius = 5;
    } else if (this.numDaysInRange() > 20) {
      Chart.defaults.Line.pointHitDetectionRadius = 10;
    } else {
      Chart.defaults.Line.pointHitDetectionRadius = 20;
    }
  }

  /**
   * Directly set items in Select2
   * Currently is not able to remove underscore from page names
   *
   * @param {array} items - page titles
   * @returns {array} - untouched array of items
   */
  setSelect2Defaults(items) {
    items.forEach(item => {
      const escapedText = $('<div>').text(item).html();
      $('<option>' + escapedText + '</option>').appendTo(this.config.select2Input);
    });
    $(this.config.select2Input).select2('val', items);
    $(this.config.select2Input).select2('close');

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
    let startDate, endDate;

    if (type.includes('latest-')) {
      const offset = parseInt(type.replace('latest-', ''), 10) || 20; // fallback of 20
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
   * @return {null} nothing
   */
  setupListeners() {
    /** prevent browser's default behaviour for any link with href="#" */
    $("a[href='#']").on('click', e => e.preventDefault());

    /** language selector */
    $('.lang-link').on('click', e => {
      const expiryGMT = moment().add(this.config.cookieExpiry, 'days').toDate().toGMTString();
      document.cookie = `TsIntuition_userlang=${$(e.target).data('lang')}; expires=${expiryGMT}; path=/`;

      const expiryUnix = Math.floor(Date.now() / 1000) + (this.config.cookieExpiry * 24 * 60 * 60);
      document.cookie = `TsIntuition_expiry=${expiryUnix}; expires=${expiryGMT}; path=/`;
      location.reload();
    });
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
      return this.storage[key];
    }
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
      return this.storage[key] = value;
    }
  }

  /**
   * sets up the daterange selector and adds listeners
   * @returns {null} - nothing
   */
  setupDateRangeSelector() {
    const dateRangeSelector = $(this.config.dateRangeSelector);

    /** transform this.config.specialRanges to have i18n as keys */
    let ranges = {};
    Object.keys(this.config.specialRanges).forEach(key => {
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
      startDate: moment().subtract(this.config.defaults.daysAgo, 'days'),
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
  }

  setThrottle() {
    if (!this.isRequestCached()) simpleStorage.set('pageviews-throttle', true, {TTL: 90000});
  }

  /**
   * Splash in console, just for fun
   * @returns {String} output
   */
  splash() {
    const style = 'background: #222; color: #bada55; padding: 4px; font-family:dejavu sans mono';
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
   * @return {null} nuttin'
   */
  updateInterAppLinks() {
    $('.interapp-link').each((i, link) => {
      let url = link.href.split('?')[0];

      if (link.classList.contains('interapp-link--siteviews')) {
        link.href = `${url}?sites=${this.project}.org`;
      } else {
        link.href = `${url}?project=${this.project}.org`;
      }
    });
  }

  /**
   * Writes message just below the chart
   * @param {string} message - message to write
   * @param {boolean} clear - whether to clear any existing messages
   * @returns {jQuery} - jQuery object of message container
   */
  writeMessage(message, clear) {
    if (clear) {
      this.clearMessages();
    }
    return $('.message-container').append(
      `<div class='error-message'>${message}</div>`
    );
  }
}

module.exports = Pv;
