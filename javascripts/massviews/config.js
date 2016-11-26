/**
 * @file Configuration for Massviews application
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 */

/**
 * Configuration for Massviews application.
 * This includes selectors, defaults, and other constants specific to Massviews
 * @type {Object}
 */
const config = {
  agentSelector: '#agent_select',
  chart: '.aqs-chart',
  dateRangeSelector: '#range_input',
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
  logarithmicCheckbox: '.logarithmic-scale-option',
  sources: {
    category: {
      placeholder: 'https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York',
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
    }
  },
  platformSelector: '#platform_select',
  sourceButton: '#source_button',
  sourceInput: '#source_input',
  formStates: ['initial', 'processing', 'complete', 'invalid'],
  timestampFormat: 'YYYYMMDD00',
  validateParams: ['source', 'subjectpage', 'platform', 'agent', 'direction', 'sort', 'view'],
  validParams: {
    direction: ['-1', '1'],
    sort: ['title', 'views', 'original'],
    source: ['pagepile', 'wikilinks', 'category', 'subpages', 'transclusions', 'quarry', 'hashtag', 'external-link'],
    view: ['list', 'chart'],
    subjectpage: ['0', '1']
  }
};

module.exports = config;
