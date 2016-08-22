/**
 * Metaviews Analysis tool
 * @file Main file for Metaviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');

/** Main MetaViews class */
class MetaViews extends mix(Pv).with(ChartHelpers) {
  constructor() {
    super(config);
    this.app = 'metaviews';
    this.specialRange = null;
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
    this.popParams();
    this.setupListeners();
  }

  /**
   * Get data formatted for a circular chart (Pie, Doughnut, PolarArea)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} entity - title of entity (page or site)
   * @param {integer} index - where we are in the list of entities to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getCircularData(data, entity, index) {
    const values = data.map(elem => elem.count),
      color = this.config.colors[index],
      value = values.reduce((a, b) => a + b),
      average = Math.round(value / values.length);

    return Object.assign({
      label: entity.descore(),
      value,
      average
    }, this.config.chartConfig[this.chartType].dataset(color));
  }

  /**
   * Get data formatted for a linear chart (line, bar, radar)
   *
   * @param {object} data - data just before we are ready to render the chart
   * @param {string} entity - title of entity
   * @param {integer} index - where we are in the list of entities to show
   *    used for colour selection
   * @returns {object} - ready for chart rendering
   */
  getLinearData(data, entity, index) {
    const values = data.map(elem => elem.count),
      sum = values.reduce((a, b) => a + b),
      average = Math.round(sum / values.length),
      max = Math.max(...values),
      min = Math.min(...values),
      color = this.config.colors[index % 10];

    return Object.assign({
      label: entity.descore(),
      data: values,
      sum,
      average,
      max,
      min,
      color
    }, this.config.chartConfig[this.chartType].dataset(color));
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    this.startSpinny();

    let params = this.parseQueryString('tools');

    const startDate = moment(params.start || moment().subtract(this.config.defaults.daysAgo, 'days')),
      endDate = moment(params.end || Date.now());

    this.daterangepicker.startDate = startDate;
    this.daterangepicker.setEndDate(endDate);

    this.resetSelect2();

    if (!params.tools || (params.tools.length === 1 && !params.tools[0])) {
      params.tools = this.config.apps;
    }

    this.setInitialChartType(params.tools.length);
    this.setSelect2Defaults(params.tools);
  }

  /**
   * Get all user-inputted parameters except the tools
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} platform, agent, etc.
   */
  getParams(specialRange = true) {
    let params = {};

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
    const tools = $(this.config.select2Input).select2('val') || [];

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&tools=${tools.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&tools=${tools.join('|')}`);
  }

  /**
   * Sets up the tool selector and adds listener to update chart
   * @returns {null} - nothing
   */
  setupSelect2() {
    const select2Input = $(this.config.select2Input);

    const data = this.config.apps.map(app => {
      return {
        id: app,
        text: app
      };
    });

    let params = {
      data,
      placeholder: $.i18n('projects-placeholder'),
      maximumSelectionLength: this.config.apps.length,
      minimumInputLength: 1
    };

    select2Input.select2(params);
    select2Input.on('change', this.processInput.bind(this));
  }

  /**
   * Directly set items in Select2
   *
   * @param {array} items - page titles
   * @returns {array} - untouched array of items
   * @override
   */
  setSelect2Defaults(items) {
    $(this.config.select2Input).val(items).trigger('change');

    return items;
  }

  /**
   * General place to add page-wide listeners
   * @override
   * @returns {null} - nothing
   */
  setupListeners() {
    super.setupListeners();
  }

  /**
   * Query the API for each tool, building up the datasets and then calling renderData
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
      entities: $(this.config.select2Input).select2('val') || [],
      labels: [], // Labels (dates) for the x-axis.
      datasets: [], // Data for each tool timeseries
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

    xhrData.entities.forEach((tool, index) => {
      const url = `//${metaRoot}/${tool}` +
        `/${startDate.format('YYYY-MM-DD')}/${endDate.format('YYYY-MM-DD')}`;

      const promise = $.ajax({
        url,
        dataType: 'json'
      });
      xhrData.promises.push(promise);

      promise.success(successData => {
        /** Build the tool's dataset. */
        if (this.config.linearCharts.includes(this.chartType)) {
          xhrData.datasets.push(this.getLinearData(successData, tool, index));
        } else {
          xhrData.datasets.push(this.getCircularData(successData, tool, index));
        }

        /** fetch the labels for the x-axis on success if we haven't already */
        if (!xhrData.labels.length) {
          xhrData.labels = successData.map(elem => {
            return moment(elem.date, 'YYYY-MM-DD').format(this.dateFormat);
          });
        }
      }).fail(data => {
        this.writeMessage(
          `<a href='/${tool.escape()}'>${tool.escape()}</a> - ${$.i18n('api-error-no-data')}`
        );
        // remove this tool from the list of entities to analyze
        xhrData.entities = xhrData.entities.filter(el => el !== tool);
      });
    });

    $.whenAll(...xhrData.promises).always(this.updateChart.bind(this, xhrData));
  }
}

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new MetaViews();
});
