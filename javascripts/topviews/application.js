const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const pv = require('../shared/pv');
let session = require('./session');
window.session = session;

function drawData(offset = 0) {
  let count = offset, index = offset;

  while (count < config.pageSize) {
    let item = session.pageData[index++ + offset];

    if (session.excludes.includes(item.article.replace(/_/g, ' '))) continue;
    if (!session.max) session.max = item.views;

    let width = 100 * (item.views / session.max);

    // FIXME: loop only through first 100, then add "show more" link
    $('.chart-container').append(
      `<div class='topview-entry' style='background:linear-gradient(to right, #EEE ${width}%, transparent ${width}%)'>
       <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${index - 1} aria-hidden='true'></span>
       <span class='topview-entry--rank'>${++count}</span>
       <a class='topview-entry--label' href="https://en.wikipedia.org/wiki/${item.article}" target="_blank">${item.article.replace(/_/g, ' ')}</a>
       <span class='topview-entry--leader'></span>
       <a class='topview-entry--views' href='${getPageviewsURL(item.article)}'>${pv.n(item.views)}</a></div>`
    );
  }

  pushParams();

  $('.topview-entry--remove').off('click').on('click', function() {
    session.excludes.push(
      session.pageNames[$(this).data('article-id')]
    );
    setArticleSelectorDefaults(session.excludes);
  });
}

/**
 * Get date format to use based on settings
 * @returns {string} date format to passed to parser
 */
function getDateFormat() {
  if (session.localizeDateFormat === 'true') {
    return pv.getLocaleDateString();
  } else {
    return config.defaults.dateFormat;
  }
}

function getPageviewsURL(article) {
  const startDate = $(config.dateRangeSelector).data('daterangepicker').startDate.format('YYYY-MM-DD'),
    endDate = $(config.dateRangeSelector).data('daterangepicker').endDate.format('YYYY-MM-DD'),
    platform = $('#platform-select').val(),
    project = $(config.projectInput).val();

  return `/pageviews#start=${startDate}&end=${endDate}&project=${project}&platform=${platform}&pages=${article}`;
}

/*
 * Generate key/value pairs of URL hash params
 * @returns {Object} key/value pairs representation of URL hash
 */
function parseHashParams() {
  const uri = decodeURI(location.hash.slice(1)),
    chunks = uri.split('&');
  let params = {};

  for (let i=0; i<chunks.length ; i++) {
    let chunk = chunks[i].split('=');

    if (chunk[0] === 'excludes') {
      params.excudes = chunk[1].split('|');
    } else {
      params[chunk[0]] = chunk[1];
    }
  }

  return params;
}

/**
 * Parses the URL hash and sets all the inputs accordingly
 * Should only be called on initial page load, until we decide to support pop states (probably never)
 * @returns {null} nothing
 */
function popParams() {
  let params = parseHashParams();

  $(config.projectInput).val(params.project || config.defaults.project);
  if (validateProject()) return;

  const startDate = moment(params.start || moment().subtract(config.daysAgo, 'days')),
    endDate = moment(params.end || Date.now());

  $(config.dateRangeSelector).data('daterangepicker').setStartDate(startDate);
  $(config.dateRangeSelector).data('daterangepicker').setEndDate(endDate);
  $('#platform-select').val(params.platform || 'all-access');

  if (startDate < moment('2015-10-01') || endDate < moment('2015-10-01')) {
    pv.addSiteNotice('danger', 'Pageviews API does not contain data older than October 2015. Sorry.', 'Invalid parameters!', true);
    resetView();
    return;
  } else if (startDate > endDate) {
    pv.addSiteNotice('warning', 'Start date must be older than the end date.', 'Invalid parameters!', true);
    resetView();
    return;
  }

  if (!params.excludes || (params.excludes.length === 1 && !params.excludes[0])) {
    session.excludes = config.defaults.excludes;
  } else {
    session.excludes = params.excludes;
  }

  initData().then(()=> {
    setupArticleSelector(session.excludes);
    drawData();
  });
}

/**
 * Replaces history state with new URL hash representing current user input
 * Called whenever we go to update the chart
 * @returns {string} the new hash param string
 */
function pushParams() {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker');

  const state = $.param({
    start: daterangepicker.startDate.format('YYYY-MM-DD'),
    end: daterangepicker.endDate.format('YYYY-MM-DD'),
    project: $(config.projectInput).val(),
    platform: $('#platform-select').val()
  }) + `&excludes=${pv.underscorePageNames(session.excludes).join('|')}`;

  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, 'Topviews comparsion', '#' + state);
  }

  return state;
}

/**
 * Removes all article selector related stuff then adds it back
 * @returns {null} nothing
 */
function resetArticleSelector() {
  const articleSelector = $(config.articleSelector);
  articleSelector.off('change');
  articleSelector.select2('val', null);
  articleSelector.select2('data', null);
  articleSelector.select2('destroy');
  setupArticleSelector();
}

/**
 * Removes chart, messages, and resets article selections
 * @returns {null} nothing
 */
function resetView() {
  $('.chart-container').html('');
  $('.chart-container').removeClass('loading');
  $('.message-container').html('');
  resetArticleSelector();
}

/**
 * Sets up the article selector and adds listener to update chart
 * @param {array} excludes - default page names to exclude
 * @returns {null} - nothing
 */
function setupArticleSelector(excludes) {
  const articleSelector = $(config.articleSelector);

  articleSelector.select2({
    data: session.pageNames,
    maximumSelectionLength: 50,
    minimumInputLength: 0,
    placeholder: 'Type page names to exclude from view...'
  });

  if (excludes) setArticleSelectorDefaults(excludes);

  articleSelector.on('change', function() {
    session.excludes = $(this).val() || [];
    session.max = null;
    session.offset = 0;
    $('.chart-container').html('');
    drawData();
    $(this).select2().trigger('close');
  });
}

/**
 * Directly set articles in article selector
 *
 * @param {array} pages - page titles
 * @returns {array} - untouched array of pages
 */
function setArticleSelectorDefaults(pages) {
  $(config.articleSelector).select2().val(pages).trigger('change');
  return pages;
}

/**
 * sets up the daterange selector and adds listeners
 * @returns {null} - nothing
 */
function setupDateRangeSelector() {
  const dateRangeSelector = $(config.dateRangeSelector);
  dateRangeSelector.daterangepicker({
    locale: { format: getDateFormat() },
    startDate: moment().subtract(config.daysAgo, 'days'),
    minDate: config.minDate,
    maxDate: config.maxDate
  });

  /** so people know why they can't query data older than October 2015 */
  $('.daterangepicker').append(
    `<div class='daterange-notice'>
     Pageviews Analysis provides data from October 2015 forward. For older data, try <a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>.
     </div>`
  );

  // dateRangeSelector.on('change', initData);
}

/**
 * Setup listeners for project input
 * @returns {null} - nothing
 */
function setupProjectInput() {
  $(config.projectInput).on('change', function() {
    if (!this.value) {
      this.value = config.defaults.project;
      return;
    }
    if (validateProject()) return;
    resetView();
  });
}

/**
 * @returns {Deferred} promise with data fetched from API
 */
function initData() {
  /** Collect parameters from inputs. */
  const dateRangeSelector = $(config.dateRangeSelector),
    startDate = dateRangeSelector.data('daterangepicker').startDate;
    // endDate = dateRangeSelector.data('daterangepicker').endDate,
    // exclusions = session.excludes || [];

  const url = (
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${startDate.format('YYYY/MM/DD')}`
  );

  let dfd = $.Deferred();

  return $.ajax({
    url: url,
    dataType: 'json'
  }).success((data)=> {
    /** first import all data */
    data.items[0].articles.forEach((item) => {
      session.pageData.push(item);
      session.pageNames.push(item.article.replace(/_/g, ' '));
    });

    return dfd.resolve(session.pageData);
  });
}

/**
 * Checks value of project input and validates it against site map
 * @returns {boolean} whether the currently input project is valid
 */
function validateProject() {
  const project = $(config.projectInput).val();
  if (siteDomains.includes(project)) {
    $('.validate').remove();
    $('.select2-selection--multiple').removeClass('disabled');
  } else {
    resetView();
    writeMessage(
      `<a href='//${project}'>${project}</a> is not a
       <a href='//meta.wikipedia.org/w/api.php?action=sitematrix&formatversion=2'>valid project</a>`,
      'validate', true
    );
    $('.select2-selection--multiple').addClass('disabled');
    return true;
  }
}

/**
 * Writes message just below the chart
 * @param {string} message - message to write
 * @param {boolean} clear - whether to clear any existing messages
 * @returns {jQuery} - jQuery object of message container
 */
function writeMessage(message, clear) {
  if (clear) {
    pv.clearMessages();
  }
  return $('.message-container').append(
    `<p class='error-message'>${message}</p>`
  );
}

$(document).ready(()=> {
  // setupProjectInput();
  setupDateRangeSelector();
  popParams();

  /** Url to query the API. */
  // const url = (
  //   `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${pv.getProject()}/${$('#platform-select').val()}` +
  //   `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
  // );

  // call resetData() or something
  session.pageData = [];
  session.pageNames = [];


});
