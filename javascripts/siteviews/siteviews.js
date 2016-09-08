/**
 * Siteviews Analysis tool
 * @file Main file for Siteviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');

/** Main SiteViews class */
class SiteViews extends mix(Pv).with(ChartHelpers) {
  constructor() {
    super(config);
    this.app = 'siteviews';
    this.specialRange = null;

    /**
     * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
     * caused by race conditions between consecutive ajax calls. They are actually
     * not critical and can be avoided with this empty function.
     */
    window.siteSuggestionCallback = $.noop;
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
    this.setupDataSourceSelector();
    this.popParams();
    this.setupListeners();
  }

  /**
   * Link to /topviews for given project and chosen options
   * @param {String} project - project to link to
   * @returns {String} URL
   */
  getTopviewsURL(project) {
    let params = {
      project,
      platform: 'all-access'
    };

    // Use the month of the start date as the date value for Topviews.
    // If we are on the cusp of a new month, use the previous month as last month's data may not be available yet.
    let startDate = moment(this.daterangepicker.startDate);
    if (startDate.month() === moment().month() || startDate.month() === moment().subtract(2, 'days').month()) {
      startDate.subtract(1, 'month');
    }
    params.date = startDate.startOf('month').format('YYYY-MM');

    return `/topviews?${$.param(params)}&project=${project}`;
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    this.startSpinny();

    let params = this.validateParams(
      this.parseQueryString('sites')
    );

    this.patchUsage();

    $(this.config.dataSourceSelector).val(params.source);
    this.setupDataSourceSelector();
    $(this.config.platformSelector).val(params.platform);

    if (params.source === 'pageviews') {
      $(this.config.agentSelector).val(params.agent);
    } else {
      $(this.config.dataSourceSelector).trigger('change');
    }

    this.validateDateRange(params);
    this.resetSelect2();

    if (!params.sites || (params.sites.length === 1 && !params.sites[0])) {
      params.sites = this.config.defaults.projects;
    } else if (params.sites.length > 10) {
      params.sites = params.sites.slice(0, 10); // max 10 sites
    }

    this.setInitialChartType(params.sites.length);
    this.setSelect2Defaults(params.sites);
  }

  /**
   * Get all user-inputted parameters except the sites
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} platform, agent, etc.
   */
  getParams(specialRange = true) {
    let params = {
      platform: $(this.config.platformSelector).val(),
      source: $(this.config.dataSourceSelector).val()
    };

    if (this.isPageviews()) {
      params.agent = $(this.config.agentSelector).val();
    }

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in this.config.specialRanges, constructed like `{range: 'last-month'}`,
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
   * Push relevant class properties to the query string
   * Called whenever we go to update the chart
   * @returns {null} nothing
   */
  pushParams() {
    const sites = $(this.config.select2Input).select2('val') || [];

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&sites=${sites.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&sites=${sites.join('|')}`);
  }

  /**
   * Sets up the site selector and adds listener to update chart
   * @returns {null} - nothing
   */
  setupSelect2() {
    const $select2Input = $(this.config.select2Input);

    let params = {
      ajax: {
        transport: (params, success, failure) => {
          const results = siteDomains.filter(domain => domain.startsWith(params.data.q));
          success({ results: results.slice(0, 10) });
        },
        processResults: data => {
          const results = data.results.map(domain => {
            return {
              id: domain,
              text: domain
            };
          });
          return {results};
        }
      },
      placeholder: $.i18n('projects-placeholder'),
      maximumSelectionLength: 10,
      minimumInputLength: 1
    };

    $select2Input.select2(params);
    $select2Input.on('change', this.processInput.bind(this));
  }

  setPlatformOptionValues() {
    $(this.config.platformSelector).find('option').each((index, el) => {
      $(el).prop('value', this.isPageviews() ? $(el).data('value') : $(el).data('ud-value'));
    });
  }

  setupDataSourceSelector() {
    this.setPlatformOptionValues();

    $(this.config.dataSourceSelector).on('change', e => {
      const value = $(this.config.platformSelector).val() || '',
        wasMobileValue = value.includes('mobile');

      if (this.isPageviews()) {
        $('.platform-select--mobile-web, .platform-select--mobile-app').show();
        $('.platform-select--mobile').hide();
        $(this.config.agentSelector).prop('disabled', false);
      } else {
        $('.platform-select--mobile-web, .platform-select--mobile-app').hide();
        $('.platform-select--mobile').show();
        $(this.config.agentSelector).val('user').prop('disabled', true);
      }

      this.setPlatformOptionValues();

      // If we're going from a mobile value select a corresponding mobile value for the new data source.
      // Desktop and all-access share the same options so we don't need to add logic for those options.
      if (wasMobileValue && this.isUniqueDevices()) {
        $(this.config.platformSelector).val('mobile-site'); // chart will automatically re-render
      } else if (wasMobileValue && this.isPageviews()) {
        $(this.config.platformSelector).val('mobile-web');
      }

      this.processInput();
    });
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
   * Query the API for each site, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @returns {null} - nothin
   */
  processInput(force) {
    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && location.search === this.params && this.prevChartType === this.chartType) {
      return;
    }

    this.params = location.search;

    const entities = $(config.select2Input).select2('val') || [];

    if (!entities.length) {
      return this.resetView();
    }

    this.prevChartType = this.chartType;
    this.clearMessages(); // clear out old error messages
    this.destroyChart();
    this.startSpinny();

    this.getPageViewsData(entities).done(xhrData => this.updateChart(xhrData));
  }

  /**
   * Extends super.validateParams to handle special conditional params specific to Siteviews
   * @param {Object} params - params as fetched by this.parseQueryString()
   * @returns {Object} same params with some invalid parameters correted, as necessary
   * @override
   */
  validateParams(params) {
    if (params.source === 'unique-devices') {
      this.config.validParams.platform = ['all-sites', 'desktop-site', 'mobile-site'];
      this.config.defaults.platform = 'all-sites';
      params.agent = 'user';
    } else {
      this.config.validParams.agent = ['all-agents', 'user', 'spider'];
    }

    return super.validateParams(params);
  }

  /**
   * Validates the given projects against the site map
   *   showing an error message of any that are invalid,
   *   and returning an array of the given projects that are valid
   * @param {Array} projects - array of project strings to validate
   * @returns {Array} - given projects that are valid
   */
  validateProjects(projects = []) {
    return projects.filter(project => {
      if (siteDomains.includes(project)) {
        return true;
      } else {
        this.writeMessage(
          $.i18n('invalid-project', `<a href='//${project.escape()}'>${project.escape()}</a>`)
        );
        return false;
      }
    });
  }
}

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new SiteViews();
});
