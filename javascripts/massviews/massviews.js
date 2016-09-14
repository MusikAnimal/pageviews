/**
 * Massviews Analysis tool
 * @file Main file for Massviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
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
    ['sort', 'source', 'sourceProject', 'direction', 'outputData', 'total', 'view', 'subjectpage'].forEach(defaultKey => {
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
      $('.output-totals').html(
        `<th scope='row'>${$.i18n('totals')}</th>
         <th>${$.i18n('num-pages', sortedDatasets.length)}</th>
         <th>${this.formatNumber(this.outputData.sum)}</th>
         <th>${this.formatNumber(Math.round(this.outputData.average))} / ${$.i18n('day')}</th>`
      );
      $('#output_list').html('');

      sortedDatasets.forEach((item, index) => {
        $('#output_list').append(
          `<tr>
           <th scope='row'>${index + 1}</th>
           <td><a href="https://${this.sourceProject.escape()}/wiki/${item.label.score()}" target="_blank">${item.label.descore()}</a></td>
           <td><a target="_blank" href='${this.getPageviewsURL(this.sourceProject, item.label)}'>${this.formatNumber(item.sum)}</a></td>
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
   * @param  {string} project - project such as en.wikipedia.org
   * @param  {Object} pages - as given by the getPagePile promise
   * @return {Deferred} - Promise resolving with data ready to be rendered to view
   */
  getPageViewsData(project, pages) {
    const startDate = this.daterangepicker.startDate.startOf('day'),
      endDate = this.daterangepicker.endDate.startOf('day');

    // XXX: throttling
    let dfd = $.Deferred(), promises = [], count = 0, hadFailure, failureRetries = {},
      totalRequestCount = pages.length, failedPages = [], pageViewsData = [];

    const makeRequest = page => {
      const uriEncodedPageName = encodeURIComponent(page);
      const url = (
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}` +
        `/${$(this.config.platformSelector).val()}/${$(this.config.agentSelector).val()}/${uriEncodedPageName}/daily` +
        `/${startDate.format(this.config.timestampFormat)}/${endDate.format(this.config.timestampFormat)}`
      );
      const promise = $.ajax({ url, dataType: 'json' });
      promises.push(promise);

      promise.done(pvData => {
        pageViewsData.push({
          title: page,
          items: pvData.items
        });
      }).fail(errorData => {
        // XXX: throttling
        /** first detect if this was a Cassandra backend error, and if so, schedule a re-try */
        const cassandraError = errorData.responseJSON.title === 'Error in Cassandra table storage backend';

        if (cassandraError) {
          if (failureRetries[project]) {
            failureRetries[project]++;
          } else {
            failureRetries[project] = 1;
          }

          /** maximum of 3 retries */
          if (failureRetries[project] < 3) {
            totalRequestCount++;
            return this.rateLimit(makeRequest, 100, this)(page);
          }
        }

        if (cassandraError) {
          failedPages.push(page);
        } else {
          this.writeMessage(`${this.getPageLink(page, project)}: ${$.i18n('api-error', 'Pageviews API')} - ${errorData.responseJSON.title}`);
        }

        hadFailure = true; // don't treat this series of requests as being cached by server
      }).always(() => {
        this.updateProgressBar((++count / totalRequestCount) * 100);

        // XXX: throttling
        if (count === totalRequestCount) {
          dfd.resolve(pageViewsData);

          if (failedPages.length) {
            this.writeMessage($.i18n(
              'api-error-timeout',
              '<ul>' +
              failedPages.map(failedPage => `<li>${this.getPageLink(failedPage, project)}</li>`).join('') +
              '</ul>'
            ));
          }

          /**
           * if there were no failures, assume the resource is now cached by the server
           *   and save this assumption to our own cache so we don't throttle the same requests
           */
          // XXX: throttling
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
    // XXX: throttling
    const requestFn = this.isRequestCached() ? makeRequest : this.rateLimit(makeRequest, 100, this);

    pages.forEach((page, index) => {
      requestFn(page);
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

      if (pages.length > 500) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', this.getPileLink(id), this.formatNumber(pages.length), this.config.pageLimit)
        );

        pages = pages.slice(0, this.config.pageLimit);
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

  processPagePile(cb) {
    const pileId = $(this.config.sourceInput).val();

    this.getPagePile(pileId).done(pileData => {
      if (!pileData.pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', this.getPileLink(pileId)));
        });
      }

      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      if (!this.isRequestCached()) simpleStorage.set('pageviews-throttle', true, {TTL: 90000});

      this.sourceProject = siteMap[pileData.wiki];

      /**
       * remove Project: prefix if present, only for enwiki, for now,
       * see https://phabricator.wikimedia.org/T135437
       */
      if (this.sourceProject === 'en.wikipedia.org') {
        pileData.pages = pileData.pages.map(page => {
          return page.replace(/^Project:Wikipedia:/, 'Wikipedia:');
        });
      }

      this.getPageViewsData(this.sourceProject, pileData.pages).done(pageViewsData => {
        const label = `Page Pile #${pileData.id}`;

        $('.output-title').text(label).prop('href', this.getPileURL(pileData.id));
        $('.output-params').html(
          `
          ${$(this.config.dateRangeSelector).val()}
          &mdash;
          <a href="https://${this.sourceProject.escape()}" target="_blank">${this.sourceProject.replace(/.org$/, '').escape()}</a>
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
    if (!category) {
      return this.setState('initial', () => {
        this.writeMessage($.i18n('invalid-category-url'));
      });
    }

    let requestData = {
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmlimit: 500,
      cmtitle: decodeURIComponent(category),
      prop: 'categoryinfo',
      titles: decodeURIComponent(category)
    };

    const promise = $.ajax({
      url: `https://${project}/w/api.php`,
      jsonp: 'callback',
      dataType: 'jsonp',
      data: requestData
    });
    const categoryLink = this.getPageLink(decodeURIComponent(category), project);
    this.sourceProject = project; // for caching purposes

    promise.done(data => {
      if (data.error) {
        return this.setState('initial', () => {
          this.writeMessage(
            `${$.i18n('api-error', 'Category API')}: ${data.error.info.escape()}`
          );
        });
      }

      const queryKey = Object.keys(data.query.pages)[0];

      if (queryKey === '-1') {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const size = data.query.pages[queryKey].categoryinfo.size,
        // siteInfo is only populated if they've opted to see subject pages instead of talk pages
        // Otherwise namespaces are not needed by this.mapCategoryPageNames
        namespaces = this.siteInfo ? this.siteInfo.namespaces : undefined;
      let pages = data.query.categorymembers;

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', categoryLink));
        });
      }

      if (size > this.config.pageLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', categoryLink, this.formatNumber(size), this.config.pageLimit)
        );

        pages = pages.slice(0, this.config.pageLimit);
      }

      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      if (size > 10) this.setThrottle();

      const pageNames = this.mapCategoryPageNames(pages, namespaces);

      this.getPageViewsData(project, pageNames).done(pageViewsData => {
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

  processSubpages(project, targetPage, cb) {
    if (!targetPage) {
      return this.setState('initial', () => {
        this.writeMessage($.i18n('invalid-page-url'));
      });
    }

    this.sourceProject = project; // for caching purposes

    // determine what namespace the targetPage is in
    const descoredTargetPage = targetPage.descore();
    let namespace = 0, queryTargetPage;
    for (const ns in this.siteInfo.namespaces) {
      if (ns === '0') continue; // skip mainspace

      const nsName = this.siteInfo.namespaces[ns]['*'] + ':';
      if (descoredTargetPage.startsWith(nsName)) {
        namespace = this.siteInfo.namespaces[ns].id;
        queryTargetPage = targetPage.substring(nsName.length);
      }
    }

    // get namespace number of corresponding talk or subject page
    const inverseNamespace = namespace % 2 === 0 ? namespace + 1 : namespace - 1;

    let promises = [];

    [namespace, inverseNamespace].forEach(apnamespace => {
      promises.push(
        $.ajax({
          url: `https://${project}/w/api.php`,
          jsonp: 'callback',
          dataType: 'jsonp',
          data: {
            action: 'query',
            format: 'json',
            list: 'allpages',
            aplimit: 500,
            apnamespace,
            apprefix: decodeURIComponent(queryTargetPage) + '/'
          }
        })
      );
    });

    const pageLink = this.getPageLink(decodeURIComponent(targetPage), project);

    $.when(...promises).done((data, data2) => {
      // show errors, if any
      const errors = [data, data2].filter(resp => !!resp[0].error);
      if (errors.length) {
        errors.forEach(error => {
          this.setState('initial', () => {
            this.writeMessage(
              `${$.i18n('api-error', 'Allpages API')}: ${error[0].error.info.escape()}`
            );
          });
        });
        return false;
      }

      let pages = data[0].query.allpages.concat(data2[0].query.allpages);
      const size = pages.length;

      if (size === 0) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      if (size > this.config.pageLimit) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', pageLink, this.formatNumber(size), this.config.pageLimit)
        );

        pages = pages.slice(0, this.config.pageLimit);
      }

      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      if (size > 10) this.setThrottle();

      const pageNames = pages.map(page => page.title).concat([targetPage]);

      this.getPageViewsData(project, pageNames).done(pageViewsData => {
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

  processTemplate(cb) {
    const [project, template] = this.getWikiPageFromURL($(this.config.sourceInput).val());
    if (!this.validateProject(project)) return;

    if (!template) {
      return this.setState('initial', () => {
        this.writeMessage($.i18n('invalid-template-url'));
      });
    }

    const promise = $.ajax({
      url: `https://${project}/w/api.php`,
      jsonp: 'callback',
      dataType: 'jsonp',
      data: {
        action: 'query',
        format: 'json',
        tilimit: 500,
        titles: decodeURIComponent(template),
        prop: 'transcludedin'
      }
    });
    const templateLink = this.getPageLink(decodeURIComponent(template), project);
    this.sourceProject = project; // for caching purposes

    promise.done(data => {
      if (data.error) {
        return this.setState('initial', () => {
          this.writeMessage(
            `${$.i18n('api-error', 'Transclusion API')}: ${data.error.info.escape()}`
          );
        });
      }

      const queryKey = Object.keys(data.query.pages)[0];

      if (queryKey === '-1') {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const pages = data.query.pages[queryKey].transcludedin.map(page => page.title);

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', templateLink));
        });
      }

      // in this case we are limited by the API to 500 pages, not this.config.pageLimit
      if (data.continue) {
        this.writeMessage(
          $.i18n('massviews-oversized-set-unknown', templateLink, 500)
        );
      }

      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      if (pages.length > 10) this.setThrottle();

      this.getPageViewsData(project, pages).done(pageViewsData => {
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

  processWikiPage(cb) {
    const [project, page] = this.getWikiPageFromURL($(this.config.sourceInput).val());
    if (!this.validateProject(project)) return;

    if (!page) {
      return this.setState('initial', () => {
        this.writeMessage($.i18n('invalid-page-url'));
      });
    }

    const promise = $.ajax({
      url: `https://${project}/w/api.php`,
      jsonp: 'callback',
      dataType: 'jsonp',
      data: {
        action: 'query',
        format: 'json',
        pllimit: 500,
        titles: decodeURIComponent(page),
        prop: 'links'
      }
    });
    const pageLink = this.getPageLink(decodeURIComponent(page), project);
    this.sourceProject = project; // for caching purposes

    promise.done(data => {
      if (data.error) {
        return this.setState('initial', () => {
          this.writeMessage(
            `${$.i18n('api-error', 'Links API')}: ${data.error.info.escape()}`
          );
        });
      }

      const queryKey = Object.keys(data.query.pages)[0];

      if (queryKey === '-1' || !data.query.pages[queryKey].links) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('api-error-no-data'));
        });
      }

      const pages = data.query.pages[queryKey].links.map(page => page.title);

      if (!pages.length) {
        return this.setState('initial', () => {
          this.writeMessage($.i18n('massviews-empty-set', pageLink));
        });
      }

      // in this case we are limited by the API to 500 pages, not this.config.pageLimit
      if (data.continue) {
        this.writeMessage(
          $.i18n('massviews-oversized-set-unknown', pageLink, 500)
        );
      }

      /**
       * XXX: throttling
       * At this point we know we have data to process,
       *   so set the throttle flag to disallow additional requests for the next 90 seconds
       */
      if (pages.length > 10) this.setThrottle();

      this.getPageViewsData(project, pages).done(pageViewsData => {
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

      if (titles.length > 500) {
        this.writeMessage(
          $.i18n('massviews-oversized-set', quarryLink, this.formatNumber(titles.length), this.config.pageLimit)
        );

        titles = titles.slice(0, this.config.pageLimit);
      }

      if (titles.length > 10) this.setThrottle();

      this.getPageViewsData(project, titles).done(pageViewsData => {
        $('.output-title').html(quarryLink);
        $('.output-params').html($(this.config.dateRangeSelector).val());
        this.buildMotherDataset(id, quarryLink, pageViewsData);

        cb();
      });
    }).error(data => {
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
    if (!project) return true;

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
    // XXX: throttling
    /** allow resubmission of queries that are cached */
    if (!this.isRequestCached()) {
      /** Check if user has exceeded request limit and throw error */
      if (simpleStorage.hasKey('pageviews-throttle')) {
        const timeRemaining = Math.round(simpleStorage.getTTL('pageviews-throttle') / 1000);

        /** > 0 check to combat race conditions */
        if (timeRemaining > 0) {
          return this.writeMessage($.i18n(
            'api-throttle-wait', `<b>${timeRemaining}</b>`,
            '<a href="https://phabricator.wikimedia.org/T124314" target="_blank">phab:T124314</a>'
          ), true);
        }
      }
    }

    this.setState('processing');

    const cb = () => {
      this.updateProgressBar(100);
      this.setInitialChartType();
      this.renderData();
    };

    let project, target;

    switch ($('#source_button').data('value')) {
    case 'pagepile':
      this.processPagePile(cb);
      break;
    case 'category':
      // parse input before calling processCategory, so we can query for siteinfo if needed
      [project, target] = this.getWikiPageFromURL($(this.config.sourceInput).val());
      if (!this.validateProject(project)) return;

      // fetch siteinfo to get namespaces if they've opted to use subject page instead of talk
      if ($('.category-subject-toggle--input').is(':checked')) {
        this.getSiteInfo(project).then(() => {
          this.processCategory(project, target, cb);
        });
      } else {
        this.processCategory(project, target, cb);
      }
      break;
    case 'subpages':
      // parse input before calling processSubpages so we can query for siteinfo
      [project, target] = this.getWikiPageFromURL($(this.config.sourceInput).val());
      if (!this.validateProject(project)) return;

      // fetch namespaces first
      this.getSiteInfo(project).then(() => this.processSubpages(project, target, cb));
      break;
    case 'wikilinks':
      this.processWikiPage(cb);
      break;
    case 'transclusions':
      this.processTemplate(cb);
      break;
    case 'quarry':
      this.processQuarry(cb);
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
