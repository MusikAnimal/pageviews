/**
 * Siteviews Analysis tool
 * @link https://tools.wmflabs.org/siteviews
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
    this.$platformSelector.val(params.platform);

    this.validateDateRange(params);

    if (params.source === 'pageviews') {
      this.$agentSelector.val(params.agent);
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
      platform: this.$platformSelector.val(),
      source: $(this.config.dataSourceSelector).val()
    };

    if (this.isPageviews()) {
      params.agent = this.$agentSelector.val();
    }

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in config.specialRanges, constructed like `{range: 'last-month'}`,
     *   or a relative range like `{range: 'latest-N'}` where N is the number of days.
     */
    if (this.specialRange && specialRange) {
      params.range = this.specialRange.range;
    } else {
      [params.start, params.end] = this.getDates(true);
    }

    /** add autolog param only if it was passed in originally, and only if it was false (true would be default) */
    if (this.noLogScale) params.autolog = 'false';

    return params;
  }

  /**
   * Replaces history state with new URL query string representing current user input.
   * Called whenever we go to update the chart.
   * @override
   */
  pushParams() {
    super.pushParams('sites');
  }

  /**
   * Sets up the site selector and adds listener to update chart
   */
  setupSelect2() {
    let params = {
      ajax: {
        transport: (params, success) => {
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
    super.setupSelect2(params);
  }

  /**
   * Set options for the Platform dropdown based on whether we're showing
   *   pageviews vs unique devices or pagecounts
   */
  setPlatformOptionValues() {
    this.$platformSelector.find('option').each((index, el) => {
      $(el).prop('value', this.isPageviews() ? $(el).data('value') : $(el).data('ud-value'));
    });
  }

  /**
   * Setup listeners for the data source selector, and initialize values for the platform dropdown
   */
  setupDataSourceSelector() {
    this.setPlatformOptionValues();

    $(this.config.dataSourceSelector).on('change', () => {
      const platform = this.$platformSelector.val() || '',
        wasMobileValue = platform.includes('mobile'),
        wasPagecounts = this.params ? this.params.includes('pagecounts') : false;

      if (this.isPageviews()) {
        $('.site-selector').toggleClass('disabled', $('#all-projects').is(':checked'));
        $('.all-projects-selector').show();
        $('.platform-select--mobile-web, .platform-select--mobile-app').show();
        $('.platform-select--mobile').hide();
        this.$agentSelector.prop('disabled', false);
      } else { // applies to unique devices and pagecounts
        $('.site-selector').removeClass('disabled');
        $('.all-projects-selector').hide();
        $('.platform-select--mobile-web, .platform-select--mobile-app').hide();
        $('.platform-select--mobile').show();
        this.$agentSelector.val('user').prop('disabled', true);
      }

      this.setPlatformOptionValues();

      // If we're going from a mobile value select a corresponding mobile value for the new data source.
      // Desktop and all-access share the same options so we don't need to add logic for those options.
      if (wasMobileValue && !this.isPageviews()) {
        this.$platformSelector.val('mobile-site'); // chart will automatically re-render
      } else if (wasMobileValue && this.isPageviews()) {
        this.$platformSelector.val('mobile-web');
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

    $.merge(this.$platformSelector, this.$agentSelector).on('change', this.processInput.bind(this));
    $('.all-projects-radio').on('change', e => {
      $('.site-selector').toggleClass('disabled', e.target.value === '1');

      if (e.target.value === '0' && !this.getEntities()) {
        this.resetView();
        return this.setSelect2Defaults(config.defaults.projects);
      }

      this.processInput();
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
    this.$outputList.html('');
    $('.single-entity-ranking').html('');
    $('.single-site-stats').html('');
    $('.single-site-legend').html('');
    $('.site-selector').removeClass('disabled');
  }

  /**
   * Get the site domains from the Select2 input.
   * @return {array}
   * @override
   */
  getEntities() {
    return this.isAllProjects()
      ? ['all-projects']
      : super.getEntities();
  }

  /**
   * Query the API for each site, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @param {string} [removedSite] - site that was just removed via Select2, supplied by select2:unselect handler
   * @return {void}
   */
  processInput(force, removedSite) {
    const sites = this.beforeProcessInput(force);
    if (!sites) {
      return;
    }

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
   */
  updateTable() {
    const datasets = this.beforeUpdateTable();
    if (!datasets) {
      return;
    }

    datasets.forEach(item => {
      this.$outputList.append(this.config.templates.tableRow(this, item));
    });

    // add summations to show up as the bottom row in the table
    const sum = datasets.reduce((a,b) => a + b.sum, 0);
    let totals = {
      label: $.i18n('num-projects', this.formatNumber(datasets.length), datasets.length),
      sum,
      average: Math.round(sum / (datasets[0].data.filter(el => el !== null)).length),
    };
    ['pages', 'articles', 'edits', 'images', 'users', 'activeusers', 'admins'].forEach(type => {
      totals[type] = datasets.reduce((a, b) => a + b[type], 0);
    });
    this.$outputList.append(this.config.templates.tableRow(this, totals, true));

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
  showSingleEntityLegend() {
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
        ${this.$dateRangeSelector.val()}
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
}

$(() => {
  new SiteViews();
});
