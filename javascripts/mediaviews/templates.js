/**
 * Templates used by Chart.js in the Mediaviews application.
 * Functions used within our app must be in the global scope.
 * All quotations must be double-quotes or properly escaped.
 * @type {Object}
 */
const templates = {
  chartLegend(scope) {
    const dataList = (entity, multiEntity = false) => {
      let infoHash = {
        [$.i18n('requests')]: {
          [$.i18n('requests')]: scope.formatNumber(entity.sum),
          [$.i18n(`${$('#date-type-select').val()}-average`)]: scope.formatNumber(entity.average)
        }
      };

      // Conditionally add other stats, as they may not be available
      //   depending on if we're showing stats for a category, a single
      //   file or multiple files.

      const statsKey = $.i18n('statistics');
      infoHash[statsKey] = {};

      if (entity.duration) {
        const duration = Math.round(entity.duration);
        infoHash[statsKey][$.i18n('duration')] = $.i18n('num-seconds', duration, scope.formatNumber(duration));
      }
      if (entity.size) {
        infoHash[statsKey][$.i18n('size')] = $.i18n('num-bytes', scope.formatNumber(entity.size), entity.size);
      }
      if (entity.timestamp) {
        infoHash[statsKey][$.i18n('date')] = scope.formatTimestamp(entity.timestamp);
      }
      if (entity.mediatype) {
        infoHash[statsKey][$.i18n('file-type')] = entity.mediatype.toLowerCase();
      }

      let markup = '';

      for (let block in infoHash) {
        const blockId = block.toLowerCase().score();
        markup += `<div class='legend-block legend-block--${blockId}'>
          <h5>${block}</h5><hr/>
          <div class='legend-block--body'>`;
        for (let key in infoHash[block]) {
          const value = infoHash[block][key];
          if (!value) continue;
          markup += `
            <div class="linear-legend--counts">
              ${key}:
              <span class='pull-right'>
                ${value}
              </span>
            </div>`;
        }
        markup += '</div></div>';
      }

      return markup;
    };

    if (scope.outputData.length === 1) {
      return dataList(scope.outputData[0]);
    }

    const sum = scope.outputData.reduce((a,b) => a + b.sum, 0),
      size = scope.outputData.reduce((a, b) => a + b.size, 0);
    const totals = {
      sum,
      average: Math.round(sum / (scope.outputData[0].data.filter(el => el !== null)).length),
      duration: scope.outputData.reduce((a, b) => a + b.duration, 0),
      size,
      sizeAvg: Math.round(size / scope.numDaysInRange())
    };

    return dataList(totals, true);
  },

  tableRow(scope, item, last = false) {
    const tag = last ? 'th' : 'td';

    $('.sort-link--sum .col-heading').text($.i18n('requests'));

    return `
      <tr>
        <${tag} class='table-view--color-col'>
          <span class='table-view--color-block' style="background:${item.color}"></span>
        </${tag}>
        <${tag} class='table-view--file'>${last ? item.label : scope.getFileLink(`File:${item.label}`)}</${tag}>
        <${tag} class='table-view--requests'>${scope.formatNumber(item.sum)}</${tag}>
        <${tag} class='table-view--average'>${scope.formatNumber(item.average)}</${tag}>
        <${tag} class='table-view--duration'>${item.duration ? scope.formatNumber(Math.round(item.duration)) : '&ndash;'}</${tag}>
        <${tag} class='table-view--size'>${scope.formatNumber(item.size)}</${tag}>
        <${tag} class='table-view--date'>${last ? '' : scope.formatTimestamp(item.timestamp)}</${tag}>
        <${tag} class='table-view--file-type'>${last ? '' : item.mediatype}</${tag}>
      </tr>
    `;
  }
};

module.exports = templates;
