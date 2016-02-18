const config = require('./config');
const siteMap = require('../shared/site_map');
const pv = require('../shared/pv');
let session = require('./session');

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

$(document).ready(()=> {
  // setupProjectInput();
  // setupDateRangeSelector();

  /** Url to query the API. */
  // const url = (
  //   `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${pv.getProject()}/${$('#platform-select').val()}` +
  //   `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
  // );
  const url = (
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/2016/01/01`
  );

  $.ajax({
    url: url,
    dataType: 'json'
  }).success((data)=> {
    const max = data.items[0].articles[1].views;
    data.items[0].articles.forEach((item)=> {
      session.pageData.push(item);
      session.pageNames.push(item.article.replace(/_/g, ' '));

      $(".chart-container").append(
        `([X] remove from view) <div style='width:${100 * (item.views / max)}%; background:#DDD; margin:10px 0; padding:10px; white-space:nowrap'>` +
        `<a href="https://en.wikipedia.org/wiki/${item.article}" target="_blank">${item.article.replace(/_/g, ' ')}</div>`
      );
    });

    setupArticleSelector();
    setArticleSelectorDefaults(config.defaults.excludedPages);
  });
});
