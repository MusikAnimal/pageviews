/**
 * @file Templates used by Chart.js for Mediaviews app
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

/**
 * Templates used by Chart.js.
 * Functions used within our app must be in the global scope.
 * All quotations must be double-quotes or properly escaped.
 * @type {Object}
 */
const templates = {
  chartLegend(scope) {
    const dataList = (entity, multiEntity = false) => {
      let infoHash = {
        [$.i18n('playcounts')]: {
          [$.i18n('playcounts')]: scope.formatNumber(entity.sum),
          [$.i18n('daily-average')]: scope.formatNumber(entity.average)
        }
      };

      // Conditionally add other stats, as they may not be available
      //   depending on if we're showing stats for a category, a single
      //   file or multiple files.

      // Pageviews gets its own heading
      if (entity.pageviews) {
        const pageviews = multiEntity ? scope.formatNumber(entity.pageviews)
          : scope.getPageviewsLink(entity.label, scope.formatNumber(entity.pageviews));
        infoHash[$.i18n('pageviews')] = {
          [$.i18n('pageviews')]: pageviews,
          [$.i18n('daily-average')]: scope.formatNumber(entity.pageviewsAvg)
        };
      }

      const statsKey = $.i18n('statistics');
      infoHash[statsKey] = {};

      if (scope.isCategory()) {
        if (entity.files) {
          infoHash[statsKey][$.i18n('files')] = scope.formatNumber(entity.files);
        }
        if (entity.subcats) {
          infoHash[statsKey][$.i18n('subcategories')] = scope.formatNumber(entity.subcats);
        }
      } else {
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
      pageviews = scope.outputData.reduce((a, b) => a + b.pageviews, 0),
      size = scope.outputData.reduce((a, b) => a + b.size, 0);
    const totals = {
      sum,
      average: Math.round(sum / scope.numDaysInRange()),
      pageviews,
      pageviewsAvg: Math.round(pageviews / scope.numDaysInRange()),
      duration: scope.outputData.reduce((a, b) => a + b.duration, 0),
      size,
      sizeAvg: Math.round(size / scope.numDaysInRange())
    };

    return dataList(totals, true);
  },

  tableRow(scope, item, last = false) {
    const tag = last ? 'th' : 'td';

    $('.sort-link--sum .col-heading').text($.i18n('playcounts'));

    let pageviewsLink = '?';

    if (item.pageviews) {
      pageviewsLink = last ? scope.formatNumber(item.pageviews)
        : scope.getPageviewsLink(item.label, scope.formatNumber(item.pageviews));
    }

    return `
      <tr>
        <${tag} class='table-view--color-col'>
          <span class='table-view--color-block' style="background:${item.color}"></span>
        </${tag}>
        <${tag} class='table-view--file'>${last ? item.label : scope.getFileLink(`File:${item.label}`)}</${tag}>
        <${tag} class='table-view--playcounts'>${scope.formatNumber(item.sum)}</${tag}>
        <${tag} class='table-view--average'>${scope.formatNumber(item.average)}</${tag}>
        <${tag} class='table-view--pageviews'>${pageviewsLink}</${tag}>
        <${tag} class='table-view--duration'>${scope.formatNumber(Math.round(item.duration))}</${tag}>
        <${tag} class='table-view--size'>${scope.formatNumber(item.size)}</${tag}>
        <${tag} class='table-view--date'>${last ? '' : scope.formatTimestamp(item.timestamp)}</${tag}>
        <${tag} class='table-view--file-type'>${last ? '' : item.mediatype}</${tag}>
      </tr>
    `;
  }
};

module.exports = templates;
