<template>
	<BaseFaqDialog
		:open="open"
		:entries="entries"
		@update:open="( value ) => emit( 'update:open', value )"
	/>
</template>

<script setup>
import BaseFaqDialog from '../../components/FaqDialog.vue';
import { banana, rawI18n } from '../../i18n.js';
import { describeSource, getSourceItems } from './sources.js';

defineProps( {
	open: {
		type: Boolean,
		default: false
	}
} );

const emit = defineEmits( [ 'update:open' ] );

const link = ( href, text ) => `<a target="_blank" href="${ href }">${ text }</a>`;

const redirectviewsLink = `<a href="/redirectviews">${ banana.i18n( 'redirectviews' ) }</a>`;

// Per-source example/details messages ($1… as the legacy FAQ passed
// them), appended after each source's description line.
const SOURCE_EXAMPLES = {
	category: () => banana.i18n( 'faq-massviews-sources-category', link(
		'https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York',
		'https://en.wikipedia.org/wiki/Category:Folk_musicians_from_New_York'
	) ),
	wikilinks: () => banana.i18n( 'faq-massviews-sources-wikilinks', link(
		'https://en.wikipedia.org/wiki/Wikipedia:Articles_for_improvement/Articles/List',
		'https://en.wikipedia.org/wiki/Wikipedia:Articles_for_improvement/Articles/List'
	) ),
	subpages: () => banana.i18n( 'faq-massviews-sources-subpages', link(
		'https://en.wikipedia.org/wiki/User:Example',
		'https://en.wikipedia.org/wiki/User:Example'
	) ),
	transclusions: () => banana.i18n( 'faq-massviews-sources-template', link(
		'https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games',
		'https://en.wikipedia.org/wiki/Template:Infobox_Olympic_games'
	) ),
	quarry: () => banana.i18n( 'faq-massviews-sources-quarry', 'Quarry', 'page_title' ),
	hashtag: () => banana.i18n(
		'faq-massviews-sources-hashtag',
		'<code>#</code>',
		link( 'https://hashtags.wmcloud.org/?query=100wikidays', '#100wikidays' ),
		link( 'https://hashtags.wmcloud.org/docs/', banana.i18n( 'documentation' ) )
	),
	'external-link': () => banana.i18n(
		'faq-massviews-sources-external-link',
		link( 'https://en.wikipedia.org/wiki/Special:LinkSearch/*.nycgo.com', '*.nycgo.com' ),
		link(
			'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Linksearch',
			banana.i18n( 'documentation' )
		)
	),
	search: () => banana.i18n( 'faq-massviews-sources-search', link(
		'https://en.wikipedia.org/w/index.php?search=insource%3A%22UNESCO+Science+Report%22&title=Special:Search',
		'insource:"UNESCO Science Report"'
	) ),
	wikiproject: () => banana.i18n(
		'faq-massviews-sources-wikiproject',
		link(
			'https://www.mediawiki.org/wiki/Special:MyLanguage/Extension:PageAssessments',
			'PageAssessments'
		),
		link( 'https://en.wikipedia.org/wiki/Special:PageAssessments?project=Volcanoes&namespace=0', 'Volcanoes' )
	)
};

function sourceItem( { value, label } ) {
	return `<li><i>${ label }</i> — ${ describeSource( value ) }. ${ SOURCE_EXAMPLES[ value ]() }</li>`;
}

const entries = [
	{
		id: 'sources',
		title: banana.i18n( 'faq-massviews-sources-title' ),
		// One item per source: its label, the description shown under
		// the input, then the example/details.
		paragraphs: [
			'<ul>' + getSourceItems().map( sourceItem ).join( '' ) + '</ul>'
		]
	},
	{
		id: 'subject_page',
		title: banana.i18n(
			'faq-massviews-subject-page-title', banana.i18n( 'category-subject-toggle' )
		),
		// rawI18n: the message embeds an anchor.
		paragraphs: [ rawI18n( 'faq-massviews-subject-page-body' ) ]
	},
	{
		id: 'anomaly',
		title: banana.i18n( 'faq-anomaly-title' ),
		paragraphs: [
			banana.i18n( 'faq-anomaly-body1' ),
			banana.i18n( 'faq-anomaly-body2', link(
				'https://phabricator.wikimedia.org/maniphest/task/edit/form/1/?projects=Pageviews-Anomaly',
				'Phabricator'
			) )
		]
	},
	{
		id: 'counts',
		title: banana.i18n( 'faq-counts-title' ),
		paragraphs: [ banana.i18n( 'faq-counts-body', link(
			'https://meta.wikimedia.org/wiki/Research:Page_view',
			'meta:Research:Page view'
		) ) ]
	},
	{
		id: 'redirects',
		title: banana.i18n( 'faq-redirects-title' ),
		paragraphs: [
			banana.i18n(
				'faq-redirects-body', redirectviewsLink, banana.i18n( 'include-redirects' )
			),
			banana.i18n( 'faq-redirects-body2', banana.i18n( 'include-redirects' ) )
		]
	},
	{
		id: 'feedback',
		title: banana.i18n( 'faq-bug-report-title' ),
		// rawI18n: the message embeds anchor markup.
		paragraphs: [ rawI18n( 'faq-bug-report-body' ) ]
	}
];
</script>
