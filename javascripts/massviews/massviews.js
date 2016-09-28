/**
 * Massviews Analysis tool
 * @file Main file for Massviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
 * @requires Pv
 * @requires ChartHelpers
 * @requires ListHelpers
 */

const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const Pv = require('../shared/pv');
const ChartHelpers = require('../shared/chart_helpers');
const ListHelpers = require('../shared/list_helpers');

/** Main MassViews class */
class MassViews extends mix(Pv).with(ChartHelpers, ListHelpers) {
  constructor() {
    super(config);
    this.app = 'massviews';
  }

  /**
   * Initialize the application.
   * Called in `pv.js` after translations have loaded
   * @return {null} Nothing
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
   * Add general event listeners
   * @override
   * @returns {null} nothing
   */
  setupListeners() {
    super.setupListeners();

    $('#pv_form').on('submit', e => {
      e.preventDefault(); // prevent page from reloading
      this.processInput();
    });

    $('.another-query').on('click', () => {
      this.setState('initial');
      this.pushParams(true);
    });

    $('.sort-link').on('click', e => {
      const sortType = $(e.currentTarget).data('type');
      this.direction = this.sort === sortType ? -this.direction : 1;
      this.sort = sortType;
      this.renderData();
    });

    $('.source-option').on('click', e => this.updateSourceInput(e.target));

    $('.view-btn').on('click', e => {
      document.activeElement.blur();
      this.view = e.currentTarget.dataset.value;
      this.toggleView(this.view);
    });
  }

  /**
   * Copy necessary default values to class instance.
   * Called when the view is reset.
   * @return {null} Nothing
   */
  assignDefaults() {
    ['sort', 'source', 'direction', 'outputData', 'total', 'view', 'subjectpage'].forEach(defaultKey => {
      this[defaultKey] = this.config.defaults[defaultKey];
    });
  }

  /**
   * Show/hide form elements based on the selected source
   * @param  {Object} node - HTML element of the selected source
   * @return {null} nothing
   */
  updateSourceInput(node) {
    const source = node.dataset.value;

    $('#source_button').data('value', source).html(`${node.textContent} <span class='caret'></span>`);

    $(this.config.sourceInput).prop('type', this.config.sources[source].type)
      .prop('placeholder', this.config.sources[source].placeholder)
      .val('');

    $('.source-description').html(
      $.i18n(`massviews-${source}-description`, ...this.config.sources[source].descriptionParams())
    );

    if (source === 'category') {
      $('.category-subject-toggle').show();
    } else {
      $('.category-subject-toggle').hide();
    }

    if (source === 'quarry') {
      $('.massviews-source-input').addClass('quarry');
      $('.quarry-project').prop('disabled', false);
    } else {
      $('.massviews-source-input').removeClass('quarry');
      $('.quarry-project').prop('disabled', true);
    }

    $(this.config.sourceInput).focus();
  }

  /**
   * Get the base project name (without language and the .org)
   * @returns {boolean} projectname
   */
  get baseProject() {
    return this.project.split('.')[1];
  }

  /**
   * Get all user-inputted parameters
   * @param {boolean} [forCacheKey] whether or not to include the page name, and exclude sort and direction
   *   in the returned object. This is for the purposes of generating a unique cache key for params affecting the API queries
   * @return {Object} project, platform, agent, etc.
   */
  getParams(forCacheKey = false) {
    let params = {
      platform: $(this.config.platformSelector).val(),
      agent: $(this.config.agentSelector).val(),
      source: $(this.config.sourceButton).data('value'),
      target: $(this.config.sourceInput).val().score()
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
    } else if (params.source === 'quarry') {
      params.project = $('.quarry-project').val();
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
   * @param  {Boolean} clear - wheter to clear the query string entirely
   * @return {null} nothing
   */
  pushParams(clear = false) {
    if (!window.history || !window.history.replaceState) return;

    if (clear) {
      return history.replaceState(null, document.title, location.href.split('?')[0]);
    }

    /** only certain characters within the page name are escaped */
    window.history.replaceState({}, document.title, '?' + $.param(this.getParams()));

    $('.permalink').prop('href', `/massviews?${$.param(this.getPermaLink())}`);
  }

  /**
   * Render list of massviews into view
   * @override
   * @returns {null} nothing
   */
  renderData() {
    super.renderData(sortedDatasets => {
      const source = $('#source_button').data('value');
      let pageColumnMessage;

      // update message for pages column
      if (['wikilinks', 'subpages', 'transclusions'].includes(source)) {
        pageColumnMessage = $.i18n(`num-${source}`, sortedDatasets.length - 1);
      } else {
        pageColumnMessage = $.i18n('num-pages', sortedDatasets.length);
      }

      $('.output-totals').html(
        `<th scope='row'>${$.i18n('totals')}</th>
         <th>${$.i18n(pageColumnMessage, sortedDatasets.length)}</th>
         <th>${this.formatNumber(this.outputData.sum)}</th>
         <th>${this.formatNumber(Math.round(this.outputData.average))} / ${$.i18n('day')}</th>`
      );
      $('#output_list').html('');

      sortedDatasets.forEach((item, index) => {
        $('#output_list').append(
          `<tr>
           <th scope='row'>${index + 1}</th>
           <td><a href="https://${item.project.escape()}/wiki/${item.label.score()}" target="_blank">${item.label.descore()}</a></td>
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

    let dfd = $.Deferred(), count = 0, hadFailure, failureRetries = {},
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
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/${uriEncodedPageName}/daily` +
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
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const cassandraError = errorData.responseJSON.title === 'Error in Cassandra table storage backend';

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
            `${this.getPageLink(page, queryProject)}: ${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`
          );
        }

        // unless it was a 404, don't treat this series of requests as being cached by server
        if (errorData.status !== 404) hadFailure = true;
      }).always(() => {
        this.updateProgressBar(++count, totalRequestCount);

        if (count === totalRequestCount) {
          dfd.resolve(pageViewsData);

          if (failedPages.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedPages.map(failedPage => `<li>${this.getPageLink(failedPage, queryProject)}</li>`).join('') +
              '</ul>'
            ));
          }

          /**
           * if there were no failures, assume the resource is now cached by the server
           *   and save this assumption to our own cache so we don't throttle the same requests
           */
          if (!hadFailure) {
            simpleStorage.set(this.getCacheKey(), true, {TTL: 600000});
          }
        }
      });
    };

    /**
     * We don't want to throttle requests for cached resources. However in our case,
     *   we're unable to check response headers to see if the resource was cached,
     *   so we use simpleStorage to keep track of what the user has recently queried.
     */
    const requestFn = this.isRequestCached() ? makeRequest : this.rateLimit(makeRequest, this.config.apiThrottle, this);

    pages.forEach((page, index) => {
      requestFn(page, index);
    });

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
      labels: this.getDateHeadings(true), // labels needed for Charts.js, even though we'll only have one dataset
      link, // for our own purposes
      listData: []
    };
    const startDate = moment(this.daterangepicker.startDate),
      endDate = moment(this.daterangepicker.endDate),
      length = this.numDaysInRange();

    let totalViewsSet = new Array(length).fill(0),
      datesWithoutData = [];

    datasets.forEach((dataset, index) => {
      const data = dataset.items.map(item => item.views),
        sum = data.reduce((a, b) => a + b);

      this.outputData.listData.push({
        data,
        label: dataset.title,
        project: dataset.project,
        sum,
        average: sum / length,
        index
      });

      /**
       * Ensure we have data for each day, using null as the view count when data is actually not available yet
       * See fillInZeros() comments for more info.
       */
      const [viewsSet, incompleteDates] = this.fillInZeros(dataset.items, startDate, endDate);
      incompleteDates.forEach(date => {
        if (!datesWithoutData.includes(date)) datesWithoutData.push(date);
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

    return this.outputData;
  }

  getPileURL(id) {
    return `http://tools.wmflabs.org/pagepile/api.php?action=get_data&id=${id}`;
  }

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
    const url = `https://tools.wmflabs.org/pagepile/api.php?id=${id}&action=get_data&format=json&metadata=1`;

    $.ajax({
      url,
      dataType: 'jsonp'
    }).done(data => {
      let pages = Object.keys(data.pages);

      if (pages.length > this.config.apiLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', this.getPileLink(id), this.formatNumber(pages.length), this.config.apiLimit)
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

    return matches ? matches.slice(1) : [null, null];
  }

  /**
   * Parses the URL query string and sets all the inputs accordingly
   * Should only be called on initial page load, until we decide to support pop states (probably never)
   * @returns {null} nothing
   */
  popParams() {
    let params = this.validateParams(
      this.parseQueryString()
    );
    this.validateDateRange(params);

    this.patchUsage();

    this.updateSourceInput($(`.source-option[data-value=${params.source}]`)[0]);

    // fill in value for the target
    if (params.target) {
      $(this.config.sourceInput).val(decodeURIComponent(params.target).descore());
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
      this.addSiteNotice(
        'info',
        $.i18n('massviews-redirect', $.i18n('title'), 10, this.getPileLink(params.target)),
        '',
        true
      );
    }

    $(this.config.platformSelector).val(params.platform);
    $(this.config.agentSelector).val(params.agent);

    /** export necessary params to outer scope */
    ['sort', 'direction', 'view', 'source', 'subjectpage'].forEach(key => {
      this[key] = params[key];
    });

    if (params.source === 'quarry' && params.project) {
      $('.quarry-project').val(params.project);
    }

    if (params.subjectpage === '1') {
      $('.category-subject-toggle--input').prop('checked', true);
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
   * @returns {null} nothing
   */
  setState(state, cb) {
    $('main').removeClass(this.config.formStates.join(' ')).addClass(state);

    switch (state) {
    case 'initial':
      this.updateProgressBar(0);
      this.clearMessages();
      this.assignDefaults();
      this.destroyChart();
      $('output').removeClass('list-mode').removeClass('chart-mode');
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
   * @return {null} nothing
   */
  apiErrorReset(apiName, errorMessage) {
    return this.setState('initial', () => {
      let message;
      if (errorMessage) {
        message = `${$.i18n('api-error', apiName)}: ${errorMessage}`;
      } else {
        message = `${$.i18n('api-error-unknown', apiName)}`;
      }
      this.writeMessage(message);
    });
  }

  processPagePile(cb) {
    const pileId = $(this.config.sourceInput).val();

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

        $('.output-title').text(label).prop('href', this.getPileURL(pileData.id));
        $('.output-params').html(
          `
          ${$(this.config.dateRangeSelector).val()}
          &mdash;
          <a href="https://${project.escape()}" target="_blank">
            ${project.replace(/.org$/, '').escape()}
          </a>
          `
        );

        this.buildMotherDataset(label, this.getPileLink(pileData.id), pageViewsData);

        cb();
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

  processCategory(project, category, cb) {
    let requestData = {
      list: 'categorymembers',
      cmlimit: 500,
      cmtitle: category,
      prop: 'categoryinfo',
      titles: category
    };

    const categoryLink = this.getPageLink(category, project);

    this.massApi(requestData, project, 'cmcontinue', 'categorymembers').done(data => {
      if (data.error) {
        return this.apiErrorReset('Category API', data.error.info);
      }

      const pageObj = data.pages[0];

      if (pageObj.missing) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const size = pageObj.categoryinfo.size,
        // siteInfo is only populated if they've opted to see subject pages instead of talk pages
        // Otherwise namespaces are not needed by this.mapCategoryPageNames
        namespaces = this.getSiteInfo(project) ? this.getSiteInfo(project).namespaces : undefined;
      let pages = data.categorymembers;

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', categoryLink));
        });
      }

      if (size > this.config.apiLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', categoryLink, this.formatNumber(size), this.config.apiLimit)
        );

        pages = pages.slice(0, this.config.apiLimit);
      }

      const pageNames = this.mapCategoryPageNames(pages, namespaces);

      this.getPageViewsData(pageNames, project).done(pageViewsData => {
        $('.output-title').html(categoryLink);
        $('.output-params').html($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(category, categoryLink, pageViewsData);

        cb();
      });
    }).fail(data => {
      this.setState('initial');

      /** structured error comes back as a string, otherwise we don't know what happened */
      if (data && typeof data.error === 'string') {
        this.writeMessage(
          $.i18n('api-error', categoryLink + ': ' + data.error)
        );
      } else {
        this.writeMessage($.i18n('api-error-unknown', categoryLink));
      }
    });
  }

  processHashtag(cb) {
    const hashtag = $(this.config.sourceInput).val().replace(/^#/, ''),
      hashTagLink = `<a target="_blank" href="http://tools.wmflabs.org/hashtags/search/${hashtag}">#${hashtag.escape()}</a>`;

    $.get(`http://tools.wmflabs.org/hashtags/csv/${hashtag}?limit=5000`).done(data => {
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
            $.i18n('massviews-oversized-set', hashTagLink, this.formatNumber(size), this.config.apiLimit)
          );

          pageURLs = pageURLs.slice(0, this.config.apiLimit);
        }

        this.getPageViewsData(pageURLs).done(pageViewsData => {
          $('.output-title').html(hashTagLink);
          $('.output-params').html($(this.config.dateRangeSelector).val());
          this.buildMotherDataset(hashtag, hashTagLink, pageViewsData);

          cb();
        });
      }).fail(() => apiErrorReset('Siteinfo API'));
    }).fail(() => apiErrorReset('Hashtag API'));
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

  processSubpages(project, targetPage, cb) {
    // determine what namespace the targetPage is in
    const descoredTargetPage = targetPage.descore();
    let namespace = 0, queryTargetPage;
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
          $.i18n('massviews-oversized-set', pageLink, this.formatNumber(size), this.config.apiLimit)
        );

        pages = pages.slice(0, this.config.apiLimit);
      }

      const pageNames = [targetPage].concat(pages.map(page => page.title));

      this.getPageViewsData(pageNames, project).done(pageViewsData => {
        $('.output-title').html(pageLink);
        $('.output-params').html($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(targetPage, pageLink, pageViewsData);

        cb();
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

  processTemplate(project, template, cb) {
    let requestData = {
      prop: 'transcludedin',
      tilimit: 500,
      titles: template
    };

    const templateLink = this.getPageLink(template, project);

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
          $.i18n('massviews-oversized-set-unknown', templateLink, this.config.apiLimit, this.config.apiLimit)
        );
      }

      this.getPageViewsData(pages, project).done(pageViewsData => {
        $('.output-title').html(templateLink);
        $('.output-params').html($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(template, templateLink, pageViewsData);

        cb();
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

  processWikiPage(project, page, cb) {
    let requestData = {
      pllimit: 500,
      prop: 'links',
      titles: page
    };

    const pageLink = this.getPageLink(page, project);

    this.massApi(requestData, project, 'plcontinue', data => data.pages[0].links).done(data => {
      if (data.error) {
        return this.apiErrorReset('Links API', data.error.info);
      }

      // this happens if there are no transclusions or the template could not be found
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
        $('.output-title').html(pageLink);
        $('.output-params').html($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(page, pageLink, pageViewsData);

        cb();
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

  processQuarry(cb) {
    const project = $('.quarry-project').val(),
      id = $(this.config.sourceInput).val();
    if (!this.validateProject(project)) return;

    const url = `https://quarry.wmflabs.org/query/${id}/result/latest/0/json`,
      quarryLink = `<a target='_blank' href='https://quarry.wmflabs.org/query/${id}'>Quarry ${id}</a>`;

    $.getJSON(url).done(data => {
      const titleIndex = data.headers.indexOf('page_title');

      if (titleIndex === -1) {
        this.setState('initial');
        return this.writeMessage($.i18n('invalid-quarry-dataset', 'page_title'));
      }

      let titles = data.rows.map(row => row[titleIndex]);

      if (titles.length > this.config.apiLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', quarryLink, this.formatNumber(titles.length), this.config.apiLimit)
        );

        titles = titles.slice(0, this.config.apiLimit);
      }

      this.getPageViewsData(titles, project).done(pageViewsData => {
        $('.output-title').html(quarryLink);
        $('.output-params').html($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(id, quarryLink, pageViewsData);

        cb();
      });
    }).fail(data => {
      this.setState('initial');
      return this.writeMessage($.i18n('api-error-unknown', 'Quarry API'), true);
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

  mapCategoryPageNames(pages, namespaces) {
    let pageNames = [];

    pages.forEach(page => {
      if (namespaces && page.ns % 2 === 1) {
        const namespace = namespaces[page.ns].canonical;
        const subjectNamespace = namespaces[page.ns - 1].canonical || '';
        pageNames.push(page.title.replace(namespace, subjectNamespace).replace(/^\:/, ''));
      } else {
        pageNames.push(page.title);
      }
    });

    return pageNames;
  }

  /**
   * Process the massviews for the given source and options entered
   * Called when submitting the form
   * @return {null} nothing
   */
  processInput() {
    this.setState('processing');

    const cb = () => {
      this.setInitialChartType();
      this.renderData();
    };
    const source = $('#source_button').data('value');

    // special sources that don't use a wiki URL
    if (source === 'pagepile') {
      return this.processPagePile(cb);
    } else if (source === 'quarry') {
      return this.processQuarry(cb);
    } else if (source === 'hashtag') {
      return this.processHashtag(cb);
    }

    // validate wiki URL
    let [project, target] = this.getWikiPageFromURL($(this.config.sourceInput).val());

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
      // fetch siteinfo to get namespaces if they've opted to use subject page instead of talk
      if ($('.category-subject-toggle--input').is(':checked')) {
        this.fetchSiteInfo(project).then(() => {
          this.processCategory(project, target, cb);
        });
      } else {
        this.processCategory(project, target, cb);
      }
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
   * @returns {null} nothing
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

$(document).ready(() => {
  /** assume hash params are supposed to be query params */
  if (document.location.hash && !document.location.search) {
    return document.location.href = document.location.href.replace('#', '?');
  } else if (document.location.hash) {
    return document.location.href = document.location.href.replace(/\#.*/, '');
  }

  new MassViews();
});
