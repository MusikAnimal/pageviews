/*
 * Pageviews Comparison tool
 *
 * Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d courtesy of marcelrf
 *
 * Copyright 2016 MusikAnimal
 * Redistributed under the MIT License: https://opensource.org/licenses/MIT
 */

const config = require('./config');
const siteMap = require('./shared/site_map');
const siteDomains = Object.keys(siteMap).map(key => siteMap[key]);
const pv = require('./shared/pv');
let session = require('./session');

/** let's us know if the page names have been normalized via the API yet */
let normalized = false;

/**
 * Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
 * caused by race conditions between consecutive ajax calls. They are actually
 * not critical and can be avoided with this empty function.
 * @param {Object} data - doesn't matter
 * @returns {null} nothing
 */
function articleSuggestionCallback(data) {}

/**
 * Destroy previous chart, if needed.
 * @returns {null} nothing
 */
function destroyChart() {
  if(session.chartObj) {
    session.chartObj.destroy();
    delete session.chartObj;
  }
}

/**
 * Exports current chart data to CSV format and loads it in a new tab
 * With the prepended data:text/csv this should cause the browser to download the data
 * @returns {string} CSV content
 */
function exportCSV() {
  let csvContent = "data:text/csv;charset=utf-8,Date,";
  let titles = [];
  let dataRows = [];
  let dates = getDateHeadings(false);

  // Begin constructing the dataRows array by populating it with the dates
  dates.forEach((date, index)=> {
    dataRows[index] = [date];
  });

  chartData.forEach((page)=> {
    // Build an array of page titles for use in the CSV header
    let pageTitle = '"' + page.label.replace(/"/g, '""') + '"';
    titles.push(pageTitle);

    // Populate the dataRows array with the data for this page
    dates.forEach((date, index)=> {
      dataRows[index].push(page.data[index]);
    });
  });

  // Finish the CSV header
  csvContent = csvContent + titles.join(',') + '\n';

  // Add the rows to the CSV
  dataRows.forEach((data)=> {
    csvContent += data.join(',') + '\n';
  });

  // Output the CSV file to the browser
  const encodedUri = encodeURI(csvContent);
  window.open(encodedUri);
}

/**
 * Exports current chart data to JSON format and loads it in a new tab
 * @returns {string} stringified JSON
 */
function exportJSON() {
  let data = [];

  chartData.forEach((page, index)=> {
    let entry = {
      page: page.label.replace(/"/g, "\"").replace(/'/g, "\'"),
      color: page.strokeColor,
      sum: page.sum,
      daily_average: Math.round(page.sum / numDaysInRange())
    };

    getDateHeadings(false).forEach((heading, index)=> {
      entry[heading.replace(/\\/,'')] = page.data[index];
    });

    data.push(entry);
  });

  const jsonContent = "data:text/json;charset=utf-8," + JSON.stringify(data),
    encodedUri = encodeURI(jsonContent);
  window.open(encodedUri);

  return jsonContent;
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
  /** Extract the dates that are already in the timeseries */
  let alreadyThere = {};
  data.items.forEach((elem)=> {
    let date = moment(elem.timestamp, config.timestampFormat);
    alreadyThere[date] = elem;
  });
  data.items = [];

  /** Reconstruct with zeros instead of nulls */
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

/**
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
    color = session.colors[index];

  return Object.assign(
    {
      label: article.replace(/_/g, ' '),
      value: values.reduce((a, b)=> a+b)
    },
    config.chartConfig[session.chartType].dataset(color)
  );
}

/**
 * Gets the date headings as strings - i18n compliant
 * @param {boolean} localized - whether the dates should be localized per browser language
 * @returns {Array} the date headings as strings
 */
function getDateHeadings(localized) {
  const daterangepicker = $(config.dateRangeSelector).data('daterangepicker'),
    dateHeadings = [];
  for(let date = moment(daterangepicker.startDate); date.isBefore(daterangepicker.endDate); date.add(1, 'd')) {
    if (localized) {
      dateHeadings.push(date.format(pv.getLocaleDateString()));
    } else {
      dateHeadings.push(date.format("YYYY-MM-DD"));
    }
  }
  return dateHeadings;
}

/**
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
    color = session.colors[index % 10];

  return Object.assign(
    {
      label: article.replace(/_/g, ' '),
      data: values,
      sum: values.reduce((a, b)=> a+b)
    },
    config.chartConfig[session.chartType].dataset(color)
  );
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
/** must be global for use in Chart templates */
window.numDaysInRange = numDaysInRange;

/*
 * Generate key/value pairs of URL hash params
 * @returns {Object} key/value pairs representation of URL hash
 */
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

/**
 * Parses the URL hash and sets all the inputs accordingly
 * Should only be called on initial page load, until we decide to support pop states (probably never)
 * @returns {null} nothing
 */
function popParams() {
  let params = parseHashParams();

  $(config.projectInput).val(params.project || config.defaultProject);
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

/**
 * Replaces history state with new URL hash representing current user input
 * Called whenever we go to update the chart
 * @returns {string} the new hash param string
 */
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

  return state;
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
    placeholder: 'Type article names...',
    maximumSelectionLength: 10,
    /**
     * This ajax call queries the Mediawiki API for article name
     * suggestions given the search term inputed in the selector.
     * We ultimately want to make the endpoint configurable based on whether they want redirects
     */
    ajax: {
      url: 'https://' + pv.getProject() + '.org/w/api.php',
      dataType: 'jsonp',
      delay: 200,
      jsonpCallback: 'articleSuggestionCallback',
      data: (search)=> {
        return {
          'action': 'opensearch',
          'format': 'json',
          'search': search.term || '',
          'redirects': 'return'
        };
      },
      processResults: function(data) {
        /** Processes Mediawiki API results into Select2 format. */
        let results = [];
        if(data && data[1].length) {
          results = data[1].map((elem)=> {
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

  return pages;
}

/**
 * sets up the daterange selector and adds listeners
 * @returns {null} - nothing
 */
function setupDateRangeSelector() {
  const dateRangeSelector = $(config.dateRangeSelector);
  dateRangeSelector.daterangepicker({
    locale: { format: pv.getLocaleDateString() },
    startDate: moment().subtract(config.daysAgo, 'days'),
    minDate: config.minDate,
    maxDate: config.maxDate
  });

  /** so people know why they can't query data older than October 2015 */
  $('.daterangepicker').append(
    "<div class='daterange-notice'>" +
    "Pageviews Analysis provides data from October 2015 forward. For older data, try <a href='http://stats.grok.se' target='_blank'>stats.grok.se</a>." +
    "</div>"
  );

  dateRangeSelector.on('change', ()=> {
    /** Attempt to fine-tune the pointer detection spacing based on how cluttered the chart is */
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

/**
 * General place to add page-wide listeners
 * @returns {null} - nothing
 */
function setupListeners() {
  $('.download-csv').on('click', exportCSV);
  $('.download-json').on('click', exportJSON);
  $('#platform-select, #agent-select').on('change', updateChart);

  /** changing of chart types */
  $('.modal-chart-type a').on('click', function() {
    session.chartType = $(this).data('type');
    localStorage['pageviews-chart-preference'] = session.chartType;
    updateChart();
  });

  /** the "Latest N days" links */
  $('.date-latest a').on('click', function() {
    let daterangepicker = $(config.dateRangeSelector).data('daterangepicker');
    daterangepicker.setStartDate(moment().subtract($(this).data('value'), 'days'));
    daterangepicker.setEndDate(moment());
  });

  /** prevent browser's default behaviour for any link with href="#" */
  $('a[href=\'#\'').on('click', (e)=> e.preventDefault());

  // window.onpopstate = popParams();
}

/**
 * Setup listeners for project input
 * @returns {null} - nothing
 */
function setupProjectInput() {
  $(config.projectInput).on('change', function() {
    if(!this.value) {
      this.value = config.defaultProject;
      return;
    }
    if(validateProject()) return;
    resetView();
  });
}

/**
 * The mother of all functions, where all the chart logic lives
 * Really needs to be broken out into several functions
 *
 * @returns {null} - nothin
 */
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

  /**
   * Asynchronously collect the data from Analytics Query Service API,
   * process it to Chart.js format and initialize the chart.
   */
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
        writeMessage(`No data found for the page <a href='${pv.getPageURL(article)}'>${article}</a>`, true);
        articles = articles.filter((el) => el !== article);

        if(!articles.length) {
          $(".chart-container").html("");
          $(".chart-container").removeClass("loading");
        }
      }
    }).always((data)=> {
      /** Get the labels from the first call. */
      if(labels.length === 0 && data.items) {
        labels = data.items.map((elem)=> {
          return moment(elem.timestamp, config.timestampFormat).format(pv.getLocaleDateString());
        });
      }

      /** When all article datasets have been collected, initialize the chart. */
      if(articles.length && datasets.length === articles.length) {
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

/**
 * Checks value of project input and validates it against site map
 * @returns {boolean} whether the currently input project is valid
 */
function validateProject() {
  const project = $(config.projectInput).val();
  if(siteDomains.includes(project)) {
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

/**
 * Writes message just below the chart
 * @param {string} message - message to write
 * @param {boolean} clear - whether to clear any existing messages
 * @returns {jQuery} - jQuery object of message container
 */
function writeMessage(message, clear) {
  if(clear) {
    pv.clearMessages();
  }
  return $(".message-container").append(
    `<p class='error-message'>${message}</p>`
  );
}

$(document).ready(()=> {
  $.extend(Chart.defaults.global, {animation: false, responsive: true});

  setupProjectInput();
  setupDateRangeSelector();
  setupArticleSelector();
  popParams();

  /** simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :) */
  $.ajax({
    url: "https://tools.wmflabs.org/musikanimal/api/uses",
    method: 'PATCH',
    data : {
      tool: 'pageviews',
      type: 'form'
    }
  });

  /** temporary redirect notice from when tool was moved from /musikanimal/pageviews to /pageviews */
  if(document.location.search.includes("redirected=true")) {
    if(window.history && window.history.replaceState) {
      let newURL = document.location.href.replace(document.location.search, '');
      window.history.replaceState({}, 'Pageview comparsion', newURL);
    }
    pv.addSiteNotice('info',
      "Please update your links to point to " +
        "<a class='alert-link' href='//tools.wmflabs.org/pageviews'>tools.wmflabs.org/pageviews</a>",
      "Pageviews Analysis has moved!"
    );
  }

  setupListeners();
});
