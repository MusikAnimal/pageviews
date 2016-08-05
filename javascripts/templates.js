/**
 * @file Templates used by Chart.js for Pageviews app
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
  linearLegend(datasets, scope) {
    let markup = '';
    if (datasets.length === 1) {
      const dataset = datasets[0];
      return `<div class="linear-legend--totals">
        <strong>${$.i18n('totals')}:</strong>
        ${scope.formatNumber(dataset.sum)} (${scope.formatNumber(dataset.average)}/${$.i18n('day')})
        &bullet;
        <a href="${scope.getLangviewsURL(dataset.label)}" target="_blank">${$.i18n('all-languages')}</a>
        &bullet;
        <a href="${scope.getRedirectviewsURL(dataset.label)}" target="_blank">${$.i18n('redirects')}</a>
        &bullet;
        <a href="${scope.getExpandedPageURL(dataset.label)}&action=history" target="_blank">${$.i18n('history')}</a>
        &bullet;
        <a href="${scope.getExpandedPageURL(dataset.label)}&action=info" target="_blank">${$.i18n('info')}</a>
      </div>`;
    }

    if (datasets.length > 1) {
      const total = datasets.reduce((a,b) => a + b.sum, 0);
      markup = `<div class="linear-legend--totals">
        <strong>${$.i18n('totals')}:</strong>
        ${scope.formatNumber(total)} (${scope.formatNumber(Math.round(total / scope.numDaysInRange()))}/${$.i18n('day')})
      </div>`;
    }
    markup += '<div class="linear-legends">';

    for (let i = 0; i < datasets.length; i++) {
      markup += `
        <span class="linear-legend">
          <div class="linear-legend--label" style="background-color:${scope.rgba(datasets[i].color, 0.8)}">
            <a href="${scope.getPageURL(datasets[i].label)}" target="_blank">${datasets[i].label}</a>
          </div>
          <div class="linear-legend--counts">
            ${scope.formatNumber(datasets[i].sum)} (${scope.formatNumber(datasets[i].average)}/${$.i18n('day')})
          </div>
          <div class="linear-legend--links">
            <a href="${scope.getLangviewsURL(datasets[i].label)}" target="_blank">${$.i18n('all-languages')}</a>
            &bullet;
            <a href="${scope.getRedirectviewsURL(datasets[i].label)}" target="_blank">${$.i18n('redirects')}</a>
            &bullet;
            <a href="${scope.getExpandedPageURL(datasets[i].label)}&action=history" target="_blank">${$.i18n('history')}</a>
            &bullet;
            <a href="${scope.getExpandedPageURL(datasets[i].label)}&action=info" target="_blank">${$.i18n('info')}</a>
          </div>
        </span>
      `;
    }
    return markup += '</div>';
  },

  circularLegend(datasets, scope) {
    const dataset = datasets[0],
      total = dataset.data.reduce((a,b) => a + b);
    let markup = `<div class="linear-legend--totals">
      <strong>${$.i18n('totals')}:</strong>
      ${scope.formatNumber(total)} (${scope.formatNumber(Math.round(total / scope.numDaysInRange()))}/${$.i18n('day')})
    </div>`;

    markup += '<div class="linear-legends">';

    for (let i = 0; i < dataset.data.length; i++) {
      const metaKey = Object.keys(dataset._meta)[0];
      const label = dataset._meta[metaKey].data[i]._view.label;
      markup += `
        <span class="linear-legend">
          <div class="linear-legend--label" style="background-color:${dataset.backgroundColor[i]}">
            <a href="${scope.getPageURL(label)}" target="_blank">${label}</a>
          </div>
          <div class="linear-legend--counts">
            ${scope.formatNumber(dataset.data[i])} (${scope.formatNumber(dataset.averages[i])}/${$.i18n('day')})
          </div>
          <div class="linear-legend--links">
            <a href="${scope.getLangviewsURL(label)}" target="_blank">All languages</a>
            &bullet;
            <a href="${scope.getRedirectviewsURL(label)}" target="_blank">${$.i18n('redirects')}</a>
            &bullet;
            <a href="${scope.getExpandedPageURL(label)}&action=history" target="_blank">History</a>
            &bullet;
            <a href="${scope.getExpandedPageURL(label)}&action=info" target="_blank">Info</a>
          </div>
        </span>
      `;
    }
    return markup += '</div>';
  }
};

module.exports = templates;
