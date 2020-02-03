/**
 * Customized zoom plugin for Chart.js, based on https://github.com/chartjs/chartjs-plugin-zoom
 * @author MusikAnimal, Evert Timberg
 */

const zoomNS = Chart.Zoom = Chart.Zoom || {};

const zoomPlugin = {
  beforeInit: chartObj => {
    if (!chartObj.options.zoom) return;

    chartObj.zoom = {};

    const node = chartObj.chart.ctx.canvas;

    chartObj.zoom._mouseDownHandler = e => {
      chartObj.zoom._dragZoomStart = e;
    };
    node.addEventListener('mousedown', chartObj.zoom._mouseDownHandler);

    chartObj.zoom._mouseMoveHandler = e => {
      if (!chartObj.zoom._dragZoomStart) return; // ignore if not dragging

      chartObj.zoom._dragZoomEnd = e;
      chartObj.update(0);
    };
    node.addEventListener('mousemove', chartObj.zoom._mouseMoveHandler);

    chartObj.zoom._mouseUpHandler = e => {
      if (!chartObj.zoom._dragZoomStart) return;

      /** compute new start and end dates from the selected area */
      const beginPoint = chartObj.zoom._dragZoomStart,
        offsetX = beginPoint.target.getBoundingClientRect().left,
        startX = Math.min(beginPoint.clientX, e.clientX) - offsetX,
        endX = Math.max(beginPoint.clientX, e.clientX) - offsetX,
        scale = chartObj.scales['x-axis-0'],
        start = scale.getValueForPixel(startX),
        end = scale.getValueForPixel(endX),
        dragDistance = endX - startX;

      /** happens if they simply clicked and didn't drag */
      if (dragDistance <= 0) {
        chartObj.zoom._dragZoomStart = null;
        return;
      }

      chartObj.zoom._dragZoomStart = null;
      chartObj.zoom._dragZoomEnd = null;

      /** set start and end date, which will fire the event to re-process the form and render the chart */
      const dateLabels = chartObj.data.labels,
        daterangepicker = $('.date-range-selector').data('daterangepicker');

      /** if they selected the same area that is already shown */
      if (end - start + 1 === dateLabels.length) {
        return chartObj.update(0);
      }

      daterangepicker.startDate = moment(dateLabels[start], chartObj.data.dateFormat);
      daterangepicker.setEndDate(moment(dateLabels[end], chartObj.data.dateFormat));
      daterangepicker.updateElement();
    };
    node.addEventListener('mouseup', chartObj.zoom._mouseUpHandler);
  },

  beforeDatasetsDraw: chartObj => {
    if (!chartObj.options.zoom) return;
    if (!chartObj.zoom._dragZoomStart || !chartObj.zoom._dragZoomEnd) return;

    const ctx = chartObj.chart.ctx,
      chartArea = chartObj.chartArea;
    ctx.save();
    ctx.beginPath();

    /** compute box for the dragged area and draw it */
    const yAxis = chartObj.scales['y-axis-0'],
      beginPoint = chartObj.zoom._dragZoomStart,
      endPoint = chartObj.zoom._dragZoomEnd,
      offsetX = beginPoint.target.getBoundingClientRect().left,
      startX = Math.min(beginPoint.clientX, endPoint.clientX) - offsetX,
      endX = Math.max(beginPoint.clientX, endPoint.clientX) - offsetX,
      rectWidth = endX - startX;

    ctx.fillStyle = 'rgba(225,225,225,0.3)';
    ctx.lineWidth = 5;
    ctx.fillRect(startX, yAxis.top, rectWidth, yAxis.bottom - yAxis.top);

    ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
    ctx.clip();
  },

  afterDatasetsDraw: chartObj => {
    if (!chartObj.options.zoom) return;

    chartObj.chart.ctx.restore();
  }
};

Chart.pluginService.register(zoomPlugin);
