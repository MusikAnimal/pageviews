/**
 * Metaviews Analysis tool
 * @link https://tools.wmflabs.org/metaviews
 */

const config = require('./config');
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');

/** Main MetaViews class */
class MetaViews extends mix(Pv).with(ChartHelpers) {
  /**
   * set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'metaviews';
    this.specialRange = null;
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
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
   */
  popParams() {
    this.startSpinny();

    const params = this.parseQueryString('tools');

    this.validateDateRange(params);

    this.resetSelect2();

    params.tools = params.tools || this.config.apps;

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
   */
  pushParams() {
    const tools = this.getEntities();

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&tools=${tools.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&tools=${tools.join('|')}`);
  }

  /**
   * Sets up the tool selector and adds listener to update chart
   */
  setupSelect2() {
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

    this.$select2Input.select2(params);
    this.$select2Input.on('change', this.processInput.bind(this));
  }

  /**
   * Directly set items in Select2
   *
   * @param {array} items - page titles
   * @returns {array} - untouched array of items
   * @override
   */
  setSelect2Defaults(items) {
    this.$select2Input.val(items).trigger('change');

    return items;
  }

  /**
   * General place to add page-wide listeners
   * @override
   */
  setupListeners() {
    super.setupListeners();

    $('.sort-link').on('click', e => {
      const sortType = $(e.currentTarget).data('type');
      this.direction = this.sort === sortType ? -this.direction : 1;
      this.sort = sortType;
      this.updateTable();
    });
  }

  /**
   * Query the API for each tool, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @return {null}
   */
  processInput(force) {
    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && location.search === this.params && this.prevChartType === this.chartType) {
      return;
    }

    const entities = this.getEntities();
    this.setInitialChartType(entities.length);

    /**
     * everything we need to keep track of for the promises
     * @type {Object}
     */
    let xhrData = {
      entities,
      labels: [], // Labels (dates) for the x-axis.
      datasets: new Array(entities.length), // Data for each tool timeseries
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
      const promise = $.ajax({
        url: '/metaviews/api.php',
        data: {
          app: tool,
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD')
        },
        dataType: 'json'
      });
      xhrData.promises.push(promise);

      promise.done(successData => {
        xhrData.datasets[index] = successData;

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

  /**
   * Get value of given page for the purposes of column sorting in table view
   * @param  {object} item - page name
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    switch (type) {
    case 'title':
      return item.label;
    case 'pageloads':
      return Number(item.sum);
    case 'average':
      return Number(item.average);
    }
  }

  /**
   * Update the page comparison table, shown below the chart
   * @return {null}
   */
  updateTable() {
    if (this.outputData.length === 1) {
      return this.showSingleAppLegend();
    } else {
      $('.single-page-stats').html('');
    }

    this.$outputList.html('');

    /** sort ascending by current sort setting, using slice() to clone the array */
    const datasets = this.outputData.slice().sort((a, b) => {
      const before = this.getSortProperty(a, this.sort),
        after = this.getSortProperty(b, this.sort);

      if (before < after) {
        return this.direction;
      } else if (before > after) {
        return -this.direction;
      } else {
        return 0;
      }
    });

    $('.sort-link span').removeClass('glyphicon-sort-by-alphabet-alt glyphicon-sort-by-alphabet').addClass('glyphicon-sort');
    const newSortClassName = parseInt(this.direction, 10) === 1 ? 'glyphicon-sort-by-alphabet-alt' : 'glyphicon-sort-by-alphabet';
    $(`.sort-link--${this.sort} span`).addClass(newSortClassName).removeClass('glyphicon-sort');

    datasets.forEach(item => {
      this.$outputList.append(`
        <tr>
          <td class='table-view--color-col'>
            <span class='table-view--color-block' style="background:${item.color}"></span>
          </td>
          <td class='table-view--title'><a href='#'>${item.label}</a></td>
          <td class='table-view--pageloads'>${this.formatNumber(item.sum)}</td>
          <td class='table-view--average'>${this.formatNumber(item.average)}</td>
        </tr>
      `);
    });

    // add summations to show up as the bottom row in the table
    const sum = datasets.reduce((a,b) => a + b.sum, 0);
    const totals = {
      label: `${datasets.length} app${datasets.length === 1 ? '' : 's'}`,
      sum,
      average: Math.round(sum / datasets[0].data.length)
    };
    this.$outputList.append(`
      <tr>
        <th class='table-view--color-col'></th>
        <th class='table-view--title'>${totals.label}</th>
        <th class='table-view--pageloads'>${this.formatNumber(totals.sum)}</th>
        <th class='table-view--average'>${this.formatNumber(totals.average)}</th>
      </tr>
    `);

    $('.output-list .table-view--title a').off('click').on('click', e => {
      this.showProjectUsage($(e.target).text());
    });

    $('.table-view').show();
  }

  /**
   * Show info below the chart when there is only one app being queried
   */
  showSingleAppLegend() {
    const app = this.outputData[0];

    $('.table-view').hide();
    $('.single-page-stats').html(`
      <a href='/${app.label}'>${app.label}</a>
      &middot;
      <span class='text-muted'>
        ${this.$dateRangeSelector.val()}
      </span>
      &middot;
      ${app.sum} page load${app.sum === 1 ? '' : 's'}
      <span>
        (${this.formatNumber(app.average)}/${$.i18n('day')})
      </span>
    `);
  }

  /**
   * Show a modal with all-time per-project usage
   * @param {String} app - app name
   */
  showProjectUsage(app) {
    $('.project-output-list').html('');
    const appName = app.charAt(0).toUpperCase() + app.slice(1),
      langProjects = ['siteviews', 'massviews'],
      usageTerm = langProjects.includes(app) ? 'language' : 'project';
    $('#project-list-modal h4').text(`${appName} usage by ${usageTerm}`);
    $('th.project-table-view--title').text(usageTerm.charAt(0).toUpperCase() + usageTerm.slice(1));
    $.ajax({
      url: '/metaviews/api.php',
      data: { app },
      dataType: 'json'
    }).done(data => {
      data = data.sort((a, b) => {
        if (a.count < b.count) {
          return 1;
        } else if (a.count > b.count) {
          return -1;
        } else {
          return 0;
        }
      });
      const total = data.reduce((a, b) => a + b.count, 0);

      $('.project-output-list').append(`
        <tr>
          <th class='project-table-view--rank'></th>
          <th class='project-table-view--title'>${data.length} ${usageTerm}s</th>
          <th class='project-table-view--pageloads'>${this.formatNumber(total)} page loads</th>
        </tr>
      `);

      data.forEach((project, index) => {
        $('.project-output-list').append(`
          <tr>
            <td class='project-table-view--rank'>${index + 1}</td>
            <td class='project-table-view--title'>
              <a href='//${project.project}.org' target='_blank'>${project.project}</a>
            </td>
            <td class='project-table-view--pageloads'>${this.formatNumber(project.count)}</td>
          </tr>
        `);
      });
      $('#project-list-modal').modal('show');
    });
  }

}

$(() => {
  new MetaViews();
});
