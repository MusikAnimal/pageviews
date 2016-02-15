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
        pv.writeMessage("No data found for the page <a href='" + getPageURL(article) + "'>" + article + "</a>", true);
        articles = articles.filter((el) => el !== article);

        if(!articles.length) {
          $(".chart-container").html("");
          $(".chart-container").removeClass("loading");
        }
      }
    }).always((data)=> {
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
