const config = require('./config');
const siteMap = require('../shared/site_map');
const pv = require('../shared/pv');
let session = require('./session');

function drawData(data, offset = 0) {
  const max = data[0].views;

  for (let index of [...Array(config.pageSize).keys()]) {
    let item = session.pageData[index + offset];

    // FIXME: loop only through first 100, then add "show more" link
    // cache data
    let width = 100 * (item.views / max);
    $(".chart-container").append(
      `<div class='topview-entry' style='background:linear-gradient(to right, #EEE ${width}%, transparent ${width}%)'>` +
      `<span class='topview-entry--remove glyphicon glyphicon-remove' aria-hidden='true'></span>` +
      `<span class='topview-entry--rank'>${index + offset + 1}</span>` +
      `<a class='topview-entry--label' href="https://en.wikipedia.org/wiki/${item.article}" target="_blank">${item.article.replace(/_/g, ' ')}</a>` +
      "<span class='topview-entry--leader'></span>" +
      `<a class='topview-entry--views' href='/pageviews#pages=${item.article}'>${pv.n(item.views)}</a></div>`
    );
  }
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
 * Removes all article selector related stuff then adds it back
 * Also calls updateChart
 * @returns {null} nothing
 */
function resetArticleSelector() {
  const articleSelector = $(config.articleSelector);
  articleSelector.off('change');
  articleSelector.select2('val', null);
  articleSelector.select2('data', null);
  articleSelector.select2('destroy');
  $('.data-links').hide();
  setupArticleSelector();
  updateChart();
}

/**
 * Removes chart, messages, and resets article selections
 * @returns {null} nothing
 */
function resetView() {
  $(".chart-container").html("");
  $(".chart-container").removeClass("loading");
  $(".message-container").html("");
  resetArticleSelector();
}

/**
 * Sets up the article selector and adds listener to update chart
 * @returns {null} - nothing
 */
function setupArticleSelector() {
  const articleSelector = $(config.articleSelector);

  articleSelector.select2({
    data: session.pageNames,
    defaults: config.defaults.excludedPages,
    maximumSelectionLength: 50,
    minimumInputLength: 0,
    placeholder: 'Type page names to exclude from view...'
  });

  // articleSelector.on('change', updateChart);
}

/**
 * Directly set articles in article selector
 *
 * @param {array} pages - page titles
 * @returns {array} - untouched array of pages
 */
function setArticleSelectorDefaults(pages) {
  $(config.articleSelector).val(pages).trigger('change');
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
    maxDate: config.maxDate,
    singleDatePicker: true
  });

  /** so people know why they can't query data older than October 2015 */
  // $('.daterangepicker').append(
  //   "<div class='daterange-notice'>" +
  //   "Pageviews Analysis provides data from October 2015 forward. For older data, try <a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>." +
  //   "</div>"
  // );

  // dateRangeSelector.on('change', ()=> {
  //   /** Attempt to fine-tune the pointer detection spacing based on how cluttered the chart is */
  //   if (session.chartType === 'Line') {
  //     if (numDaysInRange() > 50) {
  //       Chart.defaults.Line.pointHitDetectionRadius = 3;
  //     } else if (numDaysInRange() > 30) {
  //       Chart.defaults.Line.pointHitDetectionRadius = 5;
  //     } else if (numDaysInRange() > 20) {
  //       Chart.defaults.Line.pointHitDetectionRadius = 10;
  //     } else {
  //       Chart.defaults.Line.pointHitDetectionRadius = 20;
  //     }
  //   }

  //   updateChart();
  // });
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
 * Checks value of project input and validates it against site map
 * @returns {boolean} whether the currently input project is valid
 */
function validateProject() {
  const project = $(config.projectInput).val();
  if (siteDomains.includes(project)) {
    $(".validate").remove();
    $(".select2-selection--multiple").removeClass('disabled');
  } else {
    resetView();
    writeMessage(
      `<a href='//${project}'>${project}</a> is not a ` +
      "<a href='//meta.wikipedia.org/w/api.php?action=sitematrix&formatversion=2'>valid project</a>",
      'validate', true
    );
    $(".select2-selection--multiple").addClass('disabled');
    return true;
  }
}

$(document).ready(()=> {
  // setupProjectInput();
  setupDateRangeSelector();

  /** Url to query the API. */
  // const url = (
  //   `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${pv.getProject()}/${$('#platform-select').val()}` +
  //   `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
  // );
  const url = (
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/2016/01/01`
  );

  // call resetData() or something
  session.pageData = [];
  session.pageNames = [];

  $.ajax({
    url: url,
    dataType: 'json'
  }).success((data)=> {
    /** first import all data */
    data.items[0].articles.forEach((item) => {
      session.pageData.push(item);
      session.pageNames.push(item.article.replace(/_/g, ' '));
    });

    drawData(session.pageData);

    setupArticleSelector();
    setArticleSelectorDefaults(config.defaults.excludedPages);
  });
});
