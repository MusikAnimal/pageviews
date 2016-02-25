const config = require('./config');
const siteMap = require('../shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const pv = require('../shared/pv');
let session = require('./session');
window.session = session;

function drawData(startIndex = session.offset) {
  $('.chart-container').removeClass('loading');

  let count = startIndex, index = startIndex;

  while (count < config.pageSize + session.offset) {
    let item = session.pageData[index++ + session.offset];

    if (session.excludes.includes(item.article)) continue;
    if (!session.max) session.max = item.views;

    let width = 100 * (item.views / session.max);

    $('.chart-container').append(
      `<div class='topview-entry' style='background:linear-gradient(to right, #EEE ${width}%, transparent ${width}%)'>
       <span class='topview-entry--remove glyphicon glyphicon-remove' data-article-id=${index - 1} aria-hidden='true'></span>
       <span class='topview-entry--rank'>${++count}</span>
       <a class='topview-entry--label' href="https://en.wikipedia.org/wiki/${item.article}" target="_blank">${item.article}</a>
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
    pushParams();
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

/**
 * Gets the date headings as strings - i18n compliant
 * @param {boolean} localized - whether the dates should be localized per browser language
 * @returns {Array} the date headings as strings
 */
function getDateHeadings(localized) {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker'),
    dateHeadings = [];

  for (let date = moment(daterangepicker.startDate); date.isBefore(daterangepicker.endDate); date.add(1, 'd')) {
    if (localized) {
      dateHeadings.push(date.format(getDateFormat()));
    } else {
      dateHeadings.push(date.format('YYYY-MM-DD'));
    }
  }
  return dateHeadings;
}

function getPageviewsURL(article) {
  // FIXME: add/subtract doesn't work =====================================
  // Think we need to clone the moment objects
  const startDate = $(config.dateRangeSelector).data('daterangepicker').startDate.subtract(3, 'days').format('YYYY-MM-DD'),
    endDate = $(config.dateRangeSelector).data('daterangepicker').endDate.add(3, 'days').format('YYYY-MM-DD'),
    platform = $('#platform-select').val(),
    project = $(config.projectInput).val();

  return `/pageviews#start=${startDate}&end=${endDate}&project=${project}&platform=${platform}&pages=${article}`;
}

/**
 * Compute how many days are in the selected date range
 *
 * @returns {integer} number of days
 */
function numDaysInRange() {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker');
  return daterangepicker.endDate.diff(daterangepicker.startDate, 'days') + 1;
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
      params.excludes = chunk[1].split('|');
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
  const params = parseHashParams();

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
    session.excludes = params.excludes.map((exclude)=> exclude.replace(/_/g, ' '));
  }

  initData().then(()=> {
    setupArticleSelector(session.excludes);
    setupListeners();
    drawData();
  });
}

/**
 * Replaces history state with new URL hash representing current user input
 * Called whenever we go to update the chart
 * @returns {string|false} the new hash param string or false if nothing has changed
 */
function pushParams() {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker');

  const state = $.param({
    start: daterangepicker.startDate.format('YYYY-MM-DD'),
    end: daterangepicker.endDate.format('YYYY-MM-DD'),
    project: $(config.projectInput).val(),
    platform: $('#platform-select').val()
  }) + `&excludes=${pv.underscorePageNames(session.excludes).join('|')}`;

  session.params = '#' + state;

  if (location.hash === session.params) {
    return false;
  }

  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, 'Topviews comparsion', session.params);
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
function resetView(clearSelector = true) {
  session.max = null;
  session.offset = 0;
  session.pageData = [];
  session.pageNames = [];
  $('.chart-container').html('');
  $('.chart-container').removeClass('loading');
  $('.message-container').html('');
  if (clearSelector) resetArticleSelector();
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

  if (excludes.length) setArticleSelectorDefaults(excludes);

  articleSelector.on('change', function() {
    session.excludes = $(this).val() || [];
    session.max = null;
    $('.chart-container').html('');
    drawData(0);
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
     Topviews Analysis provides data from October 2015 forward. For older data, try <a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>.
     </div>`
  );
}

function setupListeners() {
  $(config.dateRangeSelector).on('change', applyChanges);
  $('#platform-select').on('change', applyChanges);
  $('a[href="#"]').on('click', (e)=> e.preventDefault());
  $('.expand-chart').on('click', ()=> {
    session.offset += config.pageSize;
    drawData();
  });
}

function applyChanges() {
  if (!pushParams()) return;

  resetView(false);
  initData().then(()=> {
    drawData();
  });
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
  $('.chart-container').addClass('loading');

  /** Collect parameters from inputs. */
  const dateRangeSelector = $(config.dateRangeSelector),
    startDate = dateRangeSelector.data('daterangepicker').startDate,
    endDate = dateRangeSelector.data('daterangepicker').endDate,
    access = $('#platform-select').val();

  let promises = [];

  for (let date = moment(startDate); date.isBefore(endDate); date.add(1, 'd')) {
    promises.push($.ajax({
      url: `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${pv.getProject()}/${access}/${date.format('YYYY/MM/DD')}`,
      dataType: 'json'
    }));
  }

  let dfd = $.Deferred();

  return $.when(...promises).then((...data)=> {
    if (promises.length === 1) data = [data];

    /** import data and do summations */
    data.forEach((day)=> {
      day[0].items[0].articles.forEach((item, index)=> {
        if (session.pageData[index]) {
          session.pageData[index].views += item.views;
        } else {
          session.pageData[index] = {
            article: item.article.replace(/_/g, ' '),
            views: item.views
          };
        }
      });
    });

    /** sort given new view counts */
    session.pageData = session.pageData.sort((a, b)=> b.views - a.views);

    /** ...and build the pageNames array for Select2 */
    session.pageNames = session.pageData.map(value => value.article.replace(/_/g, ' '));

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
