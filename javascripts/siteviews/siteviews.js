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
    return `/topviews?${$.param(this.getParams())}&project=${project}`;
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    this.startSpinny();

    let startDate, endDate, params = this.parseQueryString('sites');

    this.patchUsage('sv');

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

    $(this.config.dataSourceSelector).val(params.source || 'pageviews');

    this.setupDataSourceSelector();

    $(this.config.platformSelector).val(params.platform || 'all-access');
    if (params.source === 'pageviews') {
      $(this.config.agentSelector).val();
    } else {
      $(this.config.dataSourceSelector).trigger('change');
    }

    this.resetSelect2();

    if (!params.sites || params.sites.length === 1 && !params.sites[0]) {
      params.sites = this.config.defaults.projects;
      this.setSelect2Defaults(params.sites);
    } else {
      this.setInitialChartType(params.sites.length);
      this.setSelect2Defaults(params.sites);
    }
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
    const select2Input = $(this.config.select2Input);

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

    select2Input.select2(params);
    select2Input.on('change', this.processInput.bind(this));
  }

  setPlatformOptionValues() {
    $(this.config.platformSelector).find('option').each((index, el) => {
      $(el).prop('value', this.isPageviews() ? $(el).data('value') : $(el).data('ud-value'));
    });
  }

  setupDataSourceSelector() {
    this.setPlatformOptionValues();

    $(this.config.dataSourceSelector).on('change', e => {
      if (this.isPageviews()) {
        $('.platform-select--mobile-web').show();
        $(this.config.agentSelector).prop('disabled', false);
      } else {
        $('.platform-select--mobile-web').hide();
        $(this.config.agentSelector).val('user').prop('disabled', true);
      }

      this.setPlatformOptionValues();

      /** reset to all-access if currently on mobile-app for unique-devices (not pageviews) */
      if ($(this.config.platformSelector).val() === 'mobile-app' && !this.isPageviews()) {
        $(this.config.platformSelector).val('all-sites'); // chart will automatically re-render
      } else {
        this.processInput();
      }
    });
  }

  /**
   * General place to add page-wide listeners
   * @returns {null} - nothing
   */
  setupListeners() {
    super.setupListeners();

    $('.download-csv').on('click', this.exportCSV.bind(this));
    $('.download-json').on('click', this.exportJSON.bind(this));
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

    /** @type {Object} everything we need to keep track of for the promises */
    let xhrData = {
      entities: $(config.select2Input).select2('val') || [],
      labels: [], // Labels (dates) for the x-axis.
      datasets: [], // Data for each site timeseries
      errors: [], // Queue up errors to show after all requests have been made
      fatalErrors: [], // Unrecoverable JavaScript errors
      promises: []
    };

    if (!xhrData.entities.length) {
      return this.resetView();
    }

    this.params = location.search;
    this.prevChartType = this.chartType;
    this.clearMessages(); // clear out old error messages
    this.destroyChart();
    this.startSpinny();

    /** Collect parameters from inputs. */
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    /**
     * Asynchronously collect the data from Analytics Query Service API,
     * process it to Chart.js format and initialize the chart.
     */
    xhrData.entities.forEach((site, index) => {
      const uriEncodedSite = encodeURIComponent(site);

      /** @type {String} Url to query the API. */
      const url = this.isPageviews() ? (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/${uriEncodedSite}` +
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      ) : (
        `https://wikimedia.org/api/rest_v1/metrics/unique-devices/${uriEncodedSite}/${$(this.config.platformSelector).val()}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({
        url: url,
        dataType: 'json'
      });
      xhrData.promises.push(promise);

      promise.success(successData => {
        try {
          if (this.isPageviews()) {
            successData = this.fillInZeros(successData, startDate, endDate);
          }

          /** Build the site's dataset. */
          if (this.config.linearCharts.includes(this.chartType)) {
            xhrData.datasets.push(this.getLinearData(successData, site, index));
          } else {
            xhrData.datasets.push(this.getCircularData(successData, site, index));
          }

          /** fetch the labels for the x-axis on success if we haven't already */
          if (successData.items && !xhrData.labels.length) {
            xhrData.labels = successData.items.map(elem => {
              return moment(elem.timestamp, this.config.timestampFormat).format(this.dateFormat);
            });
          }
        } catch (err) {
          return xhrData.fatalErrors.push(err);
        }
      }).fail(data => {
        if (data.status === 404) {
          this.writeMessage(
            `<a href='https://${site}'>${site}</a> - ${$.i18n('api-error-no-data')}`
          );
          // remove this site from the list of entities to analyze
          xhrData.entities = xhrData.entities.filter(el => el !== site);
        } else {
          xhrData.errors.push(data.responseJSON.detail[0]);
        }
      });
    });

    $.when(...xhrData.promises).always(this.updateChart.bind(this, xhrData));
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
          $.i18n('invalid-project', `<a href='//${project}'>${project}</a>`)
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
