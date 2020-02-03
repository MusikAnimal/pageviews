/**
 * Configuration for Massviews application.
 * This includes selectors, defaults, and other constants specific to Massviews
 * @type {Object}
 */
const config = {
  defaults: {
    dateRange: 'latest-20',
    project: 'en.wikipedia.org',
    sort: 'views',
    source: 'category',
    sourceProject: '',
    direction: 1,
    outputData: [],
    hadFailure: false,
    total: 0,
    view: 'list',
    subjectpage: 0
  },
  chartLegend: scope => {
    return `<strong>${$.i18n('totals')}:</strong> ${scope.formatNumber(scope.outputData.sum)}
      (${scope.formatNumber(Math.round(scope.outputData.average))}/${$.i18n('day')})`;
  },
  sources: {
    category: {
      placeholder: 'https://en.wikipedia.org/wiki/Category:Hip_hop_groups_from_New_York_City',
      descriptionParams: () => [
        `<a target='_blank' href='https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Categories'>${$.i18n('category').toLowerCase()}</a>`
      ],
      type: 'text'
    },
    wikilinks: {
      placeholder: 'https://en.wikipedia.org/wiki/Book:New_York_City',
      descriptionParams: () => ['https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Wikilinks'],
      type: 'text'
    },
    pagepile: {
      placeholder: '12345',
      descriptionParams: () => ["<a target='_blank' href='//tools.wmflabs.org/pagepile'>PagePile</a>"],
      type: 'number'
    },
    subpages: {
      placeholder: 'https://en.wikipedia.org/wiki/User:Example',
      descriptionParams: () => [
        `<a target='_blank' href='https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Subpages'>${$.i18n('subpages').toLowerCase()}</a>`
      ],
      type: 'text'
    },
    transclusions: {
      placeholder: 'https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games',
      descriptionParams: () => ['https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Transclusion'],
      type: 'text'
    },
    quarry: {
      placeholder: '12345',
      descriptionParams: () => ["<a target='_blank' href='//quarry.wmflabs.org'>Quarry</a>"],
      type: 'number'
    },
    hashtag: {
      placeholder: '#editathon',
      descriptionParams: () => [
        `<span class='glyphicon glyphicon-flash'></span>${$.i18n('hashtag-credits', "<a target='_blank' href='//tools.wmflabs.org/hashtags'>Wikipedia social search</a>")}`,
        `<a target='_blank' href='//tools.wmflabs.org/hashtags/docs'>${$.i18n('hashtag').toLowerCase()}</a>`
      ],
      type: 'string'
    },
    'external-link': {
      placeholder: '*.nycgo.com',
      descriptionParams: () => [
        `<a target='_blank' href='https://www.mediawiki.org/wiki/Help:Links#External_links'>${$.i18n('external-link').toLowerCase()}</a>`
      ],
      type: 'string'
    },
    'search': {
      placeholder: 'insource:"UNESCO Science Report"',
      descriptionParams: () => [
        "<a target='_blank' href='https://www.mediawiki.org/wiki/Help:CirrusSearch'>CirrusSearch</a>"
      ],
      type: 'string'
    }
  },
  sourceButton: '#source_button',
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  timestampFormat: 'YYYYMMDD00',
  validateParams: ['source', 'subjectpage', 'subcategories', 'platform', 'agent', 'direction', 'sort', 'view'],
  validParams: {
    direction: ['-1', '1'],
    sort: ['title', 'views', 'original'],
    source: ['pagepile', 'wikilinks', 'category', 'subpages', 'transclusions', 'quarry', 'hashtag', 'external-link', 'search'],
    view: ['list', 'chart'],
    subjectpage: ['0', '1'],
    subcategories: ['0', '1']
  }
};

module.exports = config;
