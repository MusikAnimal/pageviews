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
  if(sites.includes(project)) {
    $(".validate").remove();
    $(".select2-selection--multiple").removeClass('disabled');
  } else {
    writeMessage(
      "<a href='//" + project + "'>" + project + "</a> is not a " +
      "<a href='https://en.wikipedia.org/w/api.php?action=sitematrix&formatversion=2'>valid project</a>",
      'validate', true
    );
    resetArticleSelector();
    $(".select2-selection--multiple").addClass('disabled');
    return true;
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

  $('.modal-chart-type a').on('click', function() {
    config.chartType = $(this).data('type');
    localStorage['pageviews-chart-preference'] = config.chartType;
    updateChart();
  });

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

function setArticleSelectorDefaults(defaults) {
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

  if(startDate < moment("2015-10-01") || endDate < moment("2015-10-01")) {
    pv.addSiteNotice('danger', "Pageviews API does not contain data older than October 2015. Sorry.", "Invalid parameters!", true);
    pv.resetView();
    return;
  } else if(startDate > endDate) {
    pv.addSiteNotice('warning', "Start date must be older than the end date.", "Invalid parameters!", true);
    pv.resetView();
    return;
  }

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
    if (window.history && window.history.replaceState) {
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
