/**
 * @file Templates used by Chart.js for Siteviews app
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
    let pageviewsMsg = 'pageviews';
    if (scope.isUniqueDevices()) {
      pageviewsMsg = 'unique-devices';
    } else if (scope.isPagecounts()) {
      pageviewsMsg = 'pagecounts';
    }
    pageviewsMsg = $.i18n(pageviewsMsg);

    const dataList = (entity, multiEntity = false) => {
      let infoHash = {
        [pageviewsMsg]: {
          [pageviewsMsg]: scope.formatNumber(entity.sum),
          [$.i18n('daily-average')]: scope.formatNumber(entity.average)
        }
      };

      if (scope.isAllProjects()) {
        const projects = ['wikipedia', 'wiktionary', 'wikiquote', 'wikibooks', 'wikisource',
          'wikinews', 'wikiversity', 'wikispecies', 'wikivoyage'];
        let projectCounts = {};

        scope.siteDomains.forEach(domain => {
          const project = projects.filter(project => domain.includes(project));
          if (project[0]) {
            const projectTrans = $.i18n(project[0]).upcase();
            projectCounts[projectTrans] = projectCounts[projectTrans] ? projectCounts[projectTrans] + 1 : 1;
          } else {
            projectCounts[$.i18n('other')] = projectCounts[$.i18n('other')] ? projectCounts[$.i18n('other')] + 1 : 1;
          }
        });

        infoHash[$.i18n('num-projects', scope.siteDomains.length)] = projectCounts;
      } else {
        infoHash[$.i18n('statistics')] = {
          [$.i18n('pages')]: scope.formatNumber(entity.pages),
          [$.i18n('articles')]: scope.formatNumber(entity.articles),
          [$.i18n('edits')]: scope.formatNumber(entity.edits),
          [$.i18n('images')]: scope.formatNumber(entity.images),
          [$.i18n('users')]: scope.formatNumber(entity.users),
          [$.i18n('active-users')]: scope.formatNumber(entity.activeusers),
          [$.i18n('admins')]: scope.formatNumber(entity.admins)
        };
      }

      let markup = '';

      for (let block in infoHash) {
        const blockId = block.toLowerCase().score();
        // "all time" text is shown only for .legend-block--statistics via CSS in siteviews.scss
        markup += `<div class='legend-block legend-block--${blockId}'>
          <h5>${block}<span class='text-muted'>(${$.i18n('all-time').toLowerCase()})</span></h5><hr/>
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

      if (!multiEntity && !scope.isAllProjects()) {
        markup += `
          <div class="linear-legend--links">
            <a href="${scope.getTopviewsMonthURL(entity.label)}" target="_blank">${$.i18n('most-viewed-pages')}</a>
          </div>`;
      }

      return markup;
    };

    if (scope.outputData.length === 1) {
      return dataList(scope.outputData[0]);
    }

    const sum = scope.outputData.reduce((a,b) => a + b.sum, 0);
    const totals = {
      sum,
      average: Math.round(sum / scope.numDaysInRange()),
      pages: scope.outputData.reduce((a, b) => a + b.pages, 0),
      articles: scope.outputData.reduce((a, b) => a + b.articles, 0),
      edits: scope.outputData.reduce((a, b) => a + b.edits, 0),
      images: scope.outputData.reduce((a, b) => a + b.images, 0),
      users: scope.outputData.reduce((a, b) => a + b.users, 0),
      activeusers: scope.outputData.reduce((a, b) => a + b.activeusers, 0),
      admins: scope.outputData.reduce((a, b) => a + b.admins, 0)
    };

    return dataList(totals, true);
  },

  tableRow(scope, item, last = false) {
    const tag = last ? 'th' : 'td';
    const linksRow = last ? '' : `
        <a href="${scope.getTopviewsMonthURL(item.label)}" target="_blank">${$.i18n('most-viewed-pages')}</a>
      `;

    let i18nMessage = 'views';

    if (scope.isUniqueDevices()) {
      i18nMessage = 'devices';
    } else if (scope.isPagecounts()) {
      i18nMessage = 'counts';
    }

    $('.sort-link--sum .col-heading').text($.i18n(i18nMessage));

    return `
      <tr>
        <${tag} class='table-view--color-col'>
          <span class='table-view--color-block' style="background:${item.color}"></span>
        </${tag}>
        <${tag} class='table-view--project'>${last ? item.label : scope.getSiteLink(item.label)}</${tag}>
        <${tag} class='table-view--views'>${scope.formatNumber(item.sum)}</${tag}>
        <${tag} class='table-view--average'>${scope.formatNumber(item.average)}</${tag}>
        <${tag} class='table-view--pages'>${scope.formatNumber(item.pages)}</${tag}>
        <${tag} class='table-view--edits'>${scope.formatNumber(item.edits)}</${tag}>
        <${tag} class='table-view--images'>${scope.formatNumber(item.images)}</${tag}>
        <${tag} class='table-view--users'>${scope.formatNumber(item.users)}</${tag}>
        <${tag} class='table-view--active-users'>${scope.formatNumber(item.activeusers)}</${tag}>
        <${tag} class='table-view--admins'>${scope.formatNumber(item.admins)}</${tag}>
        <${tag}>${linksRow}</${tag}>
      </tr>
    `;
  }
};

module.exports = templates;
