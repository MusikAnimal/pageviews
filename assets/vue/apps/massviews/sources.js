import { banana, rawI18n } from '../../i18n.js';

/**
 * The Massviews sources' labels and descriptions, shared between the
 * source select (Massviews.vue) and the FAQ's sources section.
 * Functions rather than constants so the messages resolve after
 * banana-i18n has loaded.
 */

const help = ( page, text ) => `<a target="_blank" href="https://www.mediawiki.org/wiki/Special:MyLanguage/${ page }">${ text }</a>`;

/**
 * The source select's items, in display order. Quarry is a proper
 * noun. WikiProject is always offered even though only some wikis run
 * PageAssessments — the project input restricts itself to those wikis
 * when this source is picked (gating the menu entry on the current
 * project instead would hide the source until the user happened to
 * have a supported wiki set).
 *
 * @return {Array<{value: string, label: string}>}
 */
export function getSourceItems() {
	return [
		{ value: 'category', label: banana.i18n( 'category' ) },
		{ value: 'wikilinks', label: banana.i18n( 'wikilinks' ) },
		{ value: 'subpages', label: banana.i18n( 'subpages' ) },
		{ value: 'transclusions', label: banana.i18n( 'transclusions' ) },
		{ value: 'quarry', label: 'Quarry' },
		{ value: 'hashtag', label: banana.i18n( 'hashtag' ) },
		{ value: 'external-link', label: banana.i18n( 'external-link' ) },
		{ value: 'search', label: banana.i18n( 'search' ) },
		{ value: 'wikiproject', label: banana.i18n( 'wikiproject' ) }
	];
}

/**
 * The subtle helper line describing a source, shown under the input
 * and in the FAQ. The wikilinks/transclusions messages embed their
 * help anchor in the content (rawI18n bypasses banana's sanitizer);
 * the others take it as a parameter.
 *
 * @param {string} source
 * @return {string} HTML.
 */
export function describeSource( source ) {
	switch ( source ) {
		case 'wikilinks':
			return rawI18n(
				'massviews-wikilinks-description',
				help( 'Help:Wikilinks', banana.i18n( 'massviews-wikilinks-description-link' ).toLowerCase() )
			);
		case 'subpages':
			return banana.i18n(
				'massviews-subpages-description',
				help( 'Help:Subpages', banana.i18n( 'massviews-subpages-description-link' ).toLowerCase() )
			);
		case 'transclusions':
			return rawI18n(
				'massviews-transclusions-description',
				help( 'Help:Transclusion', banana.i18n( 'massviews-transclusions-description-link' ).toLowerCase() )
			);
		case 'quarry':
			return banana.i18n(
				'massviews-quarry-description',
				'<a target="_blank" href="https://quarry.wmcloud.org">Quarry</a>'
			);
		case 'hashtag':
			return banana.i18n(
				'hashtag-credits',
				'<a target="_blank" href="https://hashtags.wmcloud.org">' +
					'Wikimedia hashtag search</a>'
			) + ' ' + banana.i18n(
				'massviews-hashtag-description',
				'<a target="_blank" href="https://hashtags.wmcloud.org/docs/">' +
					`${ banana.i18n( 'massviews-hashtag-description-link' ).toLowerCase() }</a>`
			);
		case 'external-link':
			return banana.i18n(
				'massviews-external-link-description',
				help( 'Help:Links#External_links', banana.i18n( 'massviews-external-link-description-link' ).toLowerCase() )
			);
		case 'search':
			return banana.i18n(
				'massviews-search-description',
				help( 'Help:CirrusSearch', 'CirrusSearch' )
			);
		case 'wikiproject':
			return banana.i18n(
				'massviews-wikiproject-description',
				// A proper noun, so no lowercasing like the others.
				help( 'Extension:PageAssessments', banana.i18n( 'massviews-wikiproject-description-link' ) )
			);
		default:
			return banana.i18n(
				'massviews-category-description',
				help( 'Help:Categories', banana.i18n( 'massviews-category-description-link' ).toLowerCase() )
			);
	}
}
