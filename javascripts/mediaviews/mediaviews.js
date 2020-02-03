/**
 * Mediaviews Analysis tool
 * @link https://tools.wmflabs.org/mediaviews
 */

const config = require('./config');
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');

/** Main MediaViews class */
class MediaViews extends mix(Pv).with(ChartHelpers) {
  /**
   * Set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'mediaviews';
    this.specialRange = null;
    this.entityInfo = { entities: {} };

    // Keep track of last valid start/end of month (when date type is set to month).
    // This is because the bootstrap datepicker library does not handle this natively
    this.monthStart = this.initialMonthStart;
    this.monthEnd = this.maxMonth;

    /**
     * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
     * caused by race conditions between consecutive ajax calls. They are actually
     * not critical and can be avoided with this empty function.
     */
    window.fileSuggestionCallback = $.noop;
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   */
  initialize() {
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
    /** show loading indicator and add error handling for timeouts */
    this.startSpinny();

    let params = this.validateParams(
      this.parseQueryString('files')
    );

    this.$projectInput.val(params.project);
    this.$agentSelector.val(params.agent);
    $('#referer-select').val(params.referer);

    this.setupDateRangeSelector();
    this.validateDateRange(params);
    this.resetSelect2();

    let noFiles = !params.files || !params.files.length || (params.files.length === 1 && !params.files[0]);

    if (noFiles) {
      this.resetView();
      this.setInitialChartType();
      // leave Select2 empty and put focus on it so they can type in pages.
      // setTimeout is used to let the rendering threads catch up.
      setTimeout(this.focusSelect2.bind(this));
      return;
    } else if (!noFiles && params.files.length > 10) {
      params.files = params.files.slice(0, 10); // max 10 files
    }

    this.setInitialChartType(params.files.length);

    /**
     * Sets the Select2 defaults, which triggers the Select2 listener and calls this.processInput
     */
    this.getFileInfo(params.files.unique()).then(fileInfo => {
      const normalizedFileNames = Object.keys(fileInfo.entities);

      // all given pages were invalid, reset view without clearing the error message
      if (!normalizedFileNames.length) return this.resetView(false, false);

      this.setSelect2Defaults(
        this.underscorePageNames(normalizedFileNames)
      );
    });
  }

  /**
   * Get statistics for the given files
   * @param  {Array} files - file names, ['Example.wav', 'Example.webm', ...]
   * @return {Deferred} Promise resolving with the stats for each file
   */
  getFileInfo(files) {
    let dfd = $.Deferred();

    // Don't re-query for files we already have data on.
    const currentFiles = Object.keys(this.entityInfo.entities);
    files = files.filter(file => {
      return !currentFiles.includes(file.descore());
    });

    // We've already got data on all the files
    if (!files.length) {
      return dfd.resolve({});
    }

    // First make array of pages *fully* URI-encoded so we can easily reference them
    // The issue is the API only returns encoded file names, so we have to reliably be
    //   able to encode that and reference the original array
    try {
      files = files.map(file => encodeURIComponent(decodeURIComponent(`File:${file}`)));
    } catch (e) {
      // nothing, this happens when they use an unencoded title like %
      //   that JavaScript gets confused about when decoding
    }

    $.ajax({
      url: `https://${this.project}.org/w/api.php?action=query&prop=imageinfo&` +
        `iiprop=mediatype|size|timestamp|url&formatversion=2&format=json&titles=${files.join('|')}`,
      dataType: 'jsonp'
    }).done(data => {
      // restore original order of files, taking into account out any file names that were normalized
      if (data.query.normalized) {
        data.query.normalized.forEach(n => {
          // API returns decoded page name, so encode and compare against original array
          files[files.indexOf(encodeURIComponent(n.from))] = encodeURIComponent(n.to);
        });
      }
      let fileData = this.entityInfo.entities || {};
      files.forEach(file => {
        // decode once more so the return fileData object is human-readable
        try {
          file = decodeURIComponent(file);
        } catch (e) {
          // same as above, catch error when JavaScript is unable to decode
        }
        let fileInfo = data.query.pages.find(p => p.title === file);

        // Throw error and remove from list if missing
        if (fileInfo.missing) {
          this.writeMessage(`${this.getFileLink(file)}: ${$.i18n('api-error-no-data')}`);
          return;
        }

        // Otherwise normalize data down to just what we want (imageinfo hash)
        fileInfo = fileInfo.imageinfo && fileInfo.imageinfo[0] ? fileInfo.imageinfo[0] : {};

        fileData[file.replace(/^File:/, '').descore()] = Object.assign({
          title: file,
          path: decodeURIComponent((fileInfo.url || '').replace('https://upload.wikimedia.org', ''))
        }, fileInfo);
      });

      this.entityInfo = { entities: fileData };

      return dfd.resolve(this.entityInfo);
    }).fail(() => {
      dfd.resolve({}); // Simply won't show the data if it could not be fetched
    });

    return dfd;
  }

  /**
   * Get all user-inputted parameters except the files
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} project, referer, agent, etc.
   */
  getParams(specialRange = true) {
    let params = {
      project: this.$projectInput.val(),
      platform: this.$platformSelector.val(),
      referer: $('#referer-select').val()
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in this.config.specialRanges, constructed like `{range: 'last-month'}`,
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
   * Push relevant class properties to the query string
   * Called whenever we go to update the chart
   */
  pushParams() {
    const entities = this.getEntities();

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&files=${entities.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&files=${entities.join('%7C')}`);
  }

  /**
   * Get the file names from the Select2 input.
   * @return {array}
   */
  getEntities() {
    return $(this.config.select2Input).select2('val') || [];
  }

  /**
   * Sets up the file selector and adds listener to update chart
   */
  setupSelect2() {
    const $select2Input = $(this.config.select2Input);

    let params = {
      ajax: {
        url: `https://${this.project}.org/w/api.php`,
        dataType: 'jsonp',
        delay: 200,
        jsonpCallback: 'fileSuggestionCallback',
        data: search => {
          return {
            action: 'query',
            list: 'allimages',
            format: 'json',
            aifrom: search.term || '',
            aiprop: ''
          };
        },
        processResults: data => {
          const query = data ? data.query : {};
          let results = [];

          if (!query) return {results};

          if (query.allimages.length) {
            let titles = query.allimages.map(elem => elem.name);

            results = titles.map(filename => {
              return {
                id: filename.score(),
                text: filename
              };
            });
          }
          return {results};
        },
        cache: true
      },
      placeholder: $.i18n('article-placeholder'),
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
   * General place to add page-wide listeners
   * @override
   */
  setupListeners() {
    super.setupListeners();
    $('#referer-select, #agent-select').on('change', this.processInput.bind(this));
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
   * Removes chart, messages, and resets file selections.
   * @param {boolean} [select2] whether or not to clear the Select2 input
   * @param {boolean} [clearMessages] whether or not to clear any existing errors from view
   * @override
   */
  resetView(select2 = false, clearMessages = true) {
    super.resetView(select2, clearMessages);
    this.$outputList.html('');
    $('.single-entity-stats').html('');
    $('.single-entity-legend').html('');
    $('.file-selector').removeClass('disabled');
  }

  /**
   * Query the API for each file, building up the datasets and then calling renderData
   * @param {boolean} force - whether to force the chart to re-render, even if no params have changed
   * @param {string} [removedFile] - file that was just removed via Select2, supplied by select2:unselect handler
   */
  processInput(force, removedFile) {
    this.pushParams();

    /** prevent duplicate querying due to conflicting listeners */
    if (!force && location.search === this.params && this.prevChartType === this.chartType) {
      return;
    }

    // clear out old error messages unless the is the first time rendering the chart
    if (this.prevChartType) this.clearMessages();

    this.params = location.search;

    this.processFiles(removedFile);
  }

  /**
   * Get URL to the mediaviews API endpoint for the given file.
   * @param {String} file
   * @param {moment} startDate
   * @param {moment} endDate
   * @returns {String}
   */
  getMvApiUrl(file, startDate, endDate) {
    const granularity = $('#date-type-select').val() || 'daily',
      agent = this.$agentSelector.val() || this.config.defaults.agent;
    return `https://wikimedia.org/api/rest_v1/metrics/mediarequests/per-file/${$('#referer-select').val()}` +
        `/${agent}/${encodeURIComponent(file)}/${granularity}/` +
        `${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`;
  }

  /**
   * Process a set of files set in the Select2 input.
   * @param {string} [removedFile] - file that was just removed via Select2, supplied by select2:unselect handler
   * @return {void}
   */
  processFiles(removedFile) {
    const files = $(config.select2Input).select2('val') || [];

    if (!files.length) {
      return this.resetView();
    }

    this.patchUsage();

    this.setInitialChartType(files.length);

    // clear out old error messages unless the is the first time rendering the chart
    if (this.prevChartType) this.clearMessages();

    this.prevChartType = this.chartType;
    this.destroyChart();
    this.startSpinny();

    if (removedFile) {
      // we've got the data already, just removed a single page so we'll remove that data
      // and re-render the chart
      this.outputData = this.outputData.filter(entry => entry.label !== removedFile.descore());
      this.outputData = this.outputData.map(entity => {
        return Object.assign({}, entity, this.config.chartConfig[this.chartType].dataset(entity.color));
      });
      delete this.entityInfo.entities[removedFile];
      this.updateChart();
    } else {
      this.getFileInfo(files).then(() => {
        this.getRequestCounts(files).done(xhrData => {
          this.updateChart(xhrData);
        });
      });
    }
  }

  /**
   * Get and process media requests for the given files
   * @param  {Array} files - File names without File: prefix
   * @return {Deferred} Promise resolving with data
   */
  getRequestCounts(files) {
    let dfd = $.Deferred(),
      totalRequestCount = files.length,
      failedFiles = [],
      count = 0;

    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    /**
     * everything we need to keep track of for the promises
     * @type {Object}
     */
    let xhrData = {
      entities: files,
      labels: [], // Labels (dates) for the x-axis.
      datasets: new Array(totalRequestCount), // Data for each article timeseries
      errors: [], // Queue up errors to show after all requests have been made
      fatalErrors: [], // Unrecoverable JavaScript errors
      promises: []
    };

    const makeRequest = (file, index) => {
      const url = this.getMvApiUrl(this.entityInfo.entities[file.descore()].path, startDate, endDate),
        promise = $.ajax({ url, dataType: 'json' });

      xhrData.promises.push(promise);

      promise.done(successData => {
        try {
          const fileIndex = xhrData.entities.indexOf(file);
          xhrData.datasets[fileIndex] = successData.items;

          /** fetch the labels for the x-axis on success if we haven't already */
          if (successData.items && !xhrData.labels.length) {
            xhrData.labels = successData.items.map(elem => {
              return moment(elem.date, this.config.timestampFormat).format(this.dateFormat);
            });
          }
        } catch (err) {
          return xhrData.fatalErrors.push(err);
        }
      }).fail(errorData => {
        // remove this file from the list of files to analyze
        const fileIndex = xhrData.entities.indexOf(file);
        xhrData.entities.splice(fileIndex, 1);
        xhrData.datasets.splice(fileIndex, 1);

        let link = this.getFileLink(file);

        xhrData.errors.push(
          `${link}: ${$.i18n('api-error', 'Media requests API')} - ${errorData.responseJSON.title}`
        );
      }).always(() => {
        if (++count === totalRequestCount) {
          dfd.resolve(xhrData);

          if (failedFiles.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedFiles.map(failedFile => `<li>${this.getFileLink(failedFile)}</li>`).join('') +
              '</ul>'
            ));
          }
        }
      });
    };

    files.forEach((file, index) => makeRequest(file, index));

    return dfd;
  }

  /**
   * Update the page comparison table, shown below the chart
   * @return {null}
   */
  updateTable() {
    if (this.outputData.length === 1) {
      return this.showSingleEntityLegend();
    } else {
      $('.single-entity-stats').html('');
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

    $('.sort-link .glyphicon').removeClass('glyphicon-sort-by-alphabet-alt glyphicon-sort-by-alphabet').addClass('glyphicon-sort');
    const newSortClassName = parseInt(this.direction, 10) === 1 ? 'glyphicon-sort-by-alphabet-alt' : 'glyphicon-sort-by-alphabet';
    $(`.sort-link--${this.sort} .glyphicon`).addClass(newSortClassName).removeClass('glyphicon-sort');

    datasets.forEach((item, index) => {
      this.$outputList.append(this.config.templates.tableRow(this, item));
    });

    // add summations to show up as the bottom row in the table
    const sum = datasets.reduce((a,b) => a + b.sum, 0);
    let totals = {
      label: $.i18n('num-files', this.formatNumber(datasets.length), datasets.length),
      sum,
      average: Math.round(sum / this.numDaysInRange()),
    };
    ['duration', 'size'].forEach(type => {
      totals[type] = datasets.reduce((a, b) => a + b[type], 0);
    });

    this.$outputList.append(this.config.templates.tableRow(this, totals, true));

    // Hide duration column if no data available (no files are videos).
    $('.table-view--duration').toggle(datasets.some(ds => !!ds.duration));

    $('.table-view').show();
  }

  /**
   * Get value of given page for the purposes of column sorting in table view
   * @param  {object} item - page name
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    if (type === 'file') {
      return item.title;
    } else if (type === 'requests') {
      return item.sum;
    } else if (type === 'date') {
      return moment(this.formatTimestamp(item.timestamp), this.dateFormat).unix();
    } else if (type === 'type') {
      return item.mediatype;
    }
    return Number(item[type]);
  }

  /**
   * Get link to file
   * @param {string} file - Page title with or without File: prefix
   * @returns {string} Markup
   */
  getFileLink(file) {
    return super.getPageLink(
      this.addNamespace(file),
      this.project,
      file.replace(/^File:/, '')
    );
  }

  /**
   * Format timestamp return from MediaWiki API
   * @param  {string} timestamp Should be in the form YYYY-MM-DDTHH:MM:SSZ
   * @return {string} Formatted according to this.dateFormat
   */
  formatTimestamp(timestamp) {
    return moment(timestamp.substring(0, 10), 'YYYY-MM-DD').format(this.dateFormat);
  }

  /**
   * Add or remove namespace from file
   * @param {string} entity File name
   * @param {boolean} [readd] Make sure the namespace IS there, but only once
   * @returns {string}
   */
  stripNamespace(entity, readd = false) {
    entity = entity.replace(/^File:/, '');
    return readd ? `File:${entity}` : entity;
  }

  /**
   * Add namespace to file name
   * @param {string} entity File name
   * @returns {string}
   */
  addNamespace(entity) {
    return this.stripNamespace(entity, true);
  }

  /**
   * Show info below the chart when there is only one file being queried
   */
  showSingleEntityLegend() {
    const file = this.outputData[0];

    $('.table-view').hide();
    $('.single-entity-stats').html(`
      ${this.getFileLink(this.addNamespace(file.label))}
      &middot;
      <span class='text-muted'>
        ${this.$dateRangeSelector.val()}
      </span>
      &middot;
      ${$.i18n('num-requests', this.formatNumber(file.sum), file.sum)}
      <span class='hidden-lg'>
        (${this.formatNumber(file.average)}/${$.i18n('day')})
      </span>
    `);
    $('.single-entity-legend').html(
      this.config.templates.chartLegend(this)
    );
  }

  /**
   * Calls parent setupProjectInput and updates the view if validations passed
   *   reverting to the old value if the new one is invalid
   * @override
   */
  validateProject() {
    if (super.validateProject()) {
      this.resetView(true);
      this.focusSelect2();
    }
  }
}

$(() => {
  new MediaViews();
});
