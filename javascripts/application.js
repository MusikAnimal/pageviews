/*
  Pageviews Comparison tool

  Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d courtesy of marcelrf

  Copyright 2016 MusikAnimal
  Redistributed under the MIT License: https://opensource.org/licenses/MIT
*/

const config = require('./config');
const siteMap = require('./shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const pv = require('./shared/helpers');
let session = require('./session');
let normalized = false;

function resetView() {
  $(".chart-container").html("");
  $(".chart-container").removeClass("loading");
  $(".message-container").html("");
  resetArticleSelector();
}

function setupProjectInput() {
  $(config.projectInput).on('change', function() {
    if(!this.value) {
      this.value = 'en.wikipedia.org';
      return;
    }
    if(validateProject()) return;
    resetView();
  });
}

function validateProject() {
  const project = $(config.projectInput).val();
  if(siteDomains.includes(project)) {
    $(".validate").remove();
    $(".select2-selection--multiple").removeClass('disabled');
  } else {
    resetView();
    writeMessage(
      `<a href='//${project}'>${project}</a> is not a ` +
      "<a href='https://en.wikipedia.org/w/api.php?action=sitematrix&formatversion=2'>valid project</a>",
      'validate', true
    );
    $(".select2-selection--multiple").addClass('disabled');
    return true;
  }
}

function writeMessage(message, clear) {
  if(clear) {
    pv.clearMessages();
  }
  $(".message-container").append(
    `<p class='error-message'>${message}</p>`
  );
}

function setupDateRangeSelector() {
  const dateRangeSelector = $(config.dateRangeSelector);
  dateRangeSelector.daterangepicker({
    locale: { format: pv.getLocaleDateString() },
    startDate: moment().subtract(config.daysAgo, 'days'),
    minDate: config.minDate,
    maxDate: config.maxDate
  });

  $('.daterangepicker').append(
    "<div class='daterange-notice'>" +
    "Pageviews Analysis provides data from October 2015 forward. For older data, try <a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>." +
    "</div>"
  );

  dateRangeSelector.on('change', ()=> {
    if(session.chartType === 'Line') {
      if(numDaysInRange() > 50) {
        Chart.defaults.Line.pointHitDetectionRadius = 3;
      } else if(numDaysInRange() > 30) {
        Chart.defaults.Line.pointHitDetectionRadius = 5;
      } else if(numDaysInRange() > 20) {
        Chart.defaults.Line.pointHitDetectionRadius = 10;
      } else {
        Chart.defaults.Line.pointHitDetectionRadius = 20;
      }
    }

    updateChart();
  });
}

function setupArticleSelector() {
  const articleSelector = $(config.articleSelector);

  articleSelector.select2({
    placeholder: 'Type article names...',
    maximumSelectionLength: 10,
    // This ajax call queries the Mediawiki API for article name
    // suggestions given the search term inputed in the selector.
    ajax: {
      url: 'https://' + pv.getProject() + '.org/w/api.php',
      dataType: 'jsonp',
      delay: 200,
      jsonpCallback: 'articleSuggestionCallback',
      data: function (search) {
        return {
          'action': 'opensearch',
          'format': 'json',
          'search': search.term || '',
          'redirects': 'return'
        };
      },
      processResults: function(data) {
        // Processes Mediawiki API results into Select2 format.
        let results = [];
        if(data && data[1].length) {
          results = data[1].map(function (elem) {
            return {
              id: elem.replace(/ /g, '_'),
              text: elem
            };
          });
        }
        return {results: results};
      },
      cache: true
    }
  });

  articleSelector.on('change', updateChart);
}

function setupListeners() {
  $('.download-csv').on('click', exportCSV);
  $('.download-json').on('click', exportJSON);
  $('#platform-select, #agent-select').on('change', updateChart);

  $('.modal-chart-type a').on('click', function() {
    session.chartType = $(this).data('type');
    localStorage['pageviews-chart-preference'] = session.chartType;
    updateChart();
  });

  // window.onpopstate = popParams();
}

// Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
// caused by race conditions between consecutive ajax calls. They are actually
// not critical and can be avoided with this empty function.
function articleSuggestionCallback(data) {}

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
 * Directly set articles in article selector
 * Also removes underscores from visible values in UI
 *
 * @param {array} pages - page titles
 * @returns {array} - untouched array of pages
 */
function setArticleSelectorDefaults(pages) {
  const articleSelectorQuery = config.articleSelector;
  pages.forEach((page)=> {
    const escapedText = $('<div>').text(page).html();
    $('<option>' + escapedText + '</option>').appendTo(articleSelectorQuery);
  });
  const articleSelector = $(articleSelectorQuery);
  articleSelector.select2('val', pages);
  articleSelector.select2('close');

  /** hack in removal of underscores in Select2 entries */
  pages.forEach((page)=> {
    if(/_/.test(page)) { // slight performance improvement
      $(`.select2-selection__choice[title=\"${page}\"]`).text(
        $(`.select2-selection__choice[title=\"${page}\"]`).text().replace(/_/g, ' ')
      );
    }
  });

  return pages;
}

function pushParams() {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker'),
    pages = $(config.articleSelector).select2('val') || [];

  const state = $.param({
    start: daterangepicker.startDate.format("YYYY-MM-DD"),
    end: daterangepicker.endDate.format("YYYY-MM-DD"),
    project: $(config.projectInput).val(),
    platform: $('#platform-select').val(),
    agent: $('#agent-select').val()
  }) + '&pages=' + pages.join('|');

  if(window.history && window.history.replaceState) {
    window.history.replaceState({}, 'Pageview comparsion', "#" + state);
  }
}

function popParams() {
  let params = parseHashParams();

  $(config.projectInput).val(params.project || 'en.wikipedia.org');
  if(validateProject()) return;

  const startDate = moment(params.start || moment().subtract(config.daysAgo, 'days')),
    endDate = moment(params.end || Date.now());

  $(config.dateRangeSelector).data('daterangepicker').setStartDate(startDate);
  $(config.dateRangeSelector).data('daterangepicker').setEndDate(endDate);
  $('#platform-select').val(params.platform || 'all-access');
  $('#agent-select').val(params.agent || 'user');

  if(startDate < moment("2015-10-01") || endDate < moment("2015-10-01")) {
    pv.addSiteNotice('danger', "Pageviews API does not contain data older than October 2015. Sorry.", "Invalid parameters!", true);
    resetView();
    return;
  } else if(startDate > endDate) {
    pv.addSiteNotice('warning', "Start date must be older than the end date.", "Invalid parameters!", true);
    resetView();
    return;
  }

  resetArticleSelector();

  if(!params.pages || params.pages.length === 1 && !params.pages[0]) {
    params.pages = ['Cat', 'Dog'];
    setArticleSelectorDefaults(params.pages);
  } else if(normalized) {
    params.pages = pv.underscorePageNames(params.pages);
    setArticleSelectorDefaults(params.pages);
  } else {
    pv.normalizePageNames(params.pages).then((data)=> {
      normalized = true;

      params.pages = data;

      if(params.pages.length === 1) {
        session.chartType = localStorage['pageviews-chart-preference'] || 'Bar';
      }

      setArticleSelectorDefaults(pv.underscorePageNames(params.pages));
    });
  }
}

function numDaysInRange() {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker');
  return daterangepicker.endDate.diff(daterangepicker.startDate, 'days') + 1;
}
window.numDaysInRange = numDaysInRange;

function getDateHeadings() {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker'),
    startMoment = moment(daterangepicker.startDate),
    dateHeadings = [];
  for(let i=0; i<numDaysInRange(); i++) {
    dateHeadings.push(startMoment.format("YYYY-MM-DD"));
    startMoment.add(1, 'day');
  }
  return dateHeadings;
}

function parseHashParams() {
  const uri = decodeURI(location.hash.slice(1)),
    chunks = uri.split('&');
  let params = {};

  for(let i=0; i<chunks.length ; i++) {
    let chunk = chunks[i].split('=');

    if(chunk[0] === 'pages') {
      params.pages = chunk[1].split('|');
    } else {
      params[chunk[0]] = chunk[1];
    }
  }

  return params;
}

// FIXME: shouldn't need this anymore
function sanitizeData(data) {
  return data.map((entry)=> {
    return entry || 0;
  });
}

function exportCSV(e) {
  e.preventDefault();
  let csvContent = "data:text/csv;charset=utf-8,Page,Color,Sum,Daily average,";

  let dataRows = [];
  chartData.forEach((page, index)=> {
    let dataString = [
      '"' + page.label.replace(/"/g, '""').replace(/'/g, "''") + '"',
      '"' + page.strokeColor + '"',
      page.sum,
      Math.round(page.sum / numDaysInRange())
    ].concat(sanitizeData(page.data)).join(',');
    dataRows.push(dataString);
  });

  csvContent = csvContent + getDateHeadings().join(',') + '\n' + dataRows.join('\n');

  const encodedUri = encodeURI(csvContent);
  window.open(encodedUri);
}

function exportJSON(e) {
  e.preventDefault();

  let data = [];

  chartData.forEach((page, index)=> {
    let entry = {
      page: page.label.replace(/"/g, "\"").replace(/'/g, "\'"),
      color: page.strokeColor,
      sum: page.sum,
      daily_average: Math.round(page.sum / numDaysInRange())
    };
    page.data = sanitizeData(page.data);

    getDateHeadings().forEach((heading, index)=> {
      entry[heading.replace(/\\/,'')] = page.data[index];
    });

    data.push(entry);
  });

  const jsonContent = "data:text/json;charset=utf-8," + JSON.stringify(data),
    encodedUri = encodeURI(jsonContent);
  window.open(encodedUri);
}

function destroyChart() {
  /** Destroy previous chart, if needed. */
  if(session.chartObj) {
    session.chartObj.destroy();
    delete session.chartObj;
  }
}

/**
 * Fills in zero value to a timeseries, see:
 * https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
 *
 * @param {object} data fetched from API
 * @param {moment} startDate - start date of range to filter through
 * @param {moment} endDate - end date of range
 * @returns {object} dataset with zeros where nulls where
 */
function fillInZeros(data, startDate, endDate) {
  // Extract the dates that are already in the timeseries
  let alreadyThere = {};
  data.items.forEach((elem)=> {
    let date = moment(elem.timestamp, config.timestampFormat);
    alreadyThere[date] = elem;
  });
  data.items = [];
  // Reconstruct the timeseries adding zeros
  // for the dates that are not in the timeseries
  // FIXME: use this implementation for getDateHeadings()
  for(let date = moment(startDate); date.isBefore(endDate); date.add(1, 'd')) {
    if(alreadyThere[date]) {
      data.items.push(alreadyThere[date]);
    } else if (date !== endDate) {
      data.items.push({
        timestamp: date.format(config.timestampFormat),
        views: 0
      });
    }
  }
}

/*
 * Get data formatted for a linear chart (Line, Bar, Radar)
 *
 * @param {object} data - data just before we are ready to render the chart
 * @param {string} article - title of page
 * @param {integer} index - where we are in the list of pages to show
 *    used for colour selection
 * @returns {object} - ready for chart rendering
 */
function getLinearData(data, article, index) {
  const values = data.items.map((elem)=> elem.views),
    color = config.colors[index % 10];

  return Object.assign(
    {
      label: article.replace(/_/g, ' '),
      data: values,
      sum: values.reduce((a, b)=> a+b)
    },
    config.chartConfig[session.chartType].dataset(color)
  );
}

/*
 * Get data formatted for a circular chart (Pie, Doughnut, PolarArea)
 *
 * @param {object} data - data just before we are ready to render the chart
 * @param {string} article - title of page
 * @param {integer} index - where we are in the list of pages to show
 *    used for colour selection
 * @returns {object} - ready for chart rendering
 */
function getCircularData(data, article, index) {
  const values = data.items.map((elem)=> elem.views),
    color = config.colors[index];

  return Object.assign(
    {
      label: article.replace(/_/g, ' '),
      value: values.reduce((a, b)=> a+b)
    },
    config.chartConfig[session.chartType].dataset(color)
  );
}

function updateChart() {
  let articles = $(config.articleSelector).select2('val') || [];

  if(!articles.length) {
    $("#chart-legend").html("");
    return;
  }

  pushParams();

  /** prevent duplicate querying due to conflicting listeners */
  if(location.hash === session.params && session.prevChartType === session.chartType) {
    return;
  }
  session.params = location.hash;
  session.prevChartType = session.chartType;

  /** Collect parameters from inputs. */
  const dateRangeSelector = $(config.dateRangeSelector),
    startDate = dateRangeSelector.data('daterangepicker').startDate,
    endDate = dateRangeSelector.data('daterangepicker').endDate;

  destroyChart();
  $(".message-container").html("");
  $(".chart-container").addClass("loading");

  // Asynchronously collect the data from Analytics Query Service API,
  // process it to Chart.js format and initialize the chart.
  let labels = []; // Labels (dates) for the x-axis.
  let datasets = []; // Data for each article timeseries.
  articles.forEach((article, index)=> {
    const uriEncodedArticle = encodeURIComponent(article);
    /** Url to query the API. */
    const url = (
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${pv.getProject()}` +
      `/${$('#platform-select').val()}/${$('#agent-select').val()}/${uriEncodedArticle}/daily` +
      `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
    );

    $.ajax({
      url: url,
      dataType: 'json'
    }).success((data)=> {
      fillInZeros(data, startDate, endDate);

      /** Build the article's dataset. */
      if(config.linearCharts.includes(session.chartType)) {
        datasets.push(getLinearData(data, article, index));
      } else {
        datasets.push(getCircularData(data, article, index));
      }

      window.chartData = datasets;
    }).fail((data)=> {
      if(data.status === 404) {
        writeMessage("No data found for the page <a href='" + pv.getPageURL(article) + "'>" + article + "</a>", true);
        articles = articles.filter((el) => el !== article);

        if(!articles.length) {
          $(".chart-container").html("");
          $(".chart-container").removeClass("loading");
        }
      }
    }).always((data)=> {
      if(!data.items) return;

      /** Get the labels from the first call. */
      if(labels.length === 0) {
        labels = data.items.map((elem)=> {
          return moment(elem.timestamp, config.timestampFormat).format(pv.getLocaleDateString());
        });
      }

      /** When all article datasets have been collected, initialize the chart. */
      if(datasets.length === articles.length) {
        $(".chart-container").removeClass("loading");
        const options = Object.assign({},
          config.chartConfig[session.chartType].opts,
          config.globalChartOpts
        );
        const linearData = {labels: labels, datasets: datasets};

        $(".chart-container").html("");
        $(".chart-container").append("<canvas class='aqs-chart'>");
        const context = $(config.chart)[0].getContext('2d');

        if(config.linearCharts.includes(session.chartType)) {
          session.chartObj = new Chart(context)[session.chartType](linearData, options);
        } else {
          session.chartObj = new Chart(context)[session.chartType](datasets, options);
        }

        pv.clearSiteNotices();
        $("#chart-legend").html(session.chartObj.generateLegend());
        $('.data-links').show();
      }
    });
  });
}

$(document).ready(()=> {
  $.extend(Chart.defaults.global, {animation: false, responsive: true});

  setupProjectInput();
  setupDateRangeSelector();
  setupArticleSelector();
  popParams();

  // simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :)
  $.ajax({
    url: "//tools.wmflabs.org/musikanimal/api/uses",
    method: 'PATCH',
    data : {
      tool: 'pageviews',
      type: 'form'
    }
  });

  $('.date-latest a').on('click', function(e) {
    let daterangepicker = $(config.dateRangeSelector).data('daterangepicker');
    daterangepicker.setStartDate(moment().subtract($(this).data('value'), 'days'));
    daterangepicker.setEndDate(moment());
    e.preventDefault();
  });

  // temporary redirect notice from when tool was moved from /musikanimal/pageviews to /pageviews
  if(document.location.search.includes("redirected=true")) {
    if(window.history && window.history.replaceState) {
      let newURL = document.location.href.replace(document.location.search, '');
      window.history.replaceState({}, 'Pageview comparsion', newURL);
    }
    pv.addSiteNotice('info',
      "Please update your links to point to " +
        "<a class='alert-link' href='https://tools.wmflabs.org/pageviews'>tools.wmflabs.org/pageviews</a>",
      "Pageviews Analysis has moved!"
    );
  }

  setupListeners();
});
