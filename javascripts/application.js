/*
  Pageviews Comparison tool

  Original code forked from https://gist.github.com/marcelrf/49738d14116fd547fe6d courtesy of marcelrf

  Copyright 2016 MusikAnimal
  Redistributed under the MIT License: https://opensource.org/licenses/MIT
*/

let normalized = false;

function setupProjectInput() {
  $(config.projectInput).on('change', function () {
    if(!this.value) {
      this.value = 'en.wikipedia.org';
      return;
    }
    if(validateProject()) return;
    resetArticleSelector(); // This will call updateChart() itself.
  });
}

function validateProject() {
  const project = $(config.projectInput).val();
  if(sites.indexOf(project) === -1) {
    writeMessage(
      "<a href='//" + project + "'>" + project + "</a> is not a " +
      "<a href='https://en.wikipedia.org/w/api.php?action=sitematrix&formatversion=2'>valid project</a>",
      'validate', true
    );
    resetArticleSelector();
    $(".select2-selection--multiple").addClass('disabled');
    return true;
  } else {
    $(".validate").remove();
    $(".select2-selection--multiple").removeClass('disabled');
  }
}

function setupDateRangeSelector() {
  const dateRangeSelector = $(config.dateRangeSelector);
  dateRangeSelector.daterangepicker({
    startDate: moment().subtract(config.daysAgo, 'days'),
    minDate: config.minDate,
    maxDate: config.maxDate
  });
  dateRangeSelector.on('change', updateChart);
}

function setupArticleSelector () {
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
          'action': 'query',
          'list': 'prefixsearch',
          'format': 'json',
          'pssearch': search.term || '',
          'cirrusUseCompletionSuggester': 'yes'
        };
      },
      processResults: function (data) {
        // Processes Mediawiki API results into Select2 format.
        let results = [];
        if (data && data.query && data.query.prefixsearch.length) {
          results = data.query.prefixsearch.map(function (elem) {
            return {
              id: elem.title.replace(/ /g, '_'),
              text: elem.title
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
  // window.onpopstate = popParams();
}

// Select2 library prints "Uncaught TypeError: XYZ is not a function" errors
// caused by race conditions between consecutive ajax calls. They are actually
// not critical and can be avoided with this empty function.
function articleSuggestionCallback (data) {}

function resetArticleSelector () {
  const articleSelector = $(config.articleSelector);
  articleSelector.off('change');
  articleSelector.select2('val', null);
  articleSelector.select2('data', null);
  articleSelector.select2('destroy');
  $('.data-links').hide();
  setupArticleSelector();
  updateChart();
}

function setArticleSelectorDefaults (defaults) {
  // Caveat: This method only works with single-word article names.
  const articleSelectorQuery = config.articleSelector;
  defaults.forEach(function (elem) {
    const escapedText = $('<div>').text(elem).html();
    $('<option>' + escapedText + '</option>').appendTo(articleSelectorQuery);
  });
  const articleSelector = $(articleSelectorQuery);
  articleSelector.select2('val', defaults);
  articleSelector.select2('close');
}

function updateChart () {
  pushParams();
  // Collect parameters from inputs.
  const dateRangeSelector = $(config.dateRangeSelector),
    startDate = dateRangeSelector.data('daterangepicker').startDate,
    endDate = dateRangeSelector.data('daterangepicker').endDate,
    articles = $(config.articleSelector).select2('val') || [];

  // Destroy previous chart, if needed.
  if(config.articleComparisonChart) {
    config.articleComparisonChart.destroy();
    delete config.articleComparisonChart;
  }

  if(articles.length) {
    $(".chart-container").addClass("loading");
  } else {
    $("#chart-legend").html("");
  }

  // Asynchronously collect the data from Analytics Query Service API,
  // process it to Chart.js format and initialize the chart.
  let labels = []; // Labels (dates) for the x-axis.
  let datasets = []; // Data for each article timeseries.
  articles.forEach(function (article, index) {
    const uriEncodedArticle = encodeURIComponent(article);
    // Url to query the API.
    const url = (
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${pv.getProject()}` +
      `/${$('#platform-select').val()}/${$('#agent-select').val()}/${uriEncodedArticle}/daily` +
      `/${startDate.format(config.timestampFormat)}/${endDate.format(config.timestampFormat)}`
    );

    $.ajax({
      url: url,
      dataType: 'json',
      success: (data)=> {
        fillInNulls(data, startDate, endDate);

        // Get the labels from the first call.
        if (labels.length === 0) {
          labels = data.items.map(function (elem) {
            return moment(elem.timestamp, config.timestampFormat).format('YYYY-MM-DD');
          });
        }

        // Build the article's dataset.
        let values = data.items.map(function (elem) { return elem.views; });
        let color = config.colors[index];
        datasets.push({
          label: article.replace(/_/g, ' '),
          fillColor: 'rgba(0,0,0,0)',
          strokeColor: color,
          pointColor: color,
          pointStrokeColor: '#fff',
          pointHighlightFill: '#fff',
          pointHighlightStroke: color,
          data: values,
          sum: values.reduce(function(a, b){return a+b;})
        });

        window.chartData = datasets;

        const template = "<b>Totals:</b><ul class=\"<%=name.toLowerCase()%>-legend\">" +
          "<% for (var i=0; i<datasets.length; i++){%>" +
            "<li><span class=\"indic\" style=\"background-color:<%=datasets[i].strokeColor%>\">" +
            "<a href='<%= getPageURL(datasets[i].label) %>'><%=datasets[i].label%></a></span> " +
            "<%= chartData[i].sum %> (<%= Math.round(chartData[i].sum / numDaysInRange()) %>/day)</li><%}%></ul>";

        // When all article datasets have been collected,
        // initialize the chart.
        if (datasets.length === articles.length) {
          $(".chart-container").removeClass("loading");
          const lineData = {labels: labels, datasets: datasets};
          const options = {
            animation: true,
            animationEasing: "easeInOutQuart",
            bezierCurve: false,
            legendTemplate : template
          };
          $(".chart-container").html("");
          $(".chart-container").append("<canvas class='aqs-chart'>");
          const context = $(config.chart)[0].getContext('2d');
          config.articleComparisonChart = new Chart(context).Line(lineData, options);
          $("#chart-legend").html(config.articleComparisonChart.generateLegend());
          $('.data-links').show();
        }
      },
      error: (data)=> {
        if(data.status === 404) {
          $(".chart-container").html("");
          $(".chart-container").removeClass("loading");
          writeMessage("No data found for the page <a href='" + getPageURL(article) + "'>" + article + "</a>");
        }
      }
    });
  });
}

// Fills in null values to a timeseries, see:
// https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
function fillInNulls(data, startDate, endDate) {
  // Extract the dates that are already in the timeseries
  let alreadyThere = {};
  data.items.forEach(function (elem) {
    let date = moment(elem.timestamp, config.timestampFormat);
    alreadyThere[date] = elem;
  });
  data.items = [];
  // Reconstruct the timeseries adding nulls
  // for the dates that are not in the timeseries
  // FIXME: use this implementation for getDateHeadings()
  for (let date = moment(startDate); date.isBefore(endDate); date.add(1, 'd')) {
    if (alreadyThere[date]) {
      data.items.push(alreadyThere[date]);
    } else if (date !== endDate) {
      data.items.push({
        timestamp: date.format(config.timestampFormat),
        views: null
      });
    }
  }
}

function writeMessage(message, className, clear) {
  if(clear) {
    $(".chart-container").removeClass("loading");
    $(".chart-container").html("");
  }
  $(".chart-container").append(
    `<p class='${className || ''}'>${message}</p>`
  );
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

  if (window.history && window.history.replaceState) {
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

  resetArticleSelector();

  if(!params.pages || params.pages.length === 1 && !params.pages[0]) {
    params.pages = ['Cat', 'Dog'];
    setArticleSelectorDefaults(params.pages);
  } else {
    if(normalized) {
      params.pages = pv.underscorePageNames(params.pages);
      setArticleSelectorDefaults(params.pages);
    } else {
      pv.normalizePageNames(params.pages).then(function(data) {
        normalized = true;

        if(data.query.normalized) {
          data.query.normalized.forEach(function(normalPage) {
            // do it this way to preserve ordering of pages
            params.pages = params.pages.map((page)=> {
              if(normalPage.from === page) {
                return normalPage.to;
              } else {
                return page;
              }
            });
          });
        }

        setArticleSelectorDefaults(pv.underscorePageNames(params.pages));
      });
    }
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

  for(let i=0; i < chunks.length ; i++) {
    let chunk = chunks[i].split('=');

    if(chunk[0] === 'pages') {
      params.pages = chunk[1].split('|');
    } else {
      params[chunk[0]] = chunk[1];
    }
  }

  return params;
}

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
      page.strokeColor,
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

  chartData.forEach(function(page, index) {
    let entry = {
      page: page.label.replace(/"/g, "\"").replace(/'/g, "\'"),
      color: page.strokeColor,
      sum: page.sum,
      daily_average: Math.round(page.sum / numDaysInRange())
    };
    page.data = sanitizeData(page.data);

    getDateHeadings().forEach(function(heading, index) {
      entry[heading.replace(/\\/,'')] = page.data[index];
    });

    data.push(entry);
  });

  const jsonContent = "data:text/json;charset=utf-8," + JSON.stringify(data),
    encodedUri = encodeURI(jsonContent);
  window.open(encodedUri);
}

$(document).ready(function() {
  $.extend(Chart.defaults.global, {animation: false, responsive: true});

  setupProjectInput();
  setupDateRangeSelector();
  setupArticleSelector();
  popParams();

  // simple metric to see how many use it (pageviews of the pageview, a meta-pageview, if you will :)
  $.ajax({
    url: "https://tools.wmflabs.org/musikanimal/api/uses",
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

  setupListeners();
});
