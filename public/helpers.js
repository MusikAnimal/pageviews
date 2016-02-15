'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var pv = {
  addSiteNotice: function addSiteNotice(level, message, title, autodismiss) {
    title = title ? '<strong>' + title + '</strong> ' : '';
    autodismiss = autodismiss ? ' autodismiss' : '';
    $(".site-notice").append('<div class=\'alert alert-' + level + autodismiss + '\'>' + title + message + '</div>');
    $(".site-notice-wrapper").show();
  },
  clearMessages: function clearMessages() {
    $(".message-container").html("");
  },
  clearSiteNotices: function clearSiteNotices() {
    $(".site-notice .autodismiss").remove();

    if (!$(".site-notice .alert").length) {
      $(".site-notice-wrapper").hide();
    }
  },


  /**
   * Get the wiki URL given the page name
   *
   * @param {string} page name
   * @returns {string} URL for the page
   */
  getPageURL: function getPageURL(page) {
    return '//' + pv.getProject() + '.org/wiki/' + page;
  },


  /**
   * Get the project name (without the .org)
   *
   * @returns {boolean} lang.projectname
   */
  getProject: function getProject() {
    var project = $(config.projectInput).val();
    // Get the first 2 characters from the project code to get the language
    return project.replace(/.org$/, '');
  },
  getLocaleDateString: function getLocaleDateString() {
    var formats = {
      "ar-SA": "DD/MM/YY",
      "bg-BG": "DD.M.YYYY",
      "ca-ES": "DD/MM/YYYY",
      "zh-TW": "YYYY/M/d",
      "cs-CZ": "D.M.YYYY",
      "da-DK": "DD-MM-YYYY",
      "de-DE": "DD.MM.YYYY",
      "el-GR": "D/M/YYYY",
      "en-US": "M/D/YYYY",
      "fi-FI": "D.M.YYYY",
      "fr-FR": "DD/MM/YYYY",
      "he-IL": "DD/MM/YYYY",
      "hu-HU": "YYYY. MM. DD.",
      "is-IS": "D.M.YYYY",
      "it-IT": "DD/MM/YYYY",
      "ja-JP": "YYYY/MM/DD",
      "ko-KR": "YYYY-MM-DD",
      "nl-NL": "D-M-YYYY",
      "nb-NO": "DD.MM.YYYY",
      "pl-PL": "YYYY-MM-DD",
      "pt-BR": "D/M/YYYY",
      "ro-RO": "DD.MM.YYYY",
      "ru-RU": "DD.MM.YYYY",
      "hr-HR": "D.M.YYYY",
      "sk-SK": "D. M. YYYY",
      "sq-AL": "YYYY-MM-DD",
      "sv-SE": "YYYY-MM-DD",
      "th-TH": "D/M/YYYY",
      "tr-TR": "DD.MM.YYYY",
      "ur-PK": "DD/MM/YYYY",
      "id-ID": "DD/MM/YYYY",
      "uk-UA": "DD.MM.YYYY",
      "be-BY": "DD.MM.YYYY",
      "sl-SI": "D.M.YYYY",
      "et-EE": "D.MM.YYYY",
      "lv-LV": "YYYY.MM.DD.",
      "lt-LT": "YYYY.MM.DD",
      "fa-IR": "MM/DD/YYYY",
      "vi-VN": "DD/MM/YYYY",
      "hy-AM": "DD.MM.YYYY",
      "az-Latn-AZ": "DD.MM.YYYY",
      "eu-ES": "YYYY/MM/DD",
      "mk-MK": "DD.MM.YYYY",
      "af-ZA": "YYYY/MM/DD",
      "ka-GE": "DD.MM.YYYY",
      "fo-FO": "DD-MM-YYYY",
      "hi-IN": "DD-MM-YYYY",
      "ms-MY": "DD/MM/YYYY",
      "kk-KZ": "DD.MM.YYYY",
      "ky-KG": "DD.MM.YY",
      "sw-KE": "M/d/YYYY",
      "uz-Latn-UZ": "DD/MM YYYY",
      "tt-RU": "DD.MM.YYYY",
      "pa-IN": "DD-MM-YY",
      "gu-IN": "DD-MM-YY",
      "ta-IN": "DD-MM-YYYY",
      "te-IN": "DD-MM-YY",
      "kn-IN": "DD-MM-YY",
      "mr-IN": "DD-MM-YYYY",
      "sa-IN": "DD-MM-YYYY",
      "mn-MN": "YY.MM.DD",
      "gl-ES": "DD/MM/YY",
      "kok-IN": "DD-MM-YYYY",
      "syr-SY": "DD/MM/YYYY",
      "dv-MV": "DD/MM/YY",
      "ar-IQ": "DD/MM/YYYY",
      "zh-CN": "YYYY/M/D",
      "de-CH": "DD.MM.YYYY",
      "en-GB": "DD/MM/YYYY",
      "es-MX": "DD/MM/YYYY",
      "fr-BE": "D/MM/YYYY",
      "it-CH": "DD.MM.YYYY",
      "nl-BE": "D/MM/YYYY",
      "nn-NO": "DD.MM.YYYY",
      "pt-PT": "DD-MM-YYYY",
      "sr-Latn-CS": "D.M.YYYY",
      "sv-FI": "D.M.YYYY",
      "az-Cyrl-AZ": "DD.MM.YYYY",
      "ms-BN": "DD/MM/YYYY",
      "uz-Cyrl-UZ": "DD.MM.YYYY",
      "ar-EG": "DD/MM/YYYY",
      "zh-HK": "D/M/YYYY",
      "de-AT": "DD.MM.YYYY",
      "en-AU": "D/MM/YYYY",
      "es-ES": "DD/MM/YYYY",
      "fr-CA": "YYYY-MM-DD",
      "sr-Cyrl-CS": "D.M.YYYY",
      "ar-LY": "DD/MM/YYYY",
      "zh-SG": "D/M/YYYY",
      "de-LU": "DD.MM.YYYY",
      "en-CA": "DD/MM/YYYY",
      "es-GT": "DD/MM/YYYY",
      "fr-CH": "DD.MM.YYYY",
      "ar-DZ": "DD-MM-YYYY",
      "zh-MO": "D/M/YYYY",
      "de-LI": "DD.MM.YYYY",
      "en-NZ": "D/MM/YYYY",
      "es-CR": "DD/MM/YYYY",
      "fr-LU": "DD/MM/YYYY",
      "ar-MA": "DD-MM-YYYY",
      "en-IE": "DD/MM/YYYY",
      "es-PA": "MM/DD/YYYY",
      "fr-MC": "DD/MM/YYYY",
      "ar-TN": "DD-MM-YYYY",
      "en-ZA": "YYYY/MM/DD",
      "es-DO": "DD/MM/YYYY",
      "ar-OM": "DD/MM/YYYY",
      "en-JM": "DD/MM/YYYY",
      "es-VE": "DD/MM/YYYY",
      "ar-YE": "DD/MM/YYYY",
      "en-029": "MM/DD/YYYY",
      "es-CO": "DD/MM/YYYY",
      "ar-SY": "DD/MM/YYYY",
      "en-BZ": "DD/MM/YYYY",
      "es-PE": "DD/MM/YYYY",
      "ar-JO": "DD/MM/YYYY",
      "en-TT": "DD/MM/YYYY",
      "es-AR": "DD/MM/YYYY",
      "ar-LB": "DD/MM/YYYY",
      "en-ZW": "M/D/YYYY",
      "es-EC": "DD/MM/YYYY",
      "ar-KW": "DD/MM/YYYY",
      "en-PH": "M/D/YYYY",
      "es-CL": "DD-MM-YYYY",
      "ar-AE": "DD/MM/YYYY",
      "es-UY": "DD/MM/YYYY",
      "ar-BH": "DD/MM/YYYY",
      "es-PY": "DD/MM/YYYY",
      "ar-QA": "DD/MM/YYYY",
      "es-BO": "DD/MM/YYYY",
      "es-SV": "DD/MM/YYYY",
      "es-HN": "DD/MM/YYYY",
      "es-NI": "DD/MM/YYYY",
      "es-PR": "DD/MM/YYYY",
      "am-ET": "D/M/YYYY",
      "tzm-Latn-DZ": "DD-MM-YYYY",
      "iu-Latn-CA": "D/MM/YYYY",
      "sma-NO": "DD.MM.YYYY",
      "mn-Mong-CN": "YYYY/M/d",
      "gd-GB": "DD/MM/YYYY",
      "en-MY": "D/M/YYYY",
      "prs-AF": "DD/MM/YY",
      "bn-BD": "DD-MM-YY",
      "wo-SN": "DD/MM/YYYY",
      "rw-RW": "M/D/YYYY",
      "qut-GT": "DD/MM/YYYY",
      "sah-RU": "MM.DD.YYYY",
      "gsw-FR": "DD/MM/YYYY",
      "co-FR": "DD/MM/YYYY",
      "oc-FR": "DD/MM/YYYY",
      "mi-NZ": "DD/MM/YYYY",
      "ga-IE": "DD/MM/YYYY",
      "se-SE": "YYYY-MM-DD",
      "br-FR": "DD/MM/YYYY",
      "smn-FI": "D.M.YYYY",
      "moh-CA": "M/D/YYYY",
      "arn-CL": "DD-MM-YYYY",
      "ii-CN": "YYYY/M/D",
      "dsb-DE": "D. M. YYYY",
      "ig-NG": "D/M/YYYY",
      "kl-GL": "DD-MM-YYYY",
      "lb-LU": "DD/MM/YYYY",
      "ba-RU": "DD.MM.YY",
      "nso-ZA": "YYYY/MM/DD",
      "quz-BO": "DD/MM/YYYY",
      "yo-NG": "D/M/YYYY",
      "ha-Latn-NG": "D/M/YYYY",
      "fil-PH": "M/D/YYYY",
      "ps-AF": "DD/MM/YY",
      "fy-NL": "D-M-YYYY",
      "ne-NP": "M/D/YYYY",
      "se-NO": "DD.MM.YYYY",
      "iu-Cans-CA": "D/M/YYYY",
      "sr-Latn-RS": "D.M.YYYY",
      "si-LK": "YYYY-MM-DD",
      "sr-Cyrl-RS": "D.M.YYYY",
      "lo-LA": "DD/MM/YYYY",
      "km-KH": "YYYY-MM-DD",
      "cy-GB": "DD/MM/YYYY",
      "bo-CN": "YYYY/M/D",
      "sms-FI": "D.M.YYYY",
      "as-IN": "DD-MM-YYYY",
      "ml-IN": "DD-MM-YY",
      "en-IN": "DD-MM-YYYY",
      "or-IN": "DD-MM-YY",
      "bn-IN": "DD-MM-YY",
      "tk-TM": "DD.MM.YY",
      "bs-Latn-BA": "D.M.YYYY",
      "mt-MT": "DD/MM/YYYY",
      "sr-Cyrl-ME": "D.M.YYYY",
      "se-FI": "D.M.YYYY",
      "zu-ZA": "YYYY/MM/DD",
      "xh-ZA": "YYYY/MM/DD",
      "tn-ZA": "YYYY/MM/DD",
      "hsb-DE": "D. M. YYYY",
      "bs-Cyrl-BA": "D.M.YYYY",
      "tg-Cyrl-TJ": "DD.MM.yy",
      "sr-Latn-BA": "D.M.YYYY",
      "smj-NO": "DD.MM.YYYY",
      "rm-CH": "DD/MM/YYYY",
      "smj-SE": "YYYY-MM-DD",
      "quz-EC": "DD/MM/YYYY",
      "quz-PE": "DD/MM/YYYY",
      "hr-BA": "D.M.YYYY.",
      "sr-Latn-ME": "D.M.YYYY",
      "sma-SE": "YYYY-MM-DD",
      "en-SG": "D/M/YYYY",
      "ug-CN": "YYYY-M-D",
      "sr-Cyrl-BA": "D.M.YYYY",
      "es-US": "M/D/YYYY"
    };
    return formats[navigator.language] || 'YYYY-MM-DD';
  },


  /**
   * Check if Intl is supported
   *
   * @returns {boolean} whether the browser (presumably) supports date locale operations
   */
  localeSupported: function localeSupported() {
    return (typeof Intl === 'undefined' ? 'undefined' : _typeof(Intl)) === "object";
  },
  n: function n(value) {
    return new Number(value).toLocaleString();
  },


  /**
   * Make request to API in order to get normalized page names. E.g. masculine versus feminine namespaces on dewiki
   *
   * @param {array} pages - array of page names
   * @returns {Deferred} promise with data fetched from API
   */
  normalizePageNames: function normalizePageNames(pages) {
    return $.ajax({
      url: 'https://' + pv.getProject() + '.org/w/api.php?action=query&prop=info&format=json&titles=' + pages.join('|'),
      dataType: 'jsonp'
    });
  },
  resetView: function resetView() {
    $(".chart-container").html("");
    $(".chart-container").removeClass("loading");
    $(".message-container").html("");
    resetArticleSelector();
  },
  rgba: function rgba(value, alpha) {
    return value.replace(/,\s*\d\)/, ', ' + alpha + ')');
  },


  /**
   * Replace spaces with underscores
   *
   * @param {array} pages - array of page names
   * @returns {array} page names with underscores
   */
  underscorePageNames: function underscorePageNames(pages) {
    return pages.map(function (page) {
      return decodeURIComponent(page.replace(/ /g, '_'));
    });
  },
  writeMessage: function writeMessage(message, clear) {
    if (clear) {
      pv.clearMessages();
    }
    $(".message-container").append('<p class=\'error-message\'>' + message + '</p>');
  }
};

// must be exported to global scope for Chart template rendering
window.getPageURL = pv.getPageURL;
window.rgba = pv.rgba;
