function destroyChart() {
  // Destroy previous chart, if needed.
  if(config.articleComparisonChart) {
    config.articleComparisonChart.destroy();
    delete config.articleComparisonChart;
  }
}

// Fills in zero value to a timeseries, see:
// https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageview_API#Gotchas
function fillInZeros(data, startDate, endDate) {
  // Extract the dates that are already in the timeseries
  let alreadyThere = {};
  data.items.forEach(function (elem) {
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

function getLinearData(data, article, index) {
  const values = data.items.map(function (elem) { return elem.views; }),
    color = config.colors[index];

  return Object.assign(
    {
      label: article.replace(/_/g, ' '),
      data: values,
      sum: values.reduce(function(a, b){return a+b;})
    },
    config.chartConfig[config.chartType].dataset(color)
  );
}

function getCircularData(data, article, index) {
  const values = data.items.map(function (elem) { return elem.views; }),
    color = config.colors[index];

  return Object.assign(
    {
      label: article.replace(/_/g, ' '),
      value: values.reduce(function(a, b){return a+b;})
    },
    config.chartConfig[config.chartType].dataset(color)
  );
}

function updateChart() {
  pushParams();
  // Collect parameters from inputs.
  const dateRangeSelector = $(config.dateRangeSelector),
    startDate = dateRangeSelector.data('daterangepicker').startDate,
    endDate = dateRangeSelector.data('daterangepicker').endDate,
    articles = $(config.articleSelector).select2('val') || [];

  destroyChart();

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
        fillInZeros(data, startDate, endDate);

        // Get the labels from the first call.
        if (labels.length === 0) {
          labels = data.items.map(function (elem) {
            return moment(elem.timestamp, config.timestampFormat).format(pv.getLocaleDateString());
          });
        }

        // Build the article's dataset.
        if(config.linearCharts.includes(config.chartType)) {
          datasets.push(getLinearData(data, article, index));
        } else {
          datasets.push(getCircularData(data, article, index));
        }

        window.chartData = datasets;

        // When all article datasets have been collected,
        // initialize the chart.
        if (datasets.length === articles.length) {
          $(".chart-container").removeClass("loading");
          const options = Object.assign({},
            config.chartConfig[config.chartType].opts,
            config.globalChartOpts
          );
          const linearData = {labels: labels, datasets: datasets};

          $(".chart-container").html("");
          $(".chart-container").append("<canvas class='aqs-chart'>");
          const context = $(config.chart)[0].getContext('2d');

          if(config.linearCharts.includes(config.chartType)) {
            config.articleComparisonChart = new Chart(context)[config.chartType](linearData, options);
          } else {
            config.articleComparisonChart = new Chart(context)[config.chartType](datasets, options);
          }

          pv.clearSiteNotices();
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
