/*
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

/** Main SiteViews class */
class SiteViews extends Pv {
  constructor() {
    super();

    this.localizeDateFormat = this.getFromLocalStorage('pageviews-settings-localizeDateFormat') || config.defaults.localizeDateFormat;
    this.numericalFormatting = this.getFromLocalStorage('pageviews-settings-numericalFormatting') || config.defaults.numericalFormatting;
    this.autocomplete = this.getFromLocalStorage('pageviews-settings-autocomplete') || config.defaults.autocomplete;
    this.chartObj = null;
    this.chartType = this.getFromLocalStorage('pageviews-chart-preference') || config.defaults.chartType;
    this.normalized = false; /** let's us know if the page names have been normalized via the API yet */
    this.params = null;
    this.prevChartType = null;
    this.specialRange = null;
    this.config = config;
    this.colorsStyleEl = undefined;
    this.siteMap = siteMap; // for debugging, as scope is accessible on localhost

    /**
     * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
     * caused by race conditions between consecutive ajax calls. They are actually
     * not critical and can be avoided with this empty function.
     */
    window.siteSuggestionCallback = $.noop;

    /** need to export to global for chart templating */
    window.formatNumber = this.formatNumber.bind(this);
    window.getTopviewsURL = this.getTopviewsURL.bind(this);
    window.numDaysInRange = this.numDaysInRange.bind(this);
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   * @return {null} Nothing
   */
  initialize() {
    this.setupDateRangeSelector();
    this.setupSelect2();
    this.setupSettingsModal();
    this.setupSelect2Colors();
    this.setupDataSourceSelector();
    this.popParams();
    this.setupListeners();
  }

  /**
   * Destroy previous chart, if needed.
   * @returns {null} nothing
   */
  destroyChart() {
    if (this.chartObj) {
      this.chartObj.destroy();
      delete this.chartObj;
    }
  }

  /**
   * Exports current chart data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @returns {string} CSV content
   */
  exportCSV() {
    let csvContent = 'data:text/csv;charset=utf-8,Date,';
    let titles = [];
    let dataRows = [];
    let dates = this.getDateHeadings(false);

    // Begin constructing the dataRows array by populating it with the dates
    dates.forEach((date, index) => {
      dataRows[index] = [date];
    });

    chartData.forEach(site => {
      // Build an array of site titles for use in the CSV header
      let siteTitle = '"' + site.label.replace(/"/g, '""') + '"';
      titles.push(siteTitle);

      // Populate the dataRows array with the data for this site
      dates.forEach((date, index) => {
        dataRows[index].push(site.data[index]);
      });
    });

    // Finish the CSV header
    csvContent = csvContent + titles.join(',') + '\n';

    // Add the rows to the CSV
    dataRows.forEach(data => {
      csvContent += data.join(',') + '\n';
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

    chartData.forEach((site, index) => {
      let entry = {
        site: site.label.replace(/"/g, '\"').replace(/'/g, "\'"),
        color: site.strokeColor,
        sum: site.sum,
        daily_average: Math.round(site.sum / this.numDaysInRange())
      };

      this.getDateHeadings(false).forEach((heading, index) => {
        entry[heading.replace(/\\/,'')] = site.data[index];
      });

      data.push(entry);
    });

    const jsonContent = 'data:text/json;charset=utf-8,' + JSON.stringify(data),
      encodedUri = encodeURI(jsonContent);
    window.open(encodedUri);

    return jsonContent;
  }

  /**
   * Fills in zero value to a timeseries, see:
   * https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
   *
   * @param {object} data fetched from API
   * @param {moment} startDate - start date of range to filter through
   * @param {moment} endDate - end date of range
   * @returns {object} dataset with zeros where nulls where
   */
  fillInZeros(data, startDate, endDate) {
    /** Extract the dates that are already in the timeseries */
    let alreadyThere = {};
    data.items.forEach(elem => {
      let date = moment(elem.timestamp, config.timestampFormat);
      alreadyThere[date] = elem;
    });
    data.items = [];

    /** Reconstruct with zeros instead of nulls */
    for (let date = moment(startDate); date <= endDate; date.add(1, 'd')) {
      if (alreadyThere[date]) {
        data.items.push(alreadyThere[date]);
      } else {
        let edgeCase = date.isSame(config.maxDate) || date.isSame(moment(config.maxDate).subtract(1, 'days'));
        data.items.push({
          timestamp: date.format(config.timestampFormat),
          [this.isPageviews() ? 'views' : 'devices']: edgeCase ? null : 0
        });
      }
    }
  }

  /**
   * Get data formatted for a circular chart (Pie, Doughnut, PolarArea)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} site - title of site
   * @param {integer} index - where we are in the list of sites to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getCircularData(data, site, index) {
    const values = data.items.map(elem => this.isPageviews() ? elem.views : elem.devices),
      color = config.colors[index];

    return Object.assign(
      {
        label: site,
        value: values.reduce((a, b) => a + b)
      },
      config.chartConfig[this.chartType].dataset(color)
    );
  }

  /**
   * Get data formatted for a linear chart (Line, Bar, Radar)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} site - title of site
   * @param {integer} index - where we are in the list of sites to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getLinearData(data, site, index) {
    const values = data.items.map(elem => this.isPageviews() ? elem.views : elem.devices),
      color = config.colors[index % 10];

    return Object.assign(
      {
        label: site,
        data: values,
        sum: values.reduce((a, b) => a + b)
      },
      config.chartConfig[this.chartType].dataset(color)
    );
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
   * Link to /topviews for given project and chosen options
   * @param {String} project - project to link to
   * @returns {String} URL
   */
  getTopviewsURL(project) {
    return `/topviews?${$.param(this.getParams())}&project=${project}`;
  }

  /**
   * Generate key/value pairs of URL query string
   * @returns {Object} key/value pairs representation of query string
   */
  parseQueryString() {
    const uri = decodeURI(location.search.slice(1)),
      chunks = uri.split('&');
    let params = {};

    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i].split('=');

      if (chunk[0] === 'sites') {
        params.sites = chunk[1].split(/\||%7C/);
      } else {
        params[chunk[0]] = chunk[1];
      }
    }

    return params;
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    let startDate, endDate, params = this.parseQueryString();

    this.patchUsage();

    /**
     * Check if we're using a valid range, and if so ignore any start/end dates.
     * If an invalid range, throw and error and use default dates.
     */
    if (params.range) {
      if (!this.setSpecialRange(params.range)) {
        this.addSiteNotice('danger', $.i18n('param-error-3'), $.i18n('invalid-params'), true);
        this.setSpecialRange(config.defaults.dateRange);
      }
    } else if (params.start) {
      startDate = moment(params.start || moment().subtract(config.defaults.daysAgo, 'days'));
      endDate = moment(params.end || Date.now());
      if (startDate < config.minDate || endDate < config.minDate) {
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
      this.setSpecialRange(config.defaults.dateRange);
    }

    $(config.dataSourceSelector).val(params.source || 'pageviews');

    this.setupDataSourceSelector();

    $(config.platformSelector).val(params.platform || 'all-access');
    if (params.source === 'pageviews') {
      $(config.agentSelector).val();
    } else {
      $(config.dataSourceSelector).trigger('change');
    }

    this.resetSelect2();

    if (!params.sites || params.sites.length === 1 && !params.sites[0]) {
      params.sites = config.defaults.projects;
      this.setSelect2Defaults(params.sites);
    } else {
      if (params.sites.length === 1) {
        this.chartType = this.getFromLocalStorage('pageviews-chart-preference') || 'Bar';
      }
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
      platform: $(config.platformSelector).val(),
      source: $(config.dataSourceSelector).val()
    };

    if (this.isPageviews()) {
      params.agent = $(config.agentSelector).val();
    }

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

  isPageviews() {
    return $(config.dataSourceSelector).val() === 'pageviews';
  }

  /**
   * Push relevant class properties to the query string
   * Called whenever we go to update the chart
   * @returns {null} nothing
   */
  pushParams() {
    const sites = $(config.select2Input).select2('val') || [];

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&sites=${sites.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&sites=${sites.join('|')}`);
  }

  /**
   * Removes chart, messages, and resets site selections
   * @returns {null} nothing
   */
  resetView() {
    $('.chart-container').html('');
    $('.chart-container').removeClass('loading');
    $('#chart-legend').html('');
    $('.message-container').html('');
    this.resetSelect2();
  }

  /**
   * Sets up the site selector and adds listener to update chart
   * @returns {null} - nothing
   */
  setupSelect2() {
    const select2Input = $(config.select2Input);

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
    select2Input.on('change', this.updateChart.bind(this));
  }

  /**
   * sets up the daterange selector and adds listeners
   * @returns {null} - nothing
   */
  setupDateRangeSelector() {
    super.setupDateRangeSelector();

    const dateRangeSelector = $(config.dateRangeSelector);

    /** the "Latest N days" links */
    $('.date-latest a').on('click', e => {
      this.setSpecialRange(`latest-${$(e.target).data('value')}`);
    });

    dateRangeSelector.on('apply.daterangepicker', (e, action) => {
      if (action.chosenLabel === $.i18n('custom-range')) {
        this.specialRange = null;

        /** force events to re-fire since apply.daterangepicker occurs before 'change' event */
        this.daterangepicker.updateElement();
      }
    });

    dateRangeSelector.on('change', e => {
      this.setChartPointDetectionRadius();
      this.updateChart();

      /** clear out specialRange if it doesn't match our input */
      if (this.specialRange && this.specialRange.value !== e.target.value) {
        this.specialRange = null;
      }
    });
  }

  setPlatformOptionValues() {
    $(config.platformSelector).find('option').each((index, el) => {
      $(el).prop('value', this.isPageviews() ? $(el).data('value') : $(el).data('ud-value'));
    });
  }

  setupDataSourceSelector() {
    this.setPlatformOptionValues();

    $(config.dataSourceSelector).on('change', e => {
      if (this.isPageviews()) {
        $('.platform-select--mobile-web').show();
        $(config.agentSelector).prop('disabled', false);
      } else {
        $('.platform-select--mobile-web').hide();
        $(config.agentSelector).val('user').prop('disabled', true);
      }

      this.setPlatformOptionValues();

      /** reset to all-access if currently on mobile-app for unique-devices (not pageviews) */
      if ($(config.platformSelector).val() === 'mobile-app' && !this.isPageviews()) {
        $(config.platformSelector).val('all-sites'); // chart will automatically re-render
      } else {
        this.updateChart();
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
    $('#platform-select, #agent-select').on('change', this.updateChart.bind(this));

    /** changing of chart types */
    $('.modal-chart-type a').on('click', e => {
      this.chartType = $(e.currentTarget).data('type');
      this.setLocalStorage('pageviews-chart-preference', this.chartType);
      this.updateChart();
    });

    // window.onpopstate = popParams();
  }

  /**
   * Set values of form based on localStorage or defaults, add listeners
   * @returns {null} nothing
   */
  setupSettingsModal() {
    /** fill in values, everything is either a checkbox or radio */
    this.fillInSettings();

    /** add listener */
    $('.save-settings-btn').on('click', this.saveSettings.bind(this));
    $('.cancel-settings-btn').on('click', this.fillInSettings.bind(this));
  }

  /**
   * The mother of all functions, where all the chart logic lives
   * Really needs to be broken out into several functions
   *
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @returns {null} - nothin
   */
  updateChart(force) {
    let sites = $(config.select2Input).select2('val') || [];

    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && location.search === this.params && this.prevChartType === this.chartType) {
      return;
    }

    if (!sites.length) {
      this.resetView();
      return;
    }

    this.params = location.search;
    this.prevChartType = this.chartType;
    this.clearMessages(); // clear out old error messages

    /** Collect parameters from inputs. */
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    this.destroyChart();
    $('.message-container').html('');
    $('.chart-container').addClass('loading');

    let labels = []; // Labels (dates) for the x-axis.
    let datasets = []; // Data for each site timeseries
    let errors = []; // Queue up errors to show after all requests have been made
    let promises = [];

    /**
     * Asynchronously collect the data from Analytics Query Service API,
     * process it to Chart.js format and initialize the chart.
     */
    sites.forEach((site, index) => {
      const uriEncodedSite = encodeURIComponent(site);

      /** @type {String} Url to query the API. */
      const url = this.isPageviews() ? (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/${uriEncodedSite}` +
        `/${$(config.platformSelector).val()}/${$(config.agentSelector).val()}/daily` +
        `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
      ) : (
        `https://wikimedia.org/api/rest_v1/metrics/unique-devices/${uriEncodedSite}/${$(config.platformSelector).val()}/daily` +
        `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
      );

      const promise = $.ajax({
        url: url,
        dataType: 'json'
      });
      promises.push(promise);

      promise.success(data => {
        // FIXME: these needs fixing too, sometimes doesn't show zero
        if (this.isPageviews()) this.fillInZeros(data, startDate, endDate);

        /** Build the site's dataset. */
        if (config.linearCharts.includes(this.chartType)) {
          datasets.push(this.getLinearData(data, site, index));
        } else {
          datasets.push(this.getCircularData(data, site, index));
        }

        /** fetch the labels for the x-axis on success if we haven't already */
        if (data.items && !labels.length) {
          labels = data.items.map(elem => {
            return moment(elem.timestamp, config.timestampFormat).format(this.dateFormat);
          });
        }
      }).fail(data => {
        if (data.status === 404) {
          this.writeMessage(
            `<a href='https://${site}'>${site}</a> - ${$.i18n('api-error-no-data')}`
          );
          sites = sites.filter(el => el !== site);

          if (!sites.length) {
            $('.chart-container').html('');
            $('.chart-container').removeClass('loading');
          }
        } else {
          errors.push(data.responseJSON.detail[0]);
        }
      });
    });

    $.when(...promises).always(data => {
      $('#chart-legend').html(''); // clear old chart legend

      if (errors.length && errors.length === sites.length) {
        /** something went wrong */
        $('.chart-container').removeClass('loading');
        const errorMessages = Array.from(new Set(errors)).map(error => `<li>${error}</li>`).join('');
        return this.writeMessage(
          `${$.i18n('api-error')}<ul>${errorMessages}</ul><br/>${$.i18n('api-error-contact')}`,
          true
        );
      }

      if (!sites.length) {
        return;
      } else if (sites.length === 1) {
        $('.multi-page-chart-node').hide();
      } else {
        $('.multi-page-chart-node').show();
      }

      /** preserve order of datasets due to asyn calls */
      let sortedDatasets = new Array(sites.length);
      datasets.forEach(dataset => {
        sortedDatasets[sites.indexOf(dataset.label)] = dataset;
      });

      /** export built datasets to global scope Chart templates */
      window.chartData = sortedDatasets;

      $('.chart-container').removeClass('loading');
      const options = Object.assign({},
        config.chartConfig[this.chartType].opts,
        config.globalChartOpts
      );
      const linearData = {labels: labels, datasets: sortedDatasets};

      $('.chart-container').html('');
      $('.chart-container').append("<canvas class='aqs-chart'>");
      const context = $(config.chart)[0].getContext('2d');

      if (config.linearCharts.includes(this.chartType)) {
        this.chartObj = new Chart(context)[this.chartType](linearData, options);
      } else {
        this.chartObj = new Chart(context)[this.chartType](sortedDatasets, options);
      }

      $('#chart-legend').html(this.chartObj.generateLegend());
      $('.data-links').show();
    });
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

  $.extend(Chart.defaults.global, {animation: false, responsive: true});

  new SiteViews();
});
