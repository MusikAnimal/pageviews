/**
 * Massviews Analysis tool
 * @link https://tools.wmflabs.org/massviews
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');
const ListHelpers = require('../shared/list_helpers');

/** Main MassViews class */
class MassViews extends mix(Pv).with(ChartHelpers, ListHelpers) {
  /**
   * set instance variables and boot the app via pv.constructor
   * @override
   */
  constructor() {
    super(config);
    this.app = 'massviews';
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   */
  initialize() {
    this.assignDefaults();
    this.setupDateRangeSelector();
    this.popParams();
    this.setupListeners();

    /** only show options for line, bar and radar charts */
    $('.multi-page-chart-node').hide();
  }

  /**
   * Add general event listeners.
   * @override
   */
  setupListeners() {
    super.setupListeners();
    $('.source-option').on('click', e => this.updateSourceInput(e.target));
  }

  /**
   * Copy necessary default values to class instance.
   * Called when the view is reset.
   */
  assignDefaults() {
    ['sort', 'source', 'direction', 'outputData', 'hadFailure', 'total', 'view', 'subjectpage'].forEach(defaultKey => {
      this[defaultKey] = this.config.defaults[defaultKey];
    });
  }

  /**
   * Show/hide form elements based on the selected source
   * @param  {Object} node - HTML element of the selected source
   */
  updateSourceInput(node) {
    const source = this.source = node.dataset.value;

    $('#source_button').data('value', source).html(`${node.textContent} <span class='caret'></span>`);

    this.$sourceInput.prop('type', this.config.sources[source].type)
      .prop('placeholder', this.config.sources[source].placeholder)
      .val('');

    $('.source-description').html(
      $.i18n(`massviews-${source}-description`, ...this.config.sources[source].descriptionParams())
    );

    if (source === 'category') {
      $('.category-options').show();
    } else {
      $('.category-options').hide();
    }

    if (['quarry', 'external-link', 'search'].includes(source)) {
      $('.massviews-source-input').addClass('project-enabled');
      $('.project-input').prop('disabled', false);
    } else {
      $('.massviews-source-input').removeClass('project-enabled');
      $('.project-input').prop('disabled', true);
    }

    this.$sourceInput.focus();
  }

  /**
   * Get the base project name (without language and the .org)
   * @returns {string} project name
   */
  get baseProject() {
    return this.project.split('.')[1];
  }

  /**
   * Get user-inputted parameters except the target.
   * @param {boolean} [forCacheKey] whether or not to include the page name, and exclude sort and direction
   *   in the returned object. This is for the purposes of generating a unique cache key for params affecting the API queries
   * @return {Object} project, platform, agent, etc.
   */
  getParams(forCacheKey = false) {
    let params = {
      platform: this.$platformSelector.val(),
      agent: this.$agentSelector.val(),
      source: $('#source_button').data('value')
    };

    /**
     * Override start and end with custom range values, if configured (set by URL params or setupDateRangeSelector)
     * Valid values are those defined in this.config.specialRanges, constructed like `{range: 'last-month'}`,
     *   or a relative range like `{range: 'latest-N'}` where N is the number of days.
     */
    if (this.specialRange && !forCacheKey) {
      params.range = this.specialRange.range;
    } else {
      params.start = this.daterangepicker.startDate.format('YYYY-MM-DD');
      params.end = this.daterangepicker.endDate.format('YYYY-MM-DD');
    }

    if (params.source === 'category') {
      params.subjectpage = $('.category-subject-toggle--input').is(':checked') ? '1' : '0';
      params.subcategories = $('.subcategories-toggle--input').is(':checked') ? '1' : '0';
    } else if (['quarry', 'external-link', 'search'].includes(params.source)) {
      params.project = $('.project-input').val();
    }

    if (!forCacheKey) {
      params.sort = this.sort;
      params.direction = this.direction;
      params.view = this.view;

      /** add autolog param only if it was passed in originally, and only if it was false (true would be default) */
      if (this.noLogScale) params.autolog = 'false';
    }

    return params;
  }

  /**
   * Push relevant class properties to the query string
   * @param {Boolean} clear - whether to clear the query string entirely
   * @override
   */
  pushParams(clear = false) {
    super.pushParams('target', clear);
  }

  /**
   * Render list of massviews into view
   * @override
   */
  renderData() {
    super.renderData(sortedDatasets => {
      const source = $('#source_button').data('value');
      let pageColumnMessage;

      // update message for pages column
      if (['wikilinks', 'subpages', 'transclusions'].includes(source)) {
        const num = sortedDatasets.length - (source === 'subpages' ? 1 : 0);
        pageColumnMessage = $.i18n(`num-${source}`, this.formatNumber(num), num);
      } else {
        pageColumnMessage = $.i18n('num-pages', this.formatNumber(sortedDatasets.length), sortedDatasets.length);
      }

      $('.output-totals').html(
        `<th scope='row'>${$.i18n('totals')}</th>
         <th>${$.i18n(pageColumnMessage, sortedDatasets.length)}</th>
         <th>${this.formatNumber(this.outputData.sum)}</th>
         <th>${this.formatNumber(Math.round(this.outputData.average))}</th>`
      );
      $('#output_list').html('');

      sortedDatasets.forEach((item, index) => {
        $('#output_list').append(
          `<tr>
           <th scope='row'>${index + 1}</th>
           <td>${this.getPageLink(item.label, item.project)}</td>
           <td><a target="_blank" href='${this.getPageviewsURL(item.project, item.label)}'>${this.formatNumber(item.sum)}</a></td>
           <td>${this.formatNumber(Math.round(item.average))} / ${$.i18n('day')}</td>
           </tr>`
        );
      });
    });
  }

  /**
   * Get value of given langview entry for the purposes of column sorting
   * @param  {object} item - langview entry within this.outputData
   * @param  {String} type - type of property to get
   * @return {String|Number} - value
   */
  getSortProperty(item, type) {
    switch (type) {
    case 'original':
      return item.index;
    case 'title':
      return item.label;
    case 'views':
      return Number(item.sum);
    }
  }

  /**
   * Loop through given pages and query the pageviews API for each
   *   Also updates this.outputData with result
   * @param  {Array} pages - list of page names or full URLs to pages
   * @param  {String} [project] - project such as en.wikipedia.org
   *   If null pages is assumed to be an array of page URLs
   * @return {Deferred} - Promise resolving with data ready to be rendered to view
   */
  getPageViewsData(pages, project) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    let dfd = $.Deferred(), count = 0, failureRetries = {},
      totalRequestCount = pages.length, failedPages = [], pageViewsData = [];

    const makeRequest = page => {
      let queryProject;

      // if there's no project that means page is a URL to the page
      if (!project) {
        [queryProject, page] = this.getWikiPageFromURL(page);
      } else {
        queryProject = project;
      }

      const uriEncodedPageName = encodeURIComponent(page);
      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${queryProject}` +
        `/${this.$platformSelector.val()}/${this.$agentSelector.val()}/${uriEncodedPageName}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({ url, dataType: 'json' });

      promise.done(pvData => {
        pageViewsData.push({
          title: page,
          project: queryProject,
          items: pvData.items
        });
      }).fail(errorData => {
        /**
         * 404s are treated as having zero pageviews
         * See https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews#Gotchas
         */
        if (errorData.status === 404) {
          pageViewsData.push({
            title: page,
            project: queryProject,
            items: [],
          });
          return;
        }

        /** Schedule a re-try for Cassandra errors. */
        const errorMessage = errorData.responseJSON && errorData.responseJSON.title
          ? errorData.responseJSON.title
          : $.i18n('unknown');
        const cassandraError = errorMessage === 'Error in Cassandra table storage backend';

        if (cassandraError) {
          if (failureRetries[page]) {
            failureRetries[page]++;
          } else {
            failureRetries[page] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[page] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, 100, this)(page);
          }
        }

        if (cassandraError) {
          failedPages.push(page);
        } else {
          this.writeMessage(
            `${this.getPageLink(page, queryProject)}: ${$.i18n('api-error', 'Pageviews API')} - ${errorMessage}`
          );
        }

        // Don't cache this series of requests.
        this.hadFailure = true;
      }).always(() => {
        this.updateProgressBar(++count, totalRequestCount);

        if (count === totalRequestCount) {
          if (failedPages.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedPages.map(failedPage => `<li>${this.getPageLink(failedPage, queryProject)}</li>`).join('') +
              '</ul>'
            ));
          }

          dfd.resolve(pageViewsData);
        }
      });
    };

    const requestFn = this.rateLimit(makeRequest, this.config.apiThrottle, this);

    pages.forEach(page => requestFn(page));

    return dfd;
  }

  /**
   * Build our mother data set, from which we can draw a chart,
   *   render a list of data, whatever our heart desires :)
   * @param  {string} label - label for the dataset (e.g. category:blah, page pile 24, etc)
   * @param  {string} link - HTML anchor tag for the label
   * @param  {array} datasets - array of datasets for each article, as returned by the Pageviews API
   * @return {object} mother data set, also stored in this.outputData
   */
  buildMotherDataset(label, link, datasets) {
    /**
     * `datasets` structure:
     *
     * [{
     *   title: page,
     *   project: 'en.wikipedia.org',
     *   items: [
     *     {
     *       access: '',
     *       agent: '',
     *       article: '',
     *       granularity: '',
     *       project: '',
     *       timestamp: '',
     *       views: 10
     *     }
     *   ]
     * }]
     *
     * output structure:
     *
     * {
     *   labels: [''],
     *   listData: [
     *     {
     *       label: '',
     *       project: '',
     *       data: [1,2,3,4],
     *       sum: 10,
     *       average: 2,
     *       index: 0
     *       ...
     *       MERGE in this.config.chartConfig[this.chartType].dataset(this.config.colors[0])
     *     }
     *   ],
     *   totalViewsSet: [1,2,3,4],
     *   sum: 10,
     *   average: 2,
     *   datesWithoutData: ['2016-05-16T00:00:00-00:00']
     * }
     */

    this.outputData = {
      link, // for our own purposes
      listData: []
    };
    const startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate),
      length = this.numDaysInRange();

    let totalViewsSet = new Array(length).fill(0),
      datesWithoutData = [];

    datasets.forEach((dataset, index) => {
      /**
       * Ensure we have data for each day, using null as the view count when data is actually not available yet
       * See fillInZeros() comments for more info.
       */
      const [viewsSet, incompleteDates] = this.fillInZeros(dataset.items, startDate, endDate);
      incompleteDates.forEach(date => {
        if (!datesWithoutData.includes(date)) datesWithoutData.push(date);
      });

      const data = viewsSet.map(item => item.views),
        sum = data.reduce((a, b) => (a || 0) + (b || 0));

      this.outputData.listData.push({
        data,
        label: dataset.title,
        project: dataset.project,
        sum,
        average: sum / length,
        index
      });

      totalViewsSet = totalViewsSet.map((num, i) => num + viewsSet[i].views);
    });

    const grandSum = totalViewsSet.reduce((a, b) => (a || 0) + (b || 0));

    Object.assign(this.outputData, {
      datasets: [{
        label,
        data: totalViewsSet,
        sum: grandSum,
        average: grandSum / length
      }],
      datesWithoutData,
      sum: grandSum, // nevermind the duplication
      average: grandSum / length
    });

    if (datesWithoutData.length) {
      const dateList = datesWithoutData.map(date => moment(date).format(this.dateFormat));
      this.writeMessage($.i18n('api-incomplete-data', dateList.sort().join(' &middot; '), dateList.length));
    }

    /**
     * If there were no failures, cache the result as some datasets can be very large.
     * There is server cache but there is also processing time that local caching can eliminate
     */
    if (!this.hadFailure) {
      // 10 minutes, TTL is milliseconds
      simpleStorage.set(this.getCacheKey(), this.outputData, {TTL: 600000});
    }

    return this.outputData;
  }

  /**
   * Get a URL for the page pile with given ID
   * @param  {String|Number} id - ID of the PagePile
   * @return {String} - the URL
   */
  getPileURL(id) {
    return `http://tools.wmflabs.org/pagepile/api.php?action=get_data&id=${id}`;
  }

  /**
   * Get a link to the page pile with given ID
   * @param  {String|Number} id - ID of the PagePile
   * @return {String} - markup
   */
  getPileLink(id) {
    return `<a href='${this.getPileURL(id)}' target='_blank'>Page Pile ${id}</a>`;
  }

  /**
   * Get list of pages from Page Pile API given id
   * @param  {Number} id - PagePile ID
   * @return {Deferred} - Promise resolving with page names
   */
  getPagePile(id) {
    const dfd = $.Deferred();
    const url = `https://tools.wmflabs.org/pagepile/api.php?id=${id}&action=get_data` +
      `&format=json&metadata=1&limit=${this.config.apiLimit}`;

    $.ajax({
      url,
      dataType: 'jsonp'
    }).done(data => {
      let pages = Object.keys(data.pages);

      if (data.pages_total > this.config.apiLimit) {
        this.writeMessage(
          $.i18n(
            'massviews-oversized-set',
            this.getPileLink(id),
            this.formatNumber(data.pages_total),
            this.config.apiLimit,
            data.pages_total
          )
        );

        pages = pages.slice(0, this.config.apiLimit);
      }

      return dfd.resolve({
        id: data.id,
        wiki: data.wiki,
        pages: pages
      });
    }).fail(error => {
      return dfd.reject(
        `${this.getPileLink(id)}: ${$.i18n('api-error-no-data')}`
      );
    });

    return dfd;
  }

  /**
   * Parse wiki URL for the wiki and page name
   * @param  {String} url - full URL to a wiki page
   * @return {Array|null} ['wiki', 'page'] or null if invalid
   */
  getWikiPageFromURL(url) {
    let matches;

    if (url.includes('?')) {
      matches = url.match(/\/\/(.*?)\/w\/.*\?(?:.*\b)?title=(.*?)(?:&|$)/);
    } else {
      matches = url.match(/\/\/(.*?)\/wiki\/(.*?)(?:\?|$)/);
    }

    if (matches) {
      return [
        matches[1].replace(/^www\./, ''),
        matches[2]
      ];
    } else {
      return [null, null];
    }
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   */
  popParams() {
    let params = this.validateParams(
      this.parseQueryString()
    );
    this.validateDateRange(params);

    this.updateSourceInput($(`.source-option[data-value=${params.source}]`)[0]);

    // fill in value for the target
    if (params.target) {
      this.$sourceInput.val(decodeURIComponent(params.target).descore());
    }

    // If there are invalid params, remove target from params so we don't process the defaults.
    // FIXME: we're checking for site messages because super.validateParams doesn't return a boolean
    //   or any indication the validations failed. This is hacky but necessary.
    if ($('.site-notice .alert-danger').length) {
      delete params.target;
    } else if (params.overflow && params.source === 'pagepile' && params.target) {
      /**
       * If they requested more than 10 pages in Pageviews (via typing it in the URL)
       *   they are redirected to Massviews with an auto-generated PagePile.
       *   This shows a message explaining what happened.
       */
      this.toastInfo(
        $.i18n('massviews-redirect', $.i18n('title'), 10, this.getPileLink(params.target))
      );
    }

    this.$platformSelector.val(params.platform);
    this.$agentSelector.val(params.agent);

    /** export necessary params to outer scope */
    ['sort', 'direction', 'view', 'source', 'subjectpage'].forEach(key => {
      this[key] = params[key];
    });

    if (['quarry', 'external-link', 'search'].includes(params.source) && params.project) {
      $('.project-input').val(params.project);
    }

    if (params.subjectpage === '1') {
      $('.category-subject-toggle--input').prop('checked', true);
    }

    if (params.subcategories === '1') {
      $('.subcategories-toggle--input').prop('checked', true);
    }

    /** start up processing if necessary params are present */
    if (params.target) {
      this.processInput();
    }
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
      this.assignDefaults();
      this.destroyChart();
      $('.output').removeClass('list-mode').removeClass('chart-mode');
      $('.data-links').addClass('invisible');
      if (this.typeahead) this.typeahead.hide();
      this.$sourceInput.val('').focus();
      if (typeof cb === 'function') cb.call(this);
      break;
    case 'processing':
      this.processStarted();
      this.clearMessages();
      document.activeElement.blur();
      $('.progress-bar').addClass('active');
      break;
    case 'complete':
      this.processEnded();
      /** stop hidden animation for slight performance improvement */
      this.updateProgressBar(0);
      $('.progress-bar').removeClass('active');
      $('.data-links').removeClass('invisible');
      break;
    case 'invalid':
      break;
    }
  }

  /**
   * Helper to reset the state of the app and indicate that than API error occurred
   * @param {String} apiName - name of the API where the error occurred
   * @param {String} [errorMessage] - optional error message to show retrieved from API
   */
  apiErrorReset(apiName, errorMessage) {
    this.setState('initial', () => {
      let message;
      if (errorMessage) {
        message = `${$.i18n('api-error', apiName)}: ${errorMessage}`;
      } else {
        message = `${$.i18n('api-error-unknown', apiName)}`;
      }
      this.writeMessage(message);
    });
  }

  /**
   * Process the input as the ID of a page pile
   * @param  {Function} cb - called after processing is complete,
   *   given the label and link for the PagePile and the pageviews data
   */
  processPagePile(cb) {
    const pileId = this.$sourceInput.val();

    $('.progress-counter').text($.i18n('fetching-data', 'Page Pile API'));
    this.getPagePile(pileId).done(pileData => {
      if (!pileData.pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', this.getPileLink(pileId)));
        });
      }

      // reference siteMap hash to get project domain from database name (giant file in /shared/site_map.js)
      const project = siteMap[pileData.wiki];

      /**
       * remove Project: prefix if present, only for enwiki, for now,
       * see https://phabricator.wikimedia.org/T135437
       */
      if (project === 'en.wikipedia.org') {
        pileData.pages = pileData.pages.map(page => {
          return page.replace(/^Project:Wikipedia:/, 'Wikipedia:');
        });
      }

      this.getPageViewsData(pileData.pages, project).done(pageViewsData => {
        const label = `Page Pile #${pileData.id}`;

        // $('.output-title').text(label).prop('href', this.getPileURL(pileData.id));
        $('.output-params').html(
          `
          ${this.$dateRangeSelector.val()}
          &mdash;
          <a href="https://${project.escape()}" target="_blank">
            ${project.replace(/.org$/, '').escape()}
          </a>
          `
        );

        cb(label, this.getPileLink(pileData.id), pageViewsData);
      });
    }).fail(error => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (typeof error === 'string') {
        this.writeMessage(error);
      } else {
        this.writeMessage($.i18n('api-error-unknown', 'Page Pile'));
      }
    });
  }

  /**
   * Get pageviews data of given category in given project
   * @param {String} project - project name
   * @param {String} category - category name
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the category and the pageviews data
   */
  processCategory(project, category, cb) {
    const categoryLink = this.getPageLink(category, project);

    $('.progress-counter').text($.i18n('fetching-data', 'Category API'));

    let url = `/massviews/api.php?project=${project}&category=${category.replace(/^.*?:/, '')}`
      + `&limit=${this.config.apiLimit}`;

    if ($('.subcategories-toggle--input').is(':checked')) {
      url += '&recursive=1';
    }

    $.getJSON(url).done(pages => {
      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      if (pages.length >= this.config.apiLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set-unknown', categoryLink, this.config.apiLimit)
        );

        pages = pages.slice(0, this.config.apiLimit);
      }

      const useSubjectPage = $('.category-subject-toggle--input').is(':checked');
      const pageTitles = this.mapCategoryPageNames(pages, this.getSiteInfo(project).namespaces, useSubjectPage);

      this.getPageViewsData(pageTitles, project).done(pageViewsData => {
        cb(category, categoryLink, pageViewsData);
      });
    }).fail(data => {
      this.setState('initial');
      this.writeMessage($.i18n('api-error-unknown', categoryLink));
    });
  }

  /**
   * Process the input as a hashtag
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the hashtag and the pageviews data
   */
  processHashtag(cb) {
    const hashtag = this.$sourceInput.val().replace(/^#/, ''),
      hashTagLink = `<a target="_blank" href="http://tools.wmflabs.org/hashtags/search/${hashtag}">#${hashtag.escape()}</a>`;

    $('.progress-counter').text($.i18n('fetching-data', 'Hashtag API'));
    $.get(`//tools.wmflabs.org/hashtags/csv/${hashtag}?limit=5000`).done(data => {
      /**
       * CSVToArray code courtesy of Ben Nadel
       * http://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm
       */
      const strDelimiter = ',';

      // Create a regular expression to parse the CSV values.
      const objPattern = new RegExp(
        (
          // Delimiters.
          `(\\${strDelimiter}|\\r?\\n|\\r|^)` +
          // Quoted fields.
          '(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|' +
          // Standard fields.
          `([^\"\\${strDelimiter}\\r\\n]*))`
        ),
        'gi'
      );

      // Create an array to hold our data. Give the array a default empty first row.
      let csvData = [[]];

      // Create an array to hold our individual pattern
      // matching groups.
      let arrMatches;

      // Keep looping over the regular expression matches until we can no longer find a match.
      while (arrMatches = objPattern.exec(data)) {
        // Get the delimiter that was found.
        const strMatchedDelimiter = arrMatches[1];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
          // Since we have reached a new row of data, add an empty row to our data array.
          csvData.push([]);
        }

        let strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[2]) {
          // We found a quoted value. When we capture
          // this value, unescape any double quotes.
          strMatchedValue = arrMatches[2].replace(
            new RegExp('\"\"', 'g'), '\"'
          );
        } else {
          // We found a non-quoted value.
          strMatchedValue = arrMatches[3];
        }

        // Now that we have our value string, let's add it to the data array.
        csvData[csvData.length - 1].push(strMatchedValue);
      }

      // remove extraneous empty entry, if present
      if (csvData[csvData.length - 1].length === 1 && !csvData[csvData.length - 1][0]) {
        csvData = csvData.slice(0, -1);
      }

      // if only header row is present, reset view and throw error for being an empty set
      if (csvData.length === 1) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', hashTagLink));
        });
      }

      // collect necessary data from the other rows
      this.getPageURLsFromHashtagCSV(csvData).done(pageURLs => {
        const size = pageURLs.length;

        if (size > this.config.apiLimit) {
          this.writeMessage(
            $.i18n('massviews-oversized-set', hashTagLink, this.formatNumber(size), this.config.apiLimit, size)
          );

          pageURLs = pageURLs.slice(0, this.config.apiLimit);
        }

        this.getPageViewsData(pageURLs).done(pageViewsData => {
          cb(hashtag, hashTagLink, pageViewsData);
        });
      }).fail(() => this.apiErrorReset('Siteinfo API'));
    }).fail(() => this.apiErrorReset('Hashtag API'));
  }

  /**
   * Helper for processHashtag that parses the CSV data to get the page URLs
   * @param  {Array} csvData - as built by processHashtag
   * @return {Array} full page URLs
   */
  getPageURLsFromHashtagCSV(csvData) {
    const dfd = $.Deferred();

    // find the index of the page title, language and diff URL
    const pageTitleIndex = csvData[0].indexOf('spaced_title'),
      namespaceIndex = csvData[0].indexOf('rc_namespace'),
      diffIndex = csvData[0].indexOf('diff_url');

    let pageURLs = [];

    // collect necessary data from the other rows
    csvData.slice(1).forEach(entry => {
      const project = entry[diffIndex].match(/https:\/\/(.*?\.org)\//)[1];

      // get siteinfo so we can get the namespace names (either from cache or from API)
      this.fetchSiteInfo(project).done(() => {
        const nsName = this.getSiteInfo(project).namespaces[entry[namespaceIndex]]['*'];
        pageURLs.push(
          `https://${project}/wiki/${!!nsName ? nsName + ':' : ''}${entry[pageTitleIndex]}`
        );

        // if we're on the last iteration resolve the outer promise with the unique page names
        if (pageURLs.length === csvData.length - 1) {
          dfd.resolve(pageURLs.unique());
        }
      }).fail(() => {
        dfd.reject();
      });
    });

    return dfd;
  }

  /**
   * Get pageviews for subpages of given page and project
   * @param {String} project - project name
   * @param {String} targetPage - name of parent wiki page
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the page and the pageviews data
   */
  processSubpages(project, targetPage, cb) {
    const descoredTargetPage = targetPage.descore();

    // determine what namespace the targetPage is in
    let namespace = 0, queryTargetPage = descoredTargetPage;
    for (const ns in this.getSiteInfo(project).namespaces) {
      if (ns === '0') continue; // skip mainspace

      const nsName = this.getSiteInfo(project).namespaces[ns]['*'] + ':';
      if (descoredTargetPage.startsWith(nsName)) {
        namespace = this.getSiteInfo(project).namespaces[ns].id;
        queryTargetPage = targetPage.substring(nsName.length);
      }
    }

    // get namespace number of corresponding talk or subject page
    const inverseNamespace = namespace % 2 === 0 ? namespace + 1 : namespace - 1;

    let promises = [];

    $('.progress-counter').text($.i18n('fetching-data', 'Allpages API'));
    [namespace, inverseNamespace].forEach(apnamespace => {
      const params = {
        list: 'allpages',
        aplimit: 500,
        apnamespace,
        apprefix: queryTargetPage + '/'
      };
      promises.push(
        this.massApi(params, project, 'apcontinue', 'allpages')
      );
    });

    const pageLink = this.getPageLink(targetPage, project);

    $.when(...promises).done((data, data2) => {
      // show errors, if any
      const errors = [data, data2].filter(resp => !!resp.error);
      if (errors.length) {
        this.setState('initial', () => {
          errors.forEach(error => {
            this.writeMessage(
              `${$.i18n('api-error', 'Allpages API')}: ${error.error.info.escape()}`
            );
          });
        });
        return false;
      }

      let pages = data.allpages.concat(data2.allpages);
      const size = pages.length;

      if (size === 0) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      if (size > this.config.apiLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', pageLink, this.formatNumber(size), this.config.apiLimit, size)
        );

        pages = pages.slice(0, this.config.apiLimit);
      }

      const pageNames = [targetPage].concat(pages.map(page => page.title));

      this.getPageViewsData(pageNames, project).done(pageViewsData => {
        cb(targetPage, pageLink, pageViewsData);
      });
    }).fail(data => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (data && typeof data.error === 'string') {
        this.writeMessage(
          $.i18n('api-error', pageLink + ': ' + data.error)
        );
      } else {
        this.writeMessage($.i18n('api-error-unknown', pageLink));
      }
    });
  }

  /**
   * Get pageviews of pages that transclude the given template for given project
   * @param {String} project
   * @param {String} template - template name, can be any wiki page
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the template and the pageviews data
   */
  processTemplate(project, template, cb) {
    let requestData = {
      prop: 'transcludedin',
      tilimit: 500,
      titles: template
    };

    const templateLink = this.getPageLink(template, project);

    $('.progress-counter').text($.i18n('fetching-data', 'Transclusion API'));
    this.massApi(requestData, project, 'ticontinue', data => data.pages[0].transcludedin).done(data => {
      if (data.error) {
        return this.apiErrorReset('Transclusion API', data.error.info);
      }

      // this happens if there are no transclusions or the template could not be found
      if (!data.pages[0]) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const pages = data.pages.map(page => page.title);

      // there were more pages that could not be processed as we hit the limit
      if (data.continue) {
        this.writeMessage(
          $.i18n('massviews-oversized-set-unknown', templateLink, this.config.apiLimit)
        );
      }

      this.getPageViewsData(pages, project).done(pageViewsData => {
        cb(template, templateLink, pageViewsData);
      });
    }).fail(data => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (data && typeof data.error === 'string') {
        this.writeMessage(
          $.i18n('api-error', templateLink + ': ' + data.error)
        );
      } else {
        this.writeMessage($.i18n('api-error-unknown', templateLink));
      }
    });
  }

  /**
   * Get pageviews of pages linked on the given page on given project
   * @param {String} project
   * @param {String} page - page name
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the page and the pageviews data
   */
  processWikiPage(project, page, cb) {
    let requestData = {
      pllimit: 500,
      prop: 'links',
      titles: page
    };

    const pageLink = this.getPageLink(page, project);

    $('.progress-counter').text($.i18n('fetching-data', 'Links API'));
    this.massApi(requestData, project, 'plcontinue', data => data.pages[0].links).done(data => {
      if (data.error) {
        return this.apiErrorReset('Links API', data.error.info);
      }

      // this happens if there are no wikilinks or the page could not be found
      if (!data.pages[0]) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const pages = data.pages.map(page => page.title);

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', pageLink));
        });
      }

      // in this case we know there are more than this.config.apiLimit pages
      //   because we got back a data.continue value
      if (data.continue) {
        this.writeMessage(
          $.i18n('massviews-oversized-set-unknown', pageLink, this.config.apiLimit)
        );
      }

      this.getPageViewsData(pages, project).done(pageViewsData => {
        cb(page, pageLink, pageViewsData);
      });
    }).fail(data => {
      const errorMessage = data && typeof data.error === 'string' ? data.error : null;
      this.apiErrorReset('Links API', errorMessage);
    });
  }

  /**
   * Process the input as the ID of a Quarry dataset, getting the pageviews of results in the 'page_title' column
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the Quarry and the pageviews data
   */
  processQuarry(cb) {
    const project = $('.project-input').val(),
      id = this.$sourceInput.val();
    if (!this.validateProject(project)) return;

    const url = `https://quarry.wmflabs.org/query/${id}/result/latest/0/json`,
      quarryLink = `<a target='_blank' href='https://quarry.wmflabs.org/query/${id}'>Quarry ${id}</a>`;

    $('.progress-counter').text($.i18n('fetching-data', 'Quarry API'));
    $.getJSON(url).done(data => {
      const titleIndex = data.headers.indexOf('page_title');

      if (titleIndex === -1) {
        this.setState('initial');
        return this.writeMessage($.i18n('invalid-quarry-dataset', 'page_title'));
      }

      let titles = data.rows.map(row => row[titleIndex]);

      if (titles.length > this.config.apiLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', quarryLink, this.formatNumber(titles.length), this.config.apiLimit, titles.length)
        );

        titles = titles.slice(0, this.config.apiLimit);
      }

      this.getPageViewsData(titles, project).done(pageViewsData => {
        cb(id, quarryLink, pageViewsData);
      });
    }).fail(data => {
      this.setState('initial');
      return this.writeMessage($.i18n('api-error-unknown', 'Quarry API'), true);
    });
  }

  /**
   * Process the input as the a URL pattern for an external link,
   *   getting the pageviews of results from list=exturlusage
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the link pattern at Special:LinkSearch and the pageviews data
   */
  processExternalLink(cb) {
    const project = $('.project-input').val();
    if (!this.validateProject(project)) return;

    // get protocol, supported values: https://www.mediawiki.org/wiki/Manual:$wgUrlProtocols
    const protocolRegex = /^(?:\/\/|(ftps?|git|gopher|https?|ircs?|mms|nntp|redis|sftp|ssh|svn|telnet|worldwind):\/\/|(bitcoin|geo|magnet|mailto|news|sips?|sms|tel|urn|xmpp):)/;
    let link = this.$sourceInput.val();
    const protocol = (protocolRegex.exec(link) || [,])[1] || 'http';
    const euquery = link.replace(protocolRegex, '');

    let requestData = {
      list: 'exturlusage',
      eulimit: 500,
      eunamespace: 0,
      euprotocol: protocol,
      euquery
    };

    const linkSearchLink = `<a target='_blank' href='https://${project}/w/index.php?target=${link}&title=Special:LinkSearch'>${link}</a>`;

    $('.progress-counter').text($.i18n('fetching-data', 'External link API'));
    this.massApi(requestData, project, 'euoffset', 'exturlusage').done(data => {
      if (data.error) {
        return this.apiErrorReset('External link API', data.error.info);
      }

      // this happens if there are no external links
      if (!data.exturlusage[0]) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const pages = data.exturlusage.map(page => page.title).unique();

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', linkSearchLink));
        });
      }

      // there were more pages that could not be processed as we hit the limit
      if (data.continue) {
        this.writeMessage(
          $.i18n('massviews-oversized-set-unknown', linkSearchLink, this.config.apiLimit)
        );
      }

      this.getPageViewsData(pages, project).done(pageViewsData => {
        cb(link, linkSearchLink, pageViewsData);
      });
    }).fail(data => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (data && typeof data.error === 'string') {
        this.writeMessage(
          $.i18n('api-error', linkSearchLink + ': ' + data.error)
        );
      } else {
        this.writeMessage($.i18n('api-error-unknown', linkSearchLink));
      }
    });
  }

  /**
   * Process the input as a search query, getting the pageviews of results from list=search
   * @param {Function} cb - called after processing is complete,
   *   given the label and link for the search query at Special:Search and the pageviews data
   */
  processSearch(cb) {
    const project = $('.project-input').val();
    if (!this.validateProject(project)) return;

    let srsearch = this.$sourceInput.val();

    let requestData = {
      list: 'search',
      srlimit: 500,
      srnamespace: 0,
      srinfo: '',
      srprop: '',
      srsearch
    };

    const linkText = srsearch.length > 50 ? srsearch.slice(0, 35) + '…' : srsearch,
      linkSearchLink = `<a target='_blank' href='https://${project}/w/index.php?title=Special:Search&search=${srsearch}'>${linkText}</a>`;

    $('.progress-counter').text($.i18n('fetching-data', 'Search API'));
    this.massApi(requestData, project, 'sroffset', 'search').done(data => {
      if (data.error) {
        return this.apiErrorReset('Search API', data.error.info);
      }

      // this happens if there are no results
      if (!data.search.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const pages = data.search.map(page => page.title).unique();

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', linkSearchLink));
        });
      }

      // there were more pages that could not be processed as we hit the limit
      if (data.continue) {
        this.writeMessage(
          $.i18n('massviews-oversized-set-unknown', linkSearchLink, this.config.apiLimit)
        );
      }

      this.getPageViewsData(pages, project).done(pageViewsData => {
        cb(linkText, linkSearchLink, pageViewsData);
      });
    }).fail(data => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (data && typeof data.error === 'string') {
        this.writeMessage(
          $.i18n('api-error', linkSearchLink + ': ' + data.error)
        );
      } else {
        this.writeMessage($.i18n('api-error-unknown', linkSearchLink));
      }
    });
  }

  /**
   * Validate given project and throw an error if invalid
   * @param  {String} project - tha project
   * @return {Boolean} true or false
   */
  validateProject(project) {
    if (!project) return false;

    /** Remove www hostnames since the pageviews API doesn't expect them. */
    project = project.replace(/^www\./, '');

    if (siteDomains.includes(project)) return true;

    this.setState('initial');
    this.writeMessage(
      $.i18n('invalid-project', `<a href='//${project.escape()}'>${project.escape()}</a>`),
      true
    );

    return false;
  }

  /**
   * Get full page titles given array of objects with page title and namespace number
   * You can optionally return the subject pages of any given talk pages
   * @param  {Array} pages - page names
   * @param  {Object} namespaces - as returned by the siteInfo
   * @param  {Boolean} useSubjectPage - whether to convert any talk pages
   *                              to their corresponding subject page
   * @return {Array} - mapped page names
   */
  mapCategoryPageNames(pages, namespaces, useSubjectPage) {
    let pageNames = [];

    pages.forEach(page => {
      const ns = parseInt(page.ns, 10);
      let namespace;

      if (ns % 2 === 1 && useSubjectPage) {
        namespace = namespaces[ns - 1]['*'] || '';
      } else {
        namespace = namespaces[page.ns]['*'];
      }

      pageNames.push(`${namespace}${namespace === '' ? '' : ':'}${page.title}`);
    });

    return pageNames;
  }

  /**
   * Process the massviews for the given source and options entered
   * Called when submitting the form
   * @return {null}
   */
  processInput() {
    this.patchUsage();

    this.setState('processing');

    const readyForRendering = () => {
      $('.output-title').html(this.outputData.link);
      $('.output-params').html(this.$dateRangeSelector.val());
      this.setInitialChartType();
      this.renderData();
    };

    if (this.isRequestCached()) {
      $('.progress-bar').css('width', '100%');
      $('.progress-counter').text($.i18n('loading-cache'));
      return setTimeout(() => {
        this.outputData = simpleStorage.get(this.getCacheKey());
        readyForRendering();
      }, 500);
    }

    const cb = (label, link, datasets) => {
      $('.progress-bar').css('width', '100%');
      $('.progress-counter').text($.i18n('building-dataset'));
      setTimeout(() => {
        this.buildMotherDataset(label, link, datasets);
        readyForRendering();
      }, 250);
    };

    const source = $('#source_button').data('value');

    // special sources that don't use a wiki URL
    switch (source) {
    case 'pagepile':
      return this.processPagePile(cb);
    case 'quarry':
      return this.processQuarry(cb);
    case 'hashtag':
      return this.processHashtag(cb);
    case 'external-link':
      return this.processExternalLink(cb);
    case 'search':
      return this.processSearch(cb);
    }

    // validate wiki URL
    let [project, target] = this.getWikiPageFromURL(this.$sourceInput.val());

    if (!project || !target) {
      return this.setState('initial', () => {
        this.writeMessage($.i18n(`invalid-${source === 'category' ? 'category' : 'page'}-url`));
      });
    } else if (!this.validateProject(project)) {
      return;
    }

    // decode and remove trailing slash
    target = decodeURIComponent(target).replace(/\/$/, '');

    switch (source) {
    case 'category':
      // namespaces needed as internal Category API fetches from the replicas
      this.fetchSiteInfo(project).then(() => {
        this.processCategory(project, target, cb);
      });
      break;
    case 'subpages':
      // fetch namespaces first
      this.fetchSiteInfo(project).then(() => this.processSubpages(project, target, cb));
      break;
    case 'wikilinks':
      this.processWikiPage(project, target, cb);
      break;
    case 'transclusions':
      this.processTemplate(project, target, cb);
      break;
    }
  }

  /**
   * Exports current mass data to CSV format and loads it in a new tab
   * With the prepended data:text/csv this should cause the browser to download the data
   * @override
   */
  exportCSV() {
    let csvContent = `data:text/csv;charset=utf-8,Title,${this.getDateHeadings(false).join(',')}\n`;

    // Add the rows to the CSV
    this.outputData.listData.forEach(page => {
      const pageName = '"' + page.label.descore().replace(/"/g, '""') + '"';

      csvContent += [pageName].concat(page.data).join(',') + '\n';
    });

    this.downloadData(csvContent, 'csv');
  }
}

$(() => {
  new MassViews();
});
