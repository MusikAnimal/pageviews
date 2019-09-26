/**
 * Siteviews Analysis tool
 * @file Main file for Siteviews application
 * @author MusikAnimal
 * @copyright 2016-2018 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 * @requires Pv
 * @requires ChartHelpers
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');

/** Main SiteViews class */
class SiteViews extends mix(Pv).with(ChartHelpers) {
  /**
   * Set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'siteviews';
    this.specialRange = null;
    this.entityInfo = { entities: {} };

    // Keep track of last valid start/end of month (when date type is set to month)
    // This is because the bootstrap datepicker library does not handle this natively
    this.monthStart = this.initialMonthStart;
    this.monthEnd = this.maxMonth;

    // used in siteviews/templates.js
    this.siteDomains = siteDomains;

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
   */
  initialize() {
    this.setupDateRangeSelector();
    this.setupSelect2();
    this.setupSelect2Colors();
    this.popParams();
    this.setupListeners();
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   */
  popParams() {
    this.startSpinny();

    let params = this.validateParams(
      this.parseQueryString('sites')
    );

    $(this.config.dataSourceSelector).val(params.source);
    this.setupDataSourceSelector();
    $(this.config.platformSelector).val(params.platform);

    this.validateDateRange(params);

    if (params.source === 'pageviews') {
      $(this.config.agentSelector).val(params.agent);
    } else {
      $(this.config.dataSourceSelector).trigger('change');
    }

    this.resetSelect2();

    if (!params.sites || !params.sites.length || (params.sites.length === 1 && !params.sites[0])) {
      params.sites = this.config.defaults.projects;
    } else if (params.sites.length > 10) {
      params.sites = params.sites.slice(0, 10); // max 10 sites
    }

    $('#all-projects').prop('checked', params.sites[0] === 'all-projects');

    this.setInitialChartType(params.sites.length);

    if (this.isAllProjects()) {
      $('.site-selector').addClass('disabled');
      this.processInput();
    } else {
      this.setSelect2Defaults(params.sites);
    }
  }

  /**
   * Get statistics for the given sites
   * @param  {Array} sites - site names, ['en.wikipedia.org', 'fr.wikipedia.org', ...]
   * @return {Deferred} Promise resolving with the stats for each site
   */
  getSiteStats(sites) {
    let dfd = $.Deferred(), requestCount = 0;

    // no stats for all sites (other than the pageviews), so just resolve
    if (this.isAllProjects()) return dfd.resolve();

    const alwaysCallback = () => {
      requestCount++;
      if (requestCount === sites.length) {
        dfd.resolve(this.entityInfo);
      }
    };

    sites.forEach(site => {
      // don't re-query for the same stats
      if (this.entityInfo.entities[site]) return alwaysCallback();

      $.ajax({
        url: `https://${site}/w/api.php`,
        data: {
          action: 'query',
          meta: 'siteinfo',
          siprop: 'statistics',
          format: 'json'
        },
        dataType: 'jsonp'
      }).done(data => {
        this.entityInfo.entities[site] = data.query.statistics;
      }).always(alwaysCallback);
    });

    return dfd;
  }

  /**
   * Are we querying for specific projects or all projects?
   * @returns {Boolean} yes or no
   */
  isAllProjects() {
    return $('.all-projects-radio:checked').val() === '1' && this.isPageviews();
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
    } else if (this.isMonthly()) {
      params.start = moment(
        this.monthStartDatepicker.getDate()
      ).format('YYYY-MM');
      params.end = moment(
        this.monthEndDatepicker.getDate()
      ).format('YYYY-MM');
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
    const sites = this.isAllProjects()
      ? ['all-projects']
      : ($(this.config.select2Input).select2('val') || []);

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&sites=${sites.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&sites=${sites.join('%7C')}`);
  }

  /**
   * Sets up the site selector and adds listener to update chart
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
    $select2Input.off('select2:select').on('select2:select', this.processInput.bind(this));
    $select2Input.off('select2:unselect').on('select2:unselect', e => {
      this.processInput(false, e.params.data.text);
      $select2Input.trigger('select2:close');
    });
  }

  /**
   * Set options for the Platform dropdown based on whether we're showing
   *   pageviews vs unique devices or pagecounts
   */
  setPlatformOptionValues() {
    $(this.config.platformSelector).find('option').each((index, el) => {
      $(el).prop('value', this.isPageviews() ? $(el).data('value') : $(el).data('ud-value'));
    });
  }

  /**
   * Setup listeners for the data source selector, and initialize values for the platform dropdown
   */
  setupDataSourceSelector() {
    this.setPlatformOptionValues();

    $(this.config.dataSourceSelector).on('change', e => {
      const platform = $(this.config.platformSelector).val() || '',
        wasMobileValue = platform.includes('mobile'),
        wasPagecounts = this.params ? this.params.includes('pagecounts') : false;

      if (this.isPageviews()) {
        $('.site-selector').toggleClass('disabled', $('#all-projects').is(':checked'));
        $('.all-projects-selector').show();
        $('.platform-select--mobile-web, .platform-select--mobile-app').show();
        $('.platform-select--mobile').hide();
        $(this.config.agentSelector).prop('disabled', false);
      } else { // applies to unique devices and pagecounts
        $('.site-selector').removeClass('disabled');
        $('.all-projects-selector').hide();
        $('.platform-select--mobile-web, .platform-select--mobile-app').hide();
        $('.platform-select--mobile').show();
        $(this.config.agentSelector).val('user').prop('disabled', true);
      }

      this.setPlatformOptionValues();

      // If we're going from a mobile value select a corresponding mobile value for the new data source.
      // Desktop and all-access share the same options so we don't need to add logic for those options.
      if (wasMobileValue && !this.isPageviews()) {
        $(this.config.platformSelector).val('mobile-site'); // chart will automatically re-render
      } else if (wasMobileValue && this.isPageviews()) {
        $(this.config.platformSelector).val('mobile-web');
      }

      // re-init date selectors with new date range constraints, which will in turn call processInput()
      if (this.isPagecounts() || wasPagecounts) {
        this.setupDateRangeSelector();
        this.setupMonthSelector();
      } else {
        this.processInput();
      }
    });
  }

  /**
   * General place to add page-wide listeners
   * @override
   */
  setupListeners() {
    super.setupListeners();
    $('#platform-select, #agent-select').on('change', this.processInput.bind(this));
    $('#date-type-select').on('change', e => {
      $('.date-selector').toggle(e.target.value === 'daily');
      $('.month-selector').toggle(e.target.value === 'monthly');
      if (e.target.value === 'monthly') {
        // no special ranges for month data type
        this.specialRange = null;

        this.setupMonthSelector();

        // Set values of normal daterangepicker, which is what is used when we query the API
        // This will in turn call this.processInput()
        this.daterangepicker.setStartDate(this.monthStartDatepicker.getDate());
        this.daterangepicker.setEndDate(
          moment(this.monthEndDatepicker.getDate()).endOf('month')
        );
      } else {
        this.processInput();
      }
    });
    $('.all-projects-radio').on('change', e => {
      $('.site-selector').toggleClass('disabled', e.target.value === '1');

      if (e.target.value === '0' && !$(config.select2Input).select2('val')) {
        this.resetView();
        return this.setSelect2Defaults(config.defaults.projects);
      }

      this.processInput();
    });
    $('.sort-link').on('click', e => {
      const sortType = $(e.currentTarget).data('type');
      this.direction = this.sort === sortType ? -this.direction : 1;
      this.sort = sortType;
      this.updateTable();
    });
    $('.clear-pages').on('click', () => {
      this.resetView(true);
      this.focusSelect2();
    });
  }

  /**
   * Removes chart, messages, and resets site selections
   * @param {boolean} [select2] whether or not to clear the Select2 input
   * @param {boolean} [clearMessages] whether or not to clear any exisitng errors from view
   * @override
   */
  resetView(select2 = false, clearMessages = true) {
    super.resetView(select2, clearMessages);
    $('.output-list').html('');
    $('.single-site-ranking').html('');
    $('.single-site-stats').html('');
    $('.single-site-legend').html('');
    $('.site-selector').removeClass('disabled');
  }

  /**
   * Query the API for each site, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @param {string} [removedSite] - site that was just removed via Select2, supplied by select2:unselect handler
   * @return {null}
   */
  processInput(force, removedSite) {
    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && location.search === this.params && this.prevChartType === this.chartType) {
      return;
    }

    this.params = location.search;

    const sites = this.isAllProjects()
      ? ['all-projects']
      : ($(config.select2Input).select2('val') || []);

    if (!sites.length) {
      return this.resetView();
    }

    this.patchUsage();

    this.setInitialChartType(sites.length);

    // clear out old error messages unless the is the first time rendering the chart
    if (this.prevChartType) this.clearMessages();

    this.prevChartType = this.chartType;
    this.destroyChart();
    this.startSpinny();

    if (removedSite) {
      // we've got the data already, just removed a single page so we'll remove that data
      // and re-render the chart
      this.outputData = this.outputData.filter(entry => entry.label !== removedSite.descore());
      this.outputData = this.outputData.map(entity => {
        return Object.assign({}, entity, this.config.chartConfig[this.chartType].dataset(entity.color));
      });
      this.updateChart();
    } else {
      this.getSiteStats(sites).then(() => {
        this.getPageViewsData(sites).done(xhrData => this.updateChart(xhrData));
      });
    }
  }

  /**
   * Update the page comparison table, shown below the chart
   * @return {null}
   */
  updateTable() {
    if (this.outputData.length === 1) {
      return this.showSinglePageLegend();
    } else {
      $('.single-site-stats').html('');
      $('.single-site-ranking').html('');
    }

    $('.output-list').html('');

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

    $('.sort-link .glyphicon').removeClass('glyphicon-sort-by-alphabet-alt glyphicon-sort-by-alphabet').addClass('glyphicon-sort');
    const newSortClassName = parseInt(this.direction, 10) === 1 ? 'glyphicon-sort-by-alphabet-alt' : 'glyphicon-sort-by-alphabet';
    $(`.sort-link--${this.sort} .glyphicon`).addClass(newSortClassName).removeClass('glyphicon-sort');

    datasets.forEach((item, index) => {
      $('.output-list').append(this.config.templates.tableRow(this, item));
    });

    // add summations to show up as the bottom row in the table
    const sum = datasets.reduce((a,b) => a + b.sum, 0);
    let totals = {
      label: $.i18n('num-projects', this.formatNumber(datasets.length), datasets.length),
      sum,
      average: Math.round(sum / this.numDaysInRange()),
    };
    ['pages', 'articles', 'edits', 'images', 'users', 'activeusers', 'admins'].forEach(type => {
      totals[type] = datasets.reduce((a, b) => a + b[type], 0);
    });
    $('.output-list').append(this.config.templates.tableRow(this, totals, true));

    $('.table-view').show();
  }

  /**
   * Get value of given page for the purposes of column sorting in table view
   * @param  {object} item - page name
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    if (type === 'active-users') {
      return Number(item.activeusers);
    } else if (type === 'label') {
      return item.label;
    }
    return Number(item[type]);
  }

  /**
   * Get link to site, or message if querying for all sites
   * @override
   */
  getSiteLink(site) {
    if (this.isAllProjects()) {
      return `<a target='_blank' href='https://www.wikimedia.org/'>${$.i18n('all-of-wikimedia')}</a>`;
    }
    return super.getSiteLink(site);
  }

  /**
   * Show info below the chart when there is only one site being queried
   */
  showSinglePageLegend() {
    const site = this.outputData[0];
    let pageviewsMsg = 'num-pageviews';

    if (this.isUniqueDevices()) {
      pageviewsMsg = 'num-unique-devices';
    } else if (this.isPagecounts()) {
      pageviewsMsg = 'num-pagecounts';
    }

    $('.table-view').hide();
    $('.single-site-stats').html(`
      ${this.getSiteLink(site.label)}
      &middot;
      <span class='text-muted'>
        ${$(this.config.dateRangeSelector).val()}
      </span>
      &middot;
      ${$.i18n(pageviewsMsg, this.formatNumber(site.sum), site.sum)}
      <span class='hidden-lg'>
        (${this.formatNumber(site.average)}/${$.i18n(this.isMonthly() ? 'month' : 'day')})
      </span>
    `);
    $('.single-site-legend').html(
      this.config.templates.chartLegend(this)
    );
  }

  /**
   * Extends super.validateParams to handle special conditional params specific to Siteviews
   * @param {Object} params - params as fetched by this.parseQueryString()
   * @returns {Object} same params with some invalid parameters correted, as necessary
   * @override
   */
  validateParams(params) {
    if (['unique-devices', 'pagecounts'].includes(params.source)) {
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

$(() => {
  new SiteViews();
});
