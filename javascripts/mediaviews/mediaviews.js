/**
 * Mediaviews Analysis tool
 * @file Main file for Mediaviews application
 * @author MusikAnimal
 * @copyright 2016-17 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 * @requires Pv
 * @requires ChartHelpers
 */

const config = require('./config');
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');
const ListHelpers = require('../shared/list_helpers');

/** Main MediaViews class */
class MediaViews extends mix(Pv).with(ChartHelpers, ListHelpers) {
  /**
   * Set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'mediaviews';
    this.specialRange = null;
    this.entityInfo = { entities: {} };

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
    this.startSpinny();

    let params = this.parseQueryString('files');

    $(this.config.dataSourceSelector).val(params.source);
    $(this.config.platformSelector).val(params.platform);

    this.setupDateRangeSelector();
    this.validateDateRange(params);
    this.resetSelect2();

    let noFiles = !params.files || !params.files.length || (params.files.length === 1 && !params.files[0]);
    const noCategory = !params.category || !params.category.length;

    if (noFiles && noCategory) {
      params.files = this.config.defaults.files;
      noFiles = false;
    } else if (!noFiles && params.files.length > 10) {
      params.files = params.files.slice(0, 10); // max 10 files
    }

    if (noFiles) {
      $('#category_source').prop('checked', true);
    } else {
      $('#file_source').prop('checked', true);
    }
    this.setupDataSourceSelector();

    this.setInitialChartType(params.category ? 1 : params.files.length);

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
   * @param  {Array} files - file names, ['Example.wav', 'Example.webm', ...], or a single category
   * @return {Deferred} Promise resolving with the stats for each file
   */
  getFileInfo(files) {
    let dfd = $.Deferred();

    // Don't re-query for files we already have data on.
    const currentFiles = Object.keys(this.entityInfo.entities);
    files = files.filter(file => {
      return !currentFiles.includes(file);
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
      url: 'https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&' +
        `iiprop=mediatype|size|timestamp&formatversion=2&format=json&titles=${files.join('|')}`,
      dataType: 'jsonp'
    }).done(data => {
      // restore original order of files, taking into account out any file names that were normalized
      if (data.query.normalized) {
        data.query.normalized.forEach(n => {
          // API returns decoded page name, so encode and compare against original array
          files[files.indexOf(encodeURIComponent(n.from))] = encodeURIComponent(n.to);
        });
      }
      let fileData = {};
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

        // Throw error and remove from list if not audio or video
        if (!['AUDIO', 'VIDEO'].includes(fileInfo.mediatype)) {
          this.toastWarn($.i18n('invalid-media-file', this.getFileLink(file)));
          return;
        }

        fileData[file.replace(/^File:/, '')] = Object.assign({
          title: file
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
   * Get statistics for the given category
   * @param  {string} category - Category name with or without Category: prefix
   * @return {Deferred} Promise resolving with the stats
   */
  getCategoryInfo(category) {
    let dfd = $.Deferred();
    category = category.replace(/^Category:/, '');

    $.ajax({
      url: 'https://commons.wikimedia.org/w/api.php?action=query&prop=categoryinfo' +
        `&titles=Category:${category}&format=json&formatversion=2`,
      dataType: 'jsonp'
    }).done(data => {
      if (data.query.normalized) {
        category = data.query.normalized[0].to.replace(/^Category:/, '');
      }

      let categoryInfo = data.query.pages[0];

      // Throw error and remove from list if missing
      if (!categoryInfo || categoryInfo.missing) {
        return dfd.reject(`${this.getCategoryLink(category)}: ${$.i18n('api-error-no-data')}`);
      }

      // Otherwise normalize data down to just what we want (categoryinfo hash)
      categoryInfo = categoryInfo.categoryinfo;

      let categoryData = {
        [category.replace(/^Category:/, '')]: Object.assign({
          title: category
        }, categoryInfo)
      };

      this.entityInfo = { entities: categoryData };

      return dfd.resolve(this.entityInfo);
    }).fail(() => {
      // Simply won't show the data if it could not be fetched
      dfd.resolve({});
    });

    return dfd;
  }

  /**
   * Get all user-inputted parameters except the files/category
   * @param {boolean} [specialRange] whether or not to include the special range instead of start/end, if applicable
   * @return {Object} source, etc.
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
    const entities = this.getEntities(),
      targetKeyword = this.isCategory() ? 'category' : 'files';

    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title,
        `?${$.param(this.getParams())}&${targetKeyword}=${entities.join('|')}`
      );
    }

    $('.permalink').prop('href', `?${$.param(this.getPermaLink())}&${targetKeyword}=${entities.join('%7C')}`);
  }

  /**
   * Get the entity values based on whether we're query for individual files or a category.
   * @return {array}
   */
  getEntities() {
    if (this.isCategory()) {
      return [$('#category-input').val().score()];
    } else {
      return $(this.config.select2Input).select2('val') || [];
    }
  }

  /**
   * Sets up the file selector and adds listener to update chart
   */
  setupSelect2() {
    const $select2Input = $(this.config.select2Input),
      isCategory = this.isCategory();

    let params = {
      ajax: {
        url: 'https://commons.wikimedia.org/w/api.php',
        dataType: 'jsonp',
        delay: 200,
        jsonpCallback: 'fileSuggestionCallback',
        data: search => {
          return {
            action: 'query',
            list: 'prefixsearch',
            format: 'json',
            pssearch: search.term || '',
            psnamespace: this.isCategory() ? 14 : 6,
            cirrusUseCompletionSuggester: 'yes'
          };
        },
        processResults: data => {
          const query = data ? data.query : {};
          let results = [];

          if (!query) return {results};

          if (query.prefixsearch.length) {
            let titles = query.prefixsearch.map(elem => elem.title);

            if (!isCategory) {
              titles = titles.filter(filename => !/\.(png|jpe?g|gif|svg|pdf|djvu)$/.test(filename.toLowerCase()));
            }

            results = titles.map(filename => {
              const title = this.stripNamespace(filename, isCategory);
              return {
                id: title.score(),
                text: title
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
   * Setup typeahead on the category input, killing the prevous instance if present.
   */
  setupCategorySearch() {
    if (this.typeahead) this.typeahead.destroy();

    $('#category-input').typeahead({
      ajax: {
        url: 'https://commons.wikimedia.org/w/api.php',
        timeout: 200,
        triggerLength: 1,
        method: 'get',
        preDispatch: query => {
          return {
            action: 'query',
            list: 'prefixsearch',
            format: 'json',
            pssearch: query,
            psnamespace: 14
          };
        },
        preProcess: data => {
          const results = data.query.prefixsearch.map(elem => elem.title.replace(/^Category:/, ''));
          return results;
        }
      }
    });
  }

  /**
   * Get the instance of the Typeahead plugin
   * @returns {Typeahead} instance
   */
  get typeahead() {
    return $('#category-input').data('typeahead');
  }

  /**
   * Helper to set a CSS class on the `main` node,
   *   styling the document based on a 'state'
   * @param {String} state - class to be added;
   *   should be one of ['initial', 'processing', 'complete']
   * @param {function} [cb] - Optional function to be called after initial state has been set
   */
  setState(state, cb) {
    $('main').removeClass(this.config.formStates.join(' ')).addClass(state);

    switch (state) {
    case 'initial':
      this.updateProgressBar(0);
      this.clearMessages();
      // this.assignDefaults();
      this.destroyChart();
      $('.output').removeClass('list-mode').removeClass('chart-mode');
      $('aside').removeClass('disabled');
      $('.data-links').addClass('invisible');
      if (this.typeahead) this.typeahead.hide();
      $(this.config.sourceInput).val('').focus();
      if (typeof cb === 'function') cb.call(this);
      break;
    case 'processing':
      this.processStarted();
      this.clearMessages();
      document.activeElement.blur();
      $('.progress-bar').addClass('active');
      $('aside').addClass('disabled');
      break;
    case 'complete':
      this.processEnded();
      /** stop hidden animation for slight performance improvement */
      this.updateProgressBar(0);
      $('.progress-bar').removeClass('active');
      $('.data-links').removeClass('invisible');
      $('aside').removeClass('disabled');
      break;
    case 'invalid':
      break;
    }
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
    $('.clear-pages').on('click', () => {
      this.resetView(true);
      this.focusSelect2();
    });
    $('#pv_form').on('submit', e => {
      e.preventDefault(); // prevent page from reloading
      this.processInput();
    });
    $('.another-query').on('click', () => {
      this.setState('initial');
      this.pushParams(true);
    });
  }

  /**
   * Setup listeners for the data source selector, and initialize values for the platform dropdown
   */
  setupDataSourceSelector() {
    $('.data-source').on('change', e => {
      this.resetView();

      if (e.target.value === 'category') {
        this.setupCategoryInterface();
      } else {
        this.setupFileInterface();
      }
    });
  }

  /**
   * Setup listeners and what not for searching/showing results in a category.
   */
  setupCategoryInterface() {
    this.resetSelect2(false); // Destroy and don't reinitialize.
    $('.num-entities-info').hide();
    $('.file-selector').hide();
    $('.category-selector').show();
    $('#category-input').val('').focus();
    this.setupCategorySearch();
  }

  /**
   * Setup listeners and what not for searching/showing results for a given set of files.
   */
  setupFileInterface() {
    $('.num-entities-info').show();
    $('.file-selector').show();
    $('.category-selector').hide();
    this.resetSelect2();
    this.focusSelect2();
  }

  /**
   * Removes chart, messages, and resets file selections.
   * @param {boolean} [select2] whether or not to clear the Select2 input
   * @param {boolean} [clearMessages] whether or not to clear any exisitng errors from view
   * @override
   */
  resetView(select2 = false, clearMessages = true) {
    super.resetView(select2, clearMessages);
    $('.output-list').html('');
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

    if (this.isCategory()) {
      this.processCategory();
    } else {
      this.processFiles(removedFile);
    }
  }

  /**
   * Process a set of files set in the Select2 input.
   * @param {string} [removedFile] - file that was just removed via Select2, supplied by select2:unselect handler
   * @return {null}
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
      this.getFileInfo(files).then(fileInfo => {
        this.getPlayCounts(files, false).done(xhrData => {
          const fileNames = files.map(file => `File:${file}`);
          this.getPageViewsData(fileNames).done(pvData => {
            pvData = this.buildChartData(pvData.datasets, fileNames, 'views');

            // Loop through once more to supply this.entityInfo with the pageviews data
            pvData.forEach(pvEntry => {
              // Make sure file exists in this.entityInfo just as a safeguard
              const title = pvEntry.label.replace(/^File:/, '');
              if (this.entityInfo.entities[title]) {
                Object.assign(this.entityInfo.entities[title], {
                  pageviews: pvEntry.sum,
                  pageviewsAvg: pvEntry.average
                });
              }
            });

            this.updateChart(xhrData);
          });
        });
      });
    }
  }

  /**
   * Process a category set in the typeahead input.
   */
  processCategory() {
    this.setState('processing');

    this.patchUsage();

    this.getCategoryInfo($('#category-input').val()).then(() => {

    }).fail(error => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (typeof error === 'string') {
        this.writeMessage(error);
      } else {
        this.writeMessage($.i18n('api-error-unknown', 'Wikidata'));
      }
    });
  }

  /**
   * Get the Playcounts API URL for the given file and date range
   * @param  {string} file - file name without File: prefix
   * @param  {moment} startDate
   * @param  {moment} endDate
   * @param  {boolean} [category] Whether we're querying for a category (otherwise it's a file)
   * @return {string} URL
   */
  getMPCApiUrl(file, startDate, endDate, category = false) {
    const endpoint = 'https://partnermetrics.wmflabs.org/mediaplaycounts/api/2/file_playcount/' +
      `date_range/${file}/${startDate.format(this.config.mpcDateFormat)}/${endDate.format(this.config.mpcDateFormat)}`;
    return `/mediaviews/api.php?endpoint=${endpoint}`;
  }

  /**
   * Get and process playcounts for the given files
   * @param  {Array} files - File or category names without File:/Category: prefix
   * @param  {boolean} [isCategory] Whether we're querying for categories (otherwise files)
   * @return {Deferred} Promise resolving with data
   */
  getPlayCounts(files, isCategory = false) {
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
      const url = this.getMPCApiUrl(file, startDate, endDate, isCategory),
        promise = $.ajax({ url, dataType: 'json' });

      xhrData.promises.push(promise);

      promise.done(successData => {
        try {
          const fileIndex = xhrData.entities.indexOf(file);
          xhrData.datasets[fileIndex] = successData.details;

          /** fetch the labels for the x-axis on success if we haven't already */
          if (successData.details && !xhrData.labels.length) {
            xhrData.labels = successData.details.map(elem => {
              return moment(elem.date, this.config.mpcDateFormat).format(this.dateFormat);
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

        let link = this.getFileLink(file, isCategory);

        xhrData.errors.push(
          `${link}: ${$.i18n('api-error', 'Playcounts API')} - ${errorData.responseJSON.title}`
        );
      }).always(() => {
        if (++count === totalRequestCount) {
          dfd.resolve(xhrData);

          if (failedFiles.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedFiles.map(failedFile => `<li>${this.getFileLink(failedFile, isCategory)}</li>`).join('') +
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
      label: $.i18n('num-files', this.formatNumber(datasets.length), datasets.length),
      sum,
      average: Math.round(sum / this.numDaysInRange()),
    };
    ['pageviews', 'duration', 'size'].forEach(type => {
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
    if (type === 'file') {
      return item.title;
    } else if (type === 'playcounts') {
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
   * @param  {boolean} [isCategory] Whether to link to a category (otherwise it's a file)
   * @returns {string} Markup
   */
  getFileLink(file, isCategory = false) {
    return super.getPageLink(
      this.addNamespace(file, isCategory),
      'commons.wikimedia.org',
      file.replace(/^(Category|File):/, '')
    );
  }

  /**
   * Get link to category
   * @param {string} category - Page title with or without Category: prefix
   * @returns {string} Markup
   */
  getCategoryLink(category) {
    return this.getFileLink(category, true);
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
   * Get a link to view the pageviews for the given file
   * @param  {string} file File or category name with or without namespace prefix
   * @param  {string} text Link text
   * @return {string} Markup
   */
  getPageviewsLink(file, text) {
    const params = this.getParams(false), // to get start/end date values
      page = this.addNamespace(
        encodeURIComponent(file.score()).replace("'", escape),
        this.isCategory()
      );
    return `<a target='_blank' href='/pageviews?start=${params.start}&end=${params.end}` +
      `&project=commons.wikimedia.org&pages=${page}'>${text}</a>`;
  }

  /**
   * Are we querying for files or a category?
   * @returns {Boolean} yes or no
   */
  isCategory() {
    return $('#category_source').is(':checked');
  }

  /**
   * Add or remove namespace from category or file
   * @param {string} entity File or category name
   * @param {boolean} [isCategory] True if category, false if file
   * @param {boolean} [readd] Make sure the namespace IS there, but only once
   * @returns {string}
   */
  stripNamespace(entity, isCategory, readd = false) {
    const ns = isCategory ? 'Category' : 'File';
    entity = entity.replace(new RegExp(`^${ns}:`), '');
    return readd ? `${ns}:${entity}` : entity;
  }

  /**
   * Add namespace to category or file name
   * @param {string} entity File or category name
   * @param {boolean} [isCategory] True if category, false if file
   * @returns {string}
   */
  addNamespace(entity, isCategory) {
    return this.stripNamespace(entity, isCategory, true);
  }

  /**
   * Show info below the chart when there is only one file being queried
   */
  showSingleEntityLegend() {
    const file = this.outputData[0],
      isCategory = this.isCategory();

    $('.table-view').hide();
    $('.single-entity-stats').html(`
      ${this.getFileLink(this.addNamespace(file.label, isCategory), isCategory)}
      &middot;
      <span class='text-muted'>
        ${$(this.config.dateRangeSelector).val()}
      </span>
      &middot;
      ${$.i18n('num-playcounts', this.formatNumber(file.sum), file.sum)}
      <span class='hidden-lg'>
        (${this.formatNumber(file.average)}/${$.i18n('day')})
      </span>
    `);
    $('.single-entity-legend').html(
      this.config.templates.chartLegend(this)
    );
  }

  /**
   * Extends super.validateParams to handle special conditional params specific to Mediaviews
   * @param {Object} params - params as fetched by this.parseQueryString()
   * @returns {Object} same params with some invalid parameters correted, as necessary
   * @override
   */
  validateParams(params) {
    return super.validateParams(params);
  }
}

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new MediaViews();
});
